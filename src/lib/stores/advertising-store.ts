/**
 * lib/stores/advertising-store.ts
 *
 * Zustand store for the Advertising Manager (módulo "Publicidad").
 *
 * Source of truth: backend (real mode).
 * On mount, load() fetches the list from GET /advertising.
 *
 * Honest degradation:
 *   - `active` and `sortOrder` are NOT persisted by the backend.
 *     They are tracked in-memory per session and reset on refresh.
 *     The UI reflects this: toggle/reorder works for the session only.
 *   - No localStorage persistence: real S3 URLs survive refresh; the store
 *     reloads from the backend on each mount.
 */

import { create } from "zustand";
import type { AdCategory, AdvertisingAsset, NewAdvertisingAsset } from "@/lib/advertising";
import {
  listAssets,
  createAsset,
  patchAsset,
  deleteAsset,
  revokeAssetUrls,
  apiToAdvertisingAsset,
} from "@/lib/advertising-service";

// ─── State & actions ────────────────────────────────────────────────────────

export interface AdvertisingState {
  /** All advertising assets across categories. */
  assets: AdvertisingAsset[];

  /** True while initial load is in progress. */
  isLoading: boolean;

  /** Error from the last load, if any. */
  loadError: string | null;

  /** True while an upload/delete is in flight. */
  isUploading: boolean;
}

export interface AdvertisingActions {
  /** Load assets from the backend. Safe to call multiple times. */
  load: () => Promise<void>;

  /** Assets for a given category, sorted by sortOrder ascending. */
  getByCategory: (category: AdCategory) => AdvertisingAsset[];

  /** Upload + add a new asset. Returns the created asset. */
  addAsset: (input: NewAdvertisingAsset) => Promise<AdvertisingAsset>;

  /**
   * Patch metadata of an existing asset (title, description).
   * NOTE: `active` is local-only — changes are not sent to the backend.
   */
  updateAsset: (
    id: string,
    patch: Partial<Pick<AdvertisingAsset, "title" | "description" | "active">>
  ) => Promise<void>;

  /**
   * Toggle the active (visible to distributors) flag.
   * LOCAL ONLY — not persisted to backend (no backend contract for `active`).
   */
  toggleActive: (id: string) => void;

  /** Remove an asset from the backend + local store. */
  removeAsset: (id: string) => Promise<void>;

  /**
   * Replace the ordered list for a category (after drag reorder).
   * LOCAL ONLY — not persisted to backend (no backend contract for `sortOrder`).
   */
  reorder: (category: AdCategory, orderedIds: string[]) => void;
}

export type AdvertisingStore = AdvertisingState & AdvertisingActions;

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAdvertisingStore = create<AdvertisingStore>()((set, get) => ({
  assets: [],
  isLoading: false,
  loadError: null,
  isUploading: false,

  load: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, loadError: null });
    try {
      const apiList = await listAssets();
      // Assign monotone sortOrder from list position; active defaults to true
      const assets = apiList.map((api, i) =>
        apiToAdvertisingAsset(api, { active: true, sortOrder: i + 1 })
      );
      set({ assets, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        loadError: err instanceof Error ? err.message : "Error al cargar publicidades",
      });
    }
  },

  getByCategory: (category) =>
    get()
      .assets.filter((a) => a.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder),

  addAsset: async (input) => {
    set({ isUploading: true });
    try {
      const apiDoc = await createAsset(input);
      set((state) => {
        const sameCat = state.assets.filter((a) => a.category === input.category);
        const maxOrder = sameCat.reduce((m, a) => Math.max(m, a.sortOrder), 0);
        const asset = apiToAdvertisingAsset(apiDoc, {
          active: true,
          sortOrder: maxOrder + 1,
        });
        return {
          assets: [...state.assets, asset],
          isUploading: false,
        };
      });
      // Return the in-store asset so callers have the local shape
      const created = get().assets.find((a) => a.id === apiDoc._id)!;
      return created;
    } catch (err) {
      set({ isUploading: false });
      throw err;
    }
  },

  updateAsset: async (id, patch) => {
    // `active` is local-only — update in memory without calling backend
    const { active, ...backendPatch } = patch;

    // If there are backend fields to update, call the API
    if (backendPatch.title !== undefined || backendPatch.description !== undefined) {
      const updated = await patchAsset(id, backendPatch);
      set((state) => ({
        assets: state.assets.map((a) =>
          a.id === id
            ? {
                ...a,
                title: updated.title,
                description: updated.description ?? undefined,
                updatedAt: updated.updatedAt,
                // Preserve local active if not in patch
                ...(active !== undefined ? { active } : {}),
              }
            : a
        ),
      }));
    } else if (active !== undefined) {
      // Only toggling active (local-only)
      set((state) => ({
        assets: state.assets.map((a) =>
          a.id === id ? { ...a, active, updatedAt: new Date().toISOString() } : a
        ),
      }));
    }
  },

  toggleActive: (id) => {
    // Local-only — no backend contract for `active`
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id ? { ...a, active: !a.active, updatedAt: new Date().toISOString() } : a
      ),
    }));
  },

  removeAsset: async (id) => {
    const asset = get().assets.find((a) => a.id === id);
    if (!asset) return;
    await deleteAsset(id);
    revokeAssetUrls(asset);
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
  },

  reorder: (category, orderedIds) => {
    // Local-only — no backend contract for `sortOrder`
    set((state) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
      return {
        assets: state.assets.map((a) =>
          a.category === category && orderMap.has(a.id)
            ? { ...a, sortOrder: orderMap.get(a.id)! }
            : a
        ),
      };
    });
  },
}));
