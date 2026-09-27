"use client";

import { create } from "zustand";
import type {
  Account,
  Provider,
  NetworkNode,
  Cable,
  NodeType,
  CableType,
} from "@/lib/types";
import {
  loadAccount,
  saveAccount,
  createAccount as createAccountStore,
  updateAccountProfile as updateAccountProfileStore,
  downloadAccountFile,
  importAccountFile,
  logoutAccount,
  makeProvider,
  addAccountProvider,
  updateAccountProvider,
  deleteAccountProvider,
  getAccountProviderData,
  setAccountProviderData,
  importLegacyPayloadIntoAccount,
  migrateLegacyIntoAccount,
  hasLegacyData,
} from "@/lib/storage";

export type Tool =
  | "select"
  | "add-odp"
  | "add-odc"
  | "add-pole"
  | "add-pop"
  | "add-join"
  | "add-cable"
  | "delete";

const TOOL_TO_NODE_TYPE: Partial<Record<Tool, NodeType>> = {
  "add-odp": "odp",
  "add-odc": "odc",
  "add-pole": "pole",
  "add-pop": "pop",
  "add-join": "join",
};

interface NetworkState {
  // account state
  account: Account | null;
  hasLegacy: boolean;
  ready: boolean;

  // active provider & its data (derived from account for convenience)
  activeProvider: Provider | null;
  nodes: NetworkNode[];
  cables: Cable[];

  // ui state
  tool: Tool;
  selectedNodeId: string | null;
  selectedCableId: string | null;
  cableStartNodeId: string | null;
  mapCenter: [number, number];
  mapZoom: number;

  // account actions
  init: () => void;
  createAccount: (profile: {
    name: string;
    email?: string;
    notes?: string;
    avatarUrl?: string;
  }) => void;
  uploadAccount: (jsonText: string) => void;
  logout: () => Account | null;
  updateProfile: (patch: {
    name?: string;
    email?: string;
    notes?: string;
    avatarUrl?: string;
  }) => void;
  downloadAccount: () => void;

  // provider actions
  selectProvider: (providerId: string | null) => void;
  createNewProvider: (
    name: string,
    naming: Provider["naming"],
    options?: { description?: string; logoUrl?: string }
  ) => Provider | null;
  deleteProvider: (providerId: string) => void;
  updateProvider: (provider: Provider) => void;
  importLegacyProviderJson: (jsonText: string) => void;
  migrateLegacy: () => void;

