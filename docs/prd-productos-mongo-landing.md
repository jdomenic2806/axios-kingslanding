# PRD — Persistencia de productos para la landing

> ⚠️ **OBSOLETO / SUPERSEDED.** Este PRD asumía persistencia **solo en Mongo** y landing en Next.js.
> La arquitectura vigente es **doble persistencia**: datos comerciales en el **WS (SQL Server)** y
> estilos en **Mongo**, ambos vía la API Node **apitae-axios**, con front en Vite/React.
> Ver el documento actual: **`docs/prd-doble-persistencia-ws-mongo.md`**.
> Se conserva este archivo solo como referencia del shape de campos visuales.

Este feature conecta el editor actual de productos con MongoDB para que los cambios guardados queden persistidos y la landing pública de Next.js renderice la data real desde base de datos en el próximo refresh.

## Resumen ejecutivo

- El botón actual de “publicar” pasa a comportarse como **guardar cambios**.
- Los productos se persistirán en una colección de MongoDB.
- La landing pública dejará de depender de mock data para los productos y leerá desde la API existente en Node + Express.
- No se implementará un flujo draft/publish: **guardar = cambio disponible para la próxima recarga**.

## Problema

Hoy el front de edición ya permite modificar productos, pero esos cambios no viven en una fuente persistente de verdad para producción. La landing necesita leer una fuente centralizada para reflejar cambios comerciales reales sin depender de datos mockeados o cambios manuales en código.

## Objetivo

Permitir que un usuario edite productos en el manager, los guarde en MongoDB mediante la API existente y que la landing de producción consuma esos productos persistidos al volver a cargar la página.

## Objetivos no incluidos

- Gestión de configuración global de la landing.
- Flujo de borrador vs publicación.
- Historial de versiones, rollback o auditoría avanzada.
- CMS genérico para otras entidades fuera de productos.
- Subida definitiva de assets a storage externo.

## Usuarios

- **Equipo comercial/operativo**: edita productos y espera ver los cambios reflejados rápidamente.
- **Visitante de la landing**: consume la oferta pública actualizada.

## Flujo esperado

1. El usuario edita un producto en el manager.
2. Presiona el botón actual de “publicar”, que en este alcance significa **save**.
3. El frontend envía los productos editados a la API existente.
4. La API valida y guarda en MongoDB.
5. En el siguiente refresh de la landing pública, Next consulta la API y renderiza la nueva data.

## Alcance funcional

### Incluido

- Crear la colección de productos en MongoDB.
- Definir el contrato de datos entre editor, API y landing.
- Guardar cambios de productos desde el editor.
- Leer productos desde la API para renderizarlos en la landing Next.
- Persistir estado de activación, orden y atributos visuales necesarios para la card.

### Excluido

- Configuración de secciones no basada en productos.
- Cambios automáticos en tiempo real sin refresh.
- Panel de historial de cambios.
- Moderación/aprobación antes de publicar.

## Requisitos funcionales

### RF1. Persistencia de productos
El sistema debe guardar productos en MongoDB usando la API actual de Node + Express.

### RF2. Guardado directo
El botón actual del editor debe guardar inmediatamente la información persistente; no existirá estado intermedio draft.

### RF3. Lectura pública
La landing de Next.js debe obtener los productos desde la API y no desde datos mock para el render productivo.

### RF4. Render en próximo refresh
Una vez guardado un cambio correctamente, la landing debe mostrarlo en la próxima recarga de página.

### RF5. Compatibilidad con modelo actual
La persistencia debe cubrir, como mínimo, los campos ya usados por el editor y por el renderer actual de cards.

### RF6. Soporte de activación y orden
Cada producto debe mantener al menos:
- identificador
- sección o grupo comercial
- orden
- estado activo/inactivo
- contenido comercial
- configuración visual necesaria para render

## Requisitos no funcionales

- **Consistencia**: el shape persistido debe ser estable entre editor, API y landing.
- **Mantenibilidad**: el contrato debe poder reemplazar gradualmente el mock data actual.
- **Seguridad**: la API debe validar el payload antes de persistir.
- **Resiliencia básica**: si falla el guardado, el editor debe poder informar error al usuario.
- **Performance razonable**: la lectura pública debe ser suficiente para renderizar la landing sin transformaciones costosas en cliente.

