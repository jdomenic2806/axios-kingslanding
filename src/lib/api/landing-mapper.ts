/**
 * lib/api/landing-mapper.ts
 *
 * Maps backend API shapes → frontend domain types (Section, Product).
 *
 * Design principles:
 *  - Never crash on missing fields — use safe defaults for any absent optional field.
 *  - The frontend Section.id is derived from the backend key (they are equivalent).
 *  - ProductVisualConfig is populated with the following priority:
 *      1. item.visualConfig   (backend visual config object — highest priority)
 *      2. section.cardStyles  → primaryColor, secondaryColor
 *      3. createVisualConfig defaults
 *
 * Telco fields (monto, dias, mb, llamadas, sms, hotspot, grupo, redesSociales,
 * operadoraId, isPromo, mbAnterior) are read directly from the API response.
 * The fallback to mock only triggers when the field is absent (undefined/null),
 * NOT when it is 0 — 0 is a valid value for some fields (e.g. llamadas).
 *
 * `disponible`: when absent from the API response, defaults to true.
 *
 * Remaining local-only (no backend contract):
 *   socialNetworks (shape mismatch: backend has { network, url, alt }; frontend
 *   needs { id, icon, color, enabled }) — merged from defaults + backend customIcon override.
 */

import type { ApiSection, ApiItem, ApiSectionFull } from "./landing-manager";
import type { Section, Product, ProductVisualConfig } from "@/lib/mock-data";
import { DEFAULT_VISUAL_CONFIG_COLORS, defaultSocialNetworks, sections as mockSections } from "@/lib/mock-data";

/**
 * Intermediate product shape returned by mapApiItemToProduct.
 * Telco fields may be undefined when the backend omits them (older seeds).
 * mergeApiWithMockProducts resolves all undefined fields before returning Product[].
 */
export type ApiMappedProduct = Omit<Product, "monto" | "dias" | "mb" | "llamadas" | "sms"> & {
  monto: number | undefined;
  dias: number | undefined;
  mb: number | undefined;
  llamadas: number | undefined;
  sms: number | undefined;
};

const mockSectionMetadataById = new Map(mockSections.map((section) => [section.id, section]));

// ─── Section slug → internal sectionId mapping ────────────────────────────────
// Backend uses keys like "cliente-nuevo"; frontend uses ids like "activacion".
// We maintain a stable map so navigation and store lookups work unchanged.

const KEY_TO_ID: Record<string, string> = {
  "cliente-nuevo": "activacion",
  "cambiate": "portabilidad",
  "paquetes": "paquetes",
  "recargas": "recargas",
  "internet-casa": "internetencasa",
  "internet-portatil": "internetportatil",
};

const ID_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_ID).map(([k, v]) => [v, k])
);

/** Convert a backend section key to the frontend section id. */
export function backendKeyToSectionId(key: string): string {
  return KEY_TO_ID[key] ?? key;
}

/** Convert a frontend section id to the backend section key. */
export function sectionIdToBackendKey(sectionId: string): string {
  return ID_TO_KEY[sectionId] ?? sectionId;
}

// ─── Section mapper ───────────────────────────────────────────────────────────

/**
 * Map a backend ApiSection to a frontend Section.
 *
 * Fields not available from backend are given safe defaults:
 *  - description: empty string
 *  - icon: derived from section key
 *  - productCount: 0 (will be updated once items are loaded)
 *  - lastPublished: null
 *  - status: "published" (backend manages isActive, not status workflow)
 */
