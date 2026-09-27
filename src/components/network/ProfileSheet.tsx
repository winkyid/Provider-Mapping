"use client";

import { useState } from "react";
import { useNetworkStore } from "@/stores/networkStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Download,
  LogOut,
  Save,
  Pencil,
  Image as ImageIcon,
  ShieldCheck,
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Account } from "@/lib/types";

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ts: number | undefined): string {
  if (!ts) return "belum pernah";
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  return `${Math.floor(mo / 12)} tahun lalu`;
}

export default function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const account = useNetworkStore((s) => s.account);
  const updateProfile = useNetworkStore((s) => s.updateProfile);
  const downloadAccount = useNetworkStore((s) => s.downloadAccount);
  const logout = useNetworkStore((s) => s.logout);

  const [editing, setEditing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  // Reset draft whenever account/open changes — derived instead of effect.
  const draftKey = `${account?.id}-${account?.profile.name}-${account?.profile.email}-${account?.profile.notes}-${account?.profile.avatarUrl}-${open}`;
  const [draftVersion, setDraftVersion] = useState(draftKey);
  const [draft, setDraft] = useState({
    name: account?.profile.name || "",
    email: account?.profile.email || "",
    notes: account?.profile.notes || "",
    avatarUrl: account?.profile.avatarUrl || "",
  });
  // If the underlying account changed (e.g. opened sheet), reset draft.
  if (draftVersion !== draftKey && account) {
    setDraftVersion(draftKey);
    setDraft({
      name: account.profile.name,
      email: account.profile.email || "",
      notes: account.profile.notes || "",
      avatarUrl: account.profile.avatarUrl || "",
    });
    setEditing(false);
    setConfirmLogout(false);
  }

  if (!account) return null;

  function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    updateProfile({
      name: draft.name,
      email: draft.email || undefined,
      notes: draft.notes || undefined,
      avatarUrl: draft.avatarUrl || undefined,
    });
    setEditing(false);
    toast.success("Profil diperbarui");
  }

  function handleDownload() {
    downloadAccount();
    toast.success("File JSON akun diunduh");
  }

  function handleLogout() {
    if (!confirmLogout) {
      setConfirmLogout(true);
      return;
    }
    // Download FIRST (while account is still in store), THEN logout
    const account = useNetworkStore.getState().account;
    if (account) {
      downloadAccount();
    }
    logout();
    toast.success("Anda keluar. File JSON akun otomatis diunduh.");
    onOpenChange(false);
  }

  const profile = account.profile;
  const totalNodes = Object.values(account.data).reduce(
    (sum, d) => sum + (d?.nodes?.length || 0),
    0
  );
  const totalCables = Object.values(account.data).reduce(
    (sum, d) => sum + (d?.cables?.length || 0),
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            Profil Akun
          </SheetTitle>
          <SheetDescription>
            Kelola profil, unduh JSON akun, atau keluar. Semua data tetap di
            perangkat ini.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="h-14 w-14 rounded-full bg-background border flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{profile.name}</div>
              {profile.email && (
                <div className="text-xs text-muted-foreground truncate">
                  {profile.email}
                </div>
              )}
              <Badge variant="outline" className="mt-1 text-xs">
                ID: {account.id.slice(0, 8)}
              </Badge>
            </div>
            {!editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Editable form */}
          {editing ? (
            <div className="space-y-3 p-3 rounded-lg border">
              <div className="space-y-1.5">
                <Label htmlFor="p-name" className="text-xs">Nama *</Label>
                <Input
                  id="p-name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email" className="text-xs">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-avatar" className="text-xs">URL Avatar</Label>
                <Input
                  id="p-avatar"
                  type="url"
                  value={draft.avatarUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, avatarUrl: e.target.value }))
                  }
                />
                {draft.avatarUrl && (
                  <div className="flex items-center gap-2 mt-1">
                    <img
                      src={draft.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          "0.3";
                      }}
                    />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Preview
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-notes" className="text-xs">Catatan</Label>
                <Textarea
                  id="p-notes"
                  value={draft.notes}
                  rows={2}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setDraft({
                      name: profile.name,
                      email: profile.email || "",
                      notes: profile.notes || "",
                      avatarUrl: profile.avatarUrl || "",
                    });
                  }}
                >
                  Batal
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5" /> Simpan
                </Button>
              </div>
            </div>
          ) : (
            <>
              {profile.notes && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Catatan
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {profile.notes}
                  </div>
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Riwayat Akun
            </h3>
            <TimestampRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Dibuat"
              value={formatDate(profile.createdAt)}
              hint={timeAgo(profile.createdAt)}
            />
            <TimestampRow
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Aktivitas terakhir"
              value={formatDate(profile.lastActiveAt)}
              hint={timeAgo(profile.lastActiveAt)}
            />
            <TimestampRow
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Logout terakhir"
              value={formatDate(profile.lastLogoutAt)}
              hint={timeAgo(profile.lastLogoutAt)}
            />
            <TimestampRow
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Akun dimodifikasi"
              value={formatDate(account.lastModifiedAt)}
              hint={timeAgo(account.lastModifiedAt)}
            />
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Provider"
              value={account.providers.length}
              color="text-emerald-600"
            />
            <StatCard
              label="Elemen"
              value={totalNodes}
              color="text-orange-600"
            />
            <StatCard
              label="Kabel"
              value={totalCables}
              color="text-teal-600"
            />
          </div>

          {/* Per-provider breakdown */}
          {account.providers.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Detail per Provider
              </h3>
              <div className="space-y-1">
                {account.providers.map((p) => {
                  const data = account.data[p.id];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded border bg-background text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.colors.cable }}
                        />
                        <span className="font-medium truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground flex-shrink-0">
                        <span>{data?.nodes?.length || 0} elemen</span>
                        <span>{data?.cables?.length || 0} kabel</span>
                        <span
                          className="text-[10px]"
                          title={`Dimodifikasi: ${formatDate(p.dataModifiedAt)}`}
                        >
                          {timeAgo(p.dataModifiedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Privacy notice */}
          <div className="flex items-start gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900">
            <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              Data akun hanya ada di browser ini. <strong>Download</strong>{" "}
              untuk backup atau pindah perangkat. <strong>Logout</strong> akan
              menghapus data dari browser ini (file JSON otomatis diunduh
              terlebih dahulu).
            </div>
          </div>

          {/* Actions */}
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" /> Download Akun JSON
            </Button>

            {confirmLogout ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    Logout akan menghapus semua data dari browser ini. File
                    JSON akan otomatis diunduh sebagai backup. Lanjutkan?
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmLogout(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" /> Ya, Logout
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmLogout(true)}
              >
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            )}
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TimestampRow({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground flex-1">{label}</span>
      <div className="text-right">
        <div className="font-medium text-xs">{value}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}
