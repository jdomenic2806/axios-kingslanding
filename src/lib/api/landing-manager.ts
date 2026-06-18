/**
 * lib/api/landing-manager.ts
 *
 * HTTP client for the real landing-manager backend.
 * Base path: `${VITE_API_URL}/landing-manager` when configured,
 * otherwise same-origin `/v1/landing-manager`.
 *
 * Endpoints consumed:
 *   Phase 1 (read):
 *     GET /sections           — list all sections
 *     GET /sections/:key/full — section + active items ready for render
 *
 *   Phase 2 (write):
 *     PATCH /sections/:key/items/:itemId        — update item fields
 *     PATCH /sections/:key/items/:itemId/status — toggle isActive
 *     PATCH /sections/:key/items/reorder        — reorder items
 *
 *   Phase 3 (assets):
 *     POST /sections/:key/assets/upload              — upload + assign section asset
 *     POST /sections/:key/items/:itemId/assets/upload — upload + assign item asset
 *     DELETE /sections/:key/assets/:assetType        — unassign section asset reference
 *     DELETE /sections/:key/items/:itemId/assets/:assetType — unassign item asset reference
 *
 * All functions throw on non-2xx so callers can catch and fall back gracefully.
 *
 * Fields now included in backend schema (read from API, no longer mock-only):
 *   monto, dias, mb, mbAnterior, llamadas, sms, hotspot, redesSociales,
 *   grupo, isPromo, operadoraId, producto
 *   (All optional — frontend falls back to mock values if absent for backward compat)
 *
 * Fields that remain local/mock only (no backend contract):
 *   visualConfig.extraApps, visualConfig.deviceImageSrc,
 *   visualConfig.noColor, visualConfig.showHotspot, visualConfig.showPreviousData,
 *   visualConfig.showPlanName, visualConfig.planName, visualConfig.durationDisplayMode
 *
 * Fields NOW persisted via backend assets:
 *   visualConfig.cardBackgroundImageSrc → section asset type "background"
 *   visualConfig.badgeFlag (custom upload) → item asset type "badge"
 *   visualConfig.socialNetworks[].customIcon → item asset type "socialIcon" (per network)
 */

const API_URL = import.meta.env.VITE_API_URL?.trim() ?? "";
const BASE = API_URL.length > 0 ? `${API_URL}/landing-manager` : "/v1/landing-manager";

export function isLandingManagerApiConfigured(): boolean {
  return true;
}

export function getLandingManagerApiDisabledReason(): string | null {
  return null;
}

// ─── Raw API shapes (match backend exactly) ───────────────────────────────────

export interface ApiSectionStyle {
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  [key: string]: unknown;
}

export interface ApiSectionAssets {
  backgroundImage?: { url: string; alt: string } | null;
  badgeImage?: { url: string; alt: string } | null;
  icon?: { url: string; alt: string } | null;
  thumbnail?: { url: string; alt: string } | null;
  socialIcons?: Array<{ network: string; url: string; alt: string }>;
}

export interface ApiSection {
  key: string;
  name: string;
  order: number;
  isActive: boolean;
  sectionStyles: ApiSectionStyle;
  cardStyles: ApiSectionStyle;
  imageStyles: Record<string, unknown>;
  assets?: ApiSectionAssets;
}

/**
 * Visual configuration returned by the backend at the item level.
 * When present, this takes precedence over customCardStyles for colors.
 * Maps to the frontend's ProductVisualConfig.
 */
export interface ApiItemVisualConfig {
  primaryColor?: string;
  secondaryColor?: string;
  badgeText?: string;
  badgeStyle?: string;
  buttonText?: string;
  planName?: string;
  showPlanName?: boolean;
  showHotspot?: boolean;
  showPreviousData?: boolean;
  [key: string]: unknown;
}

export interface ApiItem {
  _id?: string;
  sectionKey: string;
  itemType: string;
  /**
   * Backend returns `offeringId` as the stable item identifier.
   * Legacy alias `itemId` is also accepted for compatibility with write endpoints.
   */
  offeringId: string | number;
  /** @deprecated Backend uses `offeringId`. This alias is kept for backward compat. */
  itemId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  ctaText?: string;
  order: number;
  isActive: boolean;
  /**
   * Availability flag. When absent, assume true (backend may omit it for active items).
   * `false` means the item is explicitly unavailable.
   */
  disponible?: boolean;
  /**
   * Item-level visual config from the backend.
   * Priority: visualConfig > customCardStyles > section.cardStyles > defaults.
   */
  visualConfig?: ApiItemVisualConfig;
  customCardStyles?: ApiSectionStyle;
  customImageStyles?: Record<string, unknown>;
  assets?: {
    backgroundImage?: { url: string; alt: string } | null;
    badgeImage?: { url: string; alt: string } | null;
    icon?: { url: string; alt: string } | null;
    thumbnail?: { url: string; alt: string } | null;
    socialIcons?: Array<{ network: string; url: string; alt: string }>;
  };

