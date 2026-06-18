/**
 * lib/mock-data.ts
 *
 * Types and seed data for the landing manager.
 *
 * Phase 4 status:
 *  - Type exports are permanent — used throughout the codebase.
 *  - Seed data (product arrays, section list, device defaults) is KEPT because
 *    the backend is currently an in-memory stub (no real Postgres provisioned).
 *    When a real database is connected, the product/section arrays below should
 *    be replaced with API calls and this file should export TYPES ONLY.
 *
 * @todo Remove seed arrays once the Postgres backend is provisioned.
 */

// Types

// Device card info for Internet sections (HBB / MiFi)
export interface InternetDeviceInfo {
  sectionId: string;
  deviceName: string;
  deviceSubtitle: string;
  deviceImageSrc: string;
  /** Optional background image for the device card (recommended 72×72 px asset) */
  cardBackgroundImageSrc?: string;
  price: string;
  buttonText: string;
  sectionTitle: string;
  sectionSubtitle: string;
  plansTitle: string;
  plansSubtitle: string;
}

export interface SocialNetwork {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  /**
   * Optional custom icon override. When set (URL / Object URL / data URL),
   * the renderer uses this instead of the default `/socials/*.png` asset.
   * Suggested upload size: 160×90 px.
   */
  customIcon?: string;
}

/**
 * Extra app icon — used by the optional "Incluye Apps Streaming" section
 * on a product card. Lets users add custom icons (YouTube, TikTok, Vix, etc.).
 */
export interface ExtraAppIcon {
  /** Stable identifier within the card */
  id: string;
  /** Image URL — preset path, object URL, or data URL */
  iconSrc: string;
  /** Optional human-readable label (used only for alt text) */
  label?: string;
}

export interface ProductVisualConfig {
  template: "default" | "promo" | "hotsale" | "minimal" | "premium" | "internet";
  badgeText: string;
  badgeStyle: "ribbon" | "corner" | "fire" | "promo" | "none";
  badgeFlag: "red" | "orange" | "purple" | "black" | "mundial" | string;
  primaryColor: string;
  secondaryColor: string;
  /** When true, the card gradient is suppressed so the background image has full visual impact */
  noColor?: boolean;
  buttonText: string;
  buttonColor: string;
  buttonTextColor: string;
  showHotspot: boolean;
  /** @deprecated El texto "Comparte Datos" es fijo en la card; este campo ya no es fuente de verdad. */
  hotspotText?: string;
  showPreviousData: boolean;
  /** @deprecated El texto se deriva de `mbAnterior`; este campo ya no es fuente de verdad. */
  previousDataText?: string;
  socialNetworks: SocialNetwork[];
  /** Optional background image for the card (public/backgrounds-images-cards/) */
  cardBackgroundImageSrc?: string;
  /** Intensity of the background image overlay: soft (10%), medium (20%), strong (35%) */
  cardBgIntensity?: "soft" | "medium" | "strong";
  /** Custom background color for the social networks bar. Defaults to secondaryColor. */
  socialBarColor?: string;
  /** Controls how the vigencia text is shown on the card. */
  durationDisplayMode?: "days" | "months-when-possible";
  /**
   * Optional plan name label rendered above the price (e.g. "Plan GOL").
   * When `showPlanName` is false or `planName` is empty, the slot collapses
   * so the layout adjusts dynamically.
   */
  showPlanName?: boolean;
  planName?: string;
  /**
   * Optional "Includes Apps" section between the GB amount and the social bar.
   * Lets users add a small text + a row of icons (e.g. YouTube, TikTok, Vix).
   * When disabled, the slot collapses so the layout adjusts dynamically.
   */
  showExtraApps?: boolean;
  extraAppsText?: string;
  extraApps?: ExtraAppIcon[];
}

export interface Product {
  id: string;
  offeringId: string;
  /**
   * MongoDB `_id` of the backend document — stored when the item comes from the API.
   * Used as the `:itemId` path parameter in all write endpoints (PATCH, DELETE, assets).
   * Falls back to `offeringId` when absent (local-only or legacy items).
   */
  mongoId?: string;
  nombre: string;
  grupo: "ACTIVACION" | "PORTABILIDAD" | "TAE";
  /**
   * Telco fields are optional to support the intermediate pre-merge state when an item
   * comes from the API but hasn't been merged with mock data yet. After mergeApiWithMockProducts
   * all fields are guaranteed to have a numeric value (0 as fallback).
   */
  monto: number;
  dias: number;
  mb: number;
  mbAnterior?: number | null;
  llamadas: number;
  sms: number;
  hotspot: boolean;
  redesSociales: boolean;
  observacion: string;
  producto: "MOV" | "HBB" | "MIFI";
  isPromo?: boolean;
  /**
   * Availability flag. When absent (legacy items or items from before this field was added),
   * defaults to true. `false` = item is explicitly unavailable.
   */
  disponible?: boolean;
  visualConfig: ProductVisualConfig;
  sortOrder: number;
  active: boolean;
  /**
   * ID_OPERADORA — used by the recargas section to split products into tabs.
   * 203 = Celular | 211 = Celular (segunda operadora, mismo tab que 203) |
   * 217 = Paquetes | 302 = Internet en casa | 304 = Internet móvil
   * Only required for recargas products; undefined for all other sections.
   */
  operadoraId?: number;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  productCount: number;
  lastPublished: string | null;
  status: "draft" | "published" | "modified";
  cardStyles?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
  assets?: {
    backgroundImage?: {
      url: string;
      alt?: string;
    } | null;
  };
}

export interface LandingVersion {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  snapshotJson: object;
}

// Default social networks
export const defaultSocialNetworks: SocialNetwork[] = [
  { id: "facebook", name: "Facebook", icon: "facebook", color: "#1877F2", enabled: true },
  { id: "whatsapp", name: "WhatsApp", icon: "whatsapp", color: "#25D366", enabled: true },
  { id: "instagram", name: "Instagram", icon: "instagram", color: "#E4405F", enabled: true },
  { id: "messenger", name: "Messenger", icon: "messenger", color: "#0084FF", enabled: true },
  { id: "telegram", name: "Telegram", icon: "telegram", color: "#0088CC", enabled: true },
  { id: "snapchat", name: "Snapchat", icon: "snapchat", color: "#FFFC00", enabled: true },
  { id: "x", name: "X", icon: "x", color: "#000000", enabled: true },
];