export function mapApiSectionToSection(apiSection: ApiSection): Section {
  const sectionId = backendKeyToSectionId(apiSection.key);
  const fallbackMetadata = mockSectionMetadataById.get(sectionId);

  const iconMap: Record<string, string> = {
    activacion: "user-plus",
    portabilidad: "refresh-cw",
    paquetes: "package",
    recargas: "zap",
    internetencasa: "home",
    internetportatil: "wifi",
  };

  return {
    id: sectionId,
    name: apiSection.name,
    slug: apiSection.key,
    description: fallbackMetadata?.description ?? "",
    icon: fallbackMetadata?.icon ?? iconMap[sectionId] ?? "layers",
    sortOrder: apiSection.order,
    productCount: fallbackMetadata?.productCount ?? 0,
    lastPublished: fallbackMetadata?.lastPublished ?? null,
    status: apiSection.isActive ? "published" : "draft",
    cardStyles: {
      primaryColor: apiSection.cardStyles?.primaryColor as string | undefined,
      secondaryColor: apiSection.cardStyles?.secondaryColor as string | undefined,
    },
    assets: {
      backgroundImage: apiSection.assets?.backgroundImage
        ? {
            url: apiSection.assets.backgroundImage.url,
            alt: apiSection.assets.backgroundImage.alt,
          }
        : null,
    },
  };
}

// ─── Item (card) mapper ────────────────────────────────────────────────────────

/**
 * Map a backend ApiItem + parent ApiSection to a frontend Product.
 *
 * Telco fields (monto, dias, mb, llamadas, sms, hotspot, grupo, redesSociales,
 * operadoraId, isPromo, mbAnterior) are read directly from the backend item when
 * present. If the backend seed omits them (older seeds, partial responses), the
 * `mergeApiWithMockProducts` step will fill them from the local mock by offeringId.
 *
 * Visual fields (colors, badgeText, ctaText, assets) always come from the API.
 */
