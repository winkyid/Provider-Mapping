"use client";

import { useState } from "react";
import { useNetworkStore } from "@/stores/networkStore";
import {
  PROVIDER_PRESETS,
  type ProviderPreset,
} from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_NAMING, DEFAULT_COLORS } from "@/lib/types";
import type { Provider, ProviderColors } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Globe,
  Image as ImageIcon,
  ShieldCheck,
  ArrowRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface ProviderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** when true, the user can't dismiss without selecting a provider */
  forceSelect?: boolean;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID");
}

export default function ProviderManager({
  open,
  onOpenChange,
  forceSelect,
}: ProviderManagerProps) {
  const account = useNetworkStore((s) => s.account);
  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const selectProvider = useNetworkStore((s) => s.selectProvider);
  const createNewProvider = useNetworkStore((s) => s.createNewProvider);
  const deleteProvider = useNetworkStore((s) => s.deleteProvider);
  const updateProvider = useNetworkStore((s) => s.updateProvider);

  const providers = account?.providers || [];

  const [tab, setTab] = useState<"existing" | "create">("existing");
  // Derived default — when there are no providers, force "create" tab.
  const effectiveTab =
    tab === "existing" && providers.length === 0 ? "create" : tab;

  // Creation form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [naming, setNaming] = useState({ ...DEFAULT_NAMING });
  const [colors, setColors] = useState<ProviderColors>({ ...DEFAULT_COLORS });
  const [presetIdx, setPresetIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function applyPreset(idx: number) {
    const preset: ProviderPreset = PROVIDER_PRESETS[idx];
    setPresetIdx(idx);
    setName((prev) => prev || preset.name);
    setNaming({ ...DEFAULT_NAMING, ...preset.naming });
  }

  function resetForm() {
    setName("");
    setDescription("");
    setLogoUrl("");
    setNaming({ ...DEFAULT_NAMING });
    setColors({ ...DEFAULT_COLORS });
    setPresetIdx(null);
    setEditingId(null);
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Nama provider wajib diisi");
      return;
    }
    const provider = createNewProvider(name, naming, {
      description,
      logoUrl,
      colors,
    });
    toast.success(`Provider "${provider.name}" dibuat`);
    resetForm();
    onOpenChange(false);
  }

  function handleSelect(id: string) {
    selectProvider(id);
    toast.success("Provider aktif diganti");
    onOpenChange(false);
  }

  function handleDelete(id: string, pName: string) {
    if (
      !confirm(
        `Hapus provider "${pName}" beserta semua node & kabelnya? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    deleteProvider(id);
    toast.success("Provider dihapus");
  }

  function startEdit(p: Provider) {
    setEditingId(p.id);
    setTab("create");
    setName(p.name);
    setDescription(p.description || "");
    setLogoUrl(p.logoUrl || "");
    setNaming({ ...DEFAULT_NAMING, ...p.naming });
    setColors({ ...DEFAULT_COLORS, ...p.colors });
    setPresetIdx(null);
  }

  function handleSaveEdit() {
    if (!editingId) return handleCreate();
    const existing = providers.find((p) => p.id === editingId);
    if (!existing) return;
    if (!name.trim()) {
      toast.error("Nama provider wajib diisi");
      return;
    }
    updateProvider({
      ...existing,
      name: name.trim(),
      description: description.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      naming,
      colors,
    });
    toast.success("Perubahan disimpan");
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (forceSelect && activeProvider) onOpenChange(v);
        else if (!forceSelect) onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (forceSelect && !activeProvider) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (forceSelect && !activeProvider) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5 text-emerald-600" />
            Pilih atau Buat Provider
          </DialogTitle>
          <DialogDescription>
            Setiap provider punya penamaan sendiri (ODP/FAT, ODC/FDT, dst).
            Pilih salah satu untuk mulai tagging, atau buat baru. Data Anda
            hanya tersimpan di browser ini.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={effectiveTab}
          onValueChange={(v) => setTab(v as typeof tab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" disabled={providers.length === 0}>
              Provider Tersimpan ({providers.length})
            </TabsTrigger>
            <TabsTrigger value="create">
              {editingId ? "Edit Provider" : "Buat Baru"}
            </TabsTrigger>
          </TabsList>

          {/* Existing providers list */}
          <TabsContent value="existing" className="space-y-3 mt-4">
            {providers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Belum ada provider. Pindah ke tab &quot;Buat Baru&quot; untuk
                  membuat provider pertama Anda.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {providers.map((p) => {
                  const data = account?.data?.[p.id];
                  return (
                    <ProviderRow
                      key={p.id}
                      provider={p}
                      isActive={activeProvider?.id === p.id}
                      stats={{
                        nodes: data?.nodes?.length || 0,
                        cables: data?.cables?.length || 0,
                      }}
                      onSelect={() => handleSelect(p.id)}
                      onEdit={() => startEdit(p)}
                      onDelete={() => handleDelete(p.id, p.name)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Create / edit form */}
          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Preset picker */}
            <div>
              <Label className="text-xs text-muted-foreground">
                Mulai dari preset (opsional)
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROVIDER_PRESETS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(idx)}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                      presetIdx === idx
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-background hover:bg-accent border-border"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Nama Provider</Label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth: Telkom / Indihome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-logo">URL Logo (online image URL)</Label>
                <Input
                  id="p-logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://...logo.png"
                  type="url"
                />
              </div>
            </div>

            {logoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                <img
                  src={logoUrl}
                  alt="logo preview"
                  className="h-12 w-12 rounded object-contain bg-white border"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Preview logo dari URL online
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="p-desc">Deskripsi (opsional)</Label>
              <Textarea
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Catatan singkat tentang provider ini"
              />
            </div>

            {/* Naming editor */}
            <div>
              <Label className="text-xs text-muted-foreground">
                Penamaan elemen jaringan
              </Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {(
                  [
                    ["pop", "POP / OLT"],
                    ["odc", "ODC / FDT"],
                    ["odp", "ODP / FAT"],
                    ["pole", "Tiang / Pole"],
                    ["join", "Joint / Closure"],
                    ["cable", "Kabel / Cable"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={naming[key]}
                      onChange={(e) =>
                        setNaming((n) => ({ ...n, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Color configuration per element type */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Warna elemen (global per provider)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setColors({ ...DEFAULT_COLORS })}
                >
                  Reset Warna
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {(
                  [
                    ["pop", "POP / OLT"],
                    ["odc", "ODC / FDT"],
                    ["odp", "ODP / FAT"],
                    ["pole", "Tiang / Pole"],
                    ["join", "Joint / Closure"],
                    ["cable", "Kabel / Cable"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors[key]}
                        onChange={(e) =>
                          setColors((c) => ({ ...c, [key]: e.target.value }))
                        }
                        className="h-8 w-10 rounded border cursor-pointer flex-shrink-0"
                        aria-label={`Warna ${label}`}
                      />
                      <Input
                        value={colors[key]}
                        onChange={(e) =>
                          setColors((c) => ({
                            ...c,
                            [key]: e.target.value,
                          }))
                        }
                        className="h-8 text-xs flex-1 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Live preview of marker colors */}
              <div className="mt-2 flex items-center gap-2 p-2 rounded border bg-muted/30">
                <span className="text-[10px] text-muted-foreground mr-1">
                  Preview:
                </span>
                {(["pop", "odc", "odp", "pole", "join"] as const).map((t) => (
                  <div
                    key={t}
                    className="h-5 w-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: colors[t] }}
                    title={naming[t]}
                  />
                ))}
                <div
                  className="h-1 w-8 rounded flex-shrink-0 ml-1"
                  style={{ backgroundColor: colors.cable }}
                  title="Kabel"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900">
              <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                Semua data provider dan elemen jaringan disimpan 100% di browser
                ini (localStorage). Tidak ada akun, tidak ada server, tidak ada
                yang dikirim ke OpenStreetMap atau pihak lain.
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          {effectiveTab === "create" ? (
            <>
              {editingId && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setTab("existing");
                  }}
                >
                  Batal Edit
                </Button>
              )}
              <Button onClick={editingId ? handleSaveEdit : handleCreate}>
                {editingId ? (
                  <>
                    <Check className="h-4 w-4" /> Simpan Perubahan
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Buat &amp; Aktifkan
                  </>
                )}
              </Button>
            </>
          ) : (
            !forceSelect && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Tutup
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProviderRow({
  provider,
  isActive,
  stats,
  onSelect,
  onEdit,
  onDelete,
}: {
  provider: Provider;
  isActive: boolean;
  stats?: { nodes: number; cables: number };
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={
        isActive
          ? "border-emerald-500 ring-1 ring-emerald-500"
          : undefined
      }
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded flex items-center justify-center bg-muted border overflow-hidden flex-shrink-0">
          {provider.logoUrl ? (
            <img
              src={provider.logoUrl}
              alt={provider.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{provider.name}</span>
            {isActive && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs">
                Aktif
              </Badge>
            )}
          </div>
          {provider.description && (
            <div className="text-xs text-muted-foreground truncate">
              {provider.description}
            </div>
          )}
          <div className="flex flex-wrap gap-1 mt-1 items-center">
            <Badge variant="outline" className="text-xs font-normal">
              {provider.naming.odc}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {provider.naming.odp}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {provider.naming.pole}
            </Badge>
            {stats && (
              <span className="text-[10px] text-muted-foreground ml-1">
                · {stats.nodes} elemen · {stats.cables} kabel
              </span>
            )}
            <span
              className="text-[10px] text-muted-foreground flex items-center gap-0.5"
              title={`Terakhir diubah: ${new Date(provider.dataModifiedAt).toLocaleString("id-ID")}`}
            >
              <Clock className="h-2.5 w-2.5" /> {formatTimeAgo(provider.dataModifiedAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-1">
          <Button
            size="sm"
            variant={isActive ? "secondary" : "default"}
            onClick={onSelect}
            disabled={isActive}
          >
            {isActive ? (
              "Aktif"
            ) : (
              <>
                Pilih <ArrowRight className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            title="Hapus"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
