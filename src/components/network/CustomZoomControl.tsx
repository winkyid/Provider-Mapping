"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Minus } from "lucide-react";

/**
 * Custom zoom control for the Leaflet map.
 *
 * Leaflet's native zoomControl is positioned at top-left, which overlaps with
 * our Topbar (profile + provider). We disable the native control and render
 * our own React buttons that call map.zoomIn()/zoomOut() directly.
 *
 * The buttons are positioned at bottom-right, just above the green Panel FAB,
 * so they never overlap with the topbar or sidebar.
 */
export default function CustomZoomControl() {
  const zoomInRef = useRef<HTMLButtonElement | null>(null);
  const zoomOutRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const map =
      (window as unknown as { __networkMap?: { zoomIn: () => void; zoomOut: () => void } })
        .__networkMap;
    if (!map) return;
    const onIn = () => map.zoomIn();
    const onOut = () => map.zoomOut();
    const inBtn = zoomInRef.current;
    const outBtn = zoomOutRef.current;
    inBtn?.addEventListener("click", onIn);
    outBtn?.addEventListener("click", onOut);
    return () => {
      inBtn?.removeEventListener("click", onIn);
      outBtn?.removeEventListener("click", onOut);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-1 p-1 bg-card/95 backdrop-blur border rounded-lg shadow-lg pointer-events-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={zoomInRef}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Zoom in
          </TooltipContent>
        </Tooltip>
        <div className="h-px bg-border mx-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={zoomOutRef}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Zoom out
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