export function mapApiItemToProduct(
  item: ApiItem,
  parentSection: ApiSection
): ApiMappedProduct {
  const defaults = DEFAULT_VISUAL_CONFIG_COLORS;

  // ── Visual color resolution (priority order) ──────────────────────────────
  // 1. item.visualConfig.primaryColor/secondaryColor  (backend visual config)
  // 2. parentSection.cardStyles.primaryColor/secondaryColor  (section base)
  // 3. createVisualConfig defaults
  const sectionColors = {
    primaryColor: (parentSection.cardStyles?.primaryColor as string | undefined) ?? defaults.primaryColor,
    secondaryColor: (parentSection.cardStyles?.secondaryColor as string | undefined) ?? defaults.secondaryColor,
  };
  const itemColors = {
    primaryColor: (item.visualConfig?.primaryColor as string | undefined) ?? sectionColors.primaryColor,
    secondaryColor: (item.visualConfig?.secondaryColor as string | undefined) ?? sectionColors.secondaryColor,
  };

  // Map backend socialIcons (item-level) → override customIcon on matching default networks.
  // socialIcons from backend: { network, url, alt }
  // Frontend SocialNetwork: { id, customIcon? }
  // Strategy: merge backend icons into defaultSocialNetworks. Networks not in backend keep defaults.
  const itemSocialIconMap = new Map(
    (item.assets?.socialIcons ?? []).map((si) => [si.network, si.url])
  );

  const mergedSocialNetworks: typeof defaultSocialNetworks = defaultSocialNetworks.map((sn) => {
    const backendUrl = itemSocialIconMap.get(sn.id);
    if (!backendUrl) return { ...sn };
    return { ...sn, customIcon: backendUrl };
  });

  // Badge image from item assets (type "badge") → used as badgeFlag if present
  const itemBadgeUrl = item.assets?.badgeImage?.url ?? item.assets?.thumbnail?.url;

  // ── Scalar visual fields: item.visualConfig > item-level fields > defaults ──
  // badgeText: item.visualConfig.badgeText > item.badgeText > ""
  const resolvedBadgeText = (item.visualConfig?.badgeText as string | undefined) ?? item.badgeText ?? "";
  // buttonText: item.visualConfig.buttonText > item.ctaText > "LO QUIERO"
  const resolvedButtonText = (item.visualConfig?.buttonText as string | undefined) ?? item.ctaText ?? "LO QUIERO";
  // showHotspot: item.visualConfig.showHotspot > item.hotspot > false
  const resolvedShowHotspot = (item.visualConfig?.showHotspot as boolean | undefined) ?? item.hotspot ?? false;
  // showPreviousData: item.visualConfig.showPreviousData > derived from mbAnterior
  const resolvedShowPreviousData = (item.visualConfig?.showPreviousData as boolean | undefined) ?? (item.mbAnterior != null);
  // planName / showPlanName from item.visualConfig when present
  const resolvedPlanName = item.visualConfig?.planName as string | undefined;
  const resolvedShowPlanName = item.visualConfig?.showPlanName as boolean | undefined;

  const visualConfig: ProductVisualConfig = {
    template: "default",
    badgeText: resolvedBadgeText,
    badgeStyle: "none",
    badgeFlag: itemBadgeUrl ?? "red",
    primaryColor: itemColors.primaryColor,
    secondaryColor: itemColors.secondaryColor,
    buttonText: resolvedButtonText,
    buttonColor: "#ffffff",
    buttonTextColor: "#000000",
    showHotspot: resolvedShowHotspot,
    // hotspotText omitido: el texto "Comparte Datos" es fijo en el renderer.
    showPreviousData: resolvedShowPreviousData,
    // previousDataText omitido: el renderer deriva el texto directamente desde product.mbAnterior.
    durationDisplayMode: "days",
    socialNetworks: mergedSocialNetworks,
    // Background image from section assets (backend: section.assets.backgroundImage)
    cardBackgroundImageSrc: parentSection.assets?.backgroundImage?.url,
    ...(resolvedPlanName !== undefined && { planName: resolvedPlanName }),
    ...(resolvedShowPlanName !== undefined && { showPlanName: resolvedShowPlanName }),
  };

  // Backend uses `offeringId` as the stable item identifier; `itemId` is a legacy alias.
  const resolvedItemId = String(item.offeringId ?? item.itemId ?? item._id ?? "unknown");

  return {
    id: `api-${item.sectionKey}-${resolvedItemId}`,
    offeringId: resolvedItemId, // use offeringId for mock merge matching
    // Store the Mongo _id when available — used as the path param (:itemId) in write endpoints.
    mongoId: item._id ?? undefined,
    nombre: item.title,
    grupo: item.grupo ?? "ACTIVACION",             // from backend seed; default ACTIVACION
    // Telco fields: undefined means "not provided by backend" (fallback to mock in merge step).
    // 0 is a valid value — do NOT treat 0 as "absent". Use ?? undefined to preserve undefined.
    monto: item.monto,                             // undefined when absent
    dias: item.dias,                               // undefined when absent
    mb: item.mb,                                   // undefined when absent
    mbAnterior: item.mbAnterior ?? null,           // null when absent (explicit null is valid)
    llamadas: item.llamadas,                       // undefined when absent
    sms: item.sms,                                 // undefined when absent
    hotspot: item.hotspot ?? false,                // from backend seed
    // redesSociales: when the backend omits the field, fall back to hotspot as the
    // business sentinel — if the plan shares data (hotspot) it also includes social networks.
    redesSociales: item.redesSociales ?? item.hotspot ?? false,   // from backend seed
    observacion: item.description ?? item.subtitle ?? "",
    producto: item.producto ?? "MOV",              // from backend seed
    isPromo: item.isPromo ?? false,                // from backend seed
    operadoraId: item.operadoraId,                 // from backend seed (recargas only)
    // disponible: absent from backend means true (item is available unless explicitly false)
    disponible: item.disponible ?? true,
    visualConfig,
    sortOrder: item.order,
    active: item.isActive,
  };
}

// ─── Full section mapper ──────────────────────────────────────────────────────

/**
 * Map a full section response (section + items) to a typed tuple.
 * Returns { section, products } where products are ApiMappedProduct[] (pre-merge).
 * Call mergeApiWithMockProducts to resolve undefined telco fields from mock data.
 */
export function mapApiSectionFull(data: ApiSectionFull): {
  section: Section;
  products: ApiMappedProduct[];
} {
  const section = mapApiSectionToSection(data.section);
  const products = data.items
    .sort((a, b) => a.order - b.order)
    .map((item) => mapApiItemToProduct(item, data.section));

  return {
    section: { ...section, productCount: products.length },
    products,
  };
}

