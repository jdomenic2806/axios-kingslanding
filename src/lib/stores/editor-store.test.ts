// @ts-nocheck
/**
 * lib/stores/editor-store.test.ts
 *
 * Unit tests for the Zustand editor store — Simulated Scope v2.
 *
 * Key update: undo/redo now affects ACTUAL CONTENT (products[]), not just
 * a dirty flag. Tests assert on product content to verify this contract.
 *
 * Tests:
 *   - loadSection seeds products from mock data
 *   - setCard updates a specific product and pushes undo
 *   - undo 3 edits restores product content in order
 *   - redo after undo re-applies content change
 *   - undoStack is capped at 50 entries
 *   - setProducts replaces entire list
 *   - setVisibility stores visibility rule on product
 *   - applyVisualPreset stores preset id on product
 *   - resetSeed reloads seed and clears stacks
 *   - markSaved / markDirty
 *   - reset clears all state
 *
 * Runner: vitest
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editor-store";

const storage = new Map<string, string>();

if (typeof window === "undefined") {
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };

  globalThis.window = { localStorage } as never;
  globalThis.localStorage = localStorage as never;
}

// ── Helper: fresh store for each test ────────────────────────────────────────

function getStore() {
  return useEditorStore.getState();
}

function resetStore() {
  window.localStorage.removeItem("axios-kings:landing:v1");
  window.localStorage.removeItem("axios-kings:landing:v2");
  useEditorStore.getState().reset();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("EditorStore — loadSection", () => {
  beforeEach(resetStore);

  it("loads products from seed data for the given section", () => {
    getStore().loadSection("activacion");
    const { products, selectedSectionId, undoStack, isDirty } = useEditorStore.getState();
    expect(products.length).toBeGreaterThan(0);
    expect(selectedSectionId).toBe("activacion");
    expect(undoStack).toHaveLength(0);
    expect(isDirty).toBe(false);
  });

  it("always re-fetches from API on loadSection (no localStorage short-circuit)", () => {
    // This test documents the fix for the localStorage ghost-edit bug:
    // loadSection MUST always re-fetch from API. It must never use a cached
    // sectionDataSource="api" value to skip the fetch, because that would
    // make stale localStorage edits look like saved backend state after refresh.
    getStore().loadSection("activacion");
    const firstProducts = useEditorStore.getState().products;
    const originalNombre = firstProducts[0].nombre;

    // Mutate one card to simulate an unsaved/stale local edit
    getStore().setCard(firstProducts[0].id, { nombre: "STALE_LOCAL_EDIT" });
    useEditorStore.setState({ sectionDataSource: "api" });

    // Calling loadSection again must always overwrite with fresh API/mock data
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    // The stale local edit must be gone — products come from a fresh load
    expect(products[0].nombre).toBe(originalNombre);
    expect(products[0].nombre).not.toBe("STALE_LOCAL_EDIT");
  });

  it("reloads products when a different section is selected", () => {
    getStore().loadSection("activacion");
    getStore().loadSection("portabilidad");
    const { products, selectedSectionId } = useEditorStore.getState();
    expect(selectedSectionId).toBe("portabilidad");
    // portabilidad products have grupo: PORTABILIDAD
    expect(products.every((p) => p.grupo === "PORTABILIDAD")).toBe(true);
  });
});

describe("EditorStore — setCard (undo affects content)", () => {
  beforeEach(resetStore);

  it("setCard updates the product content and marks dirty", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;
    const originalNombre = products[0].nombre;

    getStore().setCard(targetId, { nombre: "Nuevo nombre" });

    const state = useEditorStore.getState();
    expect(state.products[0].nombre).toBe("Nuevo nombre");
    expect(state.isDirty).toBe(true);
    expect(state.undoStack).toHaveLength(1);
    // The undo snapshot must contain the original nombre
    expect(state.undoStack[0].products[0].nombre).toBe(originalNombre);
  });

  it("undo 3 edits restores product content in order", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;

    getStore().setCard(targetId, { nombre: "edit-1" });
    getStore().setCard(targetId, { nombre: "edit-2" });
    getStore().setCard(targetId, { nombre: "edit-3" });

    expect(useEditorStore.getState().products[0].nombre).toBe("edit-3");

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().products[0].nombre).toBe("edit-2");

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().products[0].nombre).toBe("edit-1");

    useEditorStore.getState().undo();
    // Back to original seed nombre
    expect(useEditorStore.getState().products[0].nombre).toBe(products[0].nombre);
  });

  it("redo after undo re-applies product content change", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;

    getStore().setCard(targetId, { nombre: "edited" });

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().products[0].nombre).toBe(products[0].nombre);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().products[0].nombre).toBe("edited");
  });

  it("new edit after undo clears redoStack", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;

    getStore().setCard(targetId, { nombre: "edit-1" });
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().redoStack).toHaveLength(1);

    getStore().setCard(targetId, { nombre: "edit-new" });
    expect(useEditorStore.getState().redoStack).toHaveLength(0);
  });

  it("undo on empty stack is a no-op", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const originalNombre = products[0].nombre;

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().products[0].nombre).toBe(originalNombre);
  });

  it("redo on empty stack is a no-op", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const originalNombre = products[0].nombre;

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().products[0].nombre).toBe(originalNombre);
  });

  it("undoStack is capped at 50 entries", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;

    for (let i = 0; i < 55; i++) {
      getStore().setCard(targetId, { nombre: `edit-${i}` });
    }

    expect(useEditorStore.getState().undoStack.length).toBeLessThanOrEqual(50);
  });
});

describe("EditorStore — setProducts", () => {
  beforeEach(resetStore);

  it("replaces entire products list and pushes undo", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const reversed = [...products].reverse();

    getStore().setProducts(reversed);

    const state = useEditorStore.getState();
    expect(state.products[0].id).toBe(products[products.length - 1].id);
    expect(state.undoStack).toHaveLength(1);
    expect(state.isDirty).toBe(true);
  });
});

describe("EditorStore — setVisibility", () => {
  beforeEach(resetStore);

  it("stores the visibility rule on the product", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;

    getStore().setVisibility(targetId, { kind: "hidden" });

    const updated = useEditorStore.getState().products.find((p) => p.id === targetId);
    expect(updated?._visibility?.kind).toBe("hidden");
    expect(useEditorStore.getState().isDirty).toBe(true);
  });

  it("stores a window visibility rule with from/to", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;
    const rule = { kind: "window" as const, from: "2026-07-01T00:00:00Z", to: "2026-07-31T23:59:59Z" };

    getStore().setVisibility(targetId, rule);

    const updated = useEditorStore.getState().products.find((p) => p.id === targetId);
    expect(updated?._visibility?.kind).toBe("window");
    expect(updated?._visibility?.from).toBe("2026-07-01T00:00:00Z");
  });
});

describe("EditorStore — applyVisualPreset", () => {
  beforeEach(resetStore);

  it("stores the preset id on the product without touching price/nombre", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;
    const originalMonto = products[0].monto;
    const originalNombre = products[0].nombre;

    getStore().applyVisualPreset(targetId, "highlight-blue");

    const updated = useEditorStore.getState().products.find((p) => p.id === targetId);
    expect(updated?._visualPreset).toBe("highlight-blue");
    // Price and nombre must be untouched
    expect(updated?.monto).toBe(originalMonto);
    expect(updated?.nombre).toBe(originalNombre);
    expect(useEditorStore.getState().isDirty).toBe(true);
  });
});

describe("EditorStore — resetSeed", () => {
  beforeEach(resetStore);

  it("reloads seed data and clears undo/redo stacks", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    const targetId = products[0].id;
    const originalNombre = products[0].nombre;

    getStore().setCard(targetId, { nombre: "edited" });
    expect(useEditorStore.getState().undoStack).toHaveLength(1);

    useEditorStore.getState().resetSeed();

    const state = useEditorStore.getState();
    expect(state.products[0].nombre).toBe(originalNombre);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.isDirty).toBe(false);
  });
});

describe("EditorStore — markSaved / markDirty / reset", () => {
  beforeEach(resetStore);

  it("markSaved clears dirty flag", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    getStore().setCard(products[0].id, { nombre: "A" });
    expect(useEditorStore.getState().isDirty).toBe(true);

    useEditorStore.getState().markSaved();
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("markDirty sets dirty flag", () => {
    getStore().loadSection("activacion");
    expect(useEditorStore.getState().isDirty).toBe(false);

    useEditorStore.getState().markDirty();
    expect(useEditorStore.getState().isDirty).toBe(true);
  });

  it("reset clears all state including products", () => {
    getStore().loadSection("activacion");
    const { products } = useEditorStore.getState();
    getStore().setCard(products[0].id, { nombre: "A" });

    useEditorStore.getState().reset();

    const state = useEditorStore.getState();
    expect(state.products).toHaveLength(0);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.isDirty).toBe(false);
    expect(state.selectedSectionId).toBeNull();
  });

  it("resetView clears transient editor state without dropping the persisted draft", () => {
    getStore().loadSection("activacion");
    const { products, selectedSectionId } = useEditorStore.getState();

    getStore().setCard(products[0].id, { nombre: "Draft persistido" });
    useEditorStore.getState().resetView();

    const state = useEditorStore.getState();
    expect(state.products[0].nombre).toBe("Draft persistido");
    expect(state.selectedSectionId).toBe(selectedSectionId);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.isDirty).toBe(false);
  });

  it("always re-fetches and discards stale localStorage state on section open", async () => {
    // Documents the fix: loadSection no longer honors sectionDataSource="api"
    // from a previous session. A simulated rehydration (as if localStorage had
    // a stale draft with sectionDataSource="api") must NOT prevent the API fetch.
    await getStore().loadSection("activacion");
    const { products, deviceBlocks } = useEditorStore.getState();
    const originalNombre = products[0].nombre;

    getStore().setCard(products[0].id, { nombre: "Stale draft" });
    const draftedState = useEditorStore.getState();

    // Simulate a page refresh: restore stale persisted state (old bug reproduced)
    useEditorStore.getState().reset();
    useEditorStore.setState({
      products: draftedState.products,
      deviceBlocks,
      selectedSectionId: "activacion",
      sectionDataSource: "api", // this must no longer short-circuit the fetch
      undoStack: [],
      redoStack: [],
      isDirty: false,
      isLoadingSection: false,
    });

    // loadSection must re-fetch (API is unavailable in tests → falls back to mock)
    await getStore().loadSection("activacion");

    const state = useEditorStore.getState();
    // Stale draft is gone — fresh data from API/mock took over
    expect(state.products[0].nombre).toBe(originalNombre);
    expect(state.products[0].nombre).not.toBe("Stale draft");
    // sectionDataSource reflects what the fetch returned (mock in test env)
    expect(state.sectionDataSource).toBe("mock");
  });
});

describe("EditorStore — setDeviceBlock", () => {
  beforeEach(resetStore);

  it("updates the device block for the given sectionId", () => {
    getStore().loadSection("internetencasa");
    const { deviceBlocks } = useEditorStore.getState();
    const sectionId = deviceBlocks[0].sectionId;
    const originalName = deviceBlocks[0].deviceName;

    getStore().setDeviceBlock(sectionId, { deviceName: "Nuevo equipo" });

    const updated = useEditorStore.getState().deviceBlocks.find((d) => d.sectionId === sectionId);
    expect(updated?.deviceName).toBe("Nuevo equipo");
    expect(useEditorStore.getState().isDirty).toBe(true);

    // Undo should restore original name
    useEditorStore.getState().undo();
    const restored = useEditorStore.getState().deviceBlocks.find((d) => d.sectionId === sectionId);
    expect(restored?.deviceName).toBe(originalName);
  });
});
