/**
 * lib/advertising.ts
 *
 * Types + helpers for the Advertising Manager (módulo "Publicidad").
 *
 * Domain: each advertising asset has TWO images:
 *   - thumbnail (miniatura): light image shown in the distributor admin grid.
 *   - full (pesada): high-quality image that end users download.
 *
 * In production these live in S3 (binary) + MongoDB (metadata). This module is
 * currently SIMULATED — same pattern as the landing editor:
 *   - Files are kept as in-memory object URLs (URL.createObjectURL).
 *   - Metadata is persisted to localStorage.
 *
 * The S3/Mongo wiring lives in lib/advertising-service.ts as clearly-marked
 * stubs so the real backend can be plugged in without touching the UI.
 */

/** Categories shown as tabs in the distributor admin (only "publicidad" is active for now). */
export type AdCategory = "publicidad" | "manuales" | "videos";

export const AD_CATEGORIES: { id: AdCategory; label: string }[] = [
  { id: "publicidad", label: "Publicidad" },
  // Reserved for later phases — not rendered yet.
  // { id: "manuales", label: "Manuales" },
  // { id: "videos", label: "Vídeos" },
];

/**
 * A single advertising asset.
 *
 * `thumbnailUrl` / `fullUrl` are either:
 *   - object URLs (simulated mode), or
 *   - S3/CDN URLs (when the real backend is connected).
 *
 * `thumbnailKey` / `fullKey` hold the S3 object keys when available (real mode).
 */
export interface AdvertisingAsset {
  /** Stable id — maps to the MongoDB _id when persisted for real. */
  id: string;

  /** Category this asset belongs to. */
  category: AdCategory;

  /** Human-readable title (used as alt text + admin label). */
  title: string;

  /** Optional description / internal note. */
  description?: string;

  /** Light image shown in the grid (miniatura). */
  thumbnailUrl: string;

  /** Heavy, high-quality image users download (pesada). */
  fullUrl: string;

  /** S3 object key for the thumbnail (null in simulated mode). */
  thumbnailKey?: string | null;

  /** S3 object key for the full image (null in simulated mode). */
  fullKey?: string | null;

  /** Original file name of the full image (for download). */
  fileName?: string;

  /** Size in bytes of the full image (for display). */
  sizeBytes?: number;

  /** Whether the asset is visible to distributors. */
  active: boolean;

  /** Sort order within its category (ascending). */
  sortOrder: number;

  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Input payload for creating a new asset (before it gets an id / timestamps). */
export interface NewAdvertisingAsset {
  category: AdCategory;
  title: string;
  description?: string;
  thumbnailFile: File;
  fullFile: File;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a reasonably-unique id (good enough for the simulated layer). */
export function generateAdId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ad_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Format bytes into a human-readable string (e.g. "1.4 MB"). */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Allowed image MIME types for uploads. */
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

/** Validate that a File is an accepted image type. */
export function isValidImageFile(file: File): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);
}
