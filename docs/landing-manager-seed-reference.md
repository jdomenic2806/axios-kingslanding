# Landing Manager — Referencia de Seed para Backend

> **Audiencia**: Equipo API/Backend
> **Propósito**: Documento de referencia directa — describe exactamente qué datos renderiza el frontend hoy (mock literal + campos API) para que el equipo pueda armar el seed en MongoDB sin leer el código fuente.
> **Fuente**: `src/lib/mock-data.ts`, `src/lib/advertising.ts`, `src/lib/api/landing-manager.ts`, `src/lib/api/landing-mapper.ts`
> **Actualizado**: Junio 2026 — sync literal con código fuente

---

## Resumen rápido

| Módulo | Estado hoy | Pendiente de backend |
|--------|-----------|----------------------|
| Secciones (list) | ✅ API real (`GET /v1/landing-manager/sections`) | — |
| Items/productos por sección | ✅ API real (`GET /sections/:key/full`) | Faltan campos telco (ver §4) |
| Publicidad (advertising) | ✅ API real (`GET /v1/landing-manager/advertising`) | `active`, `sortOrder` son locales |
| Dispositivos HBB/MiFi | ⚠️ Mock local hardcodeado | Requiere endpoint nuevo |
| Estilos / visual-config | ⚠️ Mix: colores base desde API, resto mock | Ver §5 |
| Assets visuales | ✅ API real (uploads S3) | — |

---

## 1. Secciones

### 1.1 Shape del frontend (`Section`)

El modelo interno del front tiene más campos que el backend:

```typescript
interface Section {
  id: string;           // interno frontend — derivado del key del backend
  name: string;
  slug: string;         // = key del backend
  description: string;  // no viene del backend — usa fallback del mock
  icon: string;         // no viene del backend — derivado del sectionId
  sortOrder: number;
  productCount: number;
  lastPublished: string | null;
  status: "draft" | "published" | "modified";
}
```

### 1.2 Shape que el frontend espera del backend (`ApiSection`)

El frontend consume `GET /v1/landing-manager/sections` y espera array de:

```json
{
  "key": "cliente-nuevo",
  "name": "Cliente Nuevo",
  "order": 1,
  "isActive": true,
  "sectionStyles": {
    "backgroundColor": "#7432e8",
    "primaryColor": "#7432e8",
    "secondaryColor": "#411c82"
  },
  "cardStyles": {
    "primaryColor": "#7432e8",
    "secondaryColor": "#411c82"
  },
  "imageStyles": {},
  "assets": {
    "backgroundImage": { "url": "https://cdn.../bg.png", "alt": "fondo" },
    "badgeImage": null,
    "icon": null,
    "thumbnail": null,
    "socialIcons": []
  }
}
```

### 1.3 Catálogo de secciones (seed exacto del mock)

| `key` (backend) | `id` (frontend) | `name` UI | `order` | Color primario | Color secundario | `icon` | `productCount` |
|----------------|----------------|-----------|---------|----------------|-----------------|--------|----------------|
| `cliente-nuevo` | `activacion` | Cliente Nuevo | 1 | `#7432e8` | `#411c82` | `user-plus` | 7 |
| `cambiate` | `portabilidad` | Cambiate | 2 | `#aa01fe` | `#731c82` | `refresh-cw` | 7 |
| `paquetes` | `paquetes` | Paquetes | 3 | `#e88ac7` | `#d45baf` | `package` | 18 |
| `recargas` | `recargas` | Recargas | 4 | `#45ccff` | `#632a99` | `zap` | 30 |
| `internet-casa` | `internetencasa` | Internet en Casa | 5 | `#4AB1D0` | `#265A6A` | `home` | 4 |
| `internet-portatil` | `internetportatil` | Internet Portatil | 6 | `#411FBE` | `#1E0E58` | `wifi` | 4 |

> **Nota de mapeo**: el frontend mantiene un mapa `KEY_TO_ID` en `landing-mapper.ts`. El backend usa `key` siempre; el frontend usa `id` internamente para navegación y store.

---

## 2. Items / Productos

### 2.1 Shape del backend (`ApiItem`)

El frontend consume `GET /v1/landing-manager/sections/:key/full` → `{ section, items[] }`.

```typescript
interface ApiItem {
  _id?: string;
  sectionKey: string;
  itemType: string;
  itemId: string;       // = offeringId del catálogo telco
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  ctaText?: string;
  order: number;
  isActive: boolean;
  customCardStyles?: { primaryColor?: string; secondaryColor?: string };
  customImageStyles?: Record<string, unknown>;
  assets?: {
    badgeImage?: { url: string; alt: string } | null;
    thumbnail?: { url: string; alt: string } | null;
    socialIcons?: Array<{ network: string; url: string; alt: string }>;
  };
}
```

> **Crítico**: el campo `itemId` es el `offeringId` del catálogo telco. El frontend lo usa para hacer **merge** entre datos API (estilos) y datos mock (precio, GB, llamadas, SMS). Si el backend no lo incluye o lo cambia, los cards muestran precio `$0` y `0 GB`.

### 2.2 Campos backend vs. campos solo frontend

#### ✅ Campos leídos/escritos por el backend hoy

| Campo (`ApiItem`) | Uso en UI | PATCH soportado |
|------------------|-----------|-----------------|
| `itemId` | Matching con catálogo telco | No (es clave) |
| `title` | Nombre interno del plan (`nombre`) | ✅ |
| `description` | Texto observación de la card (`observacion`) | ✅ |
| `badgeText` | Texto del ribbon/badge | ✅ |
| `ctaText` | Texto del botón CTA | ✅ |
| `order` | Orden de la card en la sección | ✅ (via `/reorder`) |
| `isActive` | Visibilidad de la card | ✅ (via `/status`) |
| `customCardStyles.primaryColor` | Color top de la card | ✅ |
| `customCardStyles.secondaryColor` | Color bottom de la card | ✅ |
| `assets.badgeImage.url` | Imagen del badge/flag (subida vía upload) | ✅ (upload) |
| `assets.socialIcons[].url` | Ícono personalizado por red social | ✅ (upload) |
| `section.assets.backgroundImage.url` | Imagen de fondo de la sección/card | ✅ (upload) |

#### ⛔ Campos solo en mock (no tienen backend aún)

Estos campos **no se envían al backend** y son tomados del mock local (`src/lib/mock-data.ts`).
**El backend necesita agregarlos** para que el front pueda consumirlos sin mock:

| Campo (`Product`) | Tipo | Ejemplo | Descripción |
|------------------|------|---------|-------------|
| `monto` | `number` | `100` | Precio en MXN |
| `dias` | `number` | `30` | Vigencia en días |
| `mb` | `number` | `6144` | Datos en MB (6144 = 6 GB) |
| `mbAnterior` | `number \| null` | `3072` | Datos previos (para mostrar "Antes X GB") |
| `llamadas` | `number` | `45450` | Minutos de voz |
| `sms` | `number` | `1750` | SMS incluidos |
| `hotspot` | `boolean` | `true` | Si permite compartir datos |
| `redesSociales` | `boolean` | `true` | Si incluye redes sociales ilimitadas |
| `observacion` | `string` | `"Redes soc ilim +6GB..."` | Texto legal/descripción de la card |
| `grupo` | `"ACTIVACION" \| "PORTABILIDAD" \| "TAE"` | `"ACTIVACION"` | Tipo de plan |
| `offeringId` | `string` | `"1709903032"` | ID del ofrecimiento en el catálogo telco |
| `producto` | `"MOV" \| "HBB" \| "MIFI"` | `"MOV"` | Tipo de producto |
| `isPromo` | `boolean` | `true` | Si es producto en promoción |
| `operadoraId` | `number` | `203` | Solo en recargas — para tabs |

---

## 3. Productos por sección (seed completo — mock literal)

