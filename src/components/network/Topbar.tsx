"use client";

import { useState, useRef } from "react";
import { useNetworkStore } from "@/stores/networkStore";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  User,
  Globe,
  Download,
  Upload,
  ShieldCheck,
  Info,
  PanelRight,
  Layers,
  ChevronDown,
} from "lucide-react";
import ProviderManager from "./ProviderManager";
import ProfileSheet from "./ProfileSheet";
import {
  exportProviderFromAccount,
  importLegacyPayloadIntoAccount,
} from "@/lib/storage";
import { toast } from "sonner";
import type { ExportPayload } from "@/lib/types";

interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenProviderManager: () => void;
}

export default function Topbar({
  sidebarOpen,
  onToggleSidebar,
  onOpenProviderManager,
}: TopbarProps) {
  const account = useNetworkStore((s) => s.account);
  const activeProvider = useNetworkStore((s) => s.activeProvider);
  const [infoOpen, setInfoOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleExport() {
    if (!account || !activeProvider) return;
    try {
      const payload = exportProviderFromAccount(account, activeProvider.id);
      // download single-provider JSON (legacy format, useful for sharing)
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = activeProvider.name.replace(/[^a-zA-Z0-9-_]/g, "_");
      a.download = `provider-${safeName}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Provider diekspor sebagai JSON");
    } catch (e) {
      toast.error("Gagal ekspor provider");
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string) as ExportPayload;
        importLegacyPayloadIntoAccount(account, payload);
        // reload account from store
        useNetworkStore.setState({ account: JSON.parse(JSON.stringify(account)) });
        toast.success(
          `Provider "${payload.provider.name}" diimpor ke akun Anda`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal mengimpor file provider"
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!account || !activeProvider) return null;

  return (
    <>
      <div
        className="pointer-events-auto flex items-center gap-1 p-1 rounded-lg bg-card/95 backdrop-blur border shadow-lg overflow-x-auto max-w-[calc(100vw-1rem)]"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          touchAction: "pan-x",
        }}
      >
        {/* Profile button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 flex-shrink-0"
          onClick={() => setProfileOpen(true)}
        >
          <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center overflow-hidden flex-shrink-0">
            {account.profile.avatarUrl ? (
              <img
                src={account.profile.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <User className="h-3.5 w-3.5 text-emerald-600" />
            )}
          </div>
          <span className="font-medium text-sm max-w-[80px] sm:max-w-[100px] truncate hidden xs:inline sm:inline">
            {account.profile.name}
          </span>
        </Button>

        <div className="h-5 w-px bg-border flex-shrink-0" />

        {/* Provider switcher button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={onOpenProviderManager}
        >
          {activeProvider.logoUrl ? (
            <img
              src={activeProvider.logoUrl}
              alt=""
              className="h-4 w-4 rounded object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-4 w-4 text-emerald-600" />
          )}
          <span className="font-semibold text-sm max-w-[90px] sm:max-w-[110px] truncate">
            {activeProvider.name}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </Button>

        <div className="h-5 w-px bg-border flex-shrink-0" />

        {/* Export provider — hidden on mobile (accessible via profile) */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs flex-shrink-0 hidden sm:flex"
                onClick={handleExport}
                disabled={
                  !activeProvider ||
                  (account.data[activeProvider.id]?.nodes?.length || 0) === 0 &&
                  (account.data[activeProvider.id]?.cables?.length || 0) === 0
                }
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Provider</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Ekspor provider aktif sebagai JSON (untuk sharing)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Import provider — hidden on mobile */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs flex-shrink-0 hidden sm:flex"
                onClick={handleImportClick}
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Provider</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Impor provider dari file JSON</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />

        <div className="h-5 w-px bg-border" />

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInfoOpen(true)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tentang aplikasi & privasi</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={sidebarOpen ? "default" : "ghost"}
                size="sm"
                onClick={onToggleSidebar}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarOpen ? "Sembunyikan panel" : "Tampilkan panel"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ProviderManager open={false} onOpenChange={() => {}} />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Tentang Aplikasi
            </SheetTitle>
            <SheetDescription>
              Network Tagging berbasis OpenStreetMap — privasi penuh untuk dokumentasi jaringan provider.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4 text-sm">
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-medium mb-1">
                <ShieldCheck className="h-4 w-4" /> Privasi Penuh
              </div>
              <p className="text-xs leading-relaxed">
                Akun dan semua data jaringan disimpan sebagai file JSON di
                browser ini (localStorage). Website tidak menyimpan apa pun di
                server. Tidak ada akun cloud, tidak ada sinkronisasi online.
                Gunakan menu <strong>Profil → Download</strong> untuk
                memindahkan data antar perangkat.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Cara Pakai</h3>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                <li>
                  Buat akun baru atau upload file JSON akun yang sudah ada.
                </li>
                <li>
                  Di dalam akun, tambah/pilih provider (ODP/FAT, ODC/FDT, dll).
                </li>
                <li>
                  Pilih tool di toolbar (POP, ODC, ODP, Tiang, Joint, atau
                  Kabel).
                </li>
                <li>Klik peta untuk menempatkan elemen.</li>
                <li>Untuk kabel: klik node asal lalu node tujuan.</li>
                <li>Drag marker untuk menggeser posisi.</li>
                <li>
                  Klik elemen untuk edit nama, properti, dan catatan di panel
                  kanan.
                </li>
                <li>
                  Selesai? Buka <strong>Profil → Download</strong> untuk
                  backup, atau <strong>Logout</strong> (otomatis download +
                  hapus dari browser).
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Sistem Akun JSON</h3>
              <p className="text-xs text-muted-foreground">
                Akun = 1 file JSON berisi: profil, semua provider, semua node,
                semua kabel, dan timestamp. File ini adalah sumber data
                sebenarnya. Browser hanya sebagai tempat editing sementara.
                Bawa file JSON ke perangkat mana pun untuk melanjutkan.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Timestamp</h3>
              <p className="text-xs text-muted-foreground">
                Setiap perubahan (node, kabel, provider) otomatis mencatat{" "}
                <code>waktu</code>. Lihat di Profil → Detail per Provider untuk
                mengetahui kapan terakhir setiap provider dimodifikasi.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
