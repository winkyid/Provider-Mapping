"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface GeoState {
  /** null = belum pernah request; atau error message */
  error: string | null;
  /** apakah sedang request */
  loading: boolean;
  /** koordinat user */
  coords: { lat: number; lng: number; accuracy?: number } | null;
  /** timestamp update terakhir */
  timestamp: number | null;
  /** status permission: 'prompt' | 'granted' | 'denied' | 'unsupported' */
  permission: PermissionState | "unsupported";
  /** apakah sedang watch (continuous) */
  watching: boolean;
}

export interface UseGeolocationResult extends GeoState {
  /** Request lokasi satu kali (lebih hemat baterai) */
  requestOnce: () => void;
  /** Mulai watch terus-menerus (untuk follow mode) */
  startWatch: () => void;
  /** Stop watch */
  stopWatch: () => void;
}

const SUPPORTED =
  typeof navigator !== "undefined" && "geolocation" in navigator;

export function useGeolocation(): UseGeolocationResult {
  const [state, setState] = useState<GeoState>(() => ({
    error: null,
    loading: false,
    coords: null,
    timestamp: null,
    // Initialize synchronously based on what's available at hook creation.
    // This avoids setState-in-effect and gives a stable first paint.
    permission: !SUPPORTED ? "unsupported" : "prompt",
    watching: false,
  }));
  const watchIdRef = useRef<number | null>(null);

  // Check initial permission state on mount (only the async query, not the
  // fallback default — that's already set via lazy initializer above).
  useEffect(() => {
    if (!SUPPORTED) return;
    if (!("permissions" in navigator)) return;
    let active = true;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((perm) => {
        if (!active) return;
        setState((s) => ({ ...s, permission: perm.state }));
        perm.onchange = () => {
          setState((s) => ({ ...s, permission: perm.state }));
        };
      })
      .catch(() => {
        // Some browsers don't support permissions API for geolocation
      });
    return () => {
      active = false;
    };
  }, []);

  const requestOnce = useCallback(() => {
    if (!SUPPORTED) {
      setState((s) => ({
        ...s,
        error: "Geolocation tidak didukung browser ini",
        permission: "unsupported",
      }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: null,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          timestamp: pos.timestamp,
          permission: "granted",
        }));
      },
      (err) => {
        let message = "Gagal mendapatkan lokasi";
        if (err.code === err.PERMISSION_DENIED) {
          message =
            "Izin lokasi ditolak. Aktifkan di pengaturan browser untuk menggunakan fitur ini.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Posisi tidak tersedia. Coba lagi di lokasi terbuka.";
        } else if (err.code === err.TIMEOUT) {
          message = "Timeout. Coba lagi.";
        }
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
          permission: err.code === err.PERMISSION_DENIED ? "denied" : s.permission,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }, []);

  const startWatch = useCallback(() => {
    if (!SUPPORTED) {
      setState((s) => ({
        ...s,
        error: "Geolocation tidak didukung browser ini",
        permission: "unsupported",
      }));
      return;
    }
    if (watchIdRef.current !== null) return; // already watching
    setState((s) => ({ ...s, loading: true, error: null, watching: true }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: null,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          timestamp: pos.timestamp,
          permission: "granted",
          watching: true,
        }));
      },
      (err) => {
        let message = "Gagal mendapatkan lokasi";
        if (err.code === err.PERMISSION_DENIED) {
          message =
            "Izin lokasi ditolak. Aktifkan di pengaturan browser untuk menggunakan fitur ini.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Posisi tidak tersedia. Coba lagi di lokasi terbuka.";
        } else if (err.code === err.TIMEOUT) {
          message = "Timeout. Coba lagi.";
        }
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
          watching: false,
          permission: err.code === err.PERMISSION_DENIED ? "denied" : s.permission,
        }));
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      }
    );
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((s) => ({ ...s, watching: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    requestOnce,
    startWatch,
    stopWatch,
  };
}