  // ── Telco / catalog fields (now seeded by the backend) ────────────────────
  // All optional for backward compatibility — the mapper falls back to mock
  // values when absent so existing seeds without these fields still render.
  /** Precio en MXN */
  monto?: number;
  /** Vigencia en días */
  dias?: number;
  /** Datos en MB (6144 = 6 GB) */
  mb?: number;
  /** Datos anteriores en MB para mostrar "Antes X GB". Null cuando no aplica. */
  mbAnterior?: number | null;
  /** Minutos de voz incluidos */
  llamadas?: number;
  /** SMS incluidos */
  sms?: number;
  /** Si permite compartir datos (hotspot) */
  hotspot?: boolean;
  /** Si incluye redes sociales ilimitadas */
  redesSociales?: boolean;
  /** Tipo de plan: ACTIVACION | PORTABILIDAD | TAE */
  grupo?: "ACTIVACION" | "PORTABILIDAD" | "TAE";
  /** Si el plan es promocional */
  isPromo?: boolean;
  /** Tipo de producto: MOV | HBB | MIFI */
  producto?: "MOV" | "HBB" | "MIFI";
  /**
   * ID de operadora — solo en sección recargas para splitting en tabs.
   * 203/211 = Celular | 217 = Paquetes | 302 = HBB | 304 = MiFi
   */
  operadoraId?: number;
}

export interface ApiSectionFull {
  section: ApiSection;
  items: ApiItem[];
}

/**
 * Raw shape returned by the backend for GET /sections/:key/full.
 * The backend returns a flat object (section fields + items[]) rather than
 * the nested { section, items } shape the frontend uses internally.
 */
