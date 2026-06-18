"use client";

/**
 * components/landing-manager/visibility-editor.tsx
 *
 * Per-card visibility editor.
 *
 * Allows setting a card's VisibilityRule:
 *  - "always"   → card is always rendered
 *  - "hidden"   → card is never rendered
 *  - "window"   → card is rendered only within an ISO date-time range
 *
 * Calls store.setVisibility(productId, rule) on change.
 * Validates: when both from and to are set, to > from (blocking).
 *
 * Phase 2 — replaces schedule-dialog.tsx for per-card visibility.
 *
 * Props:
 *  - productId: the card to edit
 *  - currentRule: the card's current VisibilityRule
 *  - onChanged: optional callback after the rule is committed
 *  - className?: optional wrapper class
 */

import { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/editor-store";
import type { VisibilityRule } from "@/lib/schemas/landing";

// ─── Types ────────────────────────────────────────────────────────────────────

type KindOption = VisibilityRule["kind"];

interface VisibilityEditorProps {
  productId: string;
  currentRule: VisibilityRule;
  onChanged?: (rule: VisibilityRule) => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert an ISO datetime string to a datetime-local input value (YYYY-MM-DDTHH:mm) */
function isoToLocal(iso: string | undefined): string {
  if (!iso) return "";
  try {
    // datetime-local expects YYYY-MM-DDTHH:mm (slice to 16 chars)
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

/** Convert a datetime-local input value to a full ISO string (UTC) */
function localToIso(localStr: string): string | undefined {
  if (!localStr) return undefined;
  try {
    return new Date(localStr).toISOString();
  } catch {
    return undefined;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VisibilityEditor({
  productId,
  currentRule,
  onChanged,
  className,
}: VisibilityEditorProps) {
  const setVisibility = useEditorStore((s) => s.setVisibility);

  // Local state so we can validate before committing to store
  const [kind, setKind] = useState<KindOption>(currentRule.kind);
  const [fromLocal, setFromLocal] = useState<string>(
    currentRule.kind === "window" ? isoToLocal(currentRule.from) : ""
  );
  const [toLocal, setToLocal] = useState<string>(
    currentRule.kind === "window" ? isoToLocal(currentRule.to) : ""
  );
  const [windowError, setWindowError] = useState<string | null>(null);

  // Sync local state when currentRule changes externally
  useEffect(() => {
    setKind(currentRule.kind);
    if (currentRule.kind === "window") {
      setFromLocal(isoToLocal(currentRule.from));
      setToLocal(isoToLocal(currentRule.to));
    } else {
      setFromLocal("");
      setToLocal("");
    }
    setWindowError(null);
  }, [currentRule]);

  // ── Commit rule to store ─────────────────────────────────────────────────

  const commitRule = useCallback(
    (newKind: KindOption, from: string, to: string) => {
      let rule: VisibilityRule;

      if (newKind === "always") {
        rule = { kind: "always" };
        setWindowError(null);
      } else if (newKind === "hidden") {
        rule = { kind: "hidden" };
        setWindowError(null);
      } else {
        // window kind — validate to > from when both set
        const fromIso = localToIso(from);
        const toIso = localToIso(to);

        if (fromIso && toIso) {
          const fromMs = new Date(fromIso).getTime();
          const toMs = new Date(toIso).getTime();
          if (toMs <= fromMs) {
            setWindowError(
              "La fecha de fin debe ser posterior a la de inicio."
            );
            return; // do not commit invalid rule
          }
        }
        setWindowError(null);
        rule = { kind: "window", from: fromIso, to: toIso };
      }

      setVisibility(productId, rule);
      onChanged?.(rule);
    },
    [setVisibility, productId, onChanged]
  );

  // ── Kind selector handlers ────────────────────────────────────────────────

  const handleKindChange = (newKind: KindOption) => {
    setKind(newKind);
    if (newKind !== "window") {
      setFromLocal("");
      setToLocal("");
      setWindowError(null);
    }
    commitRule(newKind, fromLocal, toLocal);
  };

  const handleFromChange = (value: string) => {
    setFromLocal(value);
    commitRule("window", value, toLocal);
  };

  const handleToChange = (value: string) => {
    setToLocal(value);
    commitRule("window", fromLocal, value);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
        Visibilidad
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Controla cuándo aparece esta card en la landing.
      </p>

      {/* ── Kind selector ── */}
      <div
        className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="radiogroup"
        aria-label="Tipo de visibilidad"
      >
        <KindButton
          kind="always"
          label="Siempre"
          active={kind === "always"}
          icon={<Eye className="h-3.5 w-3.5" />}
          onSelect={handleKindChange}
          data-testid="visibility-kind-always"
        />
        <KindButton
          kind="hidden"
          label="Oculta"
          active={kind === "hidden"}
          icon={<EyeOff className="h-3.5 w-3.5" />}
          onSelect={handleKindChange}
          data-testid="visibility-kind-hidden"
        />
        <KindButton
          kind="window"
          label="Período"
          active={kind === "window"}
          icon={<Calendar className="h-3.5 w-3.5" />}
          onSelect={handleKindChange}
          data-testid="visibility-kind-window"
        />
      </div>

      {/* ── Window date pickers — only shown when kind === 'window' ── */}
      {kind === "window" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 px-3 py-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`visibility-from-${productId}`}
              className="text-xs text-muted-foreground"
            >
              Desde (opcional)
            </Label>
            <Input
              id={`visibility-from-${productId}`}
              data-testid="visibility-from"
              type="datetime-local"
              value={fromLocal}
              onChange={(e) => handleFromChange(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`visibility-to-${productId}`}
              className="text-xs text-muted-foreground"
            >
              Hasta (opcional)
            </Label>
            <Input
              id={`visibility-to-${productId}`}
              data-testid="visibility-to"
              type="datetime-local"
              value={toLocal}
              onChange={(e) => handleToChange(e.target.value)}
              className="text-sm"
            />
          </div>

          {windowError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              {windowError}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Dejá los campos vacíos para una ventana abierta en uno o ambos extremos.
          </p>
        </div>
      )}

      {/* ── State description ── */}
      <p className="text-xs text-muted-foreground">
        {kind === "always" && "La card siempre es visible en la landing."}
        {kind === "hidden" && "La card está oculta y no se mostrará."}
        {kind === "window" && !fromLocal && !toLocal &&
          "La card es visible en todo momento (ventana abierta)."}
        {kind === "window" && fromLocal && !toLocal &&
          `La card aparece desde ${new Date(fromLocal).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.`}
        {kind === "window" && !fromLocal && toLocal &&
          `La card se oculta después del ${new Date(toLocal).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.`}
        {kind === "window" && fromLocal && toLocal && !windowError &&
          `La card es visible desde ${new Date(fromLocal).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} hasta ${new Date(toLocal).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.`}
      </p>
    </div>
  );
}

// ─── KindButton sub-component ─────────────────────────────────────────────────

function KindButton({
  kind,
  label,
  active,
  icon,
  onSelect,
  "data-testid": testId,
}: {
  kind: KindOption;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onSelect: (kind: KindOption) => void;
  "data-testid"?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={active}
      data-testid={testId}
      className={cn(
        "h-auto flex-col gap-1 py-2 text-xs",
        active
          ? "bg-background shadow-sm text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onSelect(kind)}
    >
      {icon}
      {label}
    </Button>
  );
}
