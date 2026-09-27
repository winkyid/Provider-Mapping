"use client";

import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Crosshair,
  LocateFixed,
  Loader2,
  MapPinOff,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface LocationControlProps {
  /** Dipanggil setiap kali lokasi user berubah (untuk render marker di peta) */
  onCoordsChange: (coords: { lat: number; lng: number; accuracy?: number } | null) => void;
  /** Dipanggil ketika user klik tombol locate (untuk trigger flyTo) */
  onFlyToRequest: () => void;
}

export default function LocationControl({
  onCoordsChange,
  onFlyToRequest,
}: LocationControlProps) {
  const geo = useGeolocation();
  const followMode = geo.watching;
  // Track previous coords to avoid spamming parent
  const lastTsRef = useRef<number | null>(null);

  // Notify parent whenever coords change
  useEffect(() => {
    if (geo.coords && geo.timestamp !== lastTsRef.current) {
      lastTsRef.current = geo.timestamp;
      onCoordsChange(geo.coords);
      // Auto-fly when in follow mode
      if (followMode) {
        onFlyToRequest();
      }
    } else if (!geo.coords) {
      onCoordsChange(null);
    }
  }, [geo.coords, geo.timestamp, followMode, onCoordsChange, onFlyToRequest]);

  // Show error toast once
  const lastErrRef = useRef<string | null>(null);
  useEffect(() => {
    if (geo.error && geo.error !== lastErrRef.current) {
      lastErrRef.current = geo.error;
      toast.error(geo.error, { duration: 5000 });
    }
    if (!geo.error) {
      lastErrRef.current = null;
    }
  }, [geo.error]);

  // Show success toast when first acquired
  const hadCoordsRef = useRef(false);
  useEffect(() => {
    if (geo.coords && !hadCoordsRef.current) {
      hadCoordsRef.current = true;
      toast.success(
        `Lokasi ditemukan (akurasi ±${Math.round(geo.coords.accuracy || 0)} m)`
      );
    }
    if (!geo.coords) {
      hadCoordsRef.current = false;
    }
  }, [geo.coords]);

  function handleLocateClick() {
    if (geo.permission === "denied") {
      toast.error(
        "Izin lokasi ditolak. Buka pengaturan browser → Site settings → Location → Allow, lalu reload halaman.",
        { duration: 7000 }
      );
      return;
    }
    if (geo.permission === "unsupported") {
      toast.error("Browser ini tidak mendukung Geolocation API");
      return;
    }
    if (followMode) {
      geo.stopWatch();
      toast.success("Mode follow lokasi dimatikan");
      return;
    }
    if (geo.coords) {
      onFlyToRequest();
      return;
    }
    geo.requestOnce();
  }

  function handleToggleFollow() {
    if (followMode) {
      geo.stopWatch();
      toast.success("Mode follow lokasi dimatikan");
    } else {
      if (geo.permission === "denied") {
        toast.error(
          "Izin lokasi ditolak. Aktifkan di pengaturan browser untuk menggunakan fitur ini.",
          { duration: 6000 }
        );
        return;
      }
      geo.startWatch();
      toast.success(
        "Mode follow aktif. Peta akan mengikuti lokasi Anda secara real-time."
      );
    }
  }

  const Icon = geo.loading
    ? Loader2
    : followMode
    ? Navigation
    : geo.permission === "denied"
    ? MapPinOff
    : geo.coords
    ? LocateFixed
    : Crosshair;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 p-1 bg-card/95 backdrop-blur border rounded-lg shadow-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={followMode ? "default" : "ghost"}
              size="sm"
              className={`h-9 w-9 p-0 ${
                followMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : geo.coords
                  ? "text-blue-600"
                  : ""
              }`}
              onClick={handleLocateClick}
              disabled={geo.loading || geo.permission === "unsupported"}
            >
              <Icon
                className={`h-4 w-4 ${geo.loading ? "animate-spin" : ""} ${
                  followMode ? "animate-pulse" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            {geo.loading
              ? "Mencari lokasi..."
              : followMode
              ? "Klik untuk berhenti mengikuti"
              : geo.permission === "denied"
              ? "Izin lokasi ditolak — klik untuk instruksi"
              : geo.coords
              ? "Klik untuk pusatkan ke lokasi Anda"
              : "Klik untuk minta izin lokasi"}
          </TooltipContent>
        </Tooltip>

        {(geo.coords || followMode) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={followMode ? "default" : "ghost"}
                size="sm"
                className={`h-9 w-9 p-0 ${
                  followMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : ""
                }`}
                onClick={handleToggleFollow}
                disabled={
                  geo.permission === "denied" ||
                  geo.permission === "unsupported"
                }
              >
                <Navigation
                  className={`h-4 w-4 ${followMode ? "animate-pulse" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {followMode
                ? "Matikan mode follow (hemat baterai)"
                : "Aktifkan mode follow real-time"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
