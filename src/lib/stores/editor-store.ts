/**
 * lib/stores/editor-store.ts
 *
 * Zustand store for the commercial landing editor.
 *
 * Phase 1 API integration:
 *   - loadSection() now tries the real backend via loadSectionProducts().
 *   - Falls back to mock seed if the API is unavailable or disabled by config.
 *   - isLoadingSection flag exposed for UI spinner during initial fetch.
 *   - sectionDataSource: "api" | "mock" tracks provenance for the debug banner.
 *
 * Existing behaviour unchanged:
 *   - products[]        (the "cards" in the domain — existing Product type)
 *   - deviceBlocks[]    (HBB/MiFi device info — existing InternetDeviceInfo type)
 *   - selectedSectionId (which section is being edited)
 *   - undoStack / redoStack (capped at 50 — operates on full products/deviceBlocks snapshots)
 *   - isDirty flag
 *
 * Design decisions:
 *   - Source of truth: this store owns the content arrays; page.tsx reads from here
 *   - Persistence: in-memory + optional localStorage (key: axios-kings:landing:v1)
 *   - Undo/redo: ephemeral, capped at 50, discarded on unload
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, InternetDeviceInfo } from "@/lib/mock-data";
import { getProductsBySection, internetDeviceInfoDefaults } from "@/lib/mock-data";
import type { VisibilityRule, VisualPresetId, DeviceImageRef } from "@/lib/schemas/landing";
import { loadSectionProducts } from "@/hooks/use-section-products";
import { sanitizeDeviceTransientAssets, sanitizeProductTransientAssets } from "@/lib/assets/transient-assets";

const UNDO_STACK_CAP = 50;
const PERSIST_KEY = "axios-kings:landing:v2";
let latestSectionLoadRequestId = 0;

// ─── Snapshot shape for undo/redo ─────────────────────────────────────────────

interface ContentSnapshot {
  products: Product[];
  deviceBlocks: InternetDeviceInfo[];
}

// ─── Store state & actions ────────────────────────────────────────────────────

export interface EditorState {
  /** Products for the currently selected section — source of truth */
  products: Product[];

  /** Device block info (HBB / MiFi) — source of truth */
  deviceBlocks: InternetDeviceInfo[];

  /** Currently selected section id (null = no section selected) */
  selectedSectionId: string | null;

  /** Undo stack: each entry is a snapshot of { products, deviceBlocks } */
  undoStack: ContentSnapshot[];

  /** Redo stack: each entry is a snapshot of { products, deviceBlocks } */
  redoStack: ContentSnapshot[];

  /** True when there are unsaved changes */
  isDirty: boolean;

  /**
   * True while loadSection() is fetching from the API.
   * UI can show a spinner or skeleton during this period.
   */
  isLoadingSection: boolean;

  /**
   * Indicates where the current products[] came from.
   * "api"  — fetched and merged from the real backend
   * "mock" — loaded from local mock-data seed (API unavailable or not tried yet)
   */
  sectionDataSource: "api" | "mock";

  // ── Legacy compat — kept for preset-picker.tsx until Phase 2 migration ────
  /** @deprecated Phase 2 */
  presetOverwritePending: boolean;
  /** @deprecated Phase 2 */
  pendingPresetStyles: Record<string, unknown> | null;
  /** @deprecated Phase 2 */
  pendingPresetCopy: Record<string, unknown> | null;
}

export interface EditorActions {
  /**
   * Load products for a given section.
   * Always fetches from the real backend (GET /sections/:key/full) —
   * localStorage is NOT used as a shortcut for section data.
   * Falls back silently to mock seed if the API is unavailable.
   *
   * Async — sets isLoadingSection=true during fetch.
   * Clears undo/redo stacks and dirty flag on load.
   */
  loadSection: (sectionId: string) => Promise<void>;

  /**
   * Update a single product (card) by id.
   * Pushes current state to undoStack.
   */
  setCard: (productId: string, patch: Partial<Product>) => void;

  /**
   * Update a single device block by sectionId.
   * Pushes current state to undoStack.
   */
  setDeviceBlock: (sectionId: string, patch: Partial<InternetDeviceInfo>) => void;

  /**
   * Set the visibility rule for a card.
   * Pushes current state to undoStack.
   * Phase 2: visibility-editor component calls this.
   */
  setVisibility: (productId: string, rule: VisibilityRule) => void;

  /**
   * Apply a visual preset (style treatment) to a card.
   * Presets MUST NOT touch price or copy fields.
   * Pushes current state to undoStack.
   * Phase 2: visual-preset-picker component calls this.
   */
  applyVisualPreset: (productId: string, presetId: VisualPresetId) => void;

  /**
   * Set the device image reference for an HBB/MiFi block.
   * Phase 3: device-image-gallery component calls this.
   */
  setDeviceImage: (sectionId: string, ref: DeviceImageRef) => void;

  /**
   * Replace the entire products array (e.g. after reorder).
   * Pushes current state to undoStack.
   */
  setProducts: (products: Product[]) => void;

