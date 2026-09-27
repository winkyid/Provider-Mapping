// Type definitions for the network tagging app
// All data is stored locally in the browser; nothing is ever sent to OSM or any server.

export type NodeType = "odp" | "odc" | "pole" | "pop" | "join";

export interface ProviderNaming {
  /** Display name for ODP/FAT — optical distribution point / fiber access terminal */
  odp: string;
  /** Display name for ODC/FDT — optical distribution cabinet / fiber distribution terminal */
  odc: string;
  /** Display name for tiang / pole */
  pole: string;
  /** Display name for POP / server / OLT point */
  pop: string;
  /** Display name for splice closure / joint box */
  join: string;
  /** Display name for cable / kabel */
  cable: string;
}

export interface ProviderColors {
  odp: string;
  odc: string;
  pole: string;
  pop: string;
  join: string;
  cable: string;
}

export interface Provider {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string; // online image URL (not uploaded, just referenced)
  naming: ProviderNaming;
  colors: ProviderColors;
  createdAt: number;
  updatedAt: number;
  /** Timestamp terakhir kali node/kabel di provider ini diubah */
  dataModifiedAt: number;
}

export interface NetworkNode {
  id: string;
  providerId: string;
  type: NodeType;
  name: string;
  lat: number;
  lng: number;
  notes?: string;
  /** free-form key/value properties, e.g. capacity, port count, status */
  properties?: Record<string, string>;
  /** Jika true, marker tidak bisa di-drag di peta (mencegah geser tidak sengaja saat zoom) */
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CableType = "feeder" | "distribution" | "drop" | "backbone" | "other";

export interface Cable {
  id: string;
  providerId: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  type: CableType;
  color?: string;
  /** cable fiber count, e.g. 12, 24, 48 */
  fiberCount?: number;
  length?: number; // meters (auto-calculated or manual)
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProviderData {
  nodes: NetworkNode[];
  cables: Cable[];
}

// ---------- Account (JSON-based, privacy-first) ----------

export interface AccountProfile {
  /** Nama pemilik akun (bisa diubah kapan saja) */
  name: string;
  email?: string;
  notes?: string;
  avatarUrl?: string; // online image URL
  createdAt: number;
  /** Timestamp logout terakhir */
  lastLogoutAt?: number;
  /** Timestamp aktivitas terakhir (update otomatis) */
  lastActiveAt: number;
}

export interface Account {
  version: 1;
  id: string;
  profile: AccountProfile;
  providers: Provider[];
  /** Data per-provider, key = providerId */
  data: Record<string, ProviderData>;
  /** Timestamp perubahan terakhir pada akun ini */
  lastModifiedAt: number;
}

export interface ExportPayload {
  /** Legacy export payload (single provider). Dipertahankan untuk import lama. */
  version: 1;
  exportedAt: number;
  provider: Provider;
  data: ProviderData;
}

/** File JSON akun — format yang diunduh/diunggah pengguna */
export interface AccountFile {
  version: 1;
  account: Account;
  downloadedAt: number;
}

export const DEFAULT_NAMING: ProviderNaming = {
  odp: "ODP",
  odc: "ODC",
  pole: "Tiang",
  pop: "POP",
  join: "Joint",
  cable: "Kabel",
};

export const DEFAULT_COLORS: ProviderColors = {
  odp: "#16a34a", // green
  odc: "#ea580c", // orange
  pole: "#7c3aed", // violet
  pop: "#dc2626", // red
  join: "#0891b2", // cyan
  cable: "#0f766e", // teal
};

export const NODE_TYPE_META: Record<
  NodeType,
  { icon: string; defaultLabel: string; description: string }
> = {
  odp: {
    icon: "▣",
    defaultLabel: "ODP/FAT",
    description: "Optical Distribution Point / Fiber Access Terminal — titik distribusi pelanggan",
  },
  odc: {
    icon: "▤",
    defaultLabel: "ODC/FDT",
    description: "Optical Distribution Cabinet / Fiber Distribution Terminal — kabinet distribusi",
  },
  pole: {
    icon: "│",
    defaultLabel: "Tiang",
    description: "Tiang / Pole — penyangga kabel aerial",
  },
  pop: {
    icon: "★",
    defaultLabel: "POP/OLT",
    description: "Point of Presence / OLT — sumber jaringan",
  },
  join: {
    icon: "○",
    defaultLabel: "Joint",
    description: "Splice Closure / Joint Box — sambungan kabel",
  },
};

export const CABLE_TYPE_META: Record<CableType, { label: string; description: string }> = {
  feeder: { label: "Feeder", description: "Kabel dari OLT/POP ke ODC" },
  distribution: { label: "Distribusi", description: "Kabel dari ODC ke ODP" },
  drop: { label: "Drop", description: "Kabel dari ODP ke rumah pelanggan" },
  backbone: { label: "Backbone", description: "Kabel tulang punggung antar-POP" },
  other: { label: "Lainnya", description: "Jenis kabel lain" },
};