// Sections data
export const sections: Section[] = [
  {
    id: "activacion",
    name: "Cliente Nuevo",
    slug: "cliente-nuevo",
    description: "Planes para activacion de linea nueva",
    icon: "user-plus",
    sortOrder: 1,
    productCount: 7,
    lastPublished: "2026-05-30T14:30:00Z",
    status: "published",
  },
  {
    id: "portabilidad",
    name: "Cambiate",
    slug: "cambiate",
    description: "Planes de portabilidad con beneficios extra",
    icon: "refresh-cw",
    sortOrder: 2,
    productCount: 7,
    lastPublished: "2026-05-30T14:30:00Z",
    status: "modified",
  },
  {
    id: "paquetes",
    name: "Paquetes",
    slug: "paquetes",
    description: "Planes autorecargables por periodos extendidos",
    icon: "package",
    sortOrder: 3,
    productCount: 18,
    lastPublished: "2026-05-28T10:15:00Z",
    status: "published",
  },
  {
    id: "recargas",
    name: "Recargas",
    slug: "recargas",
    description: "Recargas para usuarios existentes",
    icon: "zap",
    sortOrder: 4,
    productCount: 30,
    lastPublished: "2026-05-29T16:45:00Z",
    status: "draft",
  },
  {
    id: "internetencasa",
    name: "Internet en Casa",
    slug: "internet-casa",
    description: "Soluciones HBB con router incluido",
    icon: "home",
    sortOrder: 5,
    productCount: 4,
    lastPublished: "2026-05-25T09:00:00Z",
    status: "published",
  },
  {
    id: "internetportatil",
    name: "Internet Portatil",
    slug: "internet-portatil",
    description: "Soluciones MiFi para conectividad movil",
    icon: "wifi",
    sortOrder: 6,
    productCount: 4,
    lastPublished: "2026-05-25T09:00:00Z",
    status: "published",
  },
];

export const DEFAULT_VISUAL_CONFIG_COLORS = {
  primaryColor: "#f97316",
  secondaryColor: "#ea580c",
} as const;

// Helper to create visual config
function createVisualConfig(overrides: Partial<ProductVisualConfig> = {}): ProductVisualConfig {
  return {
    template: "default",
    badgeText: "",
    badgeStyle: "none",
    badgeFlag: "red",
    primaryColor: DEFAULT_VISUAL_CONFIG_COLORS.primaryColor,
    secondaryColor: DEFAULT_VISUAL_CONFIG_COLORS.secondaryColor,
    buttonText: "LO QUIERO",
    buttonColor: "#ffffff",
    buttonTextColor: "#000000",
    showHotspot: true,
    // hotspotText: texto fijo "Comparte Datos" — no es la fuente de verdad.
    showPreviousData: false,
    // previousDataText: texto derivado de mbAnterior en el renderer — no es la fuente de verdad.
    durationDisplayMode: "days",
    socialNetworks: JSON.parse(JSON.stringify(defaultSocialNetworks)),
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────
// ACTIVACION — 7 productos (ID_OPERADORA: 204 / 212)
// Base color: "Cliente nuevo default" → #7432e8 / #411c82
// ────────────────────────────────────────────────────────────────────
export const activacionProducts: Product[] = [
  {
    id: "act-1",
    offeringId: "1709903032",
    nombre: "Axios linea nueva",
    grupo: "ACTIVACION",
    monto: 100,
    dias: 30,
    mb: 6144,
    mbAnterior: 3072,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*PRECIO ESPECIAL DE $120 A $100* Redes soc ilim. + 3GB por 30dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "GB EXTRAS\n+ DESCUENTO $!",
      badgeStyle: "ribbon",
      badgeFlag: "red",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
      showPreviousData: true,
      previousDataText: "Antes 3 GB",
    }),
    sortOrder: 1,
    active: true,
  },
  {
    id: "act-2",
    offeringId: "1709902243",
    nombre: "Axios linea nueva mas megas",
    grupo: "ACTIVACION",
    monto: 100,
    dias: 15,
    mb: 10240,
    mbAnterior: 5120,
    llamadas: 23100,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Incluye Redes Sociales Ilimitadas+ 5GB por 15 dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "!DOBLES GB!",
      badgeStyle: "ribbon",
      badgeFlag: "red",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
      showPreviousData: true,
      previousDataText: "Antes 5 GB",
    }),
    sortOrder: 2,
    active: true,
  },
  {
    id: "act-3",
    offeringId: "1709902244",
    nombre: "Axios linea nueva 10GB",
    grupo: "ACTIVACION",
    monto: 130,
    dias: 15,
    mb: 10240,
    mbAnterior: null,
    llamadas: 23100,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +10GB por 15 dias.",
    producto: "MOV",
    isPromo: false,
    visualConfig: createVisualConfig({
      badgeText: "+10GB EXTRA",
      badgeStyle: "ribbon",
      badgeFlag: "red",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
    }),
    sortOrder: 3,
    active: true,
  },
  {
    id: "act-4",
    offeringId: "1709902246",
    nombre: "Axios linea nueva 4GB",
    grupo: "ACTIVACION",
    monto: 150,
    dias: 30,
    mb: 4096,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +4GB por 30 dias.",
    producto: "MOV",
    isPromo: false,
    visualConfig: createVisualConfig({
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
    }),
    sortOrder: 4,
    active: true,
  },
  {
    id: "act-5",
    offeringId: "1709902247",
    nombre: "Axios linea nueva 12GB",
    grupo: "ACTIVACION",
    monto: 190,
    dias: 30,
    mb: 12288,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Red Soc Ilim +12GB por 30 dias.",
    producto: "MOV",
    isPromo: false,
    visualConfig: createVisualConfig({
      badgeText: "MAS VENDIDO",
      badgeStyle: "fire",
      badgeFlag: "black",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
    }),
    sortOrder: 5,
    active: true,
  },
  {
    id: "act-6",
    offeringId: "1709902248",
    nombre: "Axios linea nueva 24GB",
    grupo: "ACTIVACION",
    monto: 250,
    dias: 30,
    mb: 24576,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +24GB por 30 dias.",
    producto: "MOV",
    isPromo: false,
    visualConfig: createVisualConfig({
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
    }),
    sortOrder: 6,
    active: true,
  },
  {
    id: "act-7",
    offeringId: "1709902250",
    nombre: "Axios linea nueva 50GB",
    grupo: "ACTIVACION",
    monto: 500,
    dias: 30,
    mb: 51200,
    mbAnterior: null,
    llamadas: 49700,
    sms: 6000,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +50GB por 30 dias.",
    producto: "MOV",
    isPromo: false,
    visualConfig: createVisualConfig({
      badgeText: "",
      badgeStyle: "none",
      badgeFlag: "black",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
    }),
    sortOrder: 7,
    active: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// PORTABILIDAD — 7 productos (todos isPromo: true)
// Base color: "Cámbiate default" → #aa01fe / #731c82
// ────────────────────────────────────────────────────────────────────
export const portabilidadProducts: Product[] = [
  {
    id: "port-1",
    offeringId: "1709903032",
    nombre: "Axios portabilidad",
    grupo: "PORTABILIDAD",
    monto: 100,
    dias: 30,
    mb: 9216,
    mbAnterior: 3072,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO PRECIO ESPECIAL* Redes soc ilim +9GB por 30dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "!TRIPLE GB!",
      badgeStyle: "fire",
      badgeFlag: "red",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 3 GB",
    }),
    sortOrder: 1,
    active: true,
  },
  {
    id: "port-2",
    offeringId: "1809905493",
    nombre: "Axios portabilidad mas megas",
    grupo: "PORTABILIDAD",
    monto: 100,
    dias: 15,
    mb: 7500,
    mbAnterior: 5000,
    llamadas: 23100,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +7.5GB por 15 dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "DOBLE GB",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 5 GB",
    }),
    sortOrder: 2,
    active: true,
  },
  {
    id: "port-3",
    offeringId: "1709902244",
    nombre: "Axios portabilidad 15GB",
    grupo: "PORTABILIDAD",
    monto: 130,
    dias: 15,
    mb: 15360,
    mbAnterior: 10240,
    llamadas: 23100,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +15GB por 15 dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "+15GB",
      badgeStyle: "ribbon",
      badgeFlag: "red",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 10 GB",
    }),
    sortOrder: 3,
    active: true,
  },
  {
    id: "port-4",
    offeringId: "1709902246",
    nombre: "Axios portabilidad 12GB",
    grupo: "PORTABILIDAD",
    monto: 150,
    dias: 30,
    mb: 12288,
    mbAnterior: 4096,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +12GB por 30 dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "!TRIPLE!",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 4 GB",
    }),
    sortOrder: 4,
    active: true,
  },
  {
    id: "port-5",
    offeringId: "1709902247",
    nombre: "Axios portabilidad 36GB",
    grupo: "PORTABILIDAD",
    monto: 190,
    dias: 30,
    mb: 36864,
    mbAnterior: 12288,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +36GB por 30dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIPLE GB",
      badgeStyle: "fire",
      badgeFlag: "black",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 12 GB",
    }),
    sortOrder: 5,
    active: true,
  },
  {
    id: "port-6",
    offeringId: "1709902248",
    nombre: "Axios portabilidad 48GB",
    grupo: "PORTABILIDAD",
    monto: 250,
    dias: 30,
    mb: 49152,
    mbAnterior: 24576,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +48GB por 30 dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "DOBLE GB",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 24 GB",
    }),
    sortOrder: 6,
    active: true,
  },
  {
    id: "port-7",
    offeringId: "1709902250",
    nombre: "Axios portabilidad 100GB",
    grupo: "PORTABILIDAD",
    monto: 500,
    dias: 30,
    mb: 102400,
    mbAnterior: 51200,
    llamadas: 49700,
    sms: 6000,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +100GB por 30 dias.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "!100GB!",
      badgeStyle: "fire",
      badgeFlag: "red",
      primaryColor: "#aa01fe",
      secondaryColor: "#731c82",
      showPreviousData: true,
      previousDataText: "Antes 50 GB",
    }),
    sortOrder: 7,
    active: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// PAQUETES — 18 productos (planes 90/180/365 dias activacion+portabilidad)