  /**
   * Undo the last content change.
   * Pops undoStack, pushes current snapshot onto redoStack.
   */
  undo: () => void;

  /**
   * Redo the last undone change.
   * Pops redoStack, pushes current snapshot onto undoStack.
   */
  redo: () => void;

  /**
   * Reset to seed data for the current section.
   * Clears undo/redo stacks.
   */
  resetSeed: () => void;

  /**
   * Clear persisted localStorage data and reload seed.
   * This lets the user wipe simulated data.
   */
  clearPersisted: () => void;

  /** Mark draft as saved (clears dirty flag). */
  markSaved: () => void;

  /** Mark draft as dirty (unsaved changes). */
  markDirty: () => void;

  /** Reset only transient editor UI state, preserving persisted draft content. */
  resetView: () => void;

  /**
   * Reset the store to its initial empty state.
   * Called when navigating away from the editor.
   */
  reset: () => void;

  // ── Legacy compatibility ──────────────────────────────────────────────────
  // These keep the old store surface alive for components that haven't been
  // migrated yet. They delegate to the new primitives above.

  /** @deprecated use setCard instead */
  updateDraft: (partial: Record<string, unknown>) => void;

  /** @deprecated use loadSection + setProducts instead */
  setDraft: (content: Record<string, unknown>) => void;

  // ── Legacy: preset overwrite dialog (preset-picker.tsx) ──────────────────
  // Will be removed when preset-picker is replaced by visual-preset-picker (Phase 2).

  /** @deprecated Phase 2 replaces this with applyVisualPreset */
  applyPreset: (styles: Record<string, unknown>, copy: Record<string, unknown>) => void;
  /** @deprecated Phase 2 */
  confirmPresetOverwrite: () => void;
  /** @deprecated Phase 2 */
  cancelPresetOverwrite: () => void;
  /** @deprecated Phase 2 */
  presetOverwritePending: boolean;
  /** @deprecated Phase 2 */
  pendingPresetStyles: Record<string, unknown> | null;
  /** @deprecated Phase 2 */
  pendingPresetCopy: Record<string, unknown> | null;
}

export type EditorStore = EditorState & EditorActions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pushUndo(
  stack: ContentSnapshot[],
  snapshot: ContentSnapshot
): ContentSnapshot[] {
  const next = [...stack, snapshot];
  return next.length > UNDO_STACK_CAP
    ? next.slice(next.length - UNDO_STACK_CAP)
    : next;
}

function currentSnapshot(state: EditorState): ContentSnapshot {
  return {
    products: state.products,
    deviceBlocks: state.deviceBlocks,
  };
}

function shouldRefreshSeedForSection(sectionId: string, currentProducts: Product[]): boolean {
  if (sectionId !== "recargas") return false;
  const seedProducts = getProductsBySection(sectionId);
  if (currentProducts.length !== seedProducts.length) return true;

  const currentOfferingIds = [...currentProducts]
    .map((p) => p.offeringId)
    .sort();
  const seedOfferingIds = [...seedProducts]
    .map((p) => p.offeringId)
    .sort();

  return currentOfferingIds.some((id, index) => id !== seedOfferingIds[index]);
}