// ─── Write payload builders ───────────────────────────────────────────────────

/**
 * Build the PATCH payload for item field updates.
 *
 * Sends all fields the backend PATCH endpoint supports plus the sheet's editable
 * telco/catalog fields. Telco fields (monto, dias, mb, etc.) are forwarded so the
 * backend can persist them when ready — they are not destructive if the backend
 * ignores unknown fields.
 *
 * Fields sent:
 *   title, description, badgeText, ctaText,
 *   customCardStyles (primaryColor, secondaryColor)
 *   monto, dias, mb, mbAnterior, llamadas, sms, hotspot, redesSociales,
 *   grupo, isPromo, producto,
 *   planName, showPlanName
 *
 * Visual-only local fields NOT sent:
 *   visualConfig.socialNetworks (upload), visualConfig.extraApps,
 *   visualConfig.badgeFlag (custom upload blob:), visualConfig.noColor,
 *   visualConfig.showHotspot, visualConfig.showPreviousData,
 *   visualConfig.durationDisplayMode, visualConfig.cardBackgroundImageSrc (blob:)
 */
export function buildItemPatchPayload(
  product: Product,
  previousProduct?: Product
): import("./landing-manager").ApiItemPatchPayload {
  const payload: import("./landing-manager").ApiItemPatchPayload = {};

  if (!previousProduct || previousProduct.nombre !== product.nombre) {
    payload.title = product.nombre;
  }

  if (!previousProduct || previousProduct.observacion !== product.observacion) {
    payload.description = product.observacion;
  }

  if (!previousProduct || previousProduct.visualConfig.badgeText !== product.visualConfig.badgeText) {
    payload.badgeText = product.visualConfig.badgeText;
  }

  if (!previousProduct || previousProduct.visualConfig.buttonText !== product.visualConfig.buttonText) {
    payload.ctaText = product.visualConfig.buttonText;
  }

  if (previousProduct) {
    const colorPatch: NonNullable<import("./landing-manager").ApiItemPatchPayload["customCardStyles"]> = {};

    if (previousProduct.visualConfig.primaryColor !== product.visualConfig.primaryColor) {
      colorPatch.primaryColor = product.visualConfig.primaryColor;
    }

    if (previousProduct.visualConfig.secondaryColor !== product.visualConfig.secondaryColor) {
      colorPatch.secondaryColor = product.visualConfig.secondaryColor;
    }

    if (Object.keys(colorPatch).length > 0) {
      payload.customCardStyles = colorPatch;
    }
  }

  // ── Telco / sheet fields ──────────────────────────────────────────────────
  // Forwarded so the backend can persist them when ready.
  // These are sent on every diff (when a previous product is supplied) or always
  // on a full save (no previous product). Backend ignores unrecognised fields safely.

  if (!previousProduct || previousProduct.monto !== product.monto) {
    payload.monto = product.monto;
  }
  if (!previousProduct || previousProduct.dias !== product.dias) {
    payload.dias = product.dias;
  }
  if (!previousProduct || previousProduct.mb !== product.mb) {
    payload.mb = product.mb;
  }
  if (!previousProduct || previousProduct.mbAnterior !== product.mbAnterior) {
    payload.mbAnterior = product.mbAnterior ?? null;
  }
  if (!previousProduct || previousProduct.llamadas !== product.llamadas) {
    payload.llamadas = product.llamadas;
  }
  if (!previousProduct || previousProduct.sms !== product.sms) {
    payload.sms = product.sms;
  }
  if (!previousProduct || previousProduct.hotspot !== product.hotspot) {
    payload.hotspot = product.hotspot;
  }
  if (!previousProduct || previousProduct.redesSociales !== product.redesSociales) {
    payload.redesSociales = product.redesSociales;
  }
  if (!previousProduct || previousProduct.grupo !== product.grupo) {
    payload.grupo = product.grupo;
  }
  if (!previousProduct || previousProduct.isPromo !== product.isPromo) {
    payload.isPromo = product.isPromo ?? false;
  }
  if (!previousProduct || previousProduct.producto !== product.producto) {
    payload.producto = product.producto;
  }

  // ── Visual title fields ───────────────────────────────────────────────────
  // Forwarded so the backend can persist planName / showPlanName when ready.

  if (!previousProduct || previousProduct.visualConfig.planName !== product.visualConfig.planName) {
    payload.planName = product.visualConfig.planName ?? null;
  }
  if (!previousProduct || previousProduct.visualConfig.showPlanName !== product.visualConfig.showPlanName) {
    payload.showPlanName = product.visualConfig.showPlanName ?? false;
  }

  return payload;
}

