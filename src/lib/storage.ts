// Account-based storage layer — privacy-first, no server, no OSM submission.
// Semua data akun disimpan di localStorage browser ini saja.
// JSON file adalah sumber data sebenarnya; localStorage hanya working copy saat login.

import {
  Account,
  AccountFile,
  AccountProfile,
  Provider,
  ProviderData,
  NetworkNode,
  Cable,
  ExportPayload,
  DEFAULT_NAMING,
  DEFAULT_COLORS,
} from "./types";

const KEYS = {
  account: "osm-net:account", // active account JSON (working copy)
  // Legacy keys (untuk migrasi)
  legacyProviders: "osm-net:providers",
  legacyActiveProviderId: "osm-net:active-provider",
  legacyDataPrefix: "osm-net:data:",
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ============ Account: load / save / clear ============

export function loadAccount(): Account | null {
  if (typeof window === "undefined") return null;
  return safeParse<Account | null>(localStorage.getItem(KEYS.account), null);
}

export function saveAccount(account: Account): void {
  account.lastModifiedAt = Date.now();
  account.profile.lastActiveAt = account.lastModifiedAt;
  localStorage.setItem(KEYS.account, JSON.stringify(account));
}

export function clearAccount(): void {
  localStorage.removeItem(KEYS.account);
}

export function isAccountExists(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEYS.account) !== null;
}

// ============ Account: create / import / export ============

export function createAccount(profile: {
  name: string;
  email?: string;
  notes?: string;
  avatarUrl?: string;
}): Account {
  const now = Date.now();
  const account: Account = {
    version: 1,
    id: crypto.randomUUID(),
    profile: {
      name: profile.name.trim() || "Pengguna Tanpa Nama",
      email: profile.email?.trim() || undefined,
      notes: profile.notes?.trim() || undefined,
      avatarUrl: profile.avatarUrl?.trim() || undefined,
      createdAt: now,
      lastActiveAt: now,
    },
    providers: [],
    data: {},
    lastModifiedAt: now,
  };
  saveAccount(account);
  return account;
}

export function updateAccountProfile(
  account: Account,
  patch: Partial<AccountProfile>
): Account {
  account.profile = { ...account.profile, ...patch };
  saveAccount(account);
  return account;
}