//
// Fuente: catálogo real compartido por el usuario (Jun 2026)
//   ID_OPERADORA 215 → Grupo ACTIVACION (línea nueva)
//   ID_OPERADORA 216 → Grupo PORTABILIDAD
//
// Precios reales (MXN):
//   Trimestral  90d: $450 / $550 / $730
//   Semestral  180d: $900 / $1100 / $1450
//   Anual      365d: $1500 / $2000 / $2500
//
// MB del payload (idénticos entre periodos y grupos — la diferencia es la vigencia):
//   Tier 1: 4096 MB  (4 GB)
//   Tier 2: 12288 MB (12 GB)
//   Tier 3: 24576 MB (24 GB)
//
// ACTIVACION: mbAnterior null (no hay oferta anterior declarada en el payload)
// PORTABILIDAD: mbAnterior = mismo valor base → muestra "Antes X GB" como referencia
// isPromo: true en todos (el payload los marca como promocionales)
// hotspot: true en todos | redesSociales: true en todos
// ────────────────────────────────────────────────────────────────────
export const paquetesProducts: Product[] = [
  // ═══════════════════════════════════════════════════════════════
  // ACTIVACION — ID_OPERADORA 215 — Grupo ACTIVACION
  // Base colors por periodo:
  //   Trimestral → "Paquetes trimestral"  #e88ac7 / #d45baf
  //   Semestral  → "Paquetes semestral"   #d94fb3 / #b02b8e
  //   Anual      → "Paquetes anual"       #8b1c6f / #5a1048
  // ═══════════════════════════════════════════════════════════════

  // --- Trimestral 90 días ---
  {
    id: "paq-1",
    offeringId: "1709904101",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 450,
    dias: 90,
    mb: 4096,         // 4 GB — payload tier 1
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +4GB por 90 dias. Plan trimestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#e88ac7",
      secondaryColor: "#d45baf",
    }),
    sortOrder: 1,
    active: true,
  },
  {
    id: "paq-2",
    offeringId: "1709904102",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 550,
    dias: 90,
    mb: 12288,        // 12 GB — payload tier 2
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +12GB por 90 dias. Plan trimestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#e88ac7",
      secondaryColor: "#d45baf",
    }),
    sortOrder: 2,
    active: true,
  },
  {
    id: "paq-3",
    offeringId: "1709904103",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 730,
    dias: 90,
    mb: 24576,        // 24 GB — payload tier 3
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +24GB por 90 dias. Plan trimestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#e88ac7",
      secondaryColor: "#d45baf",
    }),
    sortOrder: 3,
    active: true,
  },

  // --- Semestral 180 días ---
  {
    id: "paq-4",
    offeringId: "1709904104",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 900,
    dias: 180,
    mb: 4096,         // 4 GB — payload tier 1
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +4GB por 180 dias. Plan semestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#d94fb3",
      secondaryColor: "#b02b8e",
    }),
    sortOrder: 4,
    active: true,
  },
  {
    id: "paq-5",
    offeringId: "1709904105",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 1100,
    dias: 180,
    mb: 12288,        // 12 GB — payload tier 2
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +12GB por 180 dias. Plan semestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#d94fb3",
      secondaryColor: "#b02b8e",
    }),
    sortOrder: 5,
    active: true,
  },
  {
    id: "paq-6",
    offeringId: "1709904106",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 1450,
    dias: 180,
    mb: 24576,        // 24 GB — payload tier 3
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +24GB por 180 dias. Plan semestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#d94fb3",
      secondaryColor: "#b02b8e",
    }),
    sortOrder: 6,
    active: true,
  },

  // --- Anual 365 días ---
  {
    id: "paq-7",
    offeringId: "1709904107",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 1500,
    dias: 365,
    mb: 4096,         // 4 GB — payload tier 1
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +4GB por 365 dias. Plan anual.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#8b1c6f",
      secondaryColor: "#5a1048",
    }),
    sortOrder: 7,
    active: true,
  },
  {
    id: "paq-8",
    offeringId: "1709904108",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 2000,
    dias: 365,
    mb: 12288,        // 12 GB — payload tier 2
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +12GB por 365 dias. Plan anual.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#8b1c6f",
      secondaryColor: "#5a1048",
    }),
    sortOrder: 8,
    active: true,
  },
  {
    id: "paq-9",
    offeringId: "1709904109",
    nombre: "Axios planes nueva linea",
    grupo: "ACTIVACION",
    monto: 2500,
    dias: 365,
    mb: 24576,        // 24 GB — payload tier 3
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +24GB por 365 dias. Plan anual.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#8b1c6f",
      secondaryColor: "#5a1048",
    }),
    sortOrder: 9,
    active: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // PORTABILIDAD — ID_OPERADORA 216 — Grupo PORTABILIDAD
  // mbAnterior = mismo MB base (el payload lo declara como oferta anterior)
  // Base colors por periodo:
  //   Trimestral → "Paquetes portabilidad trimestral" #b08af5 / #8c5bef
  //   Semestral  → "Paquetes portabilidad semestral"  #a97bf8 / #7432e8
  //   Anual      → "Paquetes portabilidad anual"      #7432e8 / #411c82
  // ═══════════════════════════════════════════════════════════════

  // --- Trimestral 90 días ---
  {
    id: "paq-10",
    offeringId: "1709904201",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 450,
    dias: 90,
    mb: 4096,         // 4 GB — payload tier 1
    mbAnterior: 4096,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +4GB por 90 dias. Plan trimestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#b08af5",
      secondaryColor: "#8c5bef",
      showPreviousData: true,
      previousDataText: "Antes 4 GB",
    }),
    sortOrder: 10,
    active: true,
  },
  {
    id: "paq-11",
    offeringId: "1709904202",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 550,
    dias: 90,
    mb: 12288,        // 12 GB — payload tier 2
    mbAnterior: 12288,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +12GB por 90 dias. Plan trimestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#b08af5",
      secondaryColor: "#8c5bef",
      showPreviousData: true,
      previousDataText: "Antes 12 GB",
    }),
    sortOrder: 11,
    active: true,
  },
  {
    id: "paq-12",
    offeringId: "1709904203",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 730,
    dias: 90,
    mb: 24576,        // 24 GB — payload tier 3
    mbAnterior: 24576,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +24GB por 90 dias. Plan trimestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#b08af5",
      secondaryColor: "#8c5bef",
      showPreviousData: true,
      previousDataText: "Antes 24 GB",
    }),
    sortOrder: 12,
    active: true,
  },

  // --- Semestral 180 días ---
  {
    id: "paq-13",
    offeringId: "1709904204",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 900,
    dias: 180,
    mb: 4096,         // 4 GB — payload tier 1
    mbAnterior: 4096,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +4GB por 180 dias. Plan semestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#a97bf8",
      secondaryColor: "#7432e8",
      showPreviousData: true,
      previousDataText: "Antes 4 GB",
    }),
    sortOrder: 13,
    active: true,
  },
  {
    id: "paq-14",
    offeringId: "1709904205",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 1100,
    dias: 180,
    mb: 12288,        // 12 GB — payload tier 2
    mbAnterior: 12288,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +12GB por 180 dias. Plan semestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#a97bf8",
      secondaryColor: "#7432e8",
      showPreviousData: true,
      previousDataText: "Antes 12 GB",
    }),
    sortOrder: 14,
    active: true,
  },
  {
    id: "paq-15",
    offeringId: "1709904206",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 1450,
    dias: 180,
    mb: 24576,        // 24 GB — payload tier 3
    mbAnterior: 24576,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +24GB por 180 dias. Plan semestral.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#a97bf8",
      secondaryColor: "#7432e8",
      showPreviousData: true,
      previousDataText: "Antes 24 GB",
    }),
    sortOrder: 15,
    active: true,
  },

  // --- Anual 365 días ---
  {
    id: "paq-16",
    offeringId: "1709904207",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 1500,
    dias: 365,
    mb: 4096,         // 4 GB — payload tier 1
    mbAnterior: 4096,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +4GB por 365 dias. Plan anual.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "black",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
      showPreviousData: true,
      previousDataText: "Antes 4 GB",
    }),
    sortOrder: 16,
    active: true,
  },
  {
    id: "paq-17",
    offeringId: "1709904208",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 2000,
    dias: 365,
    mb: 12288,        // 12 GB — payload tier 2
    mbAnterior: 12288,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +12GB por 365 dias. Plan anual.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "black",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
      showPreviousData: true,
      previousDataText: "Antes 12 GB",
    }),
    sortOrder: 17,
    active: true,
  },
  {
    id: "paq-18",
    offeringId: "1709904209",
    nombre: "Axios planes portabilidad",
    grupo: "PORTABILIDAD",
    monto: 2500,
    dias: 365,
    mb: 24576,        // 24 GB — payload tier 3
    mbAnterior: 24576,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "*EN TU CAMBIO* Redes soc ilim +24GB por 365 dias. Plan anual.",
    producto: "MOV",
    isPromo: true,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "black",
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
      showPreviousData: true,
      previousDataText: "Antes 24 GB",
    }),
    sortOrder: 18,
    active: true,
  },
];