export function hasPersistableItemChanges(previousProduct: Product, product: Product): boolean {
  return Object.keys(buildItemPatchPayload(product, previousProduct)).length > 0;
}

/**
 * Build the reorder payload for a list of products.
 * Prefers product.mongoId (Mongo _id) as the backend itemId; falls back to offeringId.
 * Only sends products that have a valid backend id (i.e., came from the API).
 */
export function buildReorderPayload(
  products: Product[]
): import("./landing-manager").ApiReorderItem[] {
  return products
    .filter((p) => !!(p.mongoId ?? p.offeringId))
    .map((p, index) => ({
      itemId: p.mongoId ?? p.offeringId,
      order: index + 1,
    }));
}

/**
 * Merge API products with existing mock products.
 *
 * Strategy (updated for full backend contract):
 *  - The backend is the PRIMARY source of truth for all fields it returns.
 *  - Telco fields (monto, dias, mb, llamadas, sms, etc.) are now expected from the API.
 *    A field is considered "provided by the API" when it is NOT undefined (including 0).
 *  - When a telco field is absent (undefined) from the API, the mock value fills the gap
 *    for backward compatibility with older backend seeds.
 *  - Visual/API fields (colors, badgeText, ctaText, active, sortOrder, assets,
 *    visualConfig) ALWAYS come from the API — mock never overrides them.
 *  - `disponible`: API value takes precedence; fallback true when absent.
 *
 * This lets the frontend work during a phased backend rollout:
 * items with full data from the API render entirely from it;
 * items missing optional fields gracefully fall back to mock.
 */
