/**
 * lib/advertising-service.ts
 *
 * Service layer for the Advertising Manager. REAL backend mode.
 *
 * Backend flow (create):
 *   1. POST /advertising  — create metadata, get _id
 *   2. PATCH /advertising/:id/thumbnail — upload miniatura
 *   3. PATCH /advertising/:id/image     — upload imagen pesada
 *
 * Contract gaps (honest degradation):
 *   - `active`   — NOT in backend schema; tracked in memory only (resets on refresh).
 *   - `sortOrder` — NOT in backend schema; tracked in memory only (resets on refresh).
 *
 * The UI only depends on the exported functions here.
 */

import type { AdvertisingAsset, NewAdvertisingAsset } from "@/lib/advertising";
import {
  createAdvertising,
  updateAdvertising,
  deleteAdvertising,
  uploadAdvertisingImage,
  uploadAdvertisingThumbnail,
  fetchAdvertising,
  type ApiAdvertising,
} from "@/lib/api/landing-manager";

// ─── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Convert a backend ApiAdvertising doc to our frontend AdvertisingAsset shape.
 * `active` defaults to true and `sortOrder` defaults to 0; both are local-only.
 */
export function apiToAdvertisingAsset(
  api: ApiAdvertising,
  localOverrides?: { active?: boolean; sortOrder?: number }
): AdvertisingAsset {
  return {
    id: api._id,
    // Backend may not expose category — default to "publicidad"
    category: (api.category as AdvertisingAsset["category"]) ?? "publicidad",
    title: api.title,
    description: api.description ?? undefined,
    thumbnailUrl: api.thumbnailUrl ?? "",
    fullUrl: api.imageUrl ?? "",
    thumbnailKey: api.thumbnailKey ?? null,
    fullKey: api.imageKey ?? null,
    // fileName and sizeBytes are not returned by the backend
    fileName: undefined,
    sizeBytes: undefined,
    // active and sortOrder are local-only (no backend contract)
    active: localOverrides?.active ?? true,
    sortOrder: localOverrides?.sortOrder ?? 0,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function normalizeAdvertisingList(payload: unknown): ApiAdvertising[] {
  if (Array.isArray(payload)) {
    return payload as ApiAdvertising[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.advertising)) {
      return record.advertising as ApiAdvertising[];
    }

    if (Array.isArray(record.items)) {
      return record.items as ApiAdvertising[];
    }

    if (Array.isArray(record.data)) {
      return record.data as ApiAdvertising[];
    }

    if (Array.isArray(record.docs)) {
      return record.docs as ApiAdvertising[];
    }
  }

  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all advertising entries from the backend.
 * Returns them without active/sortOrder (caller sets those locally).
 */
export async function listAssets(): Promise<ApiAdvertising[]> {
  return normalizeAdvertisingList(await fetchAdvertising());
}

/**
 * Create a new advertising asset via the backend.
 *
 * Flow:
 *   1. POST /advertising — create metadata
 *   2. PATCH /:id/thumbnail — upload miniatura
 *   3. PATCH /:id/image    — upload imagen pesada
 *
 * If any upload fails, the create is treated as failed and the backend entry is
 * rolled back so the UI does not report partial success.
 */
export async function createAsset(input: NewAdvertisingAsset): Promise<ApiAdvertising> {
  // Step 1: create metadata
  const created = await createAdvertising({
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category,
  });

  const id = created._id;
  let latest: ApiAdvertising = created;

  // Step 2: upload thumbnail
  try {
    latest = await uploadAdvertisingThumbnail(id, input.thumbnailFile);
  } catch (err) {
    await rollbackCreatedAsset(id, err);
  }

  // Step 3: upload full image
  try {
    latest = await uploadAdvertisingImage(id, input.fullFile);
  } catch (err) {
    await rollbackCreatedAsset(id, err);
  }

  return latest;
}

async function rollbackCreatedAsset(id: string, cause: unknown): Promise<never> {
  try {
    await deleteAdvertising(id);
  } catch (rollbackErr) {
    console.warn("[advertising-service] Rollback after failed create upload also failed:", rollbackErr);
    throw new Error(
      cause instanceof Error
        ? `${cause.message}. Además falló el rollback de publicidad ${id}.`
        : `Falló la carga de la publicidad ${id} y también falló el rollback.`
    );
  }

  throw cause instanceof Error ? cause : new Error("No se pudo completar la carga de publicidad");
}

/**
 * Update advertising metadata (title, description).
 * Returns the updated backend doc.
 */
export async function patchAsset(
  id: string,
  patch: Partial<Pick<AdvertisingAsset, "title" | "description">>
): Promise<ApiAdvertising> {
  return updateAdvertising(id, {
    title: patch.title,
    description: patch.description,
  });
}

/**
 * Delete an advertising entry from the backend (removes Mongo doc + S3 files).
 */
export async function deleteAsset(id: string): Promise<void> {
  return deleteAdvertising(id);
}

/**
 * No-op: real S3 URLs do not need to be revoked.
 * Kept for API compatibility with previous simulated layer.
 */
export function revokeAssetUrls(_asset: AdvertisingAsset): void {
  // real URLs are remote — nothing to revoke
}