export interface ApiSectionFullRaw extends ApiSection {
  items: ApiItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Multipart fetch helper — used for asset uploads (POST).
 * Does NOT set Content-Type (the browser sets it with the correct boundary).
 */
async function apiFetchMultipart<T>(path: string, formData: FormData): Promise<T> {
  return apiFetchMultipartMethod<T>("POST", path, formData);
}

/**
 * Multipart fetch helper for PATCH requests.
 * Used by PATCH /advertising/:id/image and PATCH /advertising/:id/thumbnail.
 */
async function apiFetchMultipartPatch<T>(path: string, formData: FormData): Promise<T> {
  return apiFetchMultipartMethod<T>("PATCH", path, formData);
}

async function apiFetchMultipartMethod<T>(
  method: string,
  path: string,
  formData: FormData
): Promise<T> {
  const disabledReason = getLandingManagerApiDisabledReason();
  if (disabledReason) {
    throw new Error(`[landing-manager] ${disabledReason}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`[landing-manager] ${res.status} ${res.statusText} — ${path}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (text.trim().length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const disabledReason = getLandingManagerApiDisabledReason();
  if (disabledReason) {
    throw new Error(`[landing-manager] ${disabledReason}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`[landing-manager] ${res.status} ${res.statusText} — ${path}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (typeof res.text !== "function") {
    return res.json() as Promise<T>;
  }

  const text = await res.text();
  if (text.trim().length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// ─── Write payload shapes ─────────────────────────────────────────────────────

/**
 * Fields the backend PATCH endpoint accepts, plus the sheet's editable telco/catalog
 * fields that are forwarded so the backend can persist them when ready.
 * The backend safely ignores fields it doesn't recognise yet.
 */
export interface ApiItemPatchPayload {
  title?: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  ctaText?: string;
  customCardStyles?: ApiSectionStyle;
  customImageStyles?: Record<string, unknown>;
  // ── Telco / catalog fields (forwarded from the sheet editor) ──────────────
  // The backend seed already includes these fields on read; the editor sends them
  // back on PATCH so persistence can be wired up on the backend side incrementally.
  monto?: number;
  dias?: number;
  mb?: number;
  mbAnterior?: number | null;
  llamadas?: number;
  sms?: number;
  hotspot?: boolean;
  redesSociales?: boolean;
  grupo?: "ACTIVACION" | "PORTABILIDAD" | "TAE";
  isPromo?: boolean;
  producto?: "MOV" | "HBB" | "MIFI";
  // ── Visual title fields (forwarded so backend can persist when ready) ─────
  // planName / showPlanName are client-side visual config that the editor exposes.
  // Sent on PATCH so the backend can store them once it has a schema slot; they
  // are silently ignored by backends that don't recognise them yet.
  planName?: string | null;
  showPlanName?: boolean;
}

export interface ApiItemStatusPayload {
  isActive: boolean;
}

export interface ApiReorderItem {
  itemId: string;
  order: number;
}

export interface ApiReorderPayload {
  items: ApiReorderItem[];
}

// ─── Public API — Read ────────────────────────────────────────────────────────

/**
 * List all sections from the backend.
 * Used to populate the sections grid.
 *
 * NOTE: The backend wraps the array in `{ data: ApiSection[], results: N }`.
 * We unwrap it here so callers always receive `ApiSection[]`.
 */
export async function fetchSections(): Promise<ApiSection[]> {
  const raw = await apiFetch<{ data: ApiSection[] } | ApiSection[]>("/sections");
  // Unwrap paginated shape { data: [...] } if present
  if (raw && !Array.isArray(raw) && Array.isArray((raw as { data: ApiSection[] }).data)) {
    return (raw as { data: ApiSection[] }).data;
  }
  return raw as ApiSection[];
}

/**
 * Fetch a single section with its active items, ready for render.
 * Used when the user selects a section in the editor.
 *
 * NOTE: The backend returns a flat object { _id, key, name, ..., items: [] }
 * rather than the nested { section: {...}, items: [] } shape.
 * We normalize it here so callers always receive ApiSectionFull.
 */
export async function fetchSectionFull(sectionKey: string): Promise<ApiSectionFull> {
  const raw = await apiFetch<ApiSectionFullRaw | ApiSectionFull>(`/sections/${sectionKey}/full`);

  // Detect nested shape { section: {...}, items: [...] } (future-proof)
  if (raw && "section" in raw && !("key" in raw)) {
    return raw as ApiSectionFull;
  }

  // Normalize flat shape: extract items, rest becomes section
  const { items, ...sectionFields } = raw as ApiSectionFullRaw;
  return {
    section: sectionFields as ApiSection,
    items: items ?? [],
  };
}

// ─── Public API — Write ───────────────────────────────────────────────────────

/**
 * Update supported fields of a section item.
 * Only sends fields the backend schema accepts — telco/visual-only fields stay local.
 * Throws on non-2xx.
 */
export async function patchItem(
  sectionKey: string,
  itemId: string,
  payload: ApiItemPatchPayload,
  init?: RequestInit
): Promise<ApiItem> {
  return apiFetch<ApiItem>(`/sections/${sectionKey}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    ...init,
  });
}

/**
 * Toggle the active state of a section item.
 * Throws on non-2xx.
 */
export async function patchItemStatus(
  sectionKey: string,
  itemId: string,
  isActive: boolean,
  init?: RequestInit
): Promise<ApiItem> {
  return apiFetch<ApiItem>(`/sections/${sectionKey}/items/${itemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive } satisfies ApiItemStatusPayload),
    ...init,
  });
}

/**
 * Reorder items within a section.
 * Throws on non-2xx.
 */
export async function patchItemsReorder(
  sectionKey: string,
  items: ApiReorderItem[],
  init?: RequestInit
): Promise<void> {
  await apiFetch<unknown>(`/sections/${sectionKey}/items/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ items } satisfies ApiReorderPayload),
    ...init,
  });
}

// ─── Public API — Assets ──────────────────────────────────────────────────────

/** Asset as returned by the backend library / upload endpoints. */
export interface ApiAsset {
  _id: string;
  name: string;
  assetType: string;
  s3Key: string;
  url: string;
  alt: string;
  mimeType: string;
  size: number;
  scope: string;
  isDefault: boolean;
  network: string | null;
  sectionKey: string | null;
}

/** Upload response for section-level assets. */
export interface ApiSectionAssetUploadResponse {
  asset: ApiAsset;
  section: { key: string; assets: ApiSectionAssets };
}

/** Upload response for item-level assets. */
export interface ApiItemAssetUploadResponse {
  asset: ApiAsset;
  item: { _id: string; assets: ApiItem["assets"] };
}

export type AssetType = "background" | "badge" | "socialIcon" | "icon" | "thumbnail";

/**
 * Upload a file and assign it as an asset to a section.
 * Supported assetTypes for sections: "background", "badge", "socialIcon", "icon", "thumbnail".
 * For "socialIcon", the network param is required.
 * Throws on non-2xx.
 */
export async function uploadSectionAsset(
  sectionKey: string,
  file: File,
  assetType: AssetType,
  options?: { name?: string; alt?: string; network?: string }
): Promise<ApiSectionAssetUploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("assetType", assetType);
  fd.append("name", options?.name ?? file.name);
  if (options?.alt) fd.append("alt", options.alt);
  if (options?.network) fd.append("network", options.network);

  return apiFetchMultipart<ApiSectionAssetUploadResponse>(
    `/sections/${sectionKey}/assets/upload`,
    fd
  );
}

/**
 * Upload a file and assign it as an asset to a specific item.
 * Supported assetTypes for items: "badge", "socialIcon", "thumbnail".
 * For "socialIcon", the network param is required.
 * Throws on non-2xx.
 */
export async function uploadItemAsset(
  sectionKey: string,
  itemId: string,
  file: File,
  assetType: AssetType,
  options?: { name?: string; alt?: string; network?: string }
): Promise<ApiItemAssetUploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("assetType", assetType);
  fd.append("name", options?.name ?? file.name);
  if (options?.alt) fd.append("alt", options.alt);
  if (options?.network) fd.append("network", options.network);

  return apiFetchMultipart<ApiItemAssetUploadResponse>(
    `/sections/${sectionKey}/items/${itemId}/assets/upload`,
    fd
  );
}

/**
 * Remove the asset reference from a section (does NOT delete from S3).
 * Throws on non-2xx.
 */
export async function deleteSectionAsset(
  sectionKey: string,
  assetType: AssetType,
  network?: string
): Promise<void> {
  const query = network ? `?network=${encodeURIComponent(network)}` : "";
  await apiFetch<void>(`/sections/${sectionKey}/assets/${assetType}${query}`, {
    method: "DELETE",
  });
}

/**
 * Remove the asset reference from an item (does NOT delete from S3).
 * Throws on non-2xx.
 */
export async function deleteItemAsset(
  sectionKey: string,
  itemId: string,
  assetType: AssetType,
  network?: string
): Promise<void> {
  const query = network ? `?network=${encodeURIComponent(network)}` : "";
  await apiFetch<void>(`/sections/${sectionKey}/items/${itemId}/assets/${assetType}${query}`, {
    method: "DELETE",
  });
}

// ─── Advertising API ──────────────────────────────────────────────────────────

/**
 * Raw shape returned by GET /advertising and POST /advertising.
 * NOTE: `active` and `sortOrder` are NOT documented in the backend schema.
 * They are tracked locally only and are NOT sent to or read from the backend.
 */
export interface ApiAdvertising {
  _id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  /** URL to the full (heavy) image once uploaded. */
  imageUrl?: string | null;
  /** S3 key for the full image. */
  imageKey?: string | null;
  /** URL to the thumbnail (miniatura) once uploaded. */
  thumbnailUrl?: string | null;
  /** S3 key for the thumbnail. */
  thumbnailKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAdvertisingCreatePayload {
  title: string;
  description?: string;
  category?: string;
}

export interface ApiAdvertisingUpdatePayload {
  title?: string;
  description?: string;
}

/**
 * List all advertising entries from the backend.
 */
export async function fetchAdvertising(): Promise<ApiAdvertising[]> {
  return apiFetch<ApiAdvertising[]>("/advertising");
}

/**
 * Get a single advertising entry by ID.
 */
export async function fetchAdvertisingById(id: string): Promise<ApiAdvertising> {
  return apiFetch<ApiAdvertising>(`/advertising/${id}`);
}

/**
 * Create an advertising entry (metadata only — no images yet).
 * Returns the created doc with its _id to use for subsequent image uploads.
 */
export async function createAdvertising(
  payload: ApiAdvertisingCreatePayload
): Promise<ApiAdvertising> {
  return apiFetch<ApiAdvertising>("/advertising", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update advertising metadata (title, description).
 */
export async function updateAdvertising(
  id: string,
  payload: ApiAdvertisingUpdatePayload
): Promise<ApiAdvertising> {
  return apiFetch<ApiAdvertising>(`/advertising/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete an advertising entry (removes Mongo doc + S3 binaries).
 */
export async function deleteAdvertising(id: string): Promise<void> {
  await apiFetch<void>(`/advertising/${id}`, { method: "DELETE" });
}

/**
 * Upload or replace the full (heavy) image for an advertising entry.
 * Uses PATCH /advertising/:id/image (multipart).
 */
export async function uploadAdvertisingImage(
  id: string,
  file: File
): Promise<ApiAdvertising> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetchMultipartPatch<ApiAdvertising>(`/advertising/${id}/image`, fd);
}

/**
 * Upload or replace the thumbnail (miniatura) for an advertising entry.
 * Uses PATCH /advertising/:id/thumbnail (multipart).
 */
export async function uploadAdvertisingThumbnail(
  id: string,
  file: File
): Promise<ApiAdvertising> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetchMultipartPatch<ApiAdvertising>(`/advertising/${id}/thumbnail`, fd);
}

/**
 * Remove the full image from an advertising entry.
 */
export async function deleteAdvertisingImage(id: string): Promise<void> {
  await apiFetch<void>(`/advertising/${id}/image`, { method: "DELETE" });
}

/**
 * Remove the thumbnail from an advertising entry.
 */
export async function deleteAdvertisingThumbnail(id: string): Promise<void> {
  await apiFetch<void>(`/advertising/${id}/thumbnail`, { method: "DELETE" });
}
