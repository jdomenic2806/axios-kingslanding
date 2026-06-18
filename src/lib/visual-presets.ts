/**
 * lib/visual-presets.ts
 *
 * Closed catalog of visual presets for product cards.
 *
 * Each preset maps a VisualPresetId → a set of Tailwind class bundles
 * that control the card's look & feel.
 *
 * Design contract:
 *  - Presets MUST NOT touch commercial data (price, copy, title).
 *  - Presets control: layout variant, color theme, badge slot.
 *  - The renderer applies these classes instead of the card's visualConfig
 *    when a _visualPreset is set.
 *
 * Phase 2 — Simulated Scope v2.
 */

import type { VisualPresetId } from "@/lib/schemas/landing";

// ─── Preset Definition ────────────────────────────────────────────────────────

export interface VisualPresetDef {
  id: VisualPresetId;
  label: string;
  description: string;
  /**
   * Tailwind class bundle for the card wrapper.
   * Applied to the outermost card container.
   */
  cardClass: string;
  /**
   * Tailwind class bundle for the card header / gradient area.
   */
  headerClass: string;
  /**
   * Tailwind class bundle for the badge slot.
   */
  badgeClass: string;
  /**
   * Tailwind class bundle for the price text.
   */
  priceClass: string;
  /**
   * Tailwind class bundle for the CTA button.
   */
  ctaClass: string;
  /**
   * Optional: preview swatch color (hex or Tailwind color token) for the picker UI.
   */
  swatchColor: string;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const VISUAL_PRESETS: Record<VisualPresetId, VisualPresetDef> = {
  default: {
    id: "default",
    label: "Default",
    description: "Estilo estándar sin modificaciones visuales.",
    cardClass: "bg-card border border-border rounded-xl shadow-sm",
    headerClass: "bg-gradient-to-br from-slate-700 to-slate-900",
    badgeClass: "bg-slate-600 text-white text-xs font-semibold",
    priceClass: "text-white font-bold text-2xl",
    ctaClass: "bg-white text-black hover:bg-slate-100",
    swatchColor: "#64748b",
  },
  "highlight-blue": {
    id: "highlight-blue",
    label: "Highlight Blue",
    description: "Resaltado en azul — ideal para productos destacados.",
    cardClass: "bg-card border border-blue-500/40 rounded-xl shadow-md ring-1 ring-blue-500/20",
    headerClass: "bg-gradient-to-br from-blue-600 to-blue-900",
    badgeClass: "bg-blue-500 text-white text-xs font-semibold",
    priceClass: "text-white font-bold text-2xl",
    ctaClass: "bg-blue-400 text-white hover:bg-blue-300",
    swatchColor: "#3b82f6",
  },
  compact: {
    id: "compact",
    label: "Compact",
    description: "Diseño compacto — más cards visibles en pantalla.",
    cardClass: "bg-card border border-border rounded-lg shadow-sm",
    headerClass: "bg-gradient-to-br from-zinc-700 to-zinc-900",
    badgeClass: "bg-zinc-600 text-white text-[10px] font-semibold",
    priceClass: "text-white font-semibold text-lg",
    ctaClass: "bg-white text-black hover:bg-zinc-100 text-xs py-1",
    swatchColor: "#71717a",
  },
  feature: {
    id: "feature",
    label: "Feature",
    description: "Énfasis visual máximo — para el producto estrella.",
    cardClass: "bg-card border-2 border-amber-500/60 rounded-xl shadow-lg ring-2 ring-amber-500/20",
    headerClass: "bg-gradient-to-br from-amber-500 to-orange-700",
    badgeClass: "bg-amber-400 text-black text-xs font-bold",
    priceClass: "text-white font-extrabold text-3xl",
    ctaClass: "bg-amber-400 text-black hover:bg-amber-300 font-bold",
    swatchColor: "#f59e0b",
  },
};

// ─── Ordered list (for picker UI) ─────────────────────────────────────────────

export const VISUAL_PRESET_LIST: VisualPresetDef[] = [
  VISUAL_PRESETS["default"],
  VISUAL_PRESETS["highlight-blue"],
  VISUAL_PRESETS["compact"],
  VISUAL_PRESETS["feature"],
];

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Get the preset definition for a given id.
 * Falls back to "default" for unknown ids.
 */
export function getVisualPreset(id: VisualPresetId): VisualPresetDef {
  return VISUAL_PRESETS[id] ?? VISUAL_PRESETS["default"];
}