  // node actions
  setTool: (tool: Tool) => void;
  addNode: (lat: number, lng: number) => string | null;
  updateNode: (id: string, patch: Partial<NetworkNode>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  /** Toggle lock pada node — marker tidak bisa di-drag saat dikunci */
  toggleNodeLock: (id: string) => void;
  /** Kunci semua node di provider aktif */
  lockAllNodes: () => void;
  /** Buka kunci semua node di provider aktif */
  unlockAllNodes: () => void;

  // cable actions
  addCable: (fromId: string, toId: string, type?: CableType) => void;
  updateCable: (id: string, patch: Partial<Cable>) => void;
  removeCable: (id: string) => void;
  selectCable: (id: string | null) => void;

  setMapView: (center: [number, number], zoom: number) => void;
}

function autoNodeName(prefix: string, existing: NetworkNode[]): string {
  let max = 0;
  for (const n of existing) {
    const m = n.name.match(new RegExp(`^${prefix}[-\\s]?(\\d+)$`, "i"));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function autoCableName(prefix: string, existing: Cable[]): string {
  let max = 0;
  for (const c of existing) {
    const m = c.name.match(new RegExp(`^${prefix}[-\\s]?(\\d+)$`, "i"));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function reloadProviderDataIntoState(
  account: Account,
  providerId: string | null
): { activeProvider: Provider | null; nodes: NetworkNode[]; cables: Cable[] } {
  if (!providerId) {
    return { activeProvider: null, nodes: [], cables: [] };
  }
  const provider = account.providers.find((p) => p.id === providerId) || null;
  if (!provider) {
    return { activeProvider: null, nodes: [], cables: [] };
  }
  const data = getAccountProviderData(account, provider.id);
  return { activeProvider: provider, nodes: data.nodes, cables: data.cables };
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  account: null,
  hasLegacy: false,
  ready: false,
  activeProvider: null,
  nodes: [],
  cables: [],
  tool: "select",
  selectedNodeId: null,
  selectedCableId: null,
  cableStartNodeId: null,
  mapCenter: [-6.2, 106.816],
  mapZoom: 13,

  init: () => {
    if (typeof window === "undefined") return;
    const account = loadAccount();
    let activeProvider: Provider | null = null;
    let nodes: NetworkNode[] = [];
    let cables: Cable[] = [];
    if (account && account.providers.length > 0) {
      const result = reloadProviderDataIntoState(
        account,
        account.providers[0].id
      );
      activeProvider = result.activeProvider;
      nodes = result.nodes;
      cables = result.cables;
    }
    set({
      account,
      hasLegacy: hasLegacyData(),
      ready: true,
      activeProvider,
      nodes,
      cables,
    });
  },

  createAccount: (profile) => {
    const account = createAccountStore(profile);
    set({ account, hasLegacy: hasLegacyData(), activeProvider: null, nodes: [], cables: [] });
  },

  uploadAccount: (jsonText) => {
    const account = importAccountFile(jsonText);
    let activeProvider: Provider | null = null;
    let nodes: NetworkNode[] = [];
    let cables: Cable[] = [];
    if (account.providers.length > 0) {
      const result = reloadProviderDataIntoState(
        account,
        account.providers[0].id
      );
      activeProvider = result.activeProvider;
      nodes = result.nodes;
      cables = result.cables;
    }
    set({
      account,
      hasLegacy: hasLegacyData(),
      activeProvider,
      nodes,
      cables,
      tool: "select",
      selectedNodeId: null,
      selectedCableId: null,
    });
  },

  logout: () => {
    const finalAccount = logoutAccount();
    set({
      account: null,
      activeProvider: null,
      nodes: [],
      cables: [],
      hasLegacy: hasLegacyData(),
      tool: "select",
      selectedNodeId: null,
      selectedCableId: null,
      cableStartNodeId: null,
    });
    return finalAccount;
  },

  updateProfile: (patch) => {
    const account = get().account;
    if (!account) return;
    updateAccountProfileStore(account, patch);
    // reload account reference
    const fresh = loadAccount();
    set({ account: fresh });
  },

  downloadAccount: () => {
    const account = get().account;
    if (!account) return;
    downloadAccountFile(account);
  },

  selectProvider: (providerId) => {
    const account = get().account;
    if (!account) return;
    const result = reloadProviderDataIntoState(account, providerId);
    set({
      activeProvider: result.activeProvider,
      nodes: result.nodes,
      cables: result.cables,
      selectedNodeId: null,
      selectedCableId: null,
      cableStartNodeId: null,
      tool: "select",
    });
  },

  createNewProvider: (name, naming, options) => {
    const account = get().account;
    if (!account) return null;
    const provider = makeProvider(name, naming, options);
    addAccountProvider(account, provider);
    const fresh = loadAccount();
    if (!fresh) return null;
    const result = reloadProviderDataIntoState(fresh, provider.id);
    set({
      account: fresh,
      activeProvider: result.activeProvider,
      nodes: result.nodes,
      cables: result.cables,
      tool: "select",
      selectedNodeId: null,
      selectedCableId: null,
    });
    return provider;
  },

  deleteProvider: (providerId) => {
    const account = get().account;
    if (!account) return;
    deleteAccountProvider(account, providerId);
    const fresh = loadAccount();
    if (!fresh) return;
    // pick first remaining provider if any
    const nextProviderId = fresh.providers[0]?.id || null;
    const result = reloadProviderDataIntoState(fresh, nextProviderId);
    set({
      account: fresh,
      activeProvider: result.activeProvider,
      nodes: result.nodes,
      cables: result.cables,
      selectedNodeId: null,
      selectedCableId: null,
    });
  },

  updateProvider: (provider) => {
    const account = get().account;
    if (!account) return;
    provider.updatedAt = Date.now();
    updateAccountProvider(account, provider);
    const fresh = loadAccount();
    set({
      account: fresh,
      activeProvider: provider,
    });
  },

  importLegacyProviderJson: (jsonText) => {
    const account = get().account;
    if (!account) return;
    try {
      const payload = JSON.parse(jsonText);
      importLegacyPayloadIntoAccount(account, payload);
      const fresh = loadAccount();
      set({ account: fresh });
    } catch (e) {
      // ignore
    }
  },

  migrateLegacy: () => {
    const account = get().account;
    if (!account) return;
    migrateLegacyIntoAccount(account);
    const fresh = loadAccount();
    if (!fresh) return;
    const nextProviderId = fresh.providers[0]?.id || null;
    const result = reloadProviderDataIntoState(fresh, nextProviderId);
    set({
      account: fresh,
      hasLegacy: false,
      activeProvider: result.activeProvider,
      nodes: result.nodes,
      cables: result.cables,
    });
  },

  setTool: (tool) => set({ tool, cableStartNodeId: null }),

  addNode: (lat, lng) => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return null;
    const nodeType = TOOL_TO_NODE_TYPE[state.tool];
    if (!nodeType) return null;
    const prefix = provider.naming[nodeType];
    const data = getAccountProviderData(account, provider.id);
    const name = autoNodeName(prefix, data.nodes);
    const now = Date.now();
    const node: NetworkNode = {
      id: crypto.randomUUID(),
      providerId: provider.id,
      type: nodeType,
      name,
      lat,
      lng,
      createdAt: now,
      updatedAt: now,
    };
    data.nodes.push(node);
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return null;
    set((s) => ({
      account: fresh,
      nodes: [...s.nodes, node],
      selectedNodeId: node.id,
    }));
    return node.id;
  },

  updateNode: (id, patch) => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    const idx = data.nodes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const updated: NetworkNode = {
      ...data.nodes[idx],
      ...patch,
      updatedAt: Date.now(),
    };
    data.nodes[idx] = updated;
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      nodes: s.nodes.map((n) => (n.id === id ? updated : n)),
    }));
  },