### Nota: MB reales vs. GB mostrados

El front convierte MB a GB usando: `mb >= 1024 ? (mb/1024).toFixed(0) + " GB" : mb + " MB"`.

---

### 3.1 Sección: Cliente Nuevo (`cliente-nuevo` / `activacion`)

7 productos · tipo `MOV` · grupo `ACTIVACION`
Paleta base: `#7432e8` / `#411c82` (violeta)

```typescript
// activacionProducts — fuente: src/lib/mock-data.ts

[
  {
    id: "act-1",
    offeringId: "1709903032",
    nombre: "Axios linea nueva",
    grupo: "ACTIVACION",
    monto: 100, dias: 30, mb: 6144, mbAnterior: 3072,
    llamadas: 45450, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*PRECIO ESPECIAL DE $120 A $100* Redes soc ilim. + 3GB por 30dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "GB EXTRAS\n+ DESCUENTO $!",
      badgeStyle: "ribbon", badgeFlag: "red",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO", buttonColor: "#ffffff", buttonTextColor: "#000000",
      showHotspot: true, hotspotText: "Comparte Datos",
      showPreviousData: true, previousDataText: "Antes 3 GB",
      durationDisplayMode: "days",
    },
    sortOrder: 1,
  },
  {
    id: "act-2",
    offeringId: "1709902243",
    nombre: "Axios linea nueva mas megas",
    grupo: "ACTIVACION",
    monto: 100, dias: 15, mb: 10240, mbAnterior: 5120,
    llamadas: 23100, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "Incluye Redes Sociales Ilimitadas+ 5GB por 15 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "!DOBLES GB!", badgeStyle: "ribbon", badgeFlag: "red",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO",
      showPreviousData: true, previousDataText: "Antes 5 GB",
    },
    sortOrder: 2,
  },
  {
    id: "act-3",
    offeringId: "1709902244",
    nombre: "Axios linea nueva 10GB",
    grupo: "ACTIVACION",
    monto: 130, dias: 15, mb: 10240, mbAnterior: null,
    llamadas: 23100, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: false,
    observacion: "Redes soc. ilim. +10GB por 15 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "+10GB EXTRA", badgeStyle: "ribbon", badgeFlag: "red",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO", showPreviousData: false,
    },
    sortOrder: 3,
  },
  {
    id: "act-4",
    offeringId: "1709902246",
    nombre: "Axios linea nueva 4GB",
    grupo: "ACTIVACION",
    monto: 150, dias: 30, mb: 4096, mbAnterior: null,
    llamadas: 45450, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: false,
    observacion: "Redes soc. ilim. +4GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "", badgeStyle: "none",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO",
    },
    sortOrder: 4,
  },
  {
    id: "act-5",
    offeringId: "1709902247",
    nombre: "Axios linea nueva 12GB",
    grupo: "ACTIVACION",
    monto: 190, dias: 30, mb: 12288, mbAnterior: null,
    llamadas: 45450, sms: 3500,
    hotspot: true, redesSociales: true, isPromo: false,
    observacion: "Red Soc Ilim +12GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "MAS VENDIDO", badgeStyle: "fire", badgeFlag: "black",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO",
    },
    sortOrder: 5,
  },
  {
    id: "act-6",
    offeringId: "1709902248",
    nombre: "Axios linea nueva 24GB",
    grupo: "ACTIVACION",
    monto: 250, dias: 30, mb: 24576, mbAnterior: null,
    llamadas: 45450, sms: 3500,
    hotspot: true, redesSociales: true, isPromo: false,
    observacion: "Redes soc. ilim. +24GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "", badgeStyle: "none",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO",
    },
    sortOrder: 6,
  },
  {
    id: "act-7",
    offeringId: "1709902250",
    nombre: "Axios linea nueva 50GB",
    grupo: "ACTIVACION",
    monto: 500, dias: 30, mb: 51200, mbAnterior: null,
    llamadas: 49700, sms: 6000,      // ⚠️ distintos a los de 30d estándar
    hotspot: true, redesSociales: true, isPromo: false,
    observacion: "Redes soc. ilim. +50GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "", badgeStyle: "none", badgeFlag: "black",
      primaryColor: "#7432e8", secondaryColor: "#411c82",
      buttonText: "LO QUIERO",
    },
    sortOrder: 7,
  },
]
```

---

### 3.2 Sección: Cámbiate (`cambiate` / `portabilidad`)

7 productos · tipo `MOV` · grupo `PORTABILIDAD` · todos `isPromo: true`
Paleta base: `#aa01fe` / `#731c82` (púrpura brillante)

```typescript
// portabilidadProducts — fuente: src/lib/mock-data.ts

[
  {
    id: "port-1",
    offeringId: "1709903032",
    nombre: "Axios portabilidad",
    grupo: "PORTABILIDAD",
    monto: 100, dias: 30, mb: 9216, mbAnterior: 3072,
    llamadas: 45450, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO PRECIO ESPECIAL* Redes soc ilim +9GB por 30dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "!TRIPLE GB!", badgeStyle: "fire", badgeFlag: "red",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 3 GB",
    },
    sortOrder: 1,
  },
  {
    id: "port-2",
    offeringId: "1809905493",
    nombre: "Axios portabilidad mas megas",
    grupo: "PORTABILIDAD",
    monto: 100, dias: 15, mb: 7500, mbAnterior: 5000,
    llamadas: 23100, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +7.5GB por 15 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "DOBLE GB", badgeStyle: "ribbon", badgeFlag: "orange",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 5 GB",
    },
    sortOrder: 2,
  },
  {
    id: "port-3",
    offeringId: "1709902244",
    nombre: "Axios portabilidad 15GB",
    grupo: "PORTABILIDAD",
    monto: 130, dias: 15, mb: 15360, mbAnterior: 10240,
    llamadas: 23100, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +15GB por 15 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "+15GB", badgeStyle: "ribbon", badgeFlag: "red",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 10 GB",
    },
    sortOrder: 3,
  },
  {
    id: "port-4",
    offeringId: "1709902246",
    nombre: "Axios portabilidad 12GB",
    grupo: "PORTABILIDAD",
    monto: 150, dias: 30, mb: 12288, mbAnterior: 4096,
    llamadas: 45450, sms: 1750,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +12GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "!TRIPLE!", badgeStyle: "ribbon", badgeFlag: "purple",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 4 GB",
    },
    sortOrder: 4,
  },
  {
    id: "port-5",
    offeringId: "1709902247",
    nombre: "Axios portabilidad 36GB",
    grupo: "PORTABILIDAD",
    monto: 190, dias: 30, mb: 36864, mbAnterior: 12288,
    llamadas: 45450, sms: 3500,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +36GB por 30dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "TRIPLE GB", badgeStyle: "fire", badgeFlag: "black",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 12 GB",
    },
    sortOrder: 5,
  },
  {
    id: "port-6",
    offeringId: "1709902248",
    nombre: "Axios portabilidad 48GB",
    grupo: "PORTABILIDAD",
    monto: 250, dias: 30, mb: 49152, mbAnterior: 24576,
    llamadas: 45450, sms: 3500,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +48GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "DOBLE GB", badgeStyle: "ribbon", badgeFlag: "orange",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 24 GB",
    },
    sortOrder: 6,
  },
  {
    id: "port-7",
    offeringId: "1709902250",
    nombre: "Axios portabilidad 100GB",
    grupo: "PORTABILIDAD",
    monto: 500, dias: 30, mb: 102400, mbAnterior: 51200,
    llamadas: 49700, sms: 6000,
    hotspot: true, redesSociales: true, isPromo: true,
    observacion: "*EN TU CAMBIO* Redes soc. ilim. +100GB por 30 dias.",
    producto: "MOV",
    visualConfig: {
      badgeText: "!100GB!", badgeStyle: "fire", badgeFlag: "red",
      primaryColor: "#aa01fe", secondaryColor: "#731c82",
      showPreviousData: true, previousDataText: "Antes 50 GB",
    },
    sortOrder: 7,
  },
]
```