// ─── Visual preset Tailwind class bundles (Phase 2 — referenced here so store can apply) ───
// Full catalog lives in lib/visual-presets.ts. Here we only use the presetId on the product.
// The actual Tailwind classes are resolved in the renderer.

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: EditorState = {
  products: [],
  deviceBlocks: JSON.parse(JSON.stringify(internetDeviceInfoDefaults)),
  selectedSectionId: null,
  undoStack: [],
  redoStack: [],
  isDirty: false,
  isLoadingSection: false,
  sectionDataSource: "mock",
  // Legacy compat fields
  presetOverwritePending: false,
  pendingPresetStyles: null,
  pendingPresetCopy: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      loadSection: async (sectionId) => {
        const requestId = ++latestSectionLoadRequestId;

        // Always fetch from API — never short-circuit from localStorage.
        // Persisted state may hold stale edits from a previous session that
        // have already been sent to the backend; using them would make the
        // frontend appear to have "saved" changes that the backend already
        // received, or worse, show phantom edits that were never persisted.

        // Phase 1: start loading — show spinner, load mock immediately as placeholder
        set({
          products: getProductsBySection(sectionId),
          deviceBlocks: JSON.parse(JSON.stringify(internetDeviceInfoDefaults)),
          selectedSectionId: sectionId,
          undoStack: [],
          redoStack: [],
          isDirty: false,
          isLoadingSection: true,
          sectionDataSource: "mock",
        });

        // Then fetch from the real API (always — no localStorage short-circuit)
        const { products, isFromApi } = await loadSectionProducts(sectionId);
        const nextState = get();

        if (
          requestId !== latestSectionLoadRequestId ||
          nextState.selectedSectionId !== sectionId
        ) {
          return;
        }

        set({
          products,
          isLoadingSection: false,
          sectionDataSource: isFromApi ? "api" : "mock",
        });
      },

      setCard: (productId, patch) => {
        const state = get();
        set({
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: [],
          products: state.products.map((p) =>
            p.id === productId ? { ...p, ...patch } : p
          ),
          isDirty: true,
        });
      },

      setDeviceBlock: (sectionId, patch) => {
        const state = get();
        set({
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: [],
          deviceBlocks: state.deviceBlocks.map((d) =>
            d.sectionId === sectionId ? { ...d, ...patch } : d
          ),
          isDirty: true,
        });
      },

      setVisibility: (productId, rule) => {
        const state = get();
        set({
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: [],
          products: state.products.map((p) =>
            p.id === productId
              ? { ...p, _visibility: rule } // stored as _visibility on the Product
              : p
          ),
          isDirty: true,
        });
      },

      applyVisualPreset: (productId, presetId) => {
        const state = get();
        set({
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: [],
          products: state.products.map((p) =>
            p.id === productId
              ? { ...p, _visualPreset: presetId } // stored as _visualPreset on the Product
              : p
          ),
          isDirty: true,
        });
      },

      setDeviceImage: (sectionId, ref) => {
        const state = get();
        const imageUrl =
          ref.kind === "curated"
            ? `/devices/${ref.id}`
            : ref.objectUrl;
        set({
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: [],
          deviceBlocks: state.deviceBlocks.map((d) =>
            d.sectionId === sectionId
              ? { ...d, deviceImageSrc: imageUrl, _deviceImageRef: ref }
              : d
          ),
          isDirty: true,
        });
      },

      setProducts: (products) => {
        const state = get();
        set({
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: [],
          products,
          isDirty: true,
        });
      },

      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return;
        const previous = state.undoStack[state.undoStack.length - 1];
        set({
          products: previous.products,
          deviceBlocks: previous.deviceBlocks,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [currentSnapshot(state), ...state.redoStack],
          isDirty: true,
        });
      },

      redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return;
        const next = state.redoStack[0];
        set({
          products: next.products,
          deviceBlocks: next.deviceBlocks,
          undoStack: pushUndo(state.undoStack, currentSnapshot(state)),
          redoStack: state.redoStack.slice(1),
          isDirty: true,
        });
      },

      resetSeed: () => {
        const { selectedSectionId } = get();
        set({
          products: selectedSectionId ? getProductsBySection(selectedSectionId) : [],
          deviceBlocks: JSON.parse(JSON.stringify(internetDeviceInfoDefaults)),
          undoStack: [],
          redoStack: [],
          isDirty: false,
        });
      },

      clearPersisted: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(PERSIST_KEY);
          } catch {
            // ignore storage errors
          }
        }
        get().resetSeed();
      },

      markSaved: () => set({ isDirty: false }),

      markDirty: () => set({ isDirty: true }),

      resetView: () => set({
        undoStack: [],
        redoStack: [],
        isDirty: false,
        isLoadingSection: false,
        sectionDataSource: "mock",
        presetOverwritePending: false,
        pendingPresetStyles: null,
        pendingPresetCopy: null,
      }),

      reset: () => set({
        ...initialState,
        deviceBlocks: JSON.parse(JSON.stringify(internetDeviceInfoDefaults)),
        isLoadingSection: false,
        sectionDataSource: "mock",
      }),

      // ── Legacy compatibility ──────────────────────────────────────────────
      updateDraft: (partial) => {
        // Legacy: delegate to markDirty + no-op (components still call this)
        get().markDirty();
        // If the partial contains product-like data, log for debugging
        if (process.env.NODE_ENV === "development") {
          console.debug("[editor-store] updateDraft (legacy) called with:", partial);
        }
      },

      setDraft: (_content) => {
        // Legacy: treated as a reset signal — clear stacks
        set({ undoStack: [], redoStack: [], isDirty: false });
      },

      // ── Legacy preset dialog stubs (preset-picker.tsx compatibility) ──────
      applyPreset: (_styles, _copy) => {
        // Phase 2 will replace this with applyVisualPreset + visual-preset-picker.tsx
        get().markDirty();
      },

      confirmPresetOverwrite: () => {
        set({ presetOverwritePending: false, pendingPresetStyles: null, pendingPresetCopy: null });
      },

      cancelPresetOverwrite: () => {
        set({ presetOverwritePending: false, pendingPresetStyles: null, pendingPresetCopy: null });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => {
        // Safe localStorage access (SSR guard)
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),
      // Persist nothing about section identity or data provenance.
      // sectionDataSource MUST NOT be persisted: a rehydrated "api" value
      // would allow the loadSection guard to skip re-fetching from the API,
      // making stale localStorage edits look like fresh API data on refresh.
      // selectedSectionId is also excluded so a fresh page-load always
      // starts from sections-grid and triggers a clean API fetch on entry.
      // Only undo/redo-agnostic content arrays are kept for in-session safety
      // (e.g. background images uploaded mid-session before publish).
      partialize: (state) => ({
        products: state.products.map(sanitizeProductTransientAssets),
        deviceBlocks: state.deviceBlocks.map(sanitizeDeviceTransientAssets),
      }),
    }
  )
);
