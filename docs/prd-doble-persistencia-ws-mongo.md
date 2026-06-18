# PRD — Doble persistencia de ofertas: WS (SQL Server) + Mongo (estilos), vía apitae-axios

> Estado: **Borrador / base inicial**. Este documento define la arquitectura para que el
> manager (axios-kings-landing, Vite/React) edite ofertas y persista en dos destinos a través
> de la API Node **apitae-axios**: los **datos comerciales del producto** en el **WS (SQL Server)**
> y las **preferencias visuales/estilos** en **MongoDB**, manteniendo la mayor consistencia posible.

---

## 1. Resumen ejecutivo

- El manager **nunca** habla directo con SQL Server ni con Mongo. Siempre consume **apitae-axios** (Node).
- Una "card" en la landing = una **oferta**. Una oferta tiene dos clases de datos:
  - **Datos comerciales** (title, precio, vigencia, datos/MB, hotspot, socials on/off, isPromo, …) → viven en el **WS (SQL Server)**, que es la fuente de verdad del producto.
  - **Preferencias de presentación** (template, badge, colores, background, social bar, planName, extraApps, visibilidad, orden, …) → viven en **Mongo**.
- Editar una oferta dispara, idealmente, **una sola llamada** a apitae-axios; la API se encarga de escribir en ambos destinos y de devolver un resultado consistente.
- La landing pública lee de apitae-axios, que **fusiona** WS + Mongo por `offeringId` y entrega la card ya armada.
- Por ahora el objetivo es **dejar la base**: contrato de datos, endpoints y campos del WS. No se implementa flujo draft/publish ni historial.

---

## 2. Contexto y topología

### 2.1 Topología en producción

```
┌──────────────────────┐      ┌─────────────────────┐      ┌──────────────────────────┐
│  Manager (este repo) │      │   apitae-axios      │      │  WS SQL Server (productos)│
│  Vite + React        │ ───► │   API Node          │ ───► │  Fuente de verdad         │
│  (edición de ofertas)│      │                     │      │  comercial de la oferta   │
└──────────────────────┘      │  - ordena/formatea  │      └──────────────────────────┘
                              │  - fusiona WS+Mongo │              ▲
┌──────────────────────┐      │  - valida payloads  │      ┌───────┴──────────────────┐
│  Landing pública     │ ───► │                     │ ───► │  MongoDB (estilos/prefs)  │
│  (consumo)           │      └─────────────────────┘      │  preferencias por oferta  │
└──────────────────────┘                                   └──────────────────────────┘
```

- **apitae-axios** ya existe. Hoy: el WS regresa los productos en su formato crudo y apitae-axios los **ordena y da formato** antes de entregarlos al front.
- Este PRD **extiende** apitae-axios para que además: (a) escriba ediciones al WS, (b) persista preferencias en Mongo, (c) fusione ambos al leer.

### 2.2 Estado actual del manager

- Hoy el editor trabaja **simulado en local** (Zustand + `localStorage`, seed en `src/lib/mock-data.ts`).
- El tipo `Product` (en `src/lib/mock-data.ts`) ya mezcla datos comerciales + `visualConfig`. Este PRD separa conceptualmente esas dos mitades sin romper el tipo de UI.
- Campos comerciales actuales del tipo `Product`: `offeringId`, `nombre`, `grupo`, `monto`, `dias`, `mb`, `mbAnterior`, `llamadas`, `sms`, `hotspot`, `redesSociales`, `observacion`, `producto`, `isPromo`, `sortOrder`, `active`, `operadoraId`.
- Campos de presentación actuales (`ProductVisualConfig`): `template`, `badgeText`, `badgeStyle`, `badgeFlag`, `primaryColor`, `secondaryColor`, `noColor`, `buttonText`, `buttonColor`, `buttonTextColor`, `showHotspot`, `hotspotText`, `showPreviousData`, `previousDataText`, `socialNetworks[]`, `cardBackgroundImageSrc`, `cardBgIntensity`, `socialBarColor`, `durationDisplayMode`, `showPlanName`, `planName`, `showExtraApps`, `extraAppsText`, `extraApps[]`.

---

## 3. Problema

Los cambios que hace el usuario en el manager hoy no se persisten en una fuente real. Además, la oferta tiene **dos dueños naturales**:

- El **WS** es la fuente de verdad de los datos comerciales (precio, vigencia, datos, etc.).
- Las **preferencias visuales** no tienen lugar en el WS y deben vivir aparte (Mongo).