---

### 3.3 Sección: Paquetes (`paquetes`)

18 productos · tipo `MOV` · todos `isPromo: true` · todos `hotspot: true`, `redesSociales: true`
Divididos en dos grupos por `grupo`:
- ID_OPERADORA 215 → grupo `ACTIVACION` (9 productos)
- ID_OPERADORA 216 → grupo `PORTABILIDAD` (9 productos)

#### Paquetes ACTIVACION (ID_OPERADORA 215)

```typescript
// paq-1 a paq-9

// Trimestral (90d) — paleta: #e88ac7 / #d45baf — badge: "TRIMESTRAL" ribbon purple
{ id: "paq-1", offeringId: "1709904101", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 450, dias: 90, mb: 4096, mbAnterior: null, llamadas: 45450, sms: 1750,
  observacion: "Redes soc ilim +4GB por 90 dias. Plan trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#e88ac7", secondaryColor: "#d45baf" }, sortOrder: 1 },

{ id: "paq-2", offeringId: "1709904102", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 550, dias: 90, mb: 12288, mbAnterior: null, llamadas: 45450, sms: 1750,
  observacion: "Redes soc ilim +12GB por 90 dias. Plan trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#e88ac7", secondaryColor: "#d45baf" }, sortOrder: 2 },

{ id: "paq-3", offeringId: "1709904103", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 730, dias: 90, mb: 24576, mbAnterior: null, llamadas: 45450, sms: 3500,
  observacion: "Redes soc ilim +24GB por 90 dias. Plan trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#e88ac7", secondaryColor: "#d45baf" }, sortOrder: 3 },

// Semestral (180d) — paleta: #d94fb3 / #b02b8e — badge: "SEMESTRAL" ribbon purple
{ id: "paq-4", offeringId: "1709904104", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 900, dias: 180, mb: 4096, mbAnterior: null, llamadas: 45450, sms: 1750,
  observacion: "Redes soc ilim +4GB por 180 dias. Plan semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#d94fb3", secondaryColor: "#b02b8e" }, sortOrder: 4 },

{ id: "paq-5", offeringId: "1709904105", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 1100, dias: 180, mb: 12288, mbAnterior: null, llamadas: 45450, sms: 1750,
  observacion: "Redes soc ilim +12GB por 180 dias. Plan semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#d94fb3", secondaryColor: "#b02b8e" }, sortOrder: 5 },

{ id: "paq-6", offeringId: "1709904106", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 1450, dias: 180, mb: 24576, mbAnterior: null, llamadas: 45450, sms: 3500,
  observacion: "Redes soc ilim +24GB por 180 dias. Plan semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#d94fb3", secondaryColor: "#b02b8e" }, sortOrder: 6 },

// Anual (365d) — paleta: #8b1c6f / #5a1048 — badge: "ANUAL" ribbon orange
{ id: "paq-7", offeringId: "1709904107", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 1500, dias: 365, mb: 4096, mbAnterior: null, llamadas: 45450, sms: 1750,
  observacion: "Redes soc ilim +4GB por 365 dias. Plan anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "orange",
    primaryColor: "#8b1c6f", secondaryColor: "#5a1048" }, sortOrder: 7 },

{ id: "paq-8", offeringId: "1709904108", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 2000, dias: 365, mb: 12288, mbAnterior: null, llamadas: 45450, sms: 1750,
  observacion: "Redes soc ilim +12GB por 365 dias. Plan anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "orange",
    primaryColor: "#8b1c6f", secondaryColor: "#5a1048" }, sortOrder: 8 },

{ id: "paq-9", offeringId: "1709904109", nombre: "Axios planes nueva linea", grupo: "ACTIVACION",
  monto: 2500, dias: 365, mb: 24576, mbAnterior: null, llamadas: 45450, sms: 3500,
  observacion: "Redes soc ilim +24GB por 365 dias. Plan anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "orange",
    primaryColor: "#8b1c6f", secondaryColor: "#5a1048" }, sortOrder: 9 },
```

#### Paquetes PORTABILIDAD (ID_OPERADORA 216)

```typescript
// paq-10 a paq-18
// Todos tienen showPreviousData: true y mbAnterior = mismo valor mb (referencia)

// Trimestral (90d) — paleta: #b08af5 / #8c5bef — badge: "TRIMESTRAL" ribbon purple
{ id: "paq-10", offeringId: "1709904201", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 450, dias: 90, mb: 4096, mbAnterior: 4096, llamadas: 45450, sms: 1750,
  observacion: "*EN TU CAMBIO* Redes soc ilim +4GB por 90 dias. Plan trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#b08af5", secondaryColor: "#8c5bef",
    showPreviousData: true, previousDataText: "Antes 4 GB" }, sortOrder: 10 },

{ id: "paq-11", offeringId: "1709904202", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 550, dias: 90, mb: 12288, mbAnterior: 12288, llamadas: 45450, sms: 1750,
  observacion: "*EN TU CAMBIO* Redes soc ilim +12GB por 90 dias. Plan trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#b08af5", secondaryColor: "#8c5bef",
    showPreviousData: true, previousDataText: "Antes 12 GB" }, sortOrder: 11 },

{ id: "paq-12", offeringId: "1709904203", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 730, dias: 90, mb: 24576, mbAnterior: 24576, llamadas: 45450, sms: 3500,
  observacion: "*EN TU CAMBIO* Redes soc ilim +24GB por 90 dias. Plan trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#b08af5", secondaryColor: "#8c5bef",
    showPreviousData: true, previousDataText: "Antes 24 GB" }, sortOrder: 12 },

// Semestral (180d) — paleta: #a97bf8 / #7432e8 — badge: "SEMESTRAL" ribbon purple
{ id: "paq-13", offeringId: "1709904204", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 900, dias: 180, mb: 4096, mbAnterior: 4096, llamadas: 45450, sms: 1750,
  observacion: "*EN TU CAMBIO* Redes soc ilim +4GB por 180 dias. Plan semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#a97bf8", secondaryColor: "#7432e8",
    showPreviousData: true, previousDataText: "Antes 4 GB" }, sortOrder: 13 },

{ id: "paq-14", offeringId: "1709904205", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 1100, dias: 180, mb: 12288, mbAnterior: 12288, llamadas: 45450, sms: 1750,
  observacion: "*EN TU CAMBIO* Redes soc ilim +12GB por 180 dias. Plan semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#a97bf8", secondaryColor: "#7432e8",
    showPreviousData: true, previousDataText: "Antes 12 GB" }, sortOrder: 14 },

{ id: "paq-15", offeringId: "1709904206", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 1450, dias: 180, mb: 24576, mbAnterior: 24576, llamadas: 45450, sms: 3500,
  observacion: "*EN TU CAMBIO* Redes soc ilim +24GB por 180 dias. Plan semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#a97bf8", secondaryColor: "#7432e8",
    showPreviousData: true, previousDataText: "Antes 24 GB" }, sortOrder: 15 },

// Anual (365d) — paleta: #7432e8 / #411c82 — badge: "ANUAL" ribbon black
{ id: "paq-16", offeringId: "1709904207", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 1500, dias: 365, mb: 4096, mbAnterior: 4096, llamadas: 45450, sms: 1750,
  observacion: "*EN TU CAMBIO* Redes soc ilim +4GB por 365 dias. Plan anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "black",
    primaryColor: "#7432e8", secondaryColor: "#411c82",
    showPreviousData: true, previousDataText: "Antes 4 GB" }, sortOrder: 16 },

{ id: "paq-17", offeringId: "1709904208", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 2000, dias: 365, mb: 12288, mbAnterior: 12288, llamadas: 45450, sms: 1750,
  observacion: "*EN TU CAMBIO* Redes soc ilim +12GB por 365 dias. Plan anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "black",
    primaryColor: "#7432e8", secondaryColor: "#411c82",
    showPreviousData: true, previousDataText: "Antes 12 GB" }, sortOrder: 17 },

{ id: "paq-18", offeringId: "1709904209", nombre: "Axios planes portabilidad", grupo: "PORTABILIDAD",
  monto: 2500, dias: 365, mb: 24576, mbAnterior: 24576, llamadas: 45450, sms: 3500,
  observacion: "*EN TU CAMBIO* Redes soc ilim +24GB por 365 dias. Plan anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "black",
    primaryColor: "#7432e8", secondaryColor: "#411c82",
    showPreviousData: true, previousDataText: "Antes 24 GB" }, sortOrder: 18 },
```