export function mergeApiWithMockProducts(
  mockProducts: Product[],
  apiProducts: ApiMappedProduct[]
): Product[] {
  const mockByOfferingId = new Map(mockProducts.map((p) => [p.offeringId, p]));

  return apiProducts.map((apiProduct) => {
    const mockMatch = mockByOfferingId.get(apiProduct.offeringId);

    // Merge socialNetworks: apply backend customIcon overrides per network id onto mock/default networks.
    const baseSocials = mockMatch?.visualConfig.socialNetworks ?? apiProduct.visualConfig.socialNetworks;
    const mergedSocials = baseSocials.map((sn) => {
      const apiSn = apiProduct.visualConfig.socialNetworks.find((a) => a.id === sn.id);
      if (apiSn?.customIcon) return { ...sn, customIcon: apiSn.customIcon };
      return sn;
    });

    // Determine whether the API item carries each telco field.
    // A field is "provided by API" when it is not undefined (0 is a valid value).
    // This replaces the old `monto > 0` sentinel which incorrectly treated 0 as absent.
    const apiHasMonto = apiProduct.monto !== undefined;
    const apiHasDias = apiProduct.dias !== undefined;
    const apiHasMb = apiProduct.mb !== undefined;
    const apiHasLlamadas = apiProduct.llamadas !== undefined;
    const apiHasSms = apiProduct.sms !== undefined;
    // apiHasTelco: true when the primary numeric telco fields are present from the backend.
    // Used for derived fields that depend on multiple telco values (hotspot display, etc.).
    const apiHasTelco = apiHasMonto && apiHasDias && apiHasMb;

    return {
      // Start from mock when available (preserves local-only visual settings like
      // durationDisplayMode, noColor, extraApps, etc.)
      ...(mockMatch ?? apiProduct),
      // Always prefer API for identity, activity, ordering
      id: mockMatch?.id ?? apiProduct.id,
      offeringId: apiProduct.offeringId,
      // Always forward the Mongo _id from the API product (write endpoints need it)
      mongoId: apiProduct.mongoId,
      active: apiProduct.active,
      sortOrder: apiProduct.sortOrder,
      // API is authoritative for display-text fields (including explicit empty strings)
      nombre: apiProduct.nombre,
      observacion: apiProduct.observacion,
      // Telco: prefer API when the field is defined; fall back to mock otherwise.
      // 0 is a valid value and must NOT be treated as "absent".
      // grupo is always set from API (has a default fallback "ACTIVACION" in the mapper).
      grupo: apiProduct.grupo,
      monto: apiHasMonto ? (apiProduct.monto as number) : (mockMatch?.monto ?? 0),
      dias: apiHasDias ? (apiProduct.dias as number) : (mockMatch?.dias ?? 0),
      mb: apiHasMb ? (apiProduct.mb as number) : (mockMatch?.mb ?? 0),
      mbAnterior: apiHasTelco ? apiProduct.mbAnterior : (mockMatch?.mbAnterior ?? null),
      llamadas: apiHasLlamadas ? (apiProduct.llamadas as number) : (mockMatch?.llamadas ?? 0),
      sms: apiHasSms ? (apiProduct.sms as number) : (mockMatch?.sms ?? 0),
      hotspot: apiHasTelco ? apiProduct.hotspot : (mockMatch?.hotspot ?? false),
      // redesSociales: when the backend seed omits the field, derive from hotspot
      // (business rule: hotspot plans always include social networks).
      redesSociales: apiHasTelco
        ? (apiProduct.redesSociales || apiProduct.hotspot)
        : (mockMatch?.redesSociales ?? false),
      isPromo: apiHasTelco ? apiProduct.isPromo : (mockMatch?.isPromo ?? false),
      producto: apiProduct.producto !== "MOV" ? apiProduct.producto : (mockMatch?.producto ?? "MOV"),
      operadoraId: apiProduct.operadoraId ?? mockMatch?.operadoraId,
      // disponible: API value is authoritative; absent means true
      disponible: apiProduct.disponible ?? true,
      visualConfig: {
        // Start from mock visualConfig for local-only settings
        ...(mockMatch?.visualConfig ?? apiProduct.visualConfig),
        // API fields always override mock visual settings
        primaryColor: apiProduct.visualConfig.primaryColor,
        secondaryColor: apiProduct.visualConfig.secondaryColor,
        badgeText: apiProduct.visualConfig.badgeText,
        // API is authoritative for buttonText (preserves explicit empty strings too)
        buttonText: apiProduct.visualConfig.buttonText,
        badgeFlag:
          apiProduct.visualConfig.badgeFlag.startsWith("http") || apiProduct.visualConfig.badgeFlag.startsWith("/")
            ? apiProduct.visualConfig.badgeFlag
            : (mockMatch?.visualConfig.badgeFlag ?? apiProduct.visualConfig.badgeFlag),
        cardBackgroundImageSrc:
          apiProduct.visualConfig.cardBackgroundImageSrc ?? mockMatch?.visualConfig.cardBackgroundImageSrc,
        // showHotspot: API drives this when telco data is present
        showHotspot: apiHasTelco ? apiProduct.hotspot : (mockMatch?.visualConfig.showHotspot ?? false),
        // showPreviousData: API drives this when telco data is present
        showPreviousData: apiHasTelco
          ? apiProduct.mbAnterior != null
          : (mockMatch?.visualConfig.showPreviousData ?? false),
        // planName / showPlanName: propagate from API visualConfig when present
        ...(apiProduct.visualConfig.planName !== undefined && { planName: apiProduct.visualConfig.planName }),
        ...(apiProduct.visualConfig.showPlanName !== undefined && { showPlanName: apiProduct.visualConfig.showPlanName }),
        // previousDataText omitido: el renderer deriva el texto desde product.mbAnterior.
        socialNetworks: mergedSocials,
      },
    };
  });
}