El reto es: **¿cómo editar ambos lados desde un solo sistema sin que se desincronicen?**

---

## 4. Objetivo

Permitir que el usuario edite una oferta en el manager y que, con esa acción:

1. Los **datos comerciales** se escriban en el **WS (SQL Server)** a través de apitae-axios.
2. Las **preferencias visuales** se escriban en **Mongo** a través de apitae-axios.
3. La landing pública, al recargar, lea de apitae-axios la oferta **ya fusionada** (WS + Mongo).
4. Se pueda **crear una oferta nueva** desde el manager (escribe en WS + Mongo) y asignarle estilo y ubicación.

La consigna de esta primera entrega: **dejar la base** (contratos, endpoints, modelo de datos, lista de campos del WS), no la implementación final.

---

## 5. Principios de diseño (consistencia)

1. **Una sola puerta:** el manager y la landing solo conocen **apitae-axios**. Nunca SQL Server ni Mongo directo.
2. **`offeringId` es el ancla de identidad.** Es la clave que une el registro del WS con el documento de preferencias de Mongo.
3. **Separación de responsabilidades por dato:**
   - Dato comercial → WS manda. Mongo nunca lo duplica como verdad.
   - Dato visual → Mongo manda. El WS no lo conoce.
4. **Escritura coordinada (best-effort transaccional):** una edición que toca ambos lados se orquesta en apitae-axios con orden definido y compensación ante fallo parcial (ver §9).
5. **Lectura fusionada:** apitae-axios hace el JOIN lógico por `offeringId` y entrega la card armada, ya ordenada y formateada (como ya hace hoy con el formato).
6. **Idempotencia:** las escrituras usan `offeringId` como clave estable para permitir reintentos seguros.

---

## 6. Flujos

### 6.1 Editar una oferta existente (p. ej. "Plan GOL de 600")

```
1. Manager: usuario edita la card (title, precio, vigencia, datos, hotspot, socials, isPromo, + estilos).
2. Manager → apitae-axios:  PUT /offerings/:offeringId
     body: { commercial: {...campos WS...}, preferences: {...campos Mongo...} }
3. apitae-axios:
     a) Valida payload (zod / class-validator).
     b) Escribe datos comerciales en WS (SQL Server).
     c) Escribe preferencias en Mongo (upsert por offeringId).
     d) Si (c) falla tras (b) OK → política de compensación (§9).
4. apitae-axios → Manager: 200 con la oferta fusionada resultante.
5. Landing pública (en próximo refresh): GET /landing/:section → ofertas fusionadas.
```

### 6.2 Crear una oferta nueva desde el manager

```
1. Manager: usuario crea card nueva, define datos comerciales + estilo + sección/orden.
2. Manager → apitae-axios:  POST /offerings
3. apitae-axios:
     a) Crea la oferta en el WS → obtiene/confirma offeringId.
     b) Crea documento de preferencias en Mongo con ese offeringId.
4. Devuelve la oferta fusionada.
```

> Nota: el WS define cómo se genera el `offeringId` de una oferta nueva. Si lo genera el WS, apitae-axios
> debe esperar ese ID antes de escribir Mongo. Si lo genera el cliente, debe ser único y validado. (Pregunta abierta §12.)

### 6.3 Solo cambiar estilo (sin tocar datos comerciales)

```
Manager → apitae-axios: PATCH /offerings/:offeringId/preferences  → solo Mongo.
```

### 6.4 Solo cambiar dato comercial (sin tocar estilo)

```
Manager → apitae-axios: PATCH /offerings/:offeringId/commercial   → solo WS.
```

---

## 7. Campos que el WS requiere para editar una oferta (card)

> Esta es la lista núcleo de **datos comerciales** que el manager enviará a apitae-axios y que
> apitae-axios traducirá al formato/columnas que el WS (SQL Server) espera.
> Ejemplo del usuario: al editar el Plan GOL de 600 se envía: **title, precio, comparte datos (hotspot),
> vigencia, datos, socials, isPromo**.

### 7.1 Campos comerciales núcleo (van al WS)