export function downloadAccountFile(account: Account): void {
  const file: AccountFile = {
    version: 1,
    account,
    downloadedAt: Date.now(),
  };
  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = account.profile.name.replace(/[^a-zA-Z0-9-_]/g, "_");
  a.download = `akun-${safeName}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAccountFile(jsonText: string): Account {
  const parsed = JSON.parse(jsonText) as AccountFile | Account;
  // Support both {account: {...}} wrapper and bare Account
  const account: Account =
    "account" in parsed && parsed.account
      ? (parsed as AccountFile).account
      : (parsed as Account);
  if (!account || account.version !== 1 || !account.profile) {
    throw new Error("File JSON akun tidak valid");
  }
  // Ensure required fields exist (defensive)
  if (!Array.isArray(account.providers)) account.providers = [];
  if (!account.data || typeof account.data !== "object") account.data = {};
  // Migration: ensure each node has `locked` field (default false for old data)
  for (const p of account.providers) {
    if (!p.dataModifiedAt) p.dataModifiedAt = p.updatedAt || p.createdAt;
    const d = account.data[p.id];
    if (d && Array.isArray(d.nodes)) {
      d.nodes = d.nodes.map((n) =>
        n.locked === undefined ? { ...n, locked: false } : n
      );
    }
  }
  return account;
}

export function importAccountFile(jsonText: string): Account {
  const account = parseAccountFile(jsonText);
  // Generate new ID to avoid collision if user imports multiple times
  account.id = crypto.randomUUID();
  account.profile.createdAt = account.profile.createdAt || Date.now();
  account.profile.lastActiveAt = Date.now();
  account.lastModifiedAt = Date.now();
  saveAccount(account);
  return account;
}

/** Logout: update lastLogoutAt, save, then clear localStorage */
export function logoutAccount(): Account | null {
  const account = loadAccount();
  if (!account) return null;
  account.profile.lastLogoutAt = Date.now();
  account.profile.lastActiveAt = account.profile.lastLogoutAt;
  account.lastModifiedAt = account.profile.lastLogoutAt;
  // Save once more so the downloaded JSON reflects logout time
  localStorage.setItem(KEYS.account, JSON.stringify(account));
  const finalAccount = account;
  clearAccount();
  return finalAccount;
}

// ============ Account: provider operations ============

export function listAccountProviders(account: Account): Provider[] {
  return account.providers;
}

export function getAccountProvider(
  account: Account,
  providerId: string
): Provider | undefined {
  return account.providers.find((p) => p.id === providerId);
}

export function addAccountProvider(
  account: Account,
  provider: Provider
): Account {
  account.providers.push(provider);
  account.data[provider.id] = { nodes: [], cables: [] };
  saveAccount(account);
  return account;
}

export function updateAccountProvider(
  account: Account,
  provider: Provider
): Account {
  const idx = account.providers.findIndex((p) => p.id === provider.id);
  if (idx >= 0) account.providers[idx] = provider;
  saveAccount(account);
  return account;
}

export function deleteAccountProvider(
  account: Account,
  providerId: string
): Account {
  account.providers = account.providers.filter((p) => p.id !== providerId);
  delete account.data[providerId];
  saveAccount(account);
  return account;
}

export function getAccountProviderData(
  account: Account,
  providerId: string
): ProviderData {
  return account.data[providerId] || { nodes: [], cables: [] };
}

export function setAccountProviderData(
  account: Account,
  providerId: string,
  data: ProviderData
): Account {
  account.data[providerId] = data;
  // Update provider's dataModifiedAt
  const provider = account.providers.find((p) => p.id === providerId);
  if (provider) provider.dataModifiedAt = Date.now();
  saveAccount(account);
  return account;
}

// ============ Provider factory ============

export interface ProviderPreset {
  name: string;
  naming: Partial<Provider["naming"]>;
  description: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: "Telkom / Indihome",
    description: "Penamaan standar Telkom: ODP, ODC, Tiang",
    naming: { odp: "ODP", odc: "ODC", pole: "Tiang", pop: "OLT", join: "Joint" },
  },
  {
    name: "Biznet",
    description: "Penamaan standar Biznet: FAT, FDT, Tiang",
    naming: { odp: "FAT", odc: "FDT", pole: "Tiang", pop: "POP", join: "JB" },
  },
  {
    name: "Iconnet (PLN)",
    description: "Penamaan standar Iconnet: ODP, ODC, Tiang",
    naming: { odp: "ODP", odc: "ODC", pole: "Tiang", pop: "OLT", join: "Joint" },
  },
  {
    name: "MNC Play",
    description: "Penamaan MNC: FAT, FDT, Pole",
    naming: { odp: "FAT", odc: "FDT", pole: "Pole", pop: "POP", join: "Closure" },
  },
  {
    name: "MyRepublic",
    description: "Penamaan MyRepublic: FAT, FDT, Tiang",
    naming: { odp: "FAT", odc: "FDT", pole: "Tiang", pop: "POP", join: "Joint" },
  },
  {
    name: "Custom",
    description: "Buat provider dengan penamaan sendiri",
    naming: {},
  },
];

export function makeProvider(
  name: string,
  naming: Provider["naming"],
  options?: {
    description?: string;
    logoUrl?: string;
    colors?: Provider["colors"];
  }
): Provider {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Provider Tanpa Nama",
    description: options?.description?.trim() || undefined,
    logoUrl: options?.logoUrl?.trim() || undefined,
    naming: { ...DEFAULT_NAMING, ...naming },
    colors: options?.colors || { ...DEFAULT_COLORS },
    createdAt: now,
    updatedAt: now,
    dataModifiedAt: now,
  };
}

// ============ Legacy migration ============

/** Cek apakah ada data legacy (pre-account) yang bisa dimigrasikan */
export function hasLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  const providers = safeParse<Provider[]>(
    localStorage.getItem(KEYS.legacyProviders),
    []
  );
  return providers.length > 0;
}

export function loadLegacyData(): {
  providers: Provider[];
  data: Record<string, ProviderData>;
} {
  const providers = safeParse<Provider[]>(
    localStorage.getItem(KEYS.legacyProviders),
    []
  );
  const data: Record<string, ProviderData> = {};
  for (const p of providers) {
    data[p.id] = safeParse<ProviderData>(
      localStorage.getItem(KEYS.legacyDataPrefix + p.id),
      { nodes: [], cables: [] }
    );
    // Ensure dataModifiedAt field
    if (!p.dataModifiedAt) p.dataModifiedAt = p.updatedAt || p.createdAt;
  }
  return { providers, data };
}

export function clearLegacyData(): void {
  const providers = safeParse<Provider[]>(
    localStorage.getItem(KEYS.legacyProviders),
    []
  );
  for (const p of providers) {
    localStorage.removeItem(KEYS.legacyDataPrefix + p.id);
  }
  localStorage.removeItem(KEYS.legacyProviders);
  localStorage.removeItem(KEYS.legacyActiveProviderId);
}

/** Migrasi data legacy ke akun yang baru dibuat. Return akun yang sudah dimodifikasi. */
export function migrateLegacyIntoAccount(account: Account): Account {
  if (!hasLegacyData()) return account;
  const { providers, data } = loadLegacyData();
  for (const p of providers) {
    account.providers.push(p);
    account.data[p.id] = data[p.id] || { nodes: [], cables: [] };
  }
  saveAccount(account);
  clearLegacyData();
  return account;
}

// ============ Legacy single-provider export (for backward compatibility) ============

/** Export satu provider ke format legacy ExportPayload (untuk kompatibilitas). */
export function exportProviderFromAccount(
  account: Account,
  providerId: string
): ExportPayload {
  const provider = account.providers.find((p) => p.id === providerId);
  if (!provider) throw new Error("Provider not found");
  const data = account.data[providerId] || { nodes: [], cables: [] };
  return {
    version: 1,
    exportedAt: Date.now(),
    provider,
    data,
  };
}

/** Import legacy ExportPayload ke akun aktif (membuat provider baru). */
export function importLegacyPayloadIntoAccount(
  account: Account,
  payload: ExportPayload
): Provider {
  if (!payload || payload.version !== 1 || !payload.provider) {
    throw new Error("File JSON provider tidak valid");
  }
  const newProvider: Provider = {
    ...payload.provider,
    id: crypto.randomUUID(),
    name: payload.provider.name + " (Import)",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dataModifiedAt: Date.now(),
  };
  // Remap node IDs and cable references to avoid collision
  const idMap = new Map<string, string>();
  const nodes: NetworkNode[] = payload.data.nodes.map((n) => {
    const newId = crypto.randomUUID();
    idMap.set(n.id, newId);
    return { ...n, id: newId, providerId: newProvider.id };
  });
  const cables: Cable[] = payload.data.cables
    .filter((c) => idMap.has(c.fromNodeId) && idMap.has(c.toNodeId))
    .map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      providerId: newProvider.id,
      fromNodeId: idMap.get(c.fromNodeId)!,
      toNodeId: idMap.get(c.toNodeId)!,
    }));
  account.providers.push(newProvider);
  account.data[newProvider.id] = { nodes, cables };
  saveAccount(account);
  return newProvider;
}

// ============ Utilities ============

/** Haversine distance in meters between two coordinates */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export { DEFAULT_NAMING, DEFAULT_COLORS };
