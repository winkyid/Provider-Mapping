"use client";

import { useState, useRef } from "react";
import { useNetworkStore } from "@/stores/networkStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  UserPlus,
  Upload,
  FileJson,
  Map as MapIcon,
  ArrowRight,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface AuthScreenProps {
  hasLegacy: boolean;
  onMigrateLegacy: () => void;
}

export default function AuthScreen({
  hasLegacy,
  onMigrateLegacy,
}: AuthScreenProps) {
  const createAccount = useNetworkStore((s) => s.createAccount);
  const uploadAccount = useNetworkStore((s) => s.uploadAccount);
  const migrateLegacy = useNetworkStore((s) => s.migrateLegacy);

  const [mode, setMode] = useState<"home" | "create" | "upload">("home");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleCreateSubmit() {
    if (!name.trim()) {
      toast.error("Nama akun wajib diisi");
      return;
    }
    createAccount({ name, email, notes, avatarUrl });
    toast.success(`Akun "${name}" dibuat. Selamat datang!`);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        uploadAccount(reader.result as string);
        toast.success("Akun berhasil dimuat dari file JSON");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal memuat file akun"
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleMigrate() {
    migrateLegacy();
    onMigrateLegacy();
    toast.success("Data lama berhasil dimigrasikan ke akun baru");
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-emerald-950/30 dark:via-background dark:to-cyan-950/30 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-600 text-white shadow-lg mb-4">
            <MapIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Network Tagging
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tagging infrastruktur jaringan (ODP/FAT, ODC/FDT, Tiang, Kabel)
            berbasis OpenStreetMap — privasi penuh tanpa server.
          </p>
        </div>

        {mode === "home" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create new account */}
              <Card className="border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group" onClick={() => setMode("create")}>
                <CardContent className="p-6 flex flex-col items-start">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold">Buat Akun Baru</h2>
                  <p className="text-sm text-muted-foreground mt-1 flex-1">
                    Mulai dari nol. Buat akun JSON kosong, lalu tambahkan
                    provider dan elemen jaringan Anda.
                  </p>
                  <div className="flex items-center gap-1 text-sm text-emerald-700 mt-3 font-medium">
                    Mulai <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>

              {/* Upload existing account */}
              <Card className="border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer group" onClick={() => setMode("upload")}>
                <CardContent className="p-6 flex flex-col items-start">
                  <div className="h-12 w-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold">Upload Akun JSON</h2>
                  <p className="text-sm text-muted-foreground mt-1 flex-1">
                    Sudah punya file akun JSON dari perangkat lain? Unggah di
                    sini untuk melanjutkan kerja Anda.
                  </p>
                  <div className="flex items-center gap-1 text-sm text-cyan-700 mt-3 font-medium">
                    Pilih file <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Legacy migration warning */}
            {hasLegacy && (
              <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-amber-900 dark:text-amber-200">
                      Data lama terdeteksi
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                      Ditemukan provider & elemen dari versi sebelumnya. Anda
                      bisa memigrasikannya ke akun baru agar tidak hilang.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
                      onClick={handleMigrate}
                    >
                      <FileJson className="h-3.5 w-3.5" /> Migrasi ke Akun Baru
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy notice */}
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong className="font-semibold">Privasi penuh.</strong>{" "}
                  Akun Anda disimpan sebagai satu file JSON di perangkat ini
                  (localStorage). Website tidak menyimpan data apa pun di
                  server. Tidak ada akun cloud, tidak ada sinkronisasi online.
                  Gunakan tombol <em>Download Akun</em> di profil untuk
                  memindahkan data antar perangkat.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "create" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Buat Akun Baru</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Isi informasi dasar. Semua bisa diubah nanti lewat profil.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="a-name">Nama *</Label>
                  <Input
                    id="a-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth: Andi Pratama"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-email">Email (opsional)</Label>
                  <Input
                    id="a-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="andi@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="a-avatar">URL Avatar (opsional)</Label>
                <Input
                  id="a-avatar"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://.../avatar.png"
                />
                {avatarUrl && (
                  <div className="flex items-center gap-2 mt-1">
                    <img
                      src={avatarUrl}
                      alt="avatar preview"
                      className="h-10 w-10 rounded-full object-cover border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          "0.3";
                      }}
                    />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Preview dari URL online
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="a-notes">Catatan (opsional)</Label>
                <Textarea
                  id="a-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan tentang akun / tim / wilayah kerja"
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900">
                <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  Akun ini akan disimpan di browser ini saja. Anda bisa
                  mengunduhnya sebagai JSON kapan saja lewat menu profil.
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setMode("home")}>
                  Kembali
                </Button>
                <Button onClick={handleCreateSubmit}>
                  <UserPlus className="h-4 w-4" /> Buat Akun
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "upload" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Upload Akun JSON</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pilih file JSON akun yang sebelumnya Anda unduh dari aplikasi
                  ini.
                </p>
              </div>

              <div
                className="border-2 border-dashed border-cyan-300 rounded-lg p-8 text-center cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-950/20 transition-colors"
                onClick={handleUploadClick}
              >
                <Upload className="h-10 w-10 mx-auto text-cyan-600 mb-2" />
                <div className="text-sm font-medium">
                  Klik untuk pilih file JSON
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  File akan menggantikan akun aktif (jika ada)
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex items-start gap-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  Upload akan <strong>menimpa</strong> akun yang sedang aktif di
                  browser ini. Pastikan Anda sudah mengunduh akun lama jika
                  masih dibutuhkan.
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setMode("home")}>
                  Kembali
                </Button>
                <Button onClick={handleUploadClick}>
                  <Upload className="h-4 w-4" /> Pilih File JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Re-export Dialog for parent
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription };
