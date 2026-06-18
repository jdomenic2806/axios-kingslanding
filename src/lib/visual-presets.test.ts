/**
 * lib/visual-presets.test.ts
 *
 * Unit tests for the visual preset catalog (Phase 2).
 *
 * Covers:
 *  - All preset IDs exist in the catalog
 *  - Each preset has required fields (label, cardClass, swatchColor, etc.)
 *  - VISUAL_PRESET_LIST contains all 4 presets
 *  - getVisualPreset returns correct preset for valid id
 *  - getVisualPreset falls back to "default" for unknown id
 *  - Presets do NOT contain price or copy field modifiers (contract guard)
 */

import { describe, it, expect } from "vitest";
import {
  VISUAL_PRESETS,
  VISUAL_PRESET_LIST,
  getVisualPreset,
} from "./visual-presets";

// ─── Catalog completeness ─────────────────────────────────────────────────────

describe("VISUAL_PRESETS catalog", () => {
  const expectedIds = ["default", "highlight-blue", "compact", "feature"] as const;

  it("has all 4 expected preset ids", () => {
    for (const id of expectedIds) {
      expect(VISUAL_PRESETS[id]).toBeDefined();
    }
  });

  it("each preset has required fields", () => {
    for (const id of expectedIds) {
      const preset = VISUAL_PRESETS[id];
      expect(preset.id).toBe(id);
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.cardClass).toBeTruthy();
      expect(preset.headerClass).toBeTruthy();
      expect(preset.badgeClass).toBeTruthy();
      expect(preset.priceClass).toBeTruthy();
      expect(preset.ctaClass).toBeTruthy();
      expect(preset.swatchColor).toBeTruthy();
    }
  });

  it("presets do NOT modify commercial data fields (no price/copy/nombre in class strings)", () => {
    for (const id of expectedIds) {
      const preset = VISUAL_PRESETS[id];
      // Classes are pure Tailwind strings; they must not embed commercial field names
      const allClasses = [preset.cardClass, preset.headerClass, preset.ctaClass].join(" ");
      expect(allClasses).not.toContain("nombre");
      expect(allClasses).not.toContain("monto");
      expect(allClasses).not.toContain("price");
      expect(allClasses).not.toContain("copy");
    }
  });
});

// ─── VISUAL_PRESET_LIST ───────────────────────────────────────────────────────

describe("VISUAL_PRESET_LIST", () => {
  it("contains exactly 4 presets", () => {
    expect(VISUAL_PRESET_LIST).toHaveLength(4);
  });

  it("starts with 'default' as the first entry", () => {
    expect(VISUAL_PRESET_LIST[0].id).toBe("default");
  });

  it("contains all expected preset ids", () => {
    const ids = VISUAL_PRESET_LIST.map((p) => p.id);
    expect(ids).toContain("default");
    expect(ids).toContain("highlight-blue");
    expect(ids).toContain("compact");
    expect(ids).toContain("feature");
  });
});

// ─── getVisualPreset ──────────────────────────────────────────────────────────

describe("getVisualPreset", () => {
  it("returns the correct preset for 'highlight-blue'", () => {
    const preset = getVisualPreset("highlight-blue");
    expect(preset.id).toBe("highlight-blue");
    expect(preset.label).toBe("Highlight Blue");
  });

  it("returns the correct preset for 'feature'", () => {
    const preset = getVisualPreset("feature");
    expect(preset.id).toBe("feature");
    expect(preset.swatchColor).toBeTruthy();
  });

  it("returns the correct preset for 'compact'", () => {
    const preset = getVisualPreset("compact");
    expect(preset.id).toBe("compact");
  });

  it("returns 'default' preset for 'default' id", () => {
    const preset = getVisualPreset("default");
    expect(preset.id).toBe("default");
  });

  it("falls back to 'default' for an unknown id (runtime safety)", () => {
    // @ts-expect-error — intentional unknown id for runtime fallback test
    const preset = getVisualPreset("non-existent-id");
    expect(preset.id).toBe("default");
  });
});