  removeNode: (id) => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    data.nodes = data.nodes.filter((n) => n.id !== id);
    data.cables = data.cables.filter(
      (c) => c.fromNodeId !== id && c.toNodeId !== id
    );
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      nodes: s.nodes.filter((n) => n.id !== id),
      cables: s.cables.filter(
        (c) => c.fromNodeId !== id && c.toNodeId !== id
      ),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedCableId: null }),

  toggleNodeLock: (id) => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    const idx = data.nodes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const updated: NetworkNode = {
      ...data.nodes[idx],
      locked: !data.nodes[idx].locked,
      updatedAt: Date.now(),
    };
    data.nodes[idx] = updated;
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      nodes: s.nodes.map((n) => (n.id === id ? updated : n)),
    }));
  },

  lockAllNodes: () => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    const now = Date.now();
    data.nodes = data.nodes.map((n) =>
      n.locked ? n : { ...n, locked: true, updatedAt: now }
    );
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      nodes: s.nodes.map((n) => ({ ...n, locked: true })),
    }));
  },

  unlockAllNodes: () => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    const now = Date.now();
    data.nodes = data.nodes.map((n) =>
      n.locked ? { ...n, locked: false, updatedAt: now } : n
    );
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      nodes: s.nodes.map((n) => ({ ...n, locked: false })),
    }));
  },

  addCable: (fromId, toId, type = "distribution") => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    if (fromId === toId) return;
    const data = getAccountProviderData(account, provider.id);
    if (
      data.cables.some(
        (c) =>
          (c.fromNodeId === fromId && c.toNodeId === toId) ||
          (c.fromNodeId === toId && c.toNodeId === fromId)
      )
    ) {
      return;
    }
    const prefix = provider.naming.cable;
    const name = autoCableName(prefix, data.cables);
    const now = Date.now();
    const cable: Cable = {
      id: crypto.randomUUID(),
      providerId: provider.id,
      name,
      fromNodeId: fromId,
      toNodeId: toId,
      type,
      color: provider.colors.cable,
      createdAt: now,
      updatedAt: now,
    };
    data.cables.push(cable);
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      cables: [...s.cables, cable],
      cableStartNodeId: null,
      selectedCableId: cable.id,
    }));
  },

  updateCable: (id, patch) => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    const idx = data.cables.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const updated: Cable = { ...data.cables[idx], ...patch, updatedAt: Date.now() };
    data.cables[idx] = updated;
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      cables: s.cables.map((c) => (c.id === id ? updated : c)),
    }));
  },

  removeCable: (id) => {
    const state = get();
    const account = state.account;
    const provider = state.activeProvider;
    if (!account || !provider) return;
    const data = getAccountProviderData(account, provider.id);
    data.cables = data.cables.filter((c) => c.id !== id);
    setAccountProviderData(account, provider.id, data);
    const fresh = loadAccount();
    if (!fresh) return;
    set((s) => ({
      account: fresh,
      cables: s.cables.filter((c) => c.id !== id),
      selectedCableId: s.selectedCableId === id ? null : s.selectedCableId,
    }));
  },

  selectCable: (id) => set({ selectedCableId: id, selectedNodeId: null }),

  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
}));

// Expose store for debugging / end-to-end testing (dev only)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __networkStore?: typeof useNetworkStore }).__networkStore =
    useNetworkStore;
}