---

### 3.4 Sección: Recargas (`recargas`)

30 productos · tipo `MOV`/`HBB`/`MIFI` · grupo `TAE`
El frontend los divide en tabs por `operadoraId`:

| Tab en UI | `operadoraId` | Tipo producto |
|-----------|--------------|---------------|
| Celular | `203` + `211` | `MOV` |
| Paquetes | `217` | `MOV` |
| Internet en Casa | `302` | `HBB` |
| Internet Móvil | `304` | `MIFI` |

> El tab "Celular" agrupa `operadoraId 203` **y** `operadoraId 211` juntos.

#### Celular (operadoraId 203 — 13 productos + 1 de operadoraId 211)

Paleta base: `#45ccff` / `#632a99` · buttonText: `"RECARGAR"` en todos

```typescript
// ID_OPERADORA 203
{ id: "rec-1", offeringId: "1809905495", nombre: "Usuario recarga contigo",
  monto: 100, dias: 30, mb: 2048, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes soc ilim +2GB por 30 dias. Del 3 al 30 junio +2GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS a MX, EEUU y CAN. Permite compartir datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 1 },

{ id: "rec-8", offeringId: "1809907218", nombre: "Usuario recarga contigo",
  monto: 120, dias: 30, mb: 3072, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 203,
  observacion: "Redes soc ilim +3GB por 30 dias. Del 3 al 30 junio +3GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS a MX, EEUU y CAN. Permite compartir datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "PROMO", badgeStyle: "ribbon", badgeFlag: "red",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 4 },

{ id: "rec-3", offeringId: "1809905494", nombre: "Usuario recarga contigo",
  monto: 130, dias: 15, mb: 10240, llamadas: 23100, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes soc. ilim. +10GB por 15 días. Del 3 al 30 junio +10GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN. Permite compartir datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 3 },

{ id: "rec-4", offeringId: "1809905496", nombre: "Usuario recarga contigo",
  monto: 150, dias: 30, mb: 4096, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes soc. ilim. +4GB por 30 días. Del 3 al 30 junio +4GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN| Permite Compartir Datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 5 },

{ id: "rec-5", offeringId: "1809905497", nombre: "Usuario recarga contigo",
  monto: 190, dias: 30, mb: 12288, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes Sociales Ilimitadas +12GB por 30 días. Del 3 al 30 junio +12GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN|. Permite compartir datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "POPULAR", badgeStyle: "fire", badgeFlag: "red",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 6 },

{ id: "rec-6", offeringId: "1809905498", nombre: "Usuario recarga contigo",
  monto: 250, dias: 30, mb: 24576, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes soc. ilim. +24GB por 30 días. Del 3 al 30 junio +24GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 7 },

{ id: "rec-23", offeringId: "1809905499", nombre: "Usuario recarga contigo",
  monto: 300, dias: 30, mb: 35840, llamadas: 49700, sms: 6000,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes soc. ilim. +35GB por 30 días. Del 3 al 30 junio +35GB exclusivos para TikTok, YouTube, Vix y Vectormax. Llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 8 },

{ id: "rec-7", offeringId: "1809905500", nombre: "Usuario recarga contigo",
  monto: 500, dias: 30, mb: 51200, llamadas: 49700, sms: 6000,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Redes soc. ilim. +50GB por 30 dias.",
  visualConfig: { badgeText: "MAX", badgeStyle: "ribbon", badgeFlag: "red",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 9 },

// 7 días
{ id: "rec-cel-7d-70", offeringId: "1809905492", nombre: "Usuario recarga contigo",
  monto: 70, dias: 7, mb: 6144, llamadas: 10830, sms: 875,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Incluye Redes Sociales Ilimitadas+ 6GBpor 7 días, | llamadas y SMS MX EEUU CAN.https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 10 },

{ id: "rec-cel-7d-50", offeringId: "1809905491", nombre: "Usuario recarga contigo",
  monto: 50, dias: 7, mb: 2048, llamadas: 10830, sms: 875,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Incluye Redes Sociales Ilimitadas+ 2GBpor 7 días, | llamadas y SMS MX EEUU CAN.https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 11 },

// 3 días — hotspot: false, showHotspot: false
{ id: "rec-cel-3d-40", offeringId: "1809905490", nombre: "Usuario recarga contigo",
  monto: 40, dias: 3, mb: 2048, llamadas: 250, sms: 125,
  hotspot: false, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "2GB para navegar y redes sociales por 3 días. Llamadas y SMS incluidos a MX, EEUU y CAN.www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: false,
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 12 },

{ id: "rec-cel-3d-30", offeringId: "1809906799", nombre: "Usuario recarga contigo",
  monto: 30, dias: 3, mb: 512, llamadas: 250, sms: 125,
  hotspot: false, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Incluye Redes Sociales (500 MB) + 500 MB de Navegación, 250 min de voz y 125 SMS. Vigencia de 3 días. Permite compartir datos. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: false,
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 13 },

// 1 día — hotspot: false, showHotspot: false
{ id: "rec-cel-1d-15", offeringId: "1809906798", nombre: "Usuario recarga contigo",
  monto: 15, dias: 1, mb: 512, llamadas: 50, sms: 25,
  hotspot: false, redesSociales: true, isPromo: false, operadoraId: 203,
  observacion: "Incluye Redes Sociales (500 MB) + 500 MB de Navegación, 50 min de voz y 25 SMS. Vigencia de 1 día. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: false,
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 14 },

// ID_OPERADORA 211 — aparece en el mismo tab "Celular"
{ id: "rec-2", offeringId: "1809905493", nombre: "Axios mas megas",
  monto: 100, dias: 15, mb: 5120, llamadas: 23100, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: false, operadoraId: 211,
  observacion: "Redes soc ilim +5GB por 15 dias.",
  visualConfig: { badgeText: "", badgeStyle: "none",
    primaryColor: "#45ccff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 2 },
```

#### Paquetes recarga (operadoraId 217 — 9 productos)

Paleta graduada por período:
- Trimestral: `#694bd2` / `#8455b4`
- Semestral: `#4020b4` / `#5f328c`
- Anual: `#1f008d` / `#3e1562`

