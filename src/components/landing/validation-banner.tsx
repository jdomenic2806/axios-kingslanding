"use client";

/**
 * components/landing-manager/validation-banner.tsx
 *
 * Displays blocking validation errors and non-blocking warnings
 * returned by the draft/publish API.
 *
 * Phase 2: standalone component, ready for integration.
 * Phase 4: wired into the main editor page.
 */

import { AlertCircle, AlertTriangle, X } from "lucide-react";
// Phase 2: import directly from schemas to avoid indirect dependency on API client
import type { ValidationViolation } from "@/lib/schemas/landing";

interface ValidationBannerProps {
  violations: ValidationViolation[];
  onDismiss?: () => void;
  className?: string;
}

export function ValidationBanner({
  violations,
  onDismiss,
  className,
}: ValidationBannerProps) {
  if (violations.length === 0) return null;

  const blocking = violations.filter((v) => v.level === "blocking");
  const warnings = violations.filter((v) => v.level === "warning");

  return (
    <div data-testid="validation-banner" className={`flex flex-col gap-2 ${className ?? ""}`}>
      {blocking.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {blocking.length === 1
                ? "Hay un error que impide continuar:"
                : `Hay ${blocking.length} errores que impiden continuar:`}
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
              {blocking.map((v, i) => (
                <li key={`${v.rule}-${i}`}>{v.message}</li>
              ))}
            </ul>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="shrink-0 rounded hover:opacity-80"
              aria-label="Cerrar errores"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-yellow-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {warnings.length === 1 ? "Advertencia:" : "Advertencias:"}
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
              {warnings.map((v, i) => (
                <li key={`${v.rule}-${i}`}>{v.message}</li>
              ))}
            </ul>
          </div>
          {onDismiss && blocking.length === 0 && (
            <button
              onClick={onDismiss}
              className="shrink-0 rounded hover:opacity-80"
              aria-label="Cerrar advertencias"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