## Propuesta de datos

### Colección inicial
`products`

### Documento sugerido

```ts
{
  _id: ObjectId,
  productId: string,
  offeringId: string,
  nombre: string,
  grupo: "ACTIVACION" | "PORTABILIDAD" | "TAE",
  producto: "MOV" | "HBB" | "MIFI",
  monto: number,
  dias: number,
  mb: number,
  mbAnterior?: number | null,
  llamadas: number,
  sms: number,
  hotspot: boolean,
  redesSociales: boolean,
  observacion: string,
  isPromo?: boolean,
  sortOrder: number,
  active: boolean,
  operadoraId?: number,
  visualConfig: {
    template: string,
    badgeText: string,
    badgeStyle: string,
    badgeFlag: string,
    primaryColor: string,
    secondaryColor: string,
    buttonText: string,
    buttonColor: string,
    buttonTextColor: string,
    showHotspot: boolean,
    hotspotText: string,
    showPreviousData: boolean,
    previousDataText: string,
    socialNetworks: Array<{
      id: string,
      name: string,
      icon: string,
      color: string,
      enabled: boolean
    }>,
    cardBackgroundImageSrc?: string,
    cardBgIntensity?: "soft" | "medium" | "strong",
    socialBarColor?: string
  },
  updatedAt: string,
  createdAt: string
}
```

## Contrato funcional entre sistemas

| Capa | Responsabilidad |
|---|---|
| Editor (frontend manager) | Editar producto y enviar save |
| API Node/Express | Validar payload, persistir en Mongo, exponer lectura |
| MongoDB | Fuente de verdad de productos |
| Landing Next.js | Consultar la API y renderizar productos persistidos |

## Propuesta de endpoints

> Nombres tentativos; se ajustan al estilo de la API existente.

- `GET /products` → devuelve productos para la landing
- `PUT /products/:productId` → actualiza un producto
- opcional: `PUT /products` o `POST /products/bulk-save` → guarda cambios en lote si el editor trabaja múltiples productos por sesión

## Decisiones de producto ya definidas

- Solo se persistirán **productos** por ahora.
- La landing consumirá la data desde la **API existente**, no directo desde Mongo.
- El botón de “publicar” se interpreta como **save**.
- Los cambios se reflejan en producción en el **próximo refresh**, no en tiempo real.

## Riesgos y supuestos

### Riesgos
- El shape actual del editor puede incluir campos temporales o dependientes de mock data.
- Algunas imágenes hoy usan `objectUrl`, lo cual no sirve como persistencia real entre sesiones.
- Puede existir diferencia entre lo que necesita el editor y lo que necesita la landing pública.

### Supuestos
- Ya existe una API funcional en Node + Express conectable a Mongo.
- La landing Next puede consumir esa API desde servidor o build/runtime sin bloqueo de red.
- El modelo actual de `Product` es la base inicial del contrato persistido.

## Criterios de aceptación

- [ ] Existe una colección `products` en Mongo con el shape acordado.
- [ ] El editor puede guardar cambios de producto a través de la API existente.
- [ ] La API valida los datos mínimos antes de persistir.
- [ ] La landing deja de depender de productos mock para el render productivo.
- [ ] Al refrescar la landing después de un save exitoso, se ven los cambios guardados.
- [ ] Los campos visuales requeridos por la card actual se conservan correctamente.

## Preguntas abiertas para implementación

1. ¿El save será por producto individual o en lote?
2. ¿Qué campos del modelo actual no deberían persistirse?
3. ¿Cómo se resolverán imágenes custom que hoy viven como `objectUrl` local?
4. ¿La landing usará fetch server-side, ISR o lectura on-demand en cada request?
5. ¿Hace falta autenticación en los endpoints de escritura para el manager?

## Siguiente paso recomendado

Diseñar el contrato técnico final entre el `Product` actual del frontend y el esquema Mongo/Express, especialmente para:
- campos obligatorios
- estrategia de guardado individual vs bulk
- tratamiento de imágenes persistentes
- forma de lectura desde Next en producción