```typescript
{ id: "rec-paq-1", offeringId: "1809905245", nombre: "Axios planes",
  monto: 450, dias: 90, mb: 4096, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Redes soc ilim +4GB por 90 dias. Paquete trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#694bd2", secondaryColor: "#8455b4", buttonText: "RECARGAR" }, sortOrder: 31 },

{ id: "rec-paq-2", offeringId: "1809905247", nombre: "Axios planes",
  monto: 550, dias: 90, mb: 12288, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Redes soc ilim +12GB por 90 dias. Paquete trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#694bd2", secondaryColor: "#8455b4", buttonText: "RECARGAR" }, sortOrder: 32 },

{ id: "rec-paq-2b", offeringId: "1809905249", nombre: "Axios planes",
  monto: 730, dias: 90, mb: 24576, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Redes soc ilim +24GB por 90 dias. Paquete trimestral.",
  visualConfig: { badgeText: "TRIMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#694bd2", secondaryColor: "#8455b4", buttonText: "RECARGAR" }, sortOrder: 32 },

{ id: "rec-paq-3", offeringId: "1809905246", nombre: "Axios planes",
  monto: 900, dias: 180, mb: 4096, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Redes soc ilim +4GB por 180 dias. Paquete semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#4020b4", secondaryColor: "#5f328c", buttonText: "RECARGAR" }, sortOrder: 33 },

{ id: "rec-paq-4", offeringId: "1809905248", nombre: "Axios planes",
  monto: 1100, dias: 180, mb: 12288, llamadas: 45450, sms: 1750,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Redes soc ilim +12GB por 180 dias. Paquete semestral.",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#4020b4", secondaryColor: "#5f328c", buttonText: "RECARGAR" }, sortOrder: 34 },

{ id: "rec-paq-4b", offeringId: "1809905250", nombre: "Axios planes",
  monto: 1450, dias: 180, mb: 24576, mbAnterior: 24576, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Plan autorecargable 6 meses. Incluye Redes SocIlim +24GB de Navegación por 30 días| llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "SEMESTRAL", badgeStyle: "ribbon", badgeFlag: "purple",
    primaryColor: "#4020b4", secondaryColor: "#5f328c", buttonText: "RECARGAR" }, sortOrder: 35 },

{ id: "rec-paq-5", offeringId: "1809906804", nombre: "Axios planes",
  monto: 1500, dias: 365, mb: 4096, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Plan Anual autorecargable.Redes Sociales Ilimitadas +4GB de Navegación por 30 días| llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "orange",
    primaryColor: "#1f008d", secondaryColor: "#3e1562", buttonText: "RECARGAR" }, sortOrder: 36 },

{ id: "rec-paq-5b", offeringId: "1809906805", nombre: "Axios planes",
  monto: 2000, dias: 365, mb: 12288, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Plan Anual autorecargable.Redes Sociales Ilimitadas +12GB de Navegación por 30 días| llamadas y SMS MX EEUU CAN|Permite Compartir Datos. https://www.axiosmobile.mx",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "ribbon", badgeFlag: "orange",
    primaryColor: "#1f008d", secondaryColor: "#3e1562", buttonText: "RECARGAR" }, sortOrder: 37 },

{ id: "rec-paq-6", offeringId: "1809906806", nombre: "Axios planes",
  monto: 2500, dias: 365, mb: 24576, llamadas: 45450, sms: 3500,
  hotspot: true, redesSociales: true, isPromo: true, operadoraId: 217,
  observacion: "Redes soc ilim +24GB por 365 dias. Paquete anual.",
  visualConfig: { badgeText: "ANUAL", badgeStyle: "fire", badgeFlag: "orange",   // ⚠️ badgeStyle: fire (no ribbon)
    primaryColor: "#1f008d", secondaryColor: "#3e1562", buttonText: "RECARGAR" }, sortOrder: 38 },
```

#### Internet en Casa recarga (operadoraId 302 — 4 productos HBB)

Paleta: `#9152ff` / `#632a99` · `llamadas: 0`, `sms: 0`, `redesSociales: false`

```typescript
// ⚠️ MB REALES distintos a lo que parece: mb son en MB, no GB
// 20480 MB = 20 GB | 81920 MB = 80 GB | 122880 MB = 120 GB | 143360 MB = 140 GB

{ id: "rec-hbb-1", offeringId: "1200501128", nombre: "Internet Hogar",
  monto: 99, dias: 7, mb: 20480, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 302,
  observacion: "20GB por 7 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: true,
    primaryColor: "#9152ff", secondaryColor: "#632a99", buttonText: "RECARGAR" }, sortOrder: 37 },

{ id: "rec-hbb-2", offeringId: "1200501130", nombre: "Internet Hogar",
  monto: 369, dias: 30, mb: 81920, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 302,
  observacion: "80GB por 30 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: true,
    primaryColor: "#9152ff", secondaryColor: "#632a99", buttonText: "RECARGAR" }, sortOrder: 38 },

{ id: "rec-hbb-3", offeringId: "1200501425", nombre: "Internet Hogar",
  monto: 439, dias: 30, mb: 122880, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 302,
  observacion: "120GB por 30 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: true,
    primaryColor: "#9152ff", secondaryColor: "#632a99", buttonText: "RECARGAR" }, sortOrder: 39 },

{ id: "rec-hbb-4", offeringId: "1200501426", nombre: "Internet Hogar",
  monto: 469, dias: 30, mb: 143360, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 302,
  observacion: "140GB por 30 días. Aplican para consumo de Datos en Territorio Nacional dentro de la Cobertura para Productos de Internet en Casa (HBB). HOTSPOT permitido. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "POPULAR", badgeStyle: "fire", badgeFlag: "purple",   // ⚠️ badgeFlag: purple
    showHotspot: true, primaryColor: "#9152ff", secondaryColor: "#632a99", buttonText: "RECARGAR" },
  sortOrder: 40 },
```

#### Internet Móvil MiFi recarga (operadoraId 304 — 4 productos MIFI)

Paleta: `#ff4dca` / `#841ce6` · `llamadas: 0`, `sms: 0`, `redesSociales: false`, `showHotspot: false`

```typescript
// ⚠️ showHotspot: false en TODOS aunque hotspot: true en el objeto
// MB reales: 5000, 10000, 20000, 50000 (no potencias de 2 exactas)

{ id: "rec-mifi-1", offeringId: "1509901724", nombre: "Internet Movil",
  monto: 119, dias: 30, mb: 5000, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 304,
  observacion: "5GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: false,
    primaryColor: "#ff4dca", secondaryColor: "#841ce6", buttonText: "RECARGAR" }, sortOrder: 40 },

{ id: "rec-mifi-2", offeringId: "1509901725", nombre: "Internet Movil",
  monto: 229, dias: 30, mb: 10000, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 304,
  observacion: "10GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "", badgeStyle: "none", showHotspot: false,
    primaryColor: "#ff4dca", secondaryColor: "#841ce6", buttonText: "RECARGAR" }, sortOrder: 41 },

{ id: "rec-mifi-3", offeringId: "1509901726", nombre: "Internet Movil",
  monto: 359, dias: 30, mb: 20000, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 304,
  observacion: "20GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "POPULAR", badgeStyle: "fire", badgeFlag: "purple",  // ⚠️ badgeFlag: purple
    showHotspot: false, primaryColor: "#ff4dca", secondaryColor: "#841ce6", buttonText: "RECARGAR" }, sortOrder: 43 },

{ id: "rec-mifi-4", offeringId: "1509901727", nombre: "Internet Movil",
  monto: 559, dias: 30, mb: 50000, llamadas: 0, sms: 0,
  hotspot: true, redesSociales: false, isPromo: false, operadoraId: 304,
  observacion: "50GB navegacion + 3GB libres de Redes Sociales por 30 días. Comparte Internet. Aplican para consumo de Datos en Territorio Nacional. Visita https://www.axiosmobile.mx",
  visualConfig: { badgeText: "MAX", badgeStyle: "ribbon", badgeFlag: "purple",    // ⚠️ badgeFlag: purple (no red)
    showHotspot: false, primaryColor: "#ff4dca", secondaryColor: "#841ce6", buttonText: "RECARGAR" }, sortOrder: 44 },
```

---

### 3.5 Sección: Internet en Casa (`internet-casa` / `internetencasa`)

4 productos · tipo `HBB` · grupo `ACTIVACION` · template `"internet"`
`llamadas: 0`, `sms: 0`, `hotspot: false`, `redesSociales: false`
`showHotspot: false` en visualConfig de todos

