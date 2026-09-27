"use client";

import { useState, useMemo } from "react";
import { useNetworkStore } from "@/stores/networkStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  NODE_TYPE_META,
  CABLE_TYPE_META,
  type NetworkNode,
  type Cable,
  type NodeType,
  type CableType,
} from "@/lib/types";
import { haversineMeters } from "@/lib/storage";
import {
  Trash2,
  Crosshair,
  Pencil,
  Save,
  X,
  Plus,
  Minus,
  Lock,
  LockOpen,
} from "lucide-react";
import { toast } from "sonner";

export default function Sidebar() {
  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const nodes = useNetworkStore((s) => s.nodes);
  const cables = useNetworkStore((s) => s.cables);
  const selectedNodeId = useNetworkStore((s) => s.selectedNodeId);
  const selectedCableId = useNetworkStore((s) => s.selectedCableId);
  const selectNode = useNetworkStore((s) => s.selectNode);
  const selectCable = useNetworkStore((s) => s.selectCable);
  const lockAllNodes = useNetworkStore((s) => s.lockAllNodes);
  const unlockAllNodes = useNetworkStore((s) => s.unlockAllNodes);

  const [tab, setTab] = useState<"list" | "edit-node" | "edit-cable">("list");

  // Switch to edit tab when a node or cable is selected
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );
  const selectedCable = useMemo(
    () => cables.find((c) => c.id === selectedCableId) || null,
    [cables, selectedCableId]
  );

  // counts
  const counts = useMemo(() => {
    const byType: Record<NodeType, number> = {
      odp: 0,
      odc: 0,
      pole: 0,
      pop: 0,
      join: 0,
    };
    nodes.forEach((n) => (byType[n.type] += 1));
    return byType;
  }, [nodes]);

  // Lock stats
  const lockedCount = useMemo(
    () => nodes.filter((n) => n.locked).length,
    [nodes]
  );
  const allLocked = nodes.length > 0 && lockedCount === nodes.length;

  if (!activeProvider) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header: provider info */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded bg-background border flex items-center justify-center overflow-hidden flex-shrink-0">
            {activeProvider.logoUrl ? (
              <img
                src={activeProvider.logoUrl}
                alt={activeProvider.name}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">
                {activeProvider.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{activeProvider.name}</div>
            <div className="text-xs text-muted-foreground">
              {nodes.length} elemen · {cables.length} kabel
              {lockedCount > 0 && (
                <span className="ml-1 text-amber-600 inline-flex items-center gap-0.5">
                  · <Lock className="h-2.5 w-2.5" /> {lockedCount} terkunci
                </span>
              )}
            </div>
          </div>
          {/* Bulk lock/unlock button */}
          {nodes.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 gap-1 text-xs flex-shrink-0"
              onClick={() => {
                if (allLocked) {
                  unlockAllNodes();
                  toast.success("Semua elemen dibuka kuncinya");
                } else {
                  lockAllNodes();
                  toast.success(`${nodes.length} elemen dikunci`);
                }
              }}
              title={
                allLocked
                  ? "Buka kunci semua elemen"
                  : "Kunci semua elemen (mencegah geser tidak sengaja)"
              }
            >
              {allLocked ? (
                <>
                  <LockOpen className="h-3 w-3" />
                  <span className="hidden sm:inline">Buka Semua</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  <span className="hidden sm:inline">Kunci Semua</span>
                </>
              )}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1 mt-2.5">
          {(["pop", "odc", "odp", "pole", "join"] as NodeType[]).map((t) => (
            <div
              key={t}
              className="text-center p-1.5 rounded border bg-background"
              title={NODE_TYPE_META[t].description}
            >
              <div
                className="w-2 h-2 rounded-full mx-auto mb-0.5"
                style={{ backgroundColor: activeProvider.colors[t] }}
              />
              <div className="text-[10px] text-muted-foreground truncate">
                {activeProvider.naming[t]}
              </div>
              <div className="text-xs font-semibold">{counts[t]}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs
        value={
          selectedNode
            ? "edit-node"
            : selectedCable
            ? "edit-cable"
            : tab
        }
        onValueChange={(v) => setTab(v as typeof tab)}
        className="flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="grid grid-cols-3 m-2">
          <TabsTrigger value="list">Daftar</TabsTrigger>
          <TabsTrigger value="edit-node" disabled={!selectedNode}>
            Node
          </TabsTrigger>
          <TabsTrigger value="edit-cable" disabled={!selectedCable}>
            Kabel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 min-h-0 m-0">
          <NodeCableList
            nodes={nodes}
            cables={cables}
            provider={activeProvider}
            onSelectNode={(id) => {
              selectNode(id);
              setTab("edit-node");
            }}
            onSelectCable={(id) => {
              selectCable(id);
              setTab("edit-cable");
            }}
          />
        </TabsContent>

        <TabsContent value="edit-node" className="flex-1 min-h-0 m-0">
          {selectedNode && <NodeEditor node={selectedNode} />}
        </TabsContent>

        <TabsContent value="edit-cable" className="flex-1 min-h-0 m-0">
          {selectedCable && (
            <CableEditor cable={selectedCable} nodes={nodes} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NodeCableList({
  nodes,
  cables,
  provider,
  onSelectNode,
  onSelectCable,
}: {
  nodes: NetworkNode[];
  cables: Cable[];
  provider: ReturnType<typeof useNetworkStore.getState>["activeProvider"];
  onSelectNode: (id: string) => void;
  onSelectCable: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<NodeType | "all">("all");

  const filteredNodes = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return nodes
      .filter((n) => typeFilter === "all" || n.type === typeFilter)
      .filter((n) => !f || n.name.toLowerCase().includes(f) || (n.notes || "").toLowerCase().includes(f))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [nodes, filter, typeFilter]);

  const filteredCables = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return cables
      .filter((c) => !f || c.name.toLowerCase().includes(f))
      .map((c) => ({
        cable: c,
        from: nodeMap.get(c.fromNodeId),
        to: nodeMap.get(c.toNodeId),
      }))
      .sort((a, b) => a.cable.name.localeCompare(b.cable.name, undefined, { numeric: true }));
  }, [cables, nodes, filter]);

  if (!provider) return null;

  return (
    <ScrollArea className="h-full">
      <div className="px-3 pb-3 space-y-3">
        <Input
          placeholder="Cari nama / catatan..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 text-sm"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as NodeType | "all")}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Filter tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            {(["pop", "odc", "odp", "pole", "join"] as NodeType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {provider.naming[t]} ({NODE_TYPE_META[t].defaultLabel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            ELEMEN ({filteredNodes.length})
          </div>
          {filteredNodes.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 text-center border rounded">
              Belum ada elemen. Pilih tool di toolbar lalu klik peta.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNodes.map((n) => (
                <NodeRow
                  key={n.id}
                  node={n}
                  provider={provider}
                  onClick={() => onSelectNode(n.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            KABEL ({filteredCables.length})
          </div>
          {filteredCables.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 text-center border rounded">
              Belum ada kabel. Aktifkan tool &quot;{provider.naming.cable}&quot; lalu klik dua node.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCables.map(({ cable, from, to }) => (
                <CableRow
                  key={cable.id}
                  cable={cable}
                  fromName={from?.name || "?"}
                  toName={to?.name || "?"}
                  onClick={() => onSelectCable(cable.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function NodeRow({
  node,
  provider,
  onClick,
}: {
  node: NetworkNode;
  provider: NonNullable<ReturnType<typeof useNetworkStore.getState>["activeProvider"]>;
  onClick: () => void;
}) {
  const removeNode = useNetworkStore((s) => s.removeNode);
  const toggleNodeLock = useNetworkStore((s) => s.toggleNodeLock);
  const setTool = useNetworkStore((s) => s.setTool);
  const setMapView = useNetworkStore((s) => s.setMapView);

  function focus(e: React.MouseEvent) {
    e.stopPropagation();
    setMapView([node.lat, node.lng], 17);
    onClick();
  }

  const isLocked = !!node.locked;

  return (
    <div className="group flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer border border-transparent hover:border-border"
      onClick={focus}
    >
      <div
        className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative"
        style={{ backgroundColor: provider.colors[node.type] }}
        title={provider.naming[node.type]}
      >
        {NODE_TYPE_META[node.type].icon}
        {isLocked && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white">
            <Lock className="h-2 w-2" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate flex items-center gap-1">
          {node.name}
          {isLocked && (
            <Lock className="h-2.5 w-2.5 text-amber-600 flex-shrink-0" />
          )}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {provider.naming[node.type]} · {node.lat.toFixed(5)}, {node.lng.toFixed(5)}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className={`h-6 w-6 opacity-0 group-hover:opacity-100 ${
          isLocked
            ? "text-amber-600 hover:text-amber-700"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title={isLocked ? "Buka kunci posisi" : "Kunci posisi"}
        onClick={(e) => {
          e.stopPropagation();
          toggleNodeLock(node.id);
          toast.success(isLocked ? "Posisi dibuka" : "Posisi dikunci");
        }}
      >
        {isLocked ? (
          <Lock className="h-3 w-3" />
        ) : (
          <LockOpen className="h-3 w-3" />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          removeNode(node.id);
          toast.success("Elemen dihapus");
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function CableRow({
  cable,
  fromName,
  toName,
  onClick,
}: {
  cable: Cable;
  fromName: string;
  toName: string;
  onClick: () => void;
}) {
  const removeCable = useNetworkStore((s) => s.removeCable);
  return (
    <div
      className="group flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer border border-transparent hover:border-border"
      onClick={onClick}
    >
      <div
        className="h-1.5 w-6 rounded flex-shrink-0"
        style={{ backgroundColor: cable.color || "#0f766e" }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{cable.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {fromName} → {toName} · {CABLE_TYPE_META[cable.type].label}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          removeCable(cable.id);
          toast.success("Kabel dihapus");
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function NodeEditor({ node }: { node: NetworkNode }) {
  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const updateNode = useNetworkStore((s) => s.updateNode);
  const removeNode = useNetworkStore((s) => s.removeNode);
  const toggleNodeLock = useNetworkStore((s) => s.toggleNodeLock);
  const setMapView = useNetworkStore((s) => s.setMapView);
  const [draft, setDraft] = useState({ ...node });
  const [editing, setEditing] = useState(false);
  const [newPropKey, setNewPropKey] = useState("");
  const [newPropValue, setNewPropValue] = useState("");

  if (!activeProvider) return null;

  const isLocked = !!node.locked;

  function save() {
    updateNode(node.id, draft);
    setEditing(false);
    toast.success("Elemen disimpan");
  }

  function setField<K extends keyof NetworkNode>(key: K, value: NetworkNode[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-sm font-bold relative"
              style={{ backgroundColor: activeProvider.colors[node.type] }}
            >
              {NODE_TYPE_META[node.type].icon}
              {isLocked && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center border border-white">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {activeProvider.naming[node.type]}
            </Badge>
            {isLocked && (
              <Badge
                variant="outline"
                className="text-xs border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <Lock className="h-2.5 w-2.5 mr-1" />
                Terkunci
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={
                isLocked
                  ? "text-amber-600 hover:text-amber-700"
                  : "text-muted-foreground hover:text-foreground"
              }
              onClick={() => {
                toggleNodeLock(node.id);
                toast.success(isLocked ? "Posisi dibuka" : "Posisi dikunci");
              }}
              title={
                isLocked
                  ? "Buka kunci posisi (marker bisa di-drag lagi)"
                  : "Kunci posisi (marker tidak bisa di-drag)"
              }
            >
              {isLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMapView([node.lat, node.lng], 18);
              }}
              title="Pusatkan peta ke sini"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </Button>
            {!editing ? (
              <Button size="sm" variant="ghost" onClick={() => { setDraft({ ...node }); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={save}>
                <Save className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Hapus "${node.name}"?`)) removeNode(node.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Nama</Label>
          {editing ? (
            <Input
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          ) : (
            <div className="font-medium p-2 rounded border bg-muted/30">
              {node.name}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              Latitude
              {isLocked && <Lock className="h-2.5 w-2.5 text-amber-600" />}
            </Label>
            {editing ? (
              <Input
                type="number"
                step="0.000001"
                value={draft.lat}
                onChange={(e) => setField("lat", parseFloat(e.target.value) || 0)}
                disabled={isLocked}
                title={isLocked ? "Buka kunci dulu untuk mengubah koordinat" : undefined}
              />
            ) : (
              <div className="text-sm p-2 rounded border bg-muted/30">
                {node.lat.toFixed(6)}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              Longitude
              {isLocked && <Lock className="h-2.5 w-2.5 text-amber-600" />}
            </Label>
            {editing ? (
              <Input
                type="number"
                step="0.000001"
                value={draft.lng}
                onChange={(e) => setField("lng", parseFloat(e.target.value) || 0)}
                disabled={isLocked}
                title={isLocked ? "Buka kunci dulu untuk mengubah koordinat" : undefined}
              />
            ) : (
              <div className="text-sm p-2 rounded border bg-muted/30">
                {node.lng.toFixed(6)}
              </div>
            )}
          </div>
        </div>

        {/* Lock notice when editing locked node */}
        {editing && isLocked && (
          <div className="text-xs p-2 rounded border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div>
              Posisi (lat/lng) dikunci. Klik tombol gembok di atas untuk membuka
              agar bisa mengubah koordinat.
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Catatan</Label>
          {editing ? (
            <Textarea
              value={draft.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              rows={3}
            />
          ) : (
            <div className="text-sm p-2 rounded border bg-muted/30 min-h-[60px] whitespace-pre-wrap">
              {node.notes || <span className="text-muted-foreground italic">—</span>}
            </div>
          )}
        </div>

        {/* Properties key/value */}
        <div className="space-y-1">
          <Label className="text-xs">Properti (key/value)</Label>
          <div className="space-y-1">
            {Object.entries(editing ? draft.properties || {} : node.properties || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <Input
                  className="h-7 text-xs flex-1"
                  value={k}
                  disabled={!editing}
                  onChange={(e) => {
                    if (!editing) return;
                    const props = { ...(draft.properties || {}) };
                    delete props[k];
                    props[e.target.value] = v;
                    setField("properties", props);
                  }}
                />
                <Input
                  className="h-7 text-xs flex-1"
                  value={v}
                  disabled={!editing}
                  onChange={(e) => {
                    if (!editing) return;
                    setField("properties", {
                      ...(draft.properties || {}),
                      [k]: e.target.value,
                    });
                  }}
                />
                {editing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      const props = { ...(draft.properties || {}) };
                      delete props[k];
                      setField("properties", props);
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {editing && (
            <div className="flex items-center gap-1">
              <Input
                className="h-7 text-xs flex-1"
                placeholder="key"
                value={newPropKey}
                onChange={(e) => setNewPropKey(e.target.value)}
              />
              <Input
                className="h-7 text-xs flex-1"
                placeholder="value"
                value={newPropValue}
                onChange={(e) => setNewPropValue(e.target.value)}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  if (!newPropKey.trim()) return;
                  setField("properties", {
                    ...(draft.properties || {}),
                    [newPropKey.trim()]: newPropValue,
                  });
                  setNewPropKey("");
                  setNewPropValue("");
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Dibuat: {new Date(node.createdAt).toLocaleString("id-ID")}
          <br />
          Diperbarui: {new Date(node.updatedAt).toLocaleString("id-ID")}
        </div>
      </div>
    </ScrollArea>
  );
}

function CableEditor({ cable, nodes }: { cable: Cable; nodes: NetworkNode[] }) {
  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const updateCable = useNetworkStore((s) => s.updateCable);
  const removeCable = useNetworkStore((s) => s.removeCable);
  const [draft, setDraft] = useState({ ...cable });
  const [editing, setEditing] = useState(false);

  const fromNode = nodes.find((n) => n.id === cable.fromNodeId);
  const toNode = nodes.find((n) => n.id === cable.toNodeId);
  const length = fromNode && toNode
    ? Math.round(haversineMeters(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng))
    : null;

  if (!activeProvider) return null;

  function save() {
    updateCable(cable.id, draft);
    setEditing(false);
    toast.success("Kabel disimpan");
  }

  function setField<K extends keyof Cable>(key: K, value: Cable[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-12 rounded flex-shrink-0"
              style={{ backgroundColor: cable.color || activeProvider.colors.cable }}
            />
            <Badge variant="outline" className="text-xs">
              {CABLE_TYPE_META[cable.type].label}
            </Badge>
          </div>
          <div className="flex gap-1">
            {!editing ? (
              <Button size="sm" variant="ghost" onClick={() => { setDraft({ ...cable }); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={save}>
                <Save className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Hapus kabel "${cable.name}"?`)) removeCable(cable.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Nama</Label>
          {editing ? (
            <Input value={draft.name} onChange={(e) => setField("name", e.target.value)} />
          ) : (
            <div className="font-medium p-2 rounded border bg-muted/30">{cable.name}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Dari</Label>
            <div className="text-sm p-2 rounded border bg-muted/30 truncate">
              {fromNode?.name || "—"}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ke</Label>
            <div className="text-sm p-2 rounded border bg-muted/30 truncate">
              {toNode?.name || "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipe</Label>
            {editing ? (
              <Select
                value={draft.type}
                onValueChange={(v) => setField("type", v as CableType)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CABLE_TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm p-2 rounded border bg-muted/30">
                {CABLE_TYPE_META[cable.type].label}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jumlah Fiber</Label>
            {editing ? (
              <Input
                type="number"
                value={draft.fiberCount ?? ""}
                onChange={(e) =>
                  setField("fiberCount", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            ) : (
              <div className="text-sm p-2 rounded border bg-muted/30">
                {cable.fiberCount || "—"}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Warna</Label>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.color || "#0f766e"}
                onChange={(e) => setField("color", e.target.value)}
                className="h-8 w-12 rounded border"
              />
              <Input
                value={draft.color || ""}
                onChange={(e) => setField("color", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
              <div
                className="h-4 w-8 rounded"
                style={{ backgroundColor: cable.color || activeProvider.colors.cable }}
              />
              <span className="text-sm">{cable.color || activeProvider.colors.cable}</span>
            </div>
          )}
        </div>

        {length !== null && (
          <div className="text-xs p-2 rounded border bg-muted/30">
            Estimasi jarak garis lurus: <span className="font-semibold">{length} m</span>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Catatan</Label>
          {editing ? (
            <Textarea
              value={draft.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
            />
          ) : (
            <div className="text-sm p-2 rounded border bg-muted/30 min-h-[40px] whitespace-pre-wrap">
              {cable.notes || <span className="text-muted-foreground italic">—</span>}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
