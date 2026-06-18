"use client";

/**
 * components/landing-manager/visual-preset-picker.tsx
 *
 * UI for selecting a visual preset for a specific product card.
 *
 * Phase 2: replaces the legacy preset-picker.tsx (which loaded commercial
 * presets from the API). This picker operates entirely from the closed
 * static catalog in lib/visual-presets.ts and calls store.applyVisualPreset().
 *
 * Props:
 *  - productId: the card to apply the preset to
 *  - currentPreset: the card's current VisualPresetId (for highlighting)
 *  - onApplied: optional callback after applying
 */

import { useCallback } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/editor-store";
import { VISUAL_PRESET_LIST } from "@/lib/visual-presets";
import type { VisualPresetId } from "@/lib/schemas/landing";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualPresetPickerProps {
  productId: string;
  currentPreset?: VisualPresetId;
  onApplied?: (presetId: VisualPresetId) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VisualPresetPicker({
  productId,
  currentPreset = "default",
  onApplied,
  className,
}: VisualPresetPickerProps) {
  const applyVisualPreset = useEditorStore((s) => s.applyVisualPreset);

  const handleSelect = useCallback(
    (presetId: VisualPresetId) => {
      applyVisualPreset(productId, presetId);
      onApplied?.(presetId);
    },
    [applyVisualPreset, productId, onApplied]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Palette className="h-4 w-4 text-muted-foreground" aria-hidden />
        Preset visual
      </div>
      <p className="text-xs text-muted-foreground">
        Los presets cambian el estilo visual. No modifican precio ni texto comercial.
      </p>

      <div className="flex flex-col gap-1 mt-1">
        {VISUAL_PRESET_LIST.map((preset) => {
          const isActive = currentPreset === preset.id;
          return (
            <Button
              key={preset.id}
              variant="ghost"
              size="sm"
              data-testid={`preset-option-${preset.id}`}
              aria-pressed={isActive}
              className={cn(
                "h-auto justify-start gap-3 px-3 py-2.5 text-left",
                isActive && "bg-accent text-accent-foreground"
              )}
              onClick={() => handleSelect(preset.id)}
            >
              {/* Color swatch */}
              <span
                className="relative h-6 w-6 shrink-0 rounded-full border border-border"
                style={{ background: preset.swatchColor }}
                aria-hidden
              >
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                  </span>
                )}
              </span>

              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{preset.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {preset.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