// ════════════════════════════════════════════════════════════════════
// RECARGAS — productos (203+211 Celular) + (217 Paquetes) + (302 HBB) + (304 MiFi)
//
// operadoraId mapping:
//   203 = Celular — recargas móviles estándar (TAE)
//   211 = Celular — segunda operadora celular (mismo catálogo visible que 203)
//   217 = Paquetes — recargas de paquetes extendidos
//   302 = Internet en casa — recargas HBB
//   304 = Internet móvil — recargas MiFi
//
// El tab "Celular" en la UI agrupa 203 Y 211 juntos.
// Base color: "Recargas celular" → #45ccff / #632a99 (cyan → purple)
// ════════════════════════════════════════════════════════════════════
export const recargasProducts: Product[] = [
  // ═══════════════════════════════════════════════════════════════
  // ID_OPERADORA 203 — Celular
  // Catálogo exacto (14 recargas): 100x30, 100x15, 130x15, 120x30,
  // 150x30, 190x30, 250x30, 300x30, 500x30, 70x7, 50x7, 40x3, 30x3, 15x1
  // ═══════════════════════════════════════════════════════════════
  {
    id: "rec-1",
    offeringId: "1809905495",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 100,
    dias: 30,
    mb: 2048,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +2GB por 30 dias. Del 3 al 30 junio +2GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS a MX, EEUU y CAN. Permite compartir datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 1,
    active: true,
  },
  {
    id: "rec-2",
    offeringId: "1809905493",
    nombre: "Axios mas megas",
    grupo: "TAE",
    monto: 100,
    dias: 15,
    mb: 5120,
    mbAnterior: null,
    llamadas: 23100,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +5GB por 15 dias.",
    producto: "MOV",
    isPromo: false,
    operadoraId: 211,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 2,
    active: true,
  },
  {
    id: "rec-3",
    offeringId: "1809905494",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 130,
    dias: 15,
    mb: 10240,
    mbAnterior: null,
    llamadas: 23100,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +10GB por 15 días. Del 3 al 30 junio +10GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN. Permite compartir datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 3,
    active: true,
  },
  {
    id: "rec-8",
    offeringId: "1809907218",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 120,
    dias: 30,
    mb: 3072,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +3GB por 30 dias. Del 3 al 30 junio +3GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS a MX, EEUU y CAN. Permite compartir datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: true,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      badgeText: "PROMO",
      badgeStyle: "ribbon",
      badgeFlag: "red",
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 4,
    active: true,
  },
  {
    id: "rec-4",
    offeringId: "1809905496",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 150,
    dias: 30,
    mb: 4096,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +4GB por 30 días. Del 3 al 30 junio +4GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN| Permite Compartir Datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 5,
    active: true,
  },
  {
    id: "rec-5",
    offeringId: "1809905497",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 190,
    dias: 30,
    mb: 12288,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes Sociales Ilimitadas +12GB por 30 días. Del 3 al 30 junio +12GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN|. Permite compartir datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      badgeText: "POPULAR",
      badgeStyle: "fire",
      badgeFlag: "red",
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 6,
    active: true,
  },
  {
    id: "rec-6",
    offeringId: "1809905498",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 250,
    dias: 30,
    mb: 24576,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +24GB por 30 días. Del 3 al 30 junio +24GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 7,
    active: true,
  },
  {
    id: "rec-23",
    offeringId: "1809905499",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 300,
    dias: 30,
    mb: 35840,
    mbAnterior: null,
    llamadas: 49700,
    sms: 6000,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +35GB por 30 días. Del 3 al 30 junio +35GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 8,
    active: true,
  },
  {
    id: "rec-7",
    offeringId: "1809905500",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 500,
    dias: 30,
    mb: 51200,
    mbAnterior: null,
    llamadas: 49700,
    sms: 6000,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc. ilim. +50GB por 30 dias.",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      badgeText: "MAX",
      badgeStyle: "ribbon",
      badgeFlag: "red",
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 9,
    active: true,
  },
  {
    id: "rec-cel-7d-70",
    offeringId: "1809905492",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 70,
    dias: 7,
    mb: 6144,
    mbAnterior: null,
    llamadas: 10830,
    sms: 875,
    hotspot: true,
    redesSociales: true,
    observacion: "Incluye Redes Sociales Ilimitadas+ 6GBpor 7 días, | llamadas y SMS MX EEUU CAN.https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 10,
    active: true,
  },
  {
    id: "rec-cel-7d-50",
    offeringId: "1809905491",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 50,
    dias: 7,
    mb: 2048,
    mbAnterior: null,
    llamadas: 10830,
    sms: 875,
    hotspot: true,
    redesSociales: true,
    observacion: "Incluye Redes Sociales Ilimitadas+ 2GBpor 7 días, | llamadas y SMS MX EEUU CAN.https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
    }),
    sortOrder: 11,
    active: true,
  },
  {
    id: "rec-cel-3d-40",
    offeringId: "1809905490",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 40,
    dias: 3,
    mb: 2048,
    mbAnterior: null,
    llamadas: 250,
    sms: 125,
    hotspot: false,
    redesSociales: true,
    observacion: "2GB para navegar y redes sociales por 3 días. Llamadas y SMS incluidos a MX, EEUU y CAN.www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      showHotspot: false,
      buttonText: "RECARGAR",
    }),
    sortOrder: 12,
    active: true,
  },
  {
    id: "rec-cel-3d-30",
    offeringId: "1809906799",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 30,
    dias: 3,
    mb: 512,
    mbAnterior: null,
    llamadas: 250,
    sms: 125,
    hotspot: false,
    redesSociales: true,
    observacion: "Incluye Redes Sociales (500 MB) + 500 MB de Navegación, 250 min de voz y 125 SMS. Vigencia de 3 días. Permite compartir datos. Visita https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      showHotspot: false,
      buttonText: "RECARGAR",
    }),
    sortOrder: 13,
    active: true,
  },
  {
    id: "rec-cel-1d-15",
    offeringId: "1809906798",
    nombre: "Usuario recarga contigo",
    grupo: "TAE",
    monto: 15,
    dias: 1,
    mb: 512,
    mbAnterior: null,
    llamadas: 50,
    sms: 25,
    hotspot: false,
    redesSociales: true,
    observacion: "Incluye Redes Sociales (500 MB) + 500 MB de Navegación, 50 min de voz y 25 SMS. Vigencia de 1 día. Visita https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: false,
    operadoraId: 203,
    visualConfig: createVisualConfig({
      primaryColor: "#45ccff",
      secondaryColor: "#632a99",
      showHotspot: false,
      buttonText: "RECARGAR",
    }),
    sortOrder: 14,
    active: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // ID_OPERADORA 217 — Paquetes
  // Base color: "Recargas paquetes" → graduated purple/blue tones
  // ═══════════════════════════════════════════════════════════════
  {
    id: "rec-paq-1",
    offeringId: "1809905245",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 450,
    dias: 90,
    mb: 4096,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +4GB por 90 dias. Paquete trimestral.",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#694bd2",
      secondaryColor: "#8455b4",
      buttonText: "RECARGAR",
    }),
    sortOrder: 31,
    active: true,
  },
  {
    id: "rec-paq-2",
    offeringId: "1809905247",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 550,
    dias: 90,
    mb: 12288,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +12GB por 90 dias. Paquete trimestral.",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#694bd2",
      secondaryColor: "#8455b4",
      buttonText: "RECARGAR",
    }),
    sortOrder: 32,
    active: true,
  },
  {
    id: "rec-paq-2b",
    offeringId: "1809905249",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 730,
    dias: 90,
    mb: 24576,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +24GB por 90 dias. Paquete trimestral.",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "TRIMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#694bd2",
      secondaryColor: "#8455b4",
      buttonText: "RECARGAR",
    }),
    sortOrder: 32,
    active: true,
  },
  {
    id: "rec-paq-3",
    offeringId: "1809905246",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 900,
    dias: 180,
    mb: 4096,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +4GB por 180 dias. Paquete semestral.",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#4020b4",
      secondaryColor: "#5f328c",
      buttonText: "RECARGAR",
    }),
    sortOrder: 33,
    active: true,
  },
  {
    id: "rec-paq-4",
    offeringId: "1809905248",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 1100,
    dias: 180,
    mb: 12288,
    mbAnterior: null,
    llamadas: 45450,
    sms: 1750,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +12GB por 180 dias. Paquete semestral.",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#4020b4",
      secondaryColor: "#5f328c",
      buttonText: "RECARGAR",
    }),
    sortOrder: 34,
    active: true,
  },
  {
    id: "rec-paq-4b",
    offeringId: "1809905250",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 1450,
    dias: 180,
    mb: 24576,
    mbAnterior: 24576,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Plan autorecargable 6 meses. Incluye Redes SocIlim +24GB de Navegación por 30 días| llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "SEMESTRAL",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#4020b4",
      secondaryColor: "#5f328c",
      buttonText: "RECARGAR",
    }),
    sortOrder: 35,
    active: true,
  },
  {
    id: "rec-paq-5",
    offeringId: "1809906804",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 1500,
    dias: 365,
    mb: 4096,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Plan Anual autorecargable.Redes Sociales Ilimitadas +4GB de Navegación por 30 días| llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#1f008d",
      secondaryColor: "#3e1562",
      buttonText: "RECARGAR",
    }),
    sortOrder: 36,
    active: true,
  },
  {
    id: "rec-paq-5b",
    offeringId: "1809906805",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 2000,
    dias: 365,
    mb: 12288,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Plan Anual autorecargable.Redes Sociales Ilimitadas +12GB de Navegación por 30 días| llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "ribbon",
      badgeFlag: "orange",
      primaryColor: "#1f008d",
      secondaryColor: "#3e1562",
      buttonText: "RECARGAR",
    }),
    sortOrder: 37,
    active: true,
  },
  {
    id: "rec-paq-6",
    offeringId: "1809906806",
    nombre: "Axios planes",
    grupo: "TAE",
    monto: 2500,
    dias: 365,
    mb: 24576,
    mbAnterior: null,
    llamadas: 45450,
    sms: 3500,
    hotspot: true,
    redesSociales: true,
    observacion: "Redes soc ilim +24GB por 365 dias. Paquete anual.",
    producto: "MOV",
    isPromo: true,
    operadoraId: 217,
    visualConfig: createVisualConfig({
      badgeText: "ANUAL",
      badgeStyle: "fire",
      badgeFlag: "orange",
      primaryColor: "#1f008d",
      secondaryColor: "#3e1562",
      buttonText: "RECARGAR",
    }),
    sortOrder: 38,
    active: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // ID_OPERADORA 302 — Internet en casa
  // Base color: "Recargas internet en casa" → #9152ff / #632a99
  // ═══════════════════════════════════════════════════════════════
  {
    id: "rec-hbb-1",
    offeringId: "1200501128",
    nombre: "Internet Hogar",
    grupo: "TAE",
    monto: 99,
    dias: 7,
    mb: 20480,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "20GB por 7 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
    producto: "HBB",
    isPromo: false,
    operadoraId: 302,
    visualConfig: createVisualConfig({
      primaryColor: "#9152ff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
      showHotspot: true,
    }),
    sortOrder: 37,
    active: true,
  },
  {
    id: "rec-hbb-2",
    offeringId: "1200501130",
    nombre: "Internet Hogar",
    grupo: "TAE",
    monto: 369,
    dias: 30,
    mb: 81920,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "80GB por 30 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
    producto: "HBB",
    isPromo: false,
    operadoraId: 302,
    visualConfig: createVisualConfig({
      primaryColor: "#9152ff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
      showHotspot: true,
    }),
    sortOrder: 38,
    active: true,
  },
  {
    id: "rec-hbb-3",
    offeringId: "1200501425",
    nombre: "Internet Hogar",
    grupo: "TAE",
    monto: 439,
    dias: 30,
    mb: 122880,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "120GB por 30 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
    producto: "HBB",
    isPromo: false,
    operadoraId: 302,
    visualConfig: createVisualConfig({
      primaryColor: "#9152ff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
      showHotspot: true,
    }),
    sortOrder: 39,
    active: true,
  },
  {
    id: "rec-hbb-4",
    offeringId: "1200501426",
    nombre: "Internet Hogar",
    grupo: "TAE",
    monto: 469,
    dias: 30,
    mb: 143360,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "140GB por 30 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
    producto: "HBB",
    isPromo: false,
    operadoraId: 302,
    visualConfig: createVisualConfig({
      badgeText: "POPULAR",
      badgeStyle: "fire",
      badgeFlag: "purple",
      primaryColor: "#9152ff",
      secondaryColor: "#632a99",
      buttonText: "RECARGAR",
      showHotspot: true,
    }),
    sortOrder: 40,
    active: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // ID_OPERADORA 304 — Internet móvil (MiFi)
  // Base color: "Recargas internet móvil" → #ff4dca / #841ce6
  // ═══════════════════════════════════════════════════════════════
  {
    id: "rec-mifi-1",
    offeringId: "1509901724",
    nombre: "Internet Movil",
    grupo: "TAE",
    monto: 119,
    dias: 30,
    mb: 5000,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "5GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
    producto: "MIFI",
    isPromo: false,
    operadoraId: 304,
    visualConfig: createVisualConfig({
      primaryColor: "#ff4dca",
      secondaryColor: "#841ce6",
      buttonText: "RECARGAR",
      showHotspot: false,
    }),
    sortOrder: 40,
    active: true,
  },
  {
    id: "rec-mifi-2",
    offeringId: "1509901725",
    nombre: "Internet Movil",
    grupo: "TAE",
    monto: 229,
    dias: 30,
    mb: 10000,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "10GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
    producto: "MIFI",
    isPromo: false,
    operadoraId: 304,
    visualConfig: createVisualConfig({
      primaryColor: "#ff4dca",
      secondaryColor: "#841ce6",
      buttonText: "RECARGAR",
      showHotspot: false,
    }),
    sortOrder: 41,
    active: true,
  },
  {
    id: "rec-mifi-3",
    offeringId: "1509901726",
    nombre: "Internet Movil",
    grupo: "TAE",
    monto: 359,
    dias: 30,
    mb: 20000,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "20GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
    producto: "MIFI",
    isPromo: false,
    operadoraId: 304,
    visualConfig: createVisualConfig({
      badgeText: "POPULAR",
      badgeStyle: "fire",
      badgeFlag: "purple",
      primaryColor: "#ff4dca",
      secondaryColor: "#841ce6",
      buttonText: "RECARGAR",
      showHotspot: false,
    }),
    sortOrder: 43,
    active: true,
  },
  {
    id: "rec-mifi-4",
    offeringId: "1509901727",
    nombre: "Internet Movil",
    grupo: "TAE",
    monto: 559,
    dias: 30,
    mb: 50000,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "50GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
    producto: "MIFI",
    isPromo: false,
    operadoraId: 304,
    visualConfig: createVisualConfig({
      badgeText: "MAX",
      badgeStyle: "ribbon",
      badgeFlag: "purple",
      primaryColor: "#ff4dca",
      secondaryColor: "#841ce6",
      buttonText: "RECARGAR",
      showHotspot: false,
    }),
    sortOrder: 44,
    active: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// INTERNET EN CASA — 4 productos HBB
// Paleta: #4AB1D0 → #265A6A
// ────────────────────────────────────────────────────────────────────
export const internetEnCasaProducts: Product[] = [
  {
    id: "hbb-1",
    offeringId: "2001001001",
    nombre: "Internet Casa 10GB",
    grupo: "ACTIVACION",
    monto: 99,
    dias: 30,
    mb: 10240,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: false,
    redesSociales: false,
    observacion: "Plan Internet en Casa 10GB por 30 dias.",
    producto: "HBB",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#4AB1D0",
      secondaryColor: "#265A6A",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 1,
    active: true,
  },
  {
    id: "hbb-2",
    offeringId: "2001001002",
    nombre: "Internet Casa 40GB",
    grupo: "ACTIVACION",
    monto: 369,
    dias: 30,
    mb: 40960,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: false,
    redesSociales: false,
    observacion: "Plan Internet en Casa 40GB por 30 dias.",
    producto: "HBB",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#3A9DB8",
      secondaryColor: "#1E4A58",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 2,
    active: true,
  },
  {
    id: "hbb-3",
    offeringId: "2001001003",
    nombre: "Internet Casa 50GB",
    grupo: "ACTIVACION",
    monto: 439,
    dias: 30,
    mb: 51200,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: false,
    redesSociales: false,
    observacion: "Plan Internet en Casa 50GB por 30 dias.",
    producto: "HBB",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#2A8DA8",
      secondaryColor: "#154252",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 3,
    active: true,
  },
  {
    id: "hbb-4",
    offeringId: "2001001004",
    nombre: "Internet Casa 60GB",
    grupo: "ACTIVACION",
    monto: 469,
    dias: 30,
    mb: 61440,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: false,
    redesSociales: false,
    observacion: "Plan Internet en Casa 60GB por 30 dias.",
    producto: "HBB",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#1A7D98",
      secondaryColor: "#0C3A46",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 4,
    active: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// INTERNET PORTATIL — 4 productos MIFI
// Paleta: #411FBE → #1E0E58
// ────────────────────────────────────────────────────────────────────
export const internetPortatilProducts: Product[] = [
  {
    id: "mifi-1",
    offeringId: "3001001001",
    nombre: "Internet Portatil 10GB",
    grupo: "ACTIVACION",
    monto: 119,
    dias: 30,
    mb: 10240,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "Plan MiFi 10GB por 30 dias.",
    producto: "MIFI",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#411FBE",
      secondaryColor: "#1E0E58",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 1,
    active: true,
  },
  {
    id: "mifi-2",
    offeringId: "3001001002",
    nombre: "Internet Portatil 20GB",
    grupo: "ACTIVACION",
    monto: 229,
    dias: 30,
    mb: 20480,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "Plan MiFi 20GB por 30 dias.",
    producto: "MIFI",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#3718A8",
      secondaryColor: "#180B48",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 2,
    active: true,
  },
  {
    id: "mifi-3",
    offeringId: "3001001003",
    nombre: "Internet Portatil 35GB",
    grupo: "ACTIVACION",
    monto: 359,
    dias: 30,
    mb: 35840,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "Plan MiFi 35GB por 30 dias.",
    producto: "MIFI",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#2D1192",
      secondaryColor: "#120838",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 3,
    active: true,
  },
  {
    id: "mifi-4",
    offeringId: "3001001004",
    nombre: "Internet Portatil 55GB",
    grupo: "ACTIVACION",
    monto: 559,
    dias: 30,
    mb: 56320,
    mbAnterior: null,
    llamadas: 0,
    sms: 0,
    hotspot: true,
    redesSociales: false,
    observacion: "Plan MiFi 55GB por 30 dias.",
    producto: "MIFI",
    isPromo: false,
    visualConfig: createVisualConfig({
      template: "internet",
      primaryColor: "#230B7C",
      secondaryColor: "#0E0528",
      buttonText: "LO QUIERO",
      showHotspot: false,
    }),
    sortOrder: 4,
    active: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// INTERNET DEVICE INFO — device card data per internet section
// ────────────────────────────────────────────────────────────────────
// Mutable copy exported for stateful editing — page.tsx initialises state from this
export const internetDeviceInfoDefaults: InternetDeviceInfo[] = [
  {
    sectionId: "internetencasa",
    deviceName: "Access CPE 18 LTE Blanco",
    deviceSubtitle: "Router, Access, CPE 18 LTE Blanco",
    deviceImageSrc: "/devices/hbb.png",
    cardBackgroundImageSrc: "/backgrounds-images-cards/bg-mundial.png",
    price: "$850.00",
    buttonText: "LO QUIERO",
    sectionTitle: "Conectate por primera vez",
    sectionSubtitle: "Adquiere tu equipo y comienza a navegar sin complicaciones.",
    plansTitle: "¿Ya cuentas con un equipo compatible?",
    plansSubtitle: "Elige tu paquete preferido y recibe tu SIM en casa.",
  },
  {
    sectionId: "internetportatil",
    deviceName: "ShenZhen F-02",
    deviceSubtitle: "MiFi, ShenZhen, F-02",
    deviceImageSrc: "/devices/mifi.png",
    cardBackgroundImageSrc: undefined,
    price: "$999.00",
    buttonText: "LO QUIERO",
    sectionTitle: "Conéctate donde quieras",
    sectionSubtitle: "Tu internet portátil siempre contigo, sin cables ni complicaciones.",
    plansTitle: "¿Ya tienes tu dispositivo MiFi?",
    plansSubtitle: "Elige tu plan de datos y actívalo al instante.",
  },
];

/** @deprecated Use the stateful deviceInfoMap from page context instead of this module-level helper. */
export function getInternetDeviceInfo(sectionId: string): InternetDeviceInfo | undefined {
  return internetDeviceInfoDefaults.find((d) => d.sectionId === sectionId);
}

// Version history mock
export const versionHistory: LandingVersion[] = [
  {
    id: "v-1",
    version: 12,
    publishedAt: "2026-05-30T14:30:00Z",
    publishedBy: "marketing@axios.mx",
    snapshotJson: {},
  },
  {
    id: "v-2",
    version: 11,
    publishedAt: "2026-05-28T10:15:00Z",
    publishedBy: "admin@axios.mx",
    snapshotJson: {},
  },
  {
    id: "v-3",
    version: 10,
    publishedAt: "2026-05-25T09:00:00Z",
    publishedBy: "marketing@axios.mx",
    snapshotJson: {},
  },
];

// Template options
export const templateOptions = [
  { id: "default", name: "Default", description: "Diseno estandar de tarjeta" },
  { id: "promo", name: "Promo", description: "Enfocado en descuentos" },
  { id: "hotsale", name: "Hot Sale", description: "Promociones especiales" },
  { id: "minimal", name: "Minimal", description: "Diseno limpio y simple" },
  { id: "premium", name: "Premium", description: "Estilo elegante" },
  { id: "internet", name: "Internet", description: "Para productos de datos" },
];

// Badge style options
export const badgeStyleOptions = [
  { id: "none", name: "Sin badge" },
  { id: "ribbon", name: "Ribbon diagonal" },
  { id: "corner", name: "Esquina" },
  { id: "fire", name: "Con fuego" },
  { id: "promo", name: "Tag promo" },
];

export const badgeFlagOptions: { id: string; name: string; src: string }[] = [
  { id: "red", name: "Rojo", src: "/flags/flag-promo-red.png" },
  { id: "orange", name: "Naranja", src: "/flags/flag-promo-orange.png" },
  { id: "purple", name: "Morado", src: "/flags/flag-promo-purple.png" },
  { id: "black", name: "Negro", src: "/flags/flag-promo-black.png" },
  { id: "mundial", name: "Mundial", src: "/flags/flag-promo-mundial.png" },
];

// Color presets — gradient-based palettes for cards
// Each preset carries primary/secondary (applied to card) + gradient (for UI preview)
export const colorPresets: {
  name: string;
  primary: string;
  secondary: string;
  gradient: string;
}[] = [
  // ── Secciones principales ──
  { name: "Cliente nuevo default",           primary: "#7432e8", secondary: "#411c82", gradient: "linear-gradient(180deg, #7432e8, #411c82)" },
  { name: "Cámbiate default",                primary: "#aa01fe", secondary: "#731c82", gradient: "linear-gradient(180deg, #aa01fe, #731c82)" },
  // ── Paquetes activación ──
  { name: "Paquetes anual",                  primary: "#8b1c6f", secondary: "#5a1048", gradient: "linear-gradient(180deg, #8b1c6f, #5a1048)" },
  { name: "Paquetes semestral",              primary: "#d94fb3", secondary: "#b02b8e", gradient: "linear-gradient(180deg, #d94fb3, #b02b8e)" },
  { name: "Paquetes trimestral",             primary: "#e88ac7", secondary: "#d45baf", gradient: "linear-gradient(180deg, #e88ac7, #d45baf)" },
  // ── Paquetes portabilidad ──
  { name: "Paquetes portabilidad anual",     primary: "#7432e8", secondary: "#411c82", gradient: "linear-gradient(180deg, #7432e8, #411c82)" },
  { name: "Paquetes portabilidad semestral", primary: "#a97bf8", secondary: "#7432e8", gradient: "linear-gradient(180deg, #a97bf8, #7432e8)" },
  { name: "Paquetes portabilidad trimestral",primary: "#b08af5", secondary: "#8c5bef", gradient: "linear-gradient(180deg, #b08af5, #8c5bef)" },
  // ── Recargas ──
  { name: "Recargas celular",               primary: "#45ccff", secondary: "#632a99", gradient: "linear-gradient(180deg, #45ccff, #632a99)" },
  { name: "Recargas paquetes anual",        primary: "#1f008d", secondary: "#3e1562", gradient: "linear-gradient(180deg, #1f008d, #3e1562)" },
  { name: "Recargas paquetes semestral",    primary: "#4020b4", secondary: "#5f328c", gradient: "linear-gradient(180deg, #4020b4, #5f328c)" },
  { name: "Recargas paquetes trimestral",   primary: "#694bd2", secondary: "#8455b4", gradient: "linear-gradient(180deg, #694bd2, #8455b4)" },
  { name: "Recargas internet en casa",      primary: "#9152ff", secondary: "#632a99", gradient: "linear-gradient(180deg, #9152ff, #632a99)" },
  { name: "Recargas internet móvil",        primary: "#ff4dca", secondary: "#841ce6", gradient: "linear-gradient(180deg, #ff4dca, #841ce6)" },
  // ── Promos ──
  { name: "Promo naranja",                  primary: "#eb6931", secondary: "#ffb368", gradient: "linear-gradient(180deg, #eb6931, #ffb368)" },
  { name: "Promo roja radial",              primary: "#ff3636", secondary: "#950000", gradient: "radial-gradient(circle, #ff3636, #950000)" },
  { name: "Promo rosa",                     primary: "#e11e52", secondary: "#ed6388", gradient: "linear-gradient(180deg, #e11e52, #ed6388)" },
];

// ────────────────────────────────────────────────────────────────────
// Section-aware defaults for new cards
// Used by the "Nueva oferta" dialog so new cards are coherent with their section.
// ────────────────────────────────────────────────────────────────────

export interface NewProductDefaults {
  /** Internal name pre-filled in the dialog */
  nombre: string;
  monto: number;
  dias: number;
  mb: number;
  hotspot: boolean;
  redesSociales: boolean;
  /** Grupo — determines which tab the card appears under */
  grupo: "ACTIVACION" | "PORTABILIDAD" | "TAE";
  llamadas: number;
  sms: number;
  isPromo: boolean;
  observacion: string;
  /** producto type */
  producto: "MOV" | "HBB" | "MIFI";
  visualConfig: ProductVisualConfig;
}

/**
 * Returns section-aware defaults for a new product card.
 * Each section gets values coherent with its existing seed data:
 *  - activacion  → MOV ACTIVACION, orange gradient, hotspot on, redes on
 *  - portabilidad → MOV PORTABILIDAD, red gradient, hotspot on, redes on, isPromo
 *  - paquetes     → MOV ACTIVACION, purple (trimestral), hotspot on, redes on, 90d
 *  - recargas     → MOV TAE, blue gradient, "RECARGAR" button
 *  - others       → sensible MOV fallback
 */
export function getDefaultProductForSection(sectionId: string): NewProductDefaults {
  switch (sectionId) {
    case "activacion":
      return {
        nombre: "Nueva oferta",
        monto: 150,
        dias: 30,
        mb: 6144,
        hotspot: true,
        redesSociales: true,
        grupo: "ACTIVACION",
        llamadas: 45450,
        sms: 1750,
        isPromo: false,
        observacion: "Redes soc. ilim. +6GB por 30 dias.",
        producto: "MOV",
        visualConfig: createVisualConfig({
          primaryColor: "#7432e8",
          secondaryColor: "#411c82",
          buttonText: "LO QUIERO",
          showHotspot: true,
          hotspotText: "Comparte Datos",
          badgeStyle: "none",
        }),
      };

    case "portabilidad":
      return {
        nombre: "Nueva oferta",
        monto: 150,
        dias: 30,
        mb: 12288,
        hotspot: true,
        redesSociales: true,
        grupo: "PORTABILIDAD",
        llamadas: 45450,
        sms: 1750,
        isPromo: true,
        observacion: "*EN TU CAMBIO* Redes soc. ilim. +12GB por 30 dias.",
        producto: "MOV",
        visualConfig: createVisualConfig({
          primaryColor: "#aa01fe",
          secondaryColor: "#731c82",
          buttonText: "LO QUIERO",
          showHotspot: true,
          hotspotText: "Comparte Datos",
          showPreviousData: false,
          previousDataText: "Antes X GB",
          badgeStyle: "none",
        }),
      };

    case "paquetes":
      return {
        nombre: "Nuevo paquete",
        monto: 450,
        dias: 90,
        mb: 4096,
        hotspot: true,
        redesSociales: true,
        grupo: "ACTIVACION",
        llamadas: 45450,
        sms: 1750,
        isPromo: true,
        observacion: "Redes soc ilim +4GB por 90 dias. Plan trimestral.",
        producto: "MOV",
        visualConfig: createVisualConfig({
          badgeText: "TRIMESTRAL",
          badgeStyle: "ribbon",
          badgeFlag: "purple",
          primaryColor: "#e88ac7",
          secondaryColor: "#d45baf",
          buttonText: "LO QUIERO",
          showHotspot: true,
          hotspotText: "Comparte Datos",
        }),
      };

    case "recargas":
      return {
        nombre: "Nueva recarga",
        monto: 100,
        dias: 30,
        mb: 3072,
        hotspot: false,
        redesSociales: true,
        grupo: "TAE",
        llamadas: 45450,
        sms: 1750,
        isPromo: false,
        observacion: "Redes soc ilim +3GB por 30 dias.",
        producto: "MOV",
        visualConfig: createVisualConfig({
          primaryColor: "#45ccff",
          secondaryColor: "#632a99",
          buttonText: "RECARGAR",
          showHotspot: false,
          badgeStyle: "none",
        }),
      };

    default:
      // Fallback — sensible MOV default for any other commercial section
      return {
        nombre: "Nueva card",
        monto: 100,
        dias: 30,
        mb: 3072,
        hotspot: true,
        redesSociales: true,
        grupo: "ACTIVACION",
        llamadas: 45450,
        sms: 1750,
        isPromo: false,
        observacion: "",
        producto: "MOV",
        visualConfig: createVisualConfig({
          primaryColor: "#7432e8",
          secondaryColor: "#411c82",
          buttonText: "LO QUIERO",
          showHotspot: true,
          badgeStyle: "none",
        }),
      };
  }
}

// Helper function to format MB to GB
export function formatDataSize(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

// Helper function to format price
export function formatPrice(price: number): string {
  return `$${price}`;
}

// Get products by section — covers all sections
export function getProductsBySection(sectionId: string): Product[] {
  switch (sectionId) {
    case "activacion":
      return JSON.parse(JSON.stringify(activacionProducts));
    case "portabilidad":
      return JSON.parse(JSON.stringify(portabilidadProducts));
    case "paquetes":
      return JSON.parse(JSON.stringify(paquetesProducts));
    case "recargas":
      return JSON.parse(JSON.stringify(recargasProducts));
    case "internetencasa":
      return JSON.parse(JSON.stringify(internetEnCasaProducts));
    case "internetportatil":
      return JSON.parse(JSON.stringify(internetPortatilProducts));
    default:
      return JSON.parse(JSON.stringify(activacionProducts));
  }
}