| Campo (contrato manager) | Tipo | Significado | Mapeo a campo actual del front | Notas |
|---|---|---|---|---|
| `offeringId` | string | Identidad de la oferta (clave de unión) | `offeringId` | Requerido en edición; en alta lo define el WS o el cliente (ver §12) |
| `title` | string | Nombre/título comercial de la oferta | `nombre` | Texto visible principal de la card |
| `precio` | number | Precio de la oferta | `monto` | ≥ 0 (validación) |
| `vigencia` | number | Vigencia en días | `dias` | ≥ 0; la UI puede mostrar días o meses (`durationDisplayMode` es visual, vive en Mongo) |
| `datos` | number | Cantidad de datos / MB | `mb` | Unidad a confirmar con el WS (MB vs GB) |
| `datosAnteriores` | number \| null | Datos previos (para "antes/ahora") | `mbAnterior` | Opcional |
| `comparteDatos` (hotspot) | boolean | Si la oferta comparte datos / hotspot | `hotspot` | El usuario lo llama "comparte datos" |
| `socials` | boolean | Si incluye redes sociales ilimitadas | `redesSociales` | Flag comercial. El detalle visual de qué redes y su estilo vive en Mongo |
| `isPromo` | boolean | Si la oferta es promoción | `isPromo` | Puede afectar lógica comercial del WS |
| `llamadas` | number | Minutos / llamadas incluidas | `llamadas` | Confirmar si el WS lo administra |
| `sms` | number | SMS incluidos | `sms` | Confirmar si el WS lo administra |
| `observacion` | string | Texto comercial / observación | `observacion` | Confirmar si es comercial (WS) o copy (Mongo) — ver §12 |
| `grupo` | enum | `ACTIVACION` \| `PORTABILIDAD` \| `TAE` | `grupo` | Clasificación comercial |
| `producto` | enum | `MOV` \| `HBB` \| `MIFI` | `producto` | Tipo de producto |
| `operadoraId` | number | ID_OPERADORA (tabs de recargas) | `operadoraId` | Solo recargas |
| `active` | boolean | Oferta activa/inactiva | `active` | Confirmar si el WS gobierna el alta/baja o solo Mongo |

> **Mínimo del ejemplo del usuario (Plan GOL 600):**
> `title`, `precio`, `comparteDatos` (hotspot), `vigencia`, `datos`, `socials`, `isPromo`.

### 7.2 Campos de presentación (van a Mongo, NO al WS)

`template`, `badgeText`, `badgeStyle`, `badgeFlag`, `primaryColor`, `secondaryColor`, `noColor`,
`buttonText`, `buttonColor`, `buttonTextColor`, `showHotspot`, `hotspotText`, `showPreviousData`,
`previousDataText`, `socialNetworks[]` (estilo/orden/iconos de cada red), `cardBackgroundImageSrc`,
`cardBgIntensity`, `socialBarColor`, `durationDisplayMode`, `showPlanName`, `planName`,
`showExtraApps`, `extraAppsText`, `extraApps[]`, `sortOrder` (orden en la sección), `visibility` (regla de visibilidad).

> Regla práctica: **¿el dato cambia el precio/lo que recibe el cliente? → WS. ¿Solo cambia cómo se ve la card? → Mongo.**

---

## 8. Modelo de datos

### 8.1 WS (SQL Server) — fuente de verdad comercial

- El esquema del WS es **externo** (no lo controla este repo). apitae-axios traduce el contrato del §7.1
  a las columnas/SP que el WS exponga.
- apitae-axios ya **ordena y da formato** a la lectura; se reutiliza esa capa.

### 8.2 Mongo — preferencias por oferta

**Colección:** `offering_preferences`

```ts
{
  _id: ObjectId,
  offeringId: string,        // CLAVE DE UNIÓN con el WS (índice único)
  sectionId: string,         // a qué sección/grupo pertenece en la landing
  visualConfig: {
    template: string,
    badgeText: string,
    badgeStyle: "ribbon" | "corner" | "fire" | "promo" | "none",
    badgeFlag: string,
    primaryColor: string,
    secondaryColor: string,
    noColor?: boolean,
    buttonText: string,
    buttonColor: string,
    buttonTextColor: string,
    showHotspot: boolean,
    hotspotText: string,
    showPreviousData: boolean,
    previousDataText: string,
    socialNetworks: Array<{
      id: string, name: string, icon: string, color: string,
      enabled: boolean, customIcon?: string
    }>,
    cardBackgroundImageSrc?: string,
    cardBgIntensity?: "soft" | "medium" | "strong",
    socialBarColor?: string,
    durationDisplayMode?: "days" | "months-when-possible",
    showPlanName?: boolean,
    planName?: string,
    showExtraApps?: boolean,
    extraAppsText?: string,
    extraApps?: Array<{ id: string, iconSrc: string, label?: string }>
  },
  visibility?: { kind: "always" | "hidden" | "window", from?: string, to?: string },
  sortOrder: number,
  updatedAt: string,
  createdAt: string,
  updatedBy?: string,
  version: number            // optimistic concurrency
}
```