> **Colores degradados por card** (no un color único): cada card tiene su propio tono de azul-petróleo.

```typescript
// internetEnCasaProducts — fuente: src/lib/mock-data.ts

{ id: "hbb-1", offeringId: "2001001001", nombre: "Internet Casa 10GB",
  grupo: "ACTIVACION", monto: 99, dias: 30, mb: 10240, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: false, redesSociales: false, isPromo: false,
  observacion: "Plan Internet en Casa 10GB por 30 dias.",
  producto: "HBB",
  visualConfig: { template: "internet",
    primaryColor: "#4AB1D0", secondaryColor: "#265A6A",   // más claro
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 1 },

{ id: "hbb-2", offeringId: "2001001002", nombre: "Internet Casa 40GB",
  grupo: "ACTIVACION", monto: 369, dias: 30, mb: 40960, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: false, redesSociales: false, isPromo: false,
  observacion: "Plan Internet en Casa 40GB por 30 dias.",
  producto: "HBB",
  visualConfig: { template: "internet",
    primaryColor: "#3A9DB8", secondaryColor: "#1E4A58",
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 2 },

{ id: "hbb-3", offeringId: "2001001003", nombre: "Internet Casa 50GB",
  grupo: "ACTIVACION", monto: 439, dias: 30, mb: 51200, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: false, redesSociales: false, isPromo: false,
  observacion: "Plan Internet en Casa 50GB por 30 dias.",
  producto: "HBB",
  visualConfig: { template: "internet",
    primaryColor: "#2A8DA8", secondaryColor: "#154252",
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 3 },

{ id: "hbb-4", offeringId: "2001001004", nombre: "Internet Casa 60GB",
  grupo: "ACTIVACION", monto: 469, dias: 30, mb: 61440, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: false, redesSociales: false, isPromo: false,
  observacion: "Plan Internet en Casa 60GB por 30 dias.",
  producto: "HBB",
  visualConfig: { template: "internet",
    primaryColor: "#1A7D98", secondaryColor: "#0C3A46",   // más oscuro
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 4 },
```

> ⚠️ Los `offeringId` `2001001001–2001001004` son **placeholders del mock**. No tienen IDs reales del catálogo telco. El backend debe asignar IDs reales al armar el seed.

---

### 3.6 Sección: Internet Portátil (`internet-portatil` / `internetportatil`)

4 productos · tipo `MIFI` · grupo `ACTIVACION` · template `"internet"`
`llamadas: 0`, `sms: 0`, `hotspot: true` (objeto), `redesSociales: false`, `showHotspot: false` (visual)

> **Colores degradados por card**: cada card tiene su propio tono de índigo.

```typescript
// internetPortatilProducts — fuente: src/lib/mock-data.ts

{ id: "mifi-1", offeringId: "3001001001", nombre: "Internet Portatil 10GB",
  grupo: "ACTIVACION", monto: 119, dias: 30, mb: 10240, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: true, redesSociales: false, isPromo: false,
  observacion: "Plan MiFi 10GB por 30 dias.",
  producto: "MIFI",
  visualConfig: { template: "internet",
    primaryColor: "#411FBE", secondaryColor: "#1E0E58",   // más claro
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 1 },

{ id: "mifi-2", offeringId: "3001001002", nombre: "Internet Portatil 20GB",
  grupo: "ACTIVACION", monto: 229, dias: 30, mb: 20480, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: true, redesSociales: false, isPromo: false,
  observacion: "Plan MiFi 20GB por 30 dias.",
  producto: "MIFI",
  visualConfig: { template: "internet",
    primaryColor: "#3718A8", secondaryColor: "#180B48",
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 2 },

{ id: "mifi-3", offeringId: "3001001003", nombre: "Internet Portatil 35GB",
  grupo: "ACTIVACION", monto: 359, dias: 30, mb: 35840, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: true, redesSociales: false, isPromo: false,
  observacion: "Plan MiFi 35GB por 30 dias.",
  producto: "MIFI",
  visualConfig: { template: "internet",
    primaryColor: "#2D1192", secondaryColor: "#120838",
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 3 },

{ id: "mifi-4", offeringId: "3001001004", nombre: "Internet Portatil 55GB",
  grupo: "ACTIVACION", monto: 559, dias: 30, mb: 56320, mbAnterior: null,
  llamadas: 0, sms: 0, hotspot: true, redesSociales: false, isPromo: false,
  observacion: "Plan MiFi 55GB por 30 dias.",
  producto: "MIFI",
  visualConfig: { template: "internet",
    primaryColor: "#230B7C", secondaryColor: "#0E0528",   // más oscuro
    buttonText: "LO QUIERO", showHotspot: false },
  sortOrder: 4 },
```

> ⚠️ Los `offeringId` `3001001001–3001001004` son **placeholders del mock**. Requieren IDs reales del catálogo telco.

---

## 4. Publicidad / Advertising

### 4.1 Shape del backend (hoy activo)

El frontend consume `GET /v1/landing-manager/advertising`.
La respuesta puede ser array directo o paginada — el front normaliza ambas:

```json
// Respuesta directa:
[ { "_id": "...", "title": "...", ... } ]

// Respuesta paginada (también soportada):
{ "docs": [ { "_id": "...", ... } ] }
```

Shape de cada item de publicidad:

```json
{
  "_id": "6a28594638f96ff673c287e2",
  "title": "2gb regalo",
  "description": "Publicidad campaña junio",
  "category": "publicidad",
  "imageUrl": "https://s3.amazonaws.com/.../full.jpg",
  "imageKey": "advertising/full/uuid.jpg",
  "thumbnailUrl": "https://s3.amazonaws.com/.../thumb.jpg",
  "thumbnailKey": "advertising/thumbnail/uuid.jpg",
  "createdAt": "2026-06-09T00:00:00Z",
  "updatedAt": "2026-06-09T00:00:00Z"
}
```

### 4.2 Tipos de categoría

```typescript
type AdCategory = "publicidad" | "manuales" | "videos";
// Solo "publicidad" está activo hoy. Las otras están reservadas.
```

### 4.3 Endpoints de publicidad

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/v1/landing-manager/advertising` | Listar todas las publicidades |
| `GET` | `/v1/landing-manager/advertising/:id` | Obtener una publicidad |
| `POST` | `/v1/landing-manager/advertising` | Crear metadata (sin imágenes) |
| `PATCH` | `/v1/landing-manager/advertising/:id` | Actualizar title/description |
| `PATCH` | `/v1/landing-manager/advertising/:id/image` | Subir imagen pesada (multipart) |
| `PATCH` | `/v1/landing-manager/advertising/:id/thumbnail` | Subir miniatura (multipart) |
| `DELETE` | `/v1/landing-manager/advertising/:id` | Eliminar (Mongo + S3) |
| `DELETE` | `/v1/landing-manager/advertising/:id/image` | Quitar imagen pesada |
| `DELETE` | `/v1/landing-manager/advertising/:id/thumbnail` | Quitar miniatura |

### 4.4 Campos local-only (no persisten en backend)

| Campo frontend | Comportamiento actual |
|---------------|----------------------|
| `active` | Solo memoria — resetea al recargar |
| `sortOrder` | Solo memoria — resetea al recargar |
| `fileName` | No retornado por backend (para mostrar nombre del archivo) |
| `sizeBytes` | No retornado por backend (para mostrar tamaño) |

### 4.5 Formatos de imagen aceptados

```typescript
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
```

### 4.6 Flujo de creación (front → backend)

```
1. POST /advertising       → { title, description, category }  →  recibe _id
2. PATCH /:id/thumbnail    → multipart File (miniatura)
3. PATCH /:id/image        → multipart File (imagen pesada)
   → Si paso 2 o 3 falla: DELETE /:id (rollback automático)
