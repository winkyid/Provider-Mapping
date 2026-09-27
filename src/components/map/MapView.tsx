"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNetworkStore } from "@/stores/networkStore";
import type { NetworkNode, Cable, NodeType } from "@/lib/types";
import { CABLE_TYPE_META } from "@/lib/types";
import { haversineMeters } from "@/lib/storage";

// Fix default marker icons (we use custom divIcons, but keep this for safety)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

function makeUserLocationIcon(): L.DivIcon {
  // Pulsing blue dot like Google Maps
  return L.divIcon({
    className: "user-location-icon",
    html: `
      <div class="relative">
        <div class="absolute inset-0 -m-3 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="relative h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

function makeAccuracyCircle(accuracy: number): L.Circle {
  return L.circle([0, 0], {
    radius: accuracy,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    fillOpacity: 0.08,
    weight: 1,
    opacity: 0.4,
    interactive: false,
  });
}

function makeNodeIcon(
  type: NodeType,
  color: string,
  selected: boolean,
  locked: boolean = false
): L.DivIcon {
  const symbol: Record<NodeType, string> = {
    odp: "▣",
    odc: "▤",
    pole: "│",
    pop: "★",
    join: "○",
  };
  const ring = selected
    ? "box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.6), 0 4px 10px rgba(0,0,0,0.35);"
    : "box-shadow: 0 2px 6px rgba(0,0,0,0.3);";
  const size = type === "pop" ? 38 : type === "odc" ? 34 : 30;
  // Native SVG padlock badge (replaces emoji 🔒) — lucide lock icon path
  const lockBadge = locked
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="
        position:absolute;right:-4px;bottom:-4px;
        background:#1f2937;color:#fbbf24;
        border-radius:50%;padding:1.5px;
        border:1.5px solid white;
        box-shadow:0 1px 3px rgba(0,0,0,0.4);
        display:block;
      "><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
    : "";
  return L.divIcon({
    className: "network-node-icon",
    html: `<div style="
        position:relative;
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};color:white;display:flex;align-items:center;
        justify-content:center;font-weight:700;font-size:14px;
        border:2px solid white;${ring}
      ">${symbol[type]}${lockBadge}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

interface MapViewProps {
  /** Lokasi user dari geolocation API; null jika belum ada */
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  /** Counter yang increment untuk trigger flyTo ke user location */
  flyToUserTrigger?: number;
  /** Counter yang increment untuk trigger flyTo ke lokasi tertentu */
  flyToCoords?: { lat: number; lng: number; zoom?: number; trigger: number };
}

export default function MapView({
  userLocation,
  flyToUserTrigger,
  flyToCoords,
}: MapViewProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const cableLayerRef = useRef<L.LayerGroup | null>(null);
  const tempLineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);

  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const nodes = useNetworkStore((s) => s.nodes);
  const cables = useNetworkStore((s) => s.cables);
  const tool = useNetworkStore((s) => s.tool);
  const selectedNodeId = useNetworkStore((s) => s.selectedNodeId);
  const selectedCableId = useNetworkStore((s) => s.selectedCableId);
  const cableStartNodeId = useNetworkStore((s) => s.cableStartNodeId);
  const mapCenter = useNetworkStore((s) => s.mapCenter);
  const mapZoom = useNetworkStore((s) => s.mapZoom);
  const setMapView = useNetworkStore((s) => s.setMapView);
  const setTool = useNetworkStore((s) => s.setTool);
  const addNode = useNetworkStore((s) => s.addNode);
  const addCable = useNetworkStore((s) => s.addCable);
  const selectNode = useNetworkStore((s) => s.selectNode);
  const selectCable = useNetworkStore((s) => s.selectCable);
  const removeNode = useNetworkStore((s) => s.removeNode);
  const removeCable = useNetworkStore((s) => s.removeCable);
  const updateNode = useNetworkStore((s) => s.updateNode);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      // Hide native zoom control — replaced by custom control to avoid overlap with UI
      zoomControl: false,
      preferCanvas: true,
      // Touch / mobile support
      tap: true,
      tapTolerance: 15,
      touchZoom: true,
      touch: true,
      // Better mobile drag
      inertia: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      // OSM tiles only go to 19; beyond that the map shows gray. Clamp leaflet's
      // maxZoom to 19 so zooming stops at the highest usable level.
      maxZoom: 19,
      minZoom: 2,
      // Disable double-tap zoom when adding nodes (otherwise tap-to-place triggers zoom)
      doubleClickZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — Peta hanya sebagai latar. Data jaringan Anda TIDAK dikirim ke OSM.',
      // Match tile maxZoom with map maxZoom to prevent "blank tile" gray areas
      maxZoom: 19,
      crossOrigin: true,
      // Use higher-DPI tiles on retina screens for sharper text
      detectRetina: true,
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    cableLayerRef.current = L.layerGroup().addTo(map);

    map.on("moveend", () => {
      const c = map.getCenter();
      setMapView([c.lat, c.lng], map.getZoom());
    });

    // Handle both click (desktop) and tap (mobile). Leaflet's `click` event
    // fires on tap too. We read `tool` fresh from the store inside the handler
    // to avoid stale-closure issues (the effect only runs once).
    function handlePlace(e: L.LeafletMouseEvent) {
      const currentTool = useNetworkStore.getState().tool;
      if (
        currentTool === "add-odp" ||
        currentTool === "add-odc" ||
        currentTool === "add-pole" ||
        currentTool === "add-pop" ||
        currentTool === "add-join"
      ) {
        L.DomEvent.stopPropagation(e);
        addNode(e.latlng.lat, e.latlng.lng);
      } else if (currentTool === "select") {
        selectNode(null);
        selectCable(null);
      }
    }
    map.on("click", handlePlace);

    mapRef.current = map;
    // Expose map instance for debugging / testing (dev only)
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __networkMap?: L.Map }).__networkMap = map;
    }

    // Fix size in case container changes
    setTimeout(() => map.invalidateSize(), 200);
    // Also invalidate on resize (covers mobile address bar show/hide)
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync cursor style based on tool
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !containerRef.current) return;
    const container = map.getContainer();
    if (
      tool === "add-odp" ||
      tool === "add-odc" ||
      tool === "add-pole" ||
      tool === "add-pop" ||
      tool === "add-join"
    ) {
      container.style.cursor = "crosshair";
    } else if (tool === "delete") {
      container.style.cursor = "not-allowed";
    } else {
      container.style.cursor = "";
    }
  }, [tool]);

  // Render cables
  useEffect(() => {
    const layer = cableLayerRef.current;
    if (!layer || !activeProvider) return;
    layer.clearLayers();
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    cables.forEach((cable: Cable) => {
      const a = nodeById.get(cable.fromNodeId);
      const b = nodeById.get(cable.toNodeId);
      if (!a || !b) return;
      const isSelected = cable.id === selectedCableId;
      const color = cable.color || activeProvider.colors.cable;
      const latlngs: L.LatLngExpression[] = [
        [a.lat, a.lng],
        [b.lat, b.lng],
      ];
      const line = L.polyline(latlngs, {
        color,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.75,
        dashArray: cable.type === "drop" ? "8 6" : undefined,
      });
      line.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (tool === "delete") {
          removeCable(cable.id);
        } else {
          selectCable(cable.id);
        }
      });
      const lengthM = Math.round(
        haversineMeters(a.lat, a.lng, b.lat, b.lng)
      );
      line.bindPopup(
        `<div style="min-width:160px">
          <div style="font-weight:600;margin-bottom:4px">${cable.name}</div>
          <div style="font-size:12px;color:#555">${a.name} → ${b.name}</div>
          <div style="font-size:12px;color:#555">Tipe: ${CABLE_TYPE_META[cable.type].label}</div>
          <div style="font-size:12px;color:#555">Jarak: ${lengthM} m</div>
          ${
            cable.fiberCount
              ? `<div style="font-size:12px;color:#555">Fiber: ${cable.fiberCount}</div>`
              : ""
          }
        </div>`
      );
      layer.addLayer(line);
    });
  }, [
    cables,
    nodes,
    activeProvider,
    selectedCableId,
    tool,
    selectCable,
    removeCable,
  ]);

  // Render nodes
  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer || !activeProvider) return;
    layer.clearLayers();
    nodes.forEach((node: NetworkNode) => {
      const color = activeProvider.colors[node.type];
      const isSelected = node.id === selectedNodeId;
      const isCableStart = node.id === cableStartNodeId;
      const isLocked = !!node.locked;
      const icon = makeNodeIcon(
        node.type,
        color,
        isSelected || isCableStart,
        isLocked
      );
      // Marker draggable hanya saat tool "select" DAN tidak dikunci
      const marker = L.marker([node.lat, node.lng], {
        icon,
        draggable: tool === "select" && !isLocked,
        // Cursor style berbeda untuk locked marker
        keyboard: false,
      });
      marker.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (tool === "delete") {
          removeNode(node.id);
          return;
        }
        if (tool === "add-cable") {
          if (!cableStartNodeId) {
            useNetworkStore.setState({ cableStartNodeId: node.id });
          } else if (cableStartNodeId !== node.id) {
            addCable(cableStartNodeId, node.id);
          }
          return;
        }
        selectNode(node.id);
      });
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        updateNode(node.id, { lat: ll.lat, lng: ll.lng });
      });
      marker.bindPopup(
        `<div style="min-width:160px">
          <div style="font-weight:600">${node.name}</div>
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px">${activeProvider.naming[node.type]}</div>
          <div style="font-size:12px;color:#555;margin-top:4px">${node.lat.toFixed(6)}, ${node.lng.toFixed(6)}</div>
          ${
            isLocked
              ? `<div style="font-size:11px;color:#b45309;margin-top:4px;display:flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Posisi dikunci</div>`
              : ""
          }
          ${
            node.notes
              ? `<div style="font-size:12px;color:#555;margin-top:4px">${node.notes}</div>`
              : ""
          }
        </div>`
      );
      layer.addLayer(marker);
    });
  }, [
    nodes,
    activeProvider,
    selectedNodeId,
    selectedCableId,
    cableStartNodeId,
    tool,
    selectNode,
    addCable,
    removeNode,
    updateNode,
  ]);

  // Draw temp line from cable start to mouse
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    function onMove(e: L.LeafletMouseEvent) {
      if (tool !== "add-cable" || !cableStartNodeId) {
        if (tempLineRef.current) {
          tempLineRef.current.remove();
          tempLineRef.current = null;
        }
        return;
      }
      const start = nodes.find((n) => n.id === cableStartNodeId);
      if (!start) return;
      if (!tempLineRef.current) {
        tempLineRef.current = L.polyline([], {
          color: "#f59e0b",
          weight: 3,
          dashArray: "6 4",
          opacity: 0.8,
        }).addTo(map);
      }
      tempLineRef.current.setLatLngs([
        [start.lat, start.lng],
        [e.latlng.lat, e.latlng.lng],
      ]);
    }
    function onOut() {
      if (tempLineRef.current) {
        tempLineRef.current.remove();
        tempLineRef.current = null;
      }
    }
    map.on("mousemove", onMove);
    map.on("mouseout", onOut);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout", onOut);
      if (tempLineRef.current) {
        tempLineRef.current.remove();
        tempLineRef.current = null;
      }
    };
  }, [tool, cableStartNodeId, nodes]);

  // Render / update user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userLocation) {
      const { lat, lng, accuracy } = userLocation;
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([lat, lng], {
          icon: makeUserLocationIcon(),
          interactive: true,
          zIndexOffset: 1000,
        }).addTo(map);
        userMarkerRef.current.bindPopup(
          `<div style="min-width:140px">
            <div style="font-weight:600;display:flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> Lokasi Anda</div>
            <div style="font-size:11px;color:#555;margin-top:2px">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
            ${
              accuracy
                ? `<div style="font-size:11px;color:#555;margin-top:2px">Akurasi: ±${Math.round(accuracy)} m</div>`
                : ""
            }
          </div>`
        );
      } else {
        userMarkerRef.current.setLatLng([lat, lng]);
      }
      if (accuracy && accuracy > 0) {
        if (!userAccuracyRef.current) {
          userAccuracyRef.current = makeAccuracyCircle(accuracy);
          userAccuracyRef.current.addTo(map);
        } else {
          userAccuracyRef.current.setLatLng([lat, lng]);
          userAccuracyRef.current.setRadius(accuracy);
        }
      }
    } else {
      // Remove user marker if no location
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userAccuracyRef.current) {
        userAccuracyRef.current.remove();
        userAccuracyRef.current = null;
      }
    }
  }, [userLocation]);

  // Fly to user location on trigger
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 17), {
      duration: 0.8,
    });
  }, [flyToUserTrigger, userLocation]);

  // Fly to specific coordinates on trigger
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToCoords) return;
    map.flyTo([flyToCoords.lat, flyToCoords.lng], flyToCoords.zoom ?? 18, {
      duration: 0.8,
    });
  }, [flyToCoords]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}