**Índices Mongo:**
- `{ offeringId: 1 }` único.
- `{ sectionId: 1, sortOrder: 1 }` para listar ordenado.

### 8.3 Resultado fusionado que apitae-axios entrega (lectura)

```ts
// Card lista para render = comercial (WS) + preferencias (Mongo), unidas por offeringId
{
  offeringId, title, precio, vigencia, datos, comparteDatos, socials, isPromo, ...  // del WS
  visualConfig: { ...del Mongo... },
  sortOrder, visibility                                                              // del Mongo
}
```

> El front (manager y landing) sigue recibiendo una forma cercana al `Product` actual, para minimizar cambios de UI.

---

## 9. Estrategia de consistencia entre WS y Mongo

El reto central es escribir en **dos sistemas** sin transacción distribuida nativa. Estrategia best-effort:

### 9.1 Orden de escritura
1. **Primero el WS** (fuente de verdad comercial).
2. **Luego Mongo** (preferencias).

Rationale: si Mongo falla, el dato comercial (lo crítico) ya quedó. Las preferencias se pueden reintentar
sin afectar el precio/oferta real.

### 9.2 Manejo de fallo parcial
- **WS OK + Mongo FALLA:** apitae-axios responde `207 / parcial` (o `200` con `warnings`), marca la oferta como
  "sin preferencias sincronizadas" y encola un **reintento** de Mongo. La oferta sigue funcional con estilo por defecto.
- **WS FALLA:** se aborta. No se toca Mongo. Se devuelve error al manager (la edición no se aplicó).

### 9.3 Idempotencia y reintentos
- Mongo se escribe con **upsert por `offeringId`** → reintentar es seguro.
- La escritura al WS debe ser idempotente por `offeringId` (UPDATE por clave). En alta (POST), usar la clave que el WS retorne.

### 9.4 Reconciliación (consistencia eventual)
- Job/endpoint `reconcile` en apitae-axios:
  - Lista `offeringId` activos del WS.
  - Detecta **preferencias huérfanas** en Mongo (offeringId que ya no existe en el WS) → marca `orphaned`.
  - Detecta **ofertas del WS sin preferencias** → el manager las muestra para asignarles estilo/orden.
- Frecuencia inicial: manual/on-demand (el catálogo cambia ~1 vez al mes).

### 9.5 Concurrencia
- Mongo: campo `version` (optimistic). Si el cliente envía una versión vieja → `409`.
- WS: respetar el mecanismo de concurrencia que el WS ofrezca (a confirmar §12).

---

## 10. Contrato de API (apitae-axios)

> Nombres tentativos; se ajustan al estilo real de apitae-axios.

### Lectura (consumo landing + manager)
- `GET /landing/:sectionId` → ofertas fusionadas (WS + Mongo), ordenadas y formateadas. **Uso público.**
- `GET /offerings/:offeringId` → una oferta fusionada (manager).
- `GET /admin/sections/:sectionId/offerings` → catálogo editable: comerciales del WS + preferencias + huérfanos.

### Escritura (manager)
- `POST /offerings` → crea oferta (WS + Mongo).
- `PUT /offerings/:offeringId` → edita oferta completa (comercial WS + preferencias Mongo).
- `PATCH /offerings/:offeringId/commercial` → solo datos comerciales (WS).
- `PATCH /offerings/:offeringId/preferences` → solo preferencias (Mongo).
- `DELETE /offerings/:offeringId` → baja (define política: WS + Mongo o solo `active=false`).

### Operación
- `POST /admin/reconcile` → reconciliación WS ↔ Mongo (§9.4).

### Forma del payload de edición completa
```jsonc
PUT /offerings/:offeringId
{
  "commercial": {                 // → WS
    "title": "Plan GOL",
    "precio": 600,
    "vigencia": 30,
    "datos": 8000,
    "comparteDatos": true,        // hotspot
    "socials": true,
    "isPromo": false
    // + llamadas, sms, grupo, producto, operadoraId, active, observacion (según §7.1)
  },
  "preferences": {                // → Mongo
    "visualConfig": { /* §8.2 */ },
    "visibility": { "kind": "always" },
    "sortOrder": 3
  },
  "version": 7                    // optimistic concurrency (Mongo)
}
```

