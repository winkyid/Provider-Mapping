"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useNetworkStore } from "@/stores/networkStore";
import AuthScreen from "@/components/network/AuthScreen";
import Topbar from "@/components/network/Topbar";
import Toolbar from "@/components/network/Toolbar";
import Sidebar from "@/components/network/Sidebar";
import ProviderManager from "@/components/network/ProviderManager";
import LocationControl from "@/components/network/LocationControl";
import CustomZoomControl from "@/components/network/CustomZoomControl";
import { ShieldCheck, Layers, PanelRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Leaflet must be client-only
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-muted-foreground text-sm">
      Memuat peta…
    </div>
  ),
});

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [breakpoint]);
  return isMobile;
}

export default function Page() {
  const ready = useNetworkStore((s) => s.ready);
  const account = useNetworkStore((s) => s.account);
  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const hasLegacy = useNetworkStore((s) => s.hasLegacy);
  const init = useNetworkStore((s) => s.init);
  const tool = useNetworkStore((s) => s.tool);
  const [managerUserOpen, setManagerUserOpen] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const isMobile = useIsMobile();
  // Sidebar always starts closed; user opens via toggle.
  // On desktop, the panel toggle is in the topbar; on mobile it's a FAB.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Geolocation state — coords received from LocationControl + flyTo trigger
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [flyToUserTrigger, setFlyToUserTrigger] = useState(0);

  const handleCoordsChange = useCallback(
    (coords: { lat: number; lng: number; accuracy?: number } | null) => {
      setUserLocation(coords);
    },
    []
  );
  const handleFlyToUser = useCallback(() => {
    setFlyToUserTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Provider manager auto-opens when logged in but no provider selected.
  const managerOpen =
    ready &&
    !!account &&
    !activeProvider
      ? !userDismissed
      : managerUserOpen;

  const cursorClass =
    tool === "delete"
      ? "cursor-not-allowed"
      : tool.startsWith("add-")
      ? "cursor-crosshair"
      : "";

  // Show loading state until store is ready
  if (!ready) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <Layers className="h-10 w-10 mx-auto text-emerald-600 mb-3 animate-pulse" />
          <div className="text-sm text-muted-foreground">Memuat aplikasi…</div>
        </div>
      </main>
    );
  }

  // Show auth screen when no account
  if (!account) {
    return (
      <AuthScreen
        hasLegacy={hasLegacy}
        onMigrateLegacy={() => setUserDismissed(false)}
      />
    );
  }

  return (
    <main
      className={`fixed inset-0 flex flex-col bg-background overflow-hidden ${cursorClass}`}
      // Use manipulation to allow tap/click while preventing double-tap zoom.
      // Leaflet manages its own touch-action on the map container itself.
      style={{
        touchAction: "manipulation",
        overscrollBehavior: "none",
      }}
    >
      {/* Top bar — wraps on mobile, single row on desktop */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex items-start justify-start gap-2 pointer-events-none">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenProviderManager={() => {
            setUserDismissed(false);
            setManagerUserOpen(true);
          }}
        />
      </div>

      {/* Toolbar — wraps below topbar on mobile, single row on desktop */}
      {activeProvider && (
        <div className="absolute top-16 sm:top-16 left-2 right-2 z-[1000] pointer-events-none">
          <Toolbar provider={activeProvider} />
        </div>
      )}

      {/* Map fills the screen */}
      <div className="absolute inset-0">
        <MapView
          userLocation={userLocation}
          flyToUserTrigger={flyToUserTrigger}
        />
      </div>

      {/* Location control — bottom-left FAB-style (above privacy badge) */}
      {activeProvider && (
        <div className="absolute bottom-16 left-2 z-[600] pointer-events-auto">
          <LocationControl
            onCoordsChange={handleCoordsChange}
            onFlyToRequest={handleFlyToUser}
          />
        </div>
      )}

      {/* Custom zoom control — bottom-right, above the Panel FAB.
          Replaces Leaflet's native zoomControl so it never overlaps the topbar. */}
      {activeProvider && (
        <div className="absolute right-2 z-[600] pointer-events-auto"
          style={{ bottom: isMobile ? "4.5rem" : "4.5rem" }}
        >
          <CustomZoomControl />
        </div>
      )}

      {/* Mobile sidebar backdrop — tap to close */}
      {isMobile && sidebarOpen && (
        <div
          className="absolute inset-0 z-[999] bg-black/30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — right side. On desktop: persistent panel. On mobile: drawer. */}
      {activeProvider && sidebarOpen && (
        <aside
          className={`absolute z-[1000] bg-card border rounded-lg shadow-xl overflow-hidden flex flex-col ${
            isMobile
              ? "top-2 right-2 bottom-2 left-2 w-auto max-w-none"
              : "top-16 right-2 bottom-2 w-[340px] max-w-[calc(100vw-1rem)]"
          }`}
          // Allow vertical scroll inside sidebar on mobile
          style={{ touchAction: "pan-y" }}
        >
          {/* Mobile close button */}
          {isMobile && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Sidebar />
        </aside>
      )}

      {/* FAB — toggle sidebar. Positioned bottom-center so it doesn't overlap
          with zoom control (bottom-right) or location control (bottom-left). */}
      {activeProvider && (
        <Button
          size={isMobile ? "lg" : "default"}
          className={`absolute z-[600] shadow-xl pointer-events-auto bg-emerald-600 hover:bg-emerald-700 ${
            isMobile
              ? "bottom-4 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full"
              : "bottom-4 left-1/2 -translate-x-1/2 h-11 px-4 gap-2 rounded-full"
          } ${sidebarOpen ? "opacity-80" : ""}`}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle panel"
        >
          <PanelRight className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
          {!isMobile && (
            <span className="text-xs font-medium">
              {sidebarOpen ? "Tutup Panel" : "Panel"}
            </span>
          )}
        </Button>
      )}

      {/* Privacy badge bottom-left (hidden on mobile when FAB is visible) */}
      <div className="absolute bottom-2 left-2 z-[500] pointer-events-none">
        <div className="px-2.5 py-1.5 rounded-md bg-card/95 backdrop-blur border shadow text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          <span className="hidden sm:inline">Akun JSON lokal · tidak ada server</span>
          <span className="sm:hidden">Lokal</span>
        </div>
      </div>

      {/* Empty state hint (desktop only) */}
      {activeProvider && !isMobile && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none hidden md:block">
          <div className="px-3 py-1.5 rounded-md bg-card/90 backdrop-blur border shadow text-[11px] text-muted-foreground">
            {tool === "select" && "Klik elemen untuk edit · Drag marker untuk geser"}
            {tool === "add-cable" && "Klik node asal lalu node tujuan untuk sambung kabel"}
            {tool === "delete" && "Klik elemen/kabel untuk hapus"}
            {tool.startsWith("add-") && tool !== "add-cable" && "Klik peta untuk menempatkan elemen baru"}
          </div>
        </div>
      )}

      {/* Provider manager modal */}
      <ProviderManager
        open={managerOpen}
        onOpenChange={(v) => {
          setManagerUserOpen(v);
          if (!v) setUserDismissed(true);
        }}
        forceSelect={!activeProvider}
      />
    </main>
  );
}