```

---

## 5. Estilos / Configuración visual

### 5.1 Campos que hoy vienen del backend

- `primaryColor` — color superior de la card (gradiente)
- `secondaryColor` — color inferior de la card (gradiente)
- `assets.badgeImage.url` — imagen del badge/flag (ribbon o fire) — subida vía upload
- `assets.socialIcons[].url` — íconos de redes sociales personalizados — subida vía upload
- `section.assets.backgroundImage.url` — imagen de fondo de la card (a nivel sección)

> La lógica de merge del mapper: item override > section base > fallback default por sección.

### 5.2 Campos solo en mock (el front los toma de `mock-data.ts`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `template` | `"default" \| "promo" \| "hotsale" \| "minimal" \| "premium" \| "internet"` | Template visual de la card |
| `badgeStyle` | `"ribbon" \| "corner" \| "fire" \| "promo" \| "none"` | Estilo del badge |
| `badgeFlag` | `"red" \| "orange" \| "purple" \| "black" \| "mundial"` | Color del flag/imagen |
| `buttonColor` | `string` | `"#ffffff"` por defecto |
| `buttonTextColor` | `string` | `"#000000"` por defecto |
| `showHotspot` | `boolean` | Muestra chip "Comparte Datos" |
| `hotspotText` | `string` | Texto del chip: `"Comparte Datos"` por defecto |
| `showPreviousData` | `boolean` | Muestra "Antes X GB" en la card |
| `previousDataText` | `string` | Texto ej: `"Antes 3 GB"` |
| `durationDisplayMode` | `"days" \| "months-when-possible"` | Cómo se muestra la vigencia |
| `showPlanName` | `boolean` | Muestra nombre de plan encima del precio |
| `planName` | `string` | Texto del nombre del plan |
| `showExtraApps` | `boolean` | Muestra sección "Incluye Apps Streaming" |
| `extraAppsText` | `string` | Texto de la sección de apps |
| `extraApps` | `{id, iconSrc, label}[]` | Array de apps (YouTube, TikTok, Vix, etc.) |
| `socialBarColor` | `string` | Color personalizado de la barra de redes |
| `noColor` | `boolean` | Si `true`, suprime gradiente (full background image) |
| `cardBgIntensity` | `"soft" \| "medium" \| "strong"` | Intensidad del overlay (10%/20%/35%) |

### 5.3 Color presets del frontend (picker de colores — referencia completa)

```typescript
// colorPresets — fuente: src/lib/mock-data.ts
[
  // Secciones principales
  { name: "Cliente nuevo default",            primary: "#7432e8", secondary: "#411c82" },
  { name: "Cámbiate default",                 primary: "#aa01fe", secondary: "#731c82" },
  // Paquetes activación
  { name: "Paquetes anual",                   primary: "#8b1c6f", secondary: "#5a1048" },
  { name: "Paquetes semestral",               primary: "#d94fb3", secondary: "#b02b8e" },
  { name: "Paquetes trimestral",              primary: "#e88ac7", secondary: "#d45baf" },
  // Paquetes portabilidad
  { name: "Paquetes portabilidad anual",      primary: "#7432e8", secondary: "#411c82" },
  { name: "Paquetes portabilidad semestral",  primary: "#a97bf8", secondary: "#7432e8" },
  { name: "Paquetes portabilidad trimestral", primary: "#b08af5", secondary: "#8c5bef" },
  // Recargas
  { name: "Recargas celular",                 primary: "#45ccff", secondary: "#632a99" },
  { name: "Recargas paquetes anual",          primary: "#1f008d", secondary: "#3e1562" },
  { name: "Recargas paquetes semestral",      primary: "#4020b4", secondary: "#5f328c" },
  { name: "Recargas paquetes trimestral",     primary: "#694bd2", secondary: "#8455b4" },
  { name: "Recargas internet en casa",        primary: "#9152ff", secondary: "#632a99" },
  { name: "Recargas internet móvil",          primary: "#ff4dca", secondary: "#841ce6" },
  // Promos
  { name: "Promo naranja",                    primary: "#eb6931", secondary: "#ffb368" },
  { name: "Promo roja radial",                primary: "#ff3636", secondary: "#950000" },
  { name: "Promo rosa",                       primary: "#e11e52", secondary: "#ed6388" },
]
```

### 5.4 Defaults del `createVisualConfig` (base heredada por todos los productos)

```typescript
{
  template: "default",
  badgeText: "",
  badgeStyle: "none",
  badgeFlag: "red",
  primaryColor: "#f97316",       // naranja por defecto (siempre sobreescrito en seed)
  secondaryColor: "#ea580c",
  buttonText: "LO QUIERO",
  buttonColor: "#ffffff",
  buttonTextColor: "#000000",
  showHotspot: true,
  hotspotText: "Comparte Datos",
  showPreviousData: false,
  previousDataText: "Antes 3 GB",
  durationDisplayMode: "days",
}
```

---

## 6. Assets / Visuales

### 6.1 Archivos en `/public` (rutas estáticas del front)

Estos assets están servidos por el propio frontend, **no por S3**. El backend no necesita proveerlos.

**Banderas/flags de badge** (`/flags/`):

| `badgeFlag` valor | Archivo |
|------------------|---------|
| `"red"` | `/flags/flag-promo-red.png` |
| `"orange"` | `/flags/flag-promo-orange.png` |
| `"purple"` | `/flags/flag-promo-purple.png` |
| `"black"` | `/flags/flag-promo-black.png` |
| `"mundial"` | `/flags/flag-promo-mundial.png` |

**Dispositivos** (`/devices/`):
- `/devices/hbb.png` — router HBB (Access CPE 18 LTE Blanco)
- `/devices/mifi.png` — MiFi (ShenZhen F-02)

**Redes sociales** (`/socials/`):
- `/socials/fb.png` — Facebook
- `/socials/whpp.png` — WhatsApp
- `/socials/ig.png` — Instagram
- `/socials/mssg.png` — Messenger
- `/socials/tlg.png` — Telegram
- `/socials/snp.png` — Snapchat
- `/socials/x.png` — X (Twitter)

**Fondos de cards** (`/backgrounds-images-cards/`):
- `/backgrounds-images-cards/bg-mundial.png` — usado en device card HBB

**Streaming** (`/streaming/`):
- `/streaming/tiktok.png`
- `/streaming/youtube.png`
- `/streaming/vix.png`
- `/streaming/2.png`

### 6.2 Device Info (HBB/MiFi) — completamente mock

Este bloque es completamente mock hoy. No hay endpoint para él.

```typescript
// internetDeviceInfoDefaults — fuente: src/lib/mock-data.ts
[
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
    cardBackgroundImageSrc: undefined,    // sin fondo
    price: "$999.00",
    buttonText: "LO QUIERO",
    sectionTitle: "Conéctate donde quieras",
    sectionSubtitle: "Tu internet portátil siempre contigo, sin cables ni complicaciones.",
    plansTitle: "¿Ya tienes tu dispositivo MiFi?",
    plansSubtitle: "Elige tu plan de datos y actívalo al instante.",
  },
]
```

---

## 7. Redes sociales por defecto

```typescript
// defaultSocialNetworks — fuente: src/lib/mock-data.ts
[
  { id: "facebook",  name: "Facebook",   icon: "facebook",   color: "#1877F2", enabled: true },
  { id: "whatsapp",  name: "WhatsApp",   icon: "whatsapp",   color: "#25D366", enabled: true },
  { id: "instagram", name: "Instagram",  icon: "instagram",  color: "#E4405F", enabled: true },
  { id: "messenger", name: "Messenger",  icon: "messenger",  color: "#0084FF", enabled: true },
  { id: "telegram",  name: "Telegram",   icon: "telegram",   color: "#0088CC", enabled: true },
  { id: "snapchat",  name: "Snapchat",   icon: "snapchat",   color: "#FFFC00", enabled: true },
  { id: "x",         name: "X",          icon: "x",          color: "#000000", enabled: true },
]
```

> El front permite subir íconos personalizados por red social. Se guardan vía `assets.socialIcons[]` en el backend con `network` param coincidiendo con el `id`.

---

## 8. Templates y opciones visuales (referencia para el editor)

```typescript
// templateOptions
[
  { id: "default",  name: "Default",  description: "Diseno estandar de tarjeta" },
  { id: "promo",    name: "Promo",    description: "Enfocado en descuentos" },
  { id: "hotsale",  name: "Hot Sale", description: "Promociones especiales" },
  { id: "minimal",  name: "Minimal",  description: "Diseno limpio y simple" },
  { id: "premium",  name: "Premium",  description: "Estilo elegante" },
  { id: "internet", name: "Internet", description: "Para productos de datos" },
]