---

## 11. Cambios previstos por repositorio (alcance "dejar la base")

### 11.1 axios-kings-landing (este repo)
- `src/lib/api/apitae-client.ts` (nuevo) — cliente HTTP hacia apitae-axios (lectura/escritura de ofertas).
- `src/lib/schemas/offering.ts` (nuevo) — schemas Zod del contrato `commercial` + `preferences` + fusionado.
- `src/lib/stores/editor-store.ts` — `loadSection` pasa a hacer fetch real; `setCard`/`setVisibility`/etc.
  persisten vía cliente (debounced). (No en esta primera entrega si solo "dejamos la base".)
- `src/lib/mock-data.ts` — queda como **tipos + seed de desarrollo** (fallback), no como verdad productiva.
- `.env.development` — `VITE_APITAE_BASE_URL`.

### 11.2 apitae-axios (API Node)
- Capa de **lectura fusionada** (reutiliza el formateo/orden actual + JOIN por `offeringId`).
- Repos: `ws-offerings.repo` (SQL Server, escritura/lectura) + `offering-preferences.repo` (Mongo).
- Servicio `offering-write.service` que orquesta WS→Mongo con compensación (§9).
- Endpoints del §10.
- Conexión Mongo + índices del §8.2.
- `reconcile` (§9.4).

> Esta primera entrega entrega **contratos, esquema Mongo, lista de campos del WS y endpoints**.
> La implementación de escritura real se hace en una iteración siguiente.

---

## 12. Preguntas abiertas (para implementación)

1. **Alta de oferta:** ¿el `offeringId` lo genera el WS (y apitae-axios debe esperarlo) o lo provee el cliente?
2. **`observacion`:** ¿es dato comercial (WS) o copy de marketing (Mongo)? Hoy está en el tipo comercial.
3. **`active` / baja:** ¿el WS administra el alta/baja del producto, o "inactivar una card" es solo visibilidad (Mongo)?
4. **Unidad de `datos`:** ¿el WS espera MB, GB u otro? Definir conversión en apitae-axios.
5. **`llamadas` / `sms`:** ¿los administra el WS o son fijos/derivados?
6. **Concurrencia en WS:** ¿el WS ofrece versión/rowversion para optimistic locking, o se confía en último-gana?
7. **Métodos del WS:** ¿apitae-axios escribe vía SP, vía tabla directa, o vía otro servicio intermedio del WS?
8. **Imágenes:** `cardBackgroundImageSrc` y `customIcon` hoy pueden ser `objectUrl` local. ¿Dónde se alojan en producción (CDN/storage)? Mongo solo debe guardar URLs persistentes.
9. **Auth:** ¿los endpoints de escritura del manager requieren autenticación/roles?
10. **Sección/orden:** ¿`sectionId` y `sortOrder` los gobierna el WS o son 100% responsabilidad de Mongo?

---

## 13. Criterios de aceptación (de esta base)

- [ ] Documento define la lista de **campos comerciales que van al WS** (§7.1) y los **visuales que van a Mongo** (§7.2).
- [ ] Documento define el **esquema Mongo** `offering_preferences` con `offeringId` como clave de unión (§8.2).
- [ ] Documento define los **endpoints de apitae-axios** para leer fusionado y escribir en ambos destinos (§10).
- [ ] Documento define la **estrategia de consistencia** WS↔Mongo (orden, fallo parcial, idempotencia, reconciliación) (§9).
- [ ] Documento deja claras las **preguntas abiertas** que bloquean la implementación (§12).

---

## 14. Fuera de alcance (por ahora)

- Flujo draft vs publish y snapshots de publicación.
- Historial de versiones / auditoría avanzada / rollback.
- Subida/gestión definitiva de assets a storage externo.
- Configuración global del sitio (logo, footer, branding) más allá de la oferta.
- CMS genérico para entidades distintas de ofertas.

---

## 15. Siguiente paso recomendado

Resolver §12 (sobre todo 1, 3, 7 y 10), y con eso pasar a un **diseño técnico** que detalle el mapeo
exacto contrato↔WS y la orquestación de escritura en apitae-axios.
