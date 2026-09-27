"use client";

import { useNetworkStore, type Tool } from "@/stores/networkStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2,
  Trash2,
  Cable as CableIcon,
  Flag,
  Building2,
  Box,
  UtilityPole,
  Spline,
  X,
} from "lucide-react";
import type { Provider } from "@/lib/types";
import { NODE_TYPE_META } from "@/lib/types";

interface ToolbarProps {
  provider: Provider;
}

interface ToolDef {
  id: Tool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** label key in provider naming, used to override the label */
  namingKey?: keyof Provider["naming"];
  color: string;
}

export default function Toolbar({ provider }: ToolbarProps) {
  const tool = useNetworkStore((s) => s.tool);
  const setTool = useNetworkStore((s) => s.setTool);
  const cableStartNodeId = useNetworkStore((s) => s.cableStartNodeId);
  const nodes = useNetworkStore((s) => s.nodes);
  const startNode = nodes.find((n) => n.id === cableStartNodeId);

  const tools: ToolDef[] = [
    { id: "select", label: "Pilih / Geser", icon: MousePointer2, color: "#1f2937" },
    { id: "add-pop", label: provider.naming.pop, icon: Flag, namingKey: "pop", color: provider.colors.pop },
    { id: "add-odc", label: provider.naming.odc, icon: Building2, namingKey: "odc", color: provider.colors.odc },
    { id: "add-odp", label: provider.naming.odp, icon: Box, namingKey: "odp", color: provider.colors.odp },
    { id: "add-pole", label: provider.naming.pole, icon: UtilityPole, namingKey: "pole", color: provider.colors.pole },
    { id: "add-join", label: provider.naming.join, icon: Spline, namingKey: "join", color: provider.colors.join },
    { id: "add-cable", label: provider.naming.cable, icon: CableIcon, namingKey: "cable", color: provider.colors.cable },
    { id: "delete", label: "Hapus", icon: Trash2, color: "#dc2626" },
  ];

  return (
    <div className="pointer-events-auto">
      <TooltipProvider delayDuration={300}>
        <div
          className="flex items-center gap-1 p-1.5 bg-card/95 backdrop-blur border rounded-lg shadow-lg overflow-x-auto max-w-[calc(100vw-1rem)]"
          style={{
            scrollbarWidth: "thin",
            msOverflowStyle: "none",
            touchAction: "pan-x",
          }}
        >
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = tool === t.id;
            return (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`h-9 px-2.5 gap-1.5 flex-shrink-0 ${
                      isActive ? "ring-2 ring-offset-1" : ""
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: t.color,
                            color: "white",
                            // @ts-expect-error css var
                            "--tw-ring-color": t.color,
                          }
                        : undefined
                    }
                    onClick={() => setTool(t.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline text-xs">{t.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {t.label}
                  {t.namingKey && (
                    <span className="block text-muted-foreground text-[10px]">
                      {NODE_TYPE_META[t.id.replace("add-", "") as keyof typeof NODE_TYPE_META]?.description ||
                        "Klik peta untuk menempatkan"}
                    </span>
                  )}
                  {t.id === "add-cable" && (
                    <span className="block text-muted-foreground text-[10px]">
                      Klik node asal lalu node tujuan
                    </span>
                  )}
                  {t.id === "delete" && (
                    <span className="block text-muted-foreground text-[10px]">
                      Klik node / kabel untuk hapus
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {tool === "add-cable" && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l text-xs">
              {startNode ? (
                <>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Dari: {startNode.name} → klik node tujuan
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => useNetworkStore.setState({ cableStartNodeId: null })}
                  >
                    <X className="h-3 w-3" /> Batal
                  </Button>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Klik node asal kabel
                </span>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
