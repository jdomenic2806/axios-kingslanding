/**
 * hooks/use-item-writes.ts
 *
 * Safe write operations for landing-manager section items.
 * Provides three operations matching the backend Phase 2 write endpoints:
 *
 *   patchItem    — PATCH /sections/:key/items/:itemId   (field edits)
 *   patchStatus  — PATCH /sections/:key/items/:itemId/status
 *   reorderItems — PATCH /sections/:key/items/reorder
 *
 * Design contract:
 *   - Optimistic: caller applies local store update FIRST; this hook fires backend.
 *   - Safe: on failure, logs a warning and returns { ok: false, error }. Does NOT
 *     revert the local store — the caller decides if revert is needed.
 *   - Fields NOT in backend schema stay silent: we only send supported fields.
 *   - If the API is not reachable, the write degrades gracefully (local-only edit).
 *
 * Fields sent to backend (via buildItemPatchPayload):
 *   title, description, badgeText, ctaText, customCardStyles (primaryColor, secondaryColor),
 *   monto, dias, mb, mbAnterior, llamadas, sms, hotspot, redesSociales, grupo, isPromo, producto,
 *   planName, showPlanName
 *
 * The `:itemId` path param uses `product.mongoId` (Mongo _id) when available,
 * falling back to `product.offeringId` for backward compatibility.
 *
 * Fields that remain local-only (never sent):
 *   visualConfig.socialNetworks (upload), visualConfig.extraApps,
 *   visualConfig.badgeFlag (blob:), visualConfig.noColor,
 *   visualConfig.showHotspot, visualConfig.showPreviousData,
 *   visualConfig.durationDisplayMode, visualConfig.cardBackgroundImageSrc (blob:)
 */

import type { Product } from "@/lib/mock-data";
import { patchItem, patchItemStatus, patchItemsReorder } from "@/lib/api/landing-manager";
import { buildItemPatchPayload, buildReorderPayload, sectionIdToBackendKey } from "@/lib/api/landing-mapper";

export interface WriteResult {
  ok: boolean;
  error?: string;
}

export interface PersistItemWriteOptions {
  requestInit?: RequestInit;
}

/**
 * Persist visual/copy edits for a product to the backend.
 *
 * @param sectionId - frontend section id (e.g. "activacion")
 * @param product   - the updated product (already applied to local store by caller)
 */
export async function persistItemEdit(
  sectionId: string,
  product: Product,
  previousProduct?: Product,
  options?: PersistItemWriteOptions
): Promise<WriteResult> {
  const backendKey = sectionIdToBackendKey(sectionId);
  // Prefer mongoId (_id) as the authoritative path param; fall back to offeringId.
  const itemId = product.mongoId ?? product.offeringId;

  if (!itemId) {
    // Mock-only product — no backend id means it was never in the backend
    return { ok: false, error: "local-only: no mongoId or offeringId" };
  }

  const payload = buildItemPatchPayload(product, previousProduct);

  if (Object.keys(payload).length === 0) {
    return { ok: true };
  }

  try {
    await patchItem(backendKey, itemId, payload, options?.requestInit);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[use-item-writes] patchItem failed for ${itemId}:`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Persist an active/inactive toggle for a product to the backend.
 *
 * @param sectionId - frontend section id
 * @param product   - the product with the already-toggled `active` field
 */
export async function persistItemStatus(
  sectionId: string,
  product: Product,
  options?: PersistItemWriteOptions
): Promise<WriteResult> {
  const backendKey = sectionIdToBackendKey(sectionId);
  // Prefer mongoId (_id) as the authoritative path param; fall back to offeringId.
  const itemId = product.mongoId ?? product.offeringId;

  if (!itemId) {
    return { ok: false, error: "local-only: no mongoId or offeringId" };
  }

  try {
    await patchItemStatus(backendKey, itemId, product.active !== false, options?.requestInit);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[use-item-writes] patchItemStatus failed for ${itemId}:`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Persist a reorder operation to the backend.
 *
 * Only products with a valid offeringId are included in the payload.
 * Products without offeringId (mock-only) are silently skipped.
 *
 * @param sectionId - frontend section id
 * @param products  - the reordered products array (already applied to local store by caller)
 */
export async function persistItemReorder(
  sectionId: string,
  products: Product[],
  options?: PersistItemWriteOptions
): Promise<WriteResult> {
  const backendKey = sectionIdToBackendKey(sectionId);
  const reorderItems = buildReorderPayload(products);

  if (reorderItems.length === 0) {
    // No API-backed items to reorder — silently OK (all mock-only)
    return { ok: true };
  }

  try {
    await patchItemsReorder(backendKey, reorderItems, options?.requestInit);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[use-item-writes] patchItemsReorder failed for section ${sectionId}:`, msg);
    return { ok: false, error: msg };
  }
}