// badgeStyleOptions
[
  { id: "none",   name: "Sin badge" },
  { id: "ribbon", name: "Ribbon diagonal" },
  { id: "corner", name: "Esquina" },
  { id: "fire",   name: "Con fuego" },
  { id: "promo",  name: "Tag promo" },
]

// badgeFlagOptions (archivos físicos en /public/flags/)
[
  { id: "red",     name: "Rojo",    src: "/flags/flag-promo-red.png" },
  { id: "orange",  name: "Naranja", src: "/flags/flag-promo-orange.png" },
  { id: "purple",  name: "Morado",  src: "/flags/flag-promo-purple.png" },
  { id: "black",   name: "Negro",   src: "/flags/flag-promo-black.png" },
  { id: "mundial", name: "Mundial", src: "/flags/flag-promo-mundial.png" },
]
```

---

## 9. JSON copiable para seed de MongoDB

### Sección completa con item

```json
{
  "section": {
    "key": "cliente-nuevo",
    "name": "Cliente Nuevo",
    "order": 1,
    "isActive": true,
    "sectionStyles": { "primaryColor": "#7432e8", "secondaryColor": "#411c82" },
    "cardStyles": { "primaryColor": "#7432e8", "secondaryColor": "#411c82" },
    "imageStyles": {},
    "assets": { "backgroundImage": null, "badgeImage": null, "socialIcons": [] }
  },
  "items": [
    {
      "sectionKey": "cliente-nuevo",
      "itemType": "product",
      "itemId": "1709903032",
      "title": "Axios linea nueva",
      "description": "*PRECIO ESPECIAL DE $120 A $100* Redes soc ilim. + 3GB por 30dias.",
      "badgeText": "GB EXTRAS\n+ DESCUENTO $!",
      "ctaText": "LO QUIERO",
      "order": 1,
      "isActive": true,
      "customCardStyles": { "primaryColor": "#7432e8", "secondaryColor": "#411c82" },
      "customImageStyles": {},
      "assets": { "badgeImage": null, "socialIcons": [] }
    },
    {
      "sectionKey": "cliente-nuevo",
      "itemType": "product",
      "itemId": "1709902247",
      "title": "Axios linea nueva 12GB",
      "description": "Red Soc Ilim +12GB por 30 dias.",
      "badgeText": "MAS VENDIDO",
      "ctaText": "LO QUIERO",
      "order": 5,
      "isActive": true,
      "customCardStyles": { "primaryColor": "#7432e8", "secondaryColor": "#411c82" },
      "customImageStyles": {},
      "assets": { "badgeImage": null, "socialIcons": [] }
    }
  ]
}
```

### Advertising (shape completo)

```json
{
  "title": "2gb regalo",
  "description": "Publicidad campaña junio 2026",
  "category": "publicidad",
  "imageUrl": null,
  "imageKey": null,
  "thumbnailUrl": null,
  "thumbnailKey": null
}
```

> Las URLs de imagen se llenan con los endpoints PATCH después de crear el documento.

---

## 10. Gaps y notas para el equipo backend

### 🔴 Críticos (el front muestra datos incorrectos sin esto)

1. **Campos telco en items** — `monto`, `dias`, `mb`, `llamadas`, `sms`, `hotspot`, `redesSociales` no están en el schema del item del backend. El front los toma del mock local haciendo match por `offeringId`. Si cambia un `offeringId` en el backend sin actualizar el mock, la card muestra `$0` y `0 GB`.

2. **`operadoraId` en recargas** — el tab "Celular / Paquetes / Internet..." de la sección Recargas se divide por este campo. Si el backend no lo expone, todos los productos se mezclan en un solo tab.

3. **`grupo`** — `ACTIVACION`, `PORTABILIDAD`, `TAE`. El mapper hace default `"ACTIVACION"`. Necesario para la lógica de la sección Paquetes que muestra dos grupos separados.

### 🟡 Importantes (funcionalidad degradada sin esto)

4. **`active` y `sortOrder` en Advertising** — el front los trackea en memoria solamente. Se pierden al recargar. Si el backend los soporta, el front ya tiene la lógica de mapeo.

5. **Device Info (HBB/MiFi)** — no hay endpoint. El front usa defaults hardcodeados. Un endpoint `GET /sections/:key/device-info` evitaría modificar el front para cambiar texto/precio del dispositivo.

6. **`isPromo`** — campo del producto, hoy solo en mock. Usado para filtros y el display del card "promo".

7. **`producto`** — `"MOV"`, `"HBB"`, `"MIFI"`. El mapper siempre devuelve `"MOV"`. Necesario para diferenciación en secciones HBB/MiFi.

### 🟢 Deseables (mejoras no urgentes)

8. **`mbAnterior`** — para mostrar "Antes X GB" en la card. Hoy solo en mock.

9. **`fileName` y `sizeBytes` en Advertising** — para mostrar el tamaño del archivo al distribuidor.

10. **`sortOrder` y `active` en Advertising** — persistir en backend para que no se reseteen.

11. **`observacion` vs. `description`** — el campo `description` del `ApiItem` mapea a `observacion` del `Product`. Asegurarse que el backend devuelva siempre `description` (no solo `subtitle`).

### ⚠️ Gotchas de MB en recargas

Los MB de algunas recargas **no son potencias de 2 exactas**:
- MiFi: `5000`, `10000`, `20000`, `50000` (no 5120, 10240, 20480, 51200)
- El front los muestra como `4.9 GB`, `9.8 GB`, `19.5 GB`, `48.8 GB`
- Si el backend normaliza a potencias de 2, el display cambiará

---

## 11. Checklist de verificación de seed

- [ ] Las 6 secciones existen con sus `key` exactos (tabla §1.3)
- [ ] Cada sección tiene `cardStyles.primaryColor` y `cardStyles.secondaryColor`
- [ ] Los 7 items de `cliente-nuevo` existen con `itemId` coincidiendo con `offeringId` del catálogo
- [ ] Los 7 items de `cambiate` existen (mismo criterio)
- [ ] Los 18 items de `paquetes` existen (9 activación + 9 portabilidad)
- [ ] Los 30 items de `recargas` existen con `operadoraId` correcto por item
- [ ] Los 4 items de `internet-casa` tienen IDs telco reales (no los `2001001xxx` del mock)
- [ ] Los 4 items de `internet-portatil` tienen IDs telco reales (no los `3001001xxx` del mock)
- [ ] Al menos 1 publicidad de prueba en MongoDB (aunque sin imágenes)
- [ ] `GET /v1/landing-manager/sections` responde con array de 6 secciones
- [ ] `GET /v1/landing-manager/sections/cliente-nuevo/full` responde con `{ section, items }` con items
- [ ] `GET /v1/landing-manager/advertising` responde con array (directo o `{ docs: [] }`)

---

*Generado desde código fuente literal: `src/lib/mock-data.ts`, `src/lib/advertising.ts`, `src/lib/api/landing-manager.ts`, `src/lib/api/landing-mapper.ts`. Fecha: Junio 2026.*
