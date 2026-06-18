"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpDown,
  Palette,
  ChevronDown,
  ChevronUp,
  Code2,
  Plus,
  EyeOff,
} from "lucide-react";
import { type Product, type InternetDeviceInfo, formatDataSize, formatPrice, colorPresets, defaultSocialNetworks, getDefaultProductForSection } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ProductBadge, ProductCardInner, BADGE_TEXT_MAX, SOCIAL_IMAGES } from "@/components/landing/card-preview-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CAROUSEL_VIEWPORT_CLASSNAME = "h-[442px]";

// Scope for "Color a todos" in paquetes section
export type PaquetesColorScope = "todos" | "anual" | "semestral" | "trimestral";

// Tab context passed along with color-to-all so page.tsx can filter by grupo
export type PaquetesTabContext = "linea-nueva" | "portabilidad";

// Tab values for the recargas section (maps to operadoraId)
export type RecargasTab = "celular" | "paquetes" | "internet-casa" | "internet-movil";
// Celular agrupa ID_OPERADORA 203 y 211 (ambas son recargas de celular)
const RECARGAS_TABS: { value: RecargasTab; label: string; operadoraIds: number[] }[] = [
  { value: "celular",        label: "Celular",           operadoraIds: [203, 211] },
  { value: "paquetes",       label: "Paquetes",          operadoraIds: [217] },
  { value: "internet-casa",  label: "Internet en casa",  operadoraIds: [302] },
  { value: "internet-movil", label: "Internet móvil",    operadoraIds: [304] },
];

interface ProductListProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onReorderProducts: (products: Product[]) => void;
  onApplyColorToAll: (primaryColor: string, secondaryColor: string, paquetesScope?: PaquetesColorScope, paquetesTab?: PaquetesTabContext) => void;
  /** Called with the new product after the user fills the basic fields dialog */
  onAddProduct?: (product: Product) => void;
  sectionName: string;
  sectionId?: string;
  deviceInfoMap?: InternetDeviceInfo[];
  onSelectDevice?: (device: InternetDeviceInfo) => void;
  disableBulkColorApply?: boolean;
  bulkColorApplyDisabledReason?: string;
  isLoading?: boolean;
}

function CarouselLoadingSkeleton({ cardCount = 8 }: { cardCount?: number }) {
  return (
    <div className={cn(CAROUSEL_VIEWPORT_CLASSNAME, "overflow-hidden rounded-[32px] border border-border/60 bg-card/40")}>
      <div className="cards-carousel-scroll flex h-full gap-6 overflow-x-hidden pb-4 pl-4 pr-2 pt-8 items-end">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} className="h-[410px] w-[270px] flex-shrink-0 rounded-[30px]" />
        ))}
      </div>
    </div>
  );
}



// Detect if a card is inactive — reads the `active` field directly.
// Inactive cards stay in the carousel but render visually muted.
function isProductInactive(product: Product): boolean {
  return product.active === false;
}

// Sortable card: outer wrapper has overflow:visible so badge can protrude
function SortableProductCard({
  product,
  isSelected,
  isFlash,
  onClick,
}: {
  product: Product;
  isSelected: boolean;
  isFlash?: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasBadge = product.visualConfig.badgeStyle !== "none";
  const inactive = isProductInactive(product);

  return (
    // Outer wrapper: overflow:visible + uniform paddingTop=32px for ALL cards so
    // every card starts at the same visual top edge regardless of badge presence.
    // Extra 5px over the badge's top:-27px gives comfortable breathing room.
    <div
      ref={setNodeRef}
      style={{ ...style, paddingTop: "32px" }}
      className={cn(
        "group relative flex-shrink-0 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      data-testid="product-card"
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {/* Inactive wrapper — keeps card position in the carousel but mutes the visuals */}
      <div
        className={cn(
          "relative transition-all duration-200",
          inactive && "opacity-40 grayscale-[60%]",
        )}
      >
        {/* Badge — absolutely positioned, visible above the card */}
        {hasBadge && (
          <ProductBadge
            text={product.visualConfig.badgeText}
            style={product.visualConfig.badgeStyle}
            flag={product.visualConfig.badgeFlag}
          />
        )}

        {/* Card visual */}
        <ProductCardInner
          product={product}
          isSelected={isSelected}
          isDragging={false}
        />
      </div>

      {/* Inactive badge — overlay label, always fully opaque so it's readable */}
      {inactive && (
        <div
          className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg ring-1 ring-white/20"
          style={{ top: "50%" }}
        >
          <EyeOff className="h-3 w-3" />
          Inactiva
        </div>
      )}

      {/* Selection ring */}
      {isSelected && (
        <div className="pointer-events-none absolute inset-0 ring-2 ring-white/80 ring-offset-1 ring-offset-transparent" style={{ borderRadius: "30px", top: "32px" }} />
      )}
      {/* Flash ring — green glow for newly added cards */}
      {isFlash && !isSelected && (
        <div className="pointer-events-none absolute inset-0 ring-2 ring-emerald-400 ring-offset-1 ring-offset-transparent animate-pulse" style={{ borderRadius: "30px", top: "32px" }} />
      )}
    </div>
  );
}

// Overlay card rendered while dragging (shown at cursor position, no opacity loss)
function DragOverlayCard({ product }: { product: Product }) {
  const hasBadge = product.visualConfig.badgeStyle !== "none";

  return (
    <div
      style={{
        position: "relative",
        cursor: "grabbing",
        paddingTop: "32px",
      }}
    >
      {hasBadge && (
        <ProductBadge
          text={product.visualConfig.badgeText}
          style={product.visualConfig.badgeStyle}
          flag={product.visualConfig.badgeFlag}
        />
      )}
      <ProductCardInner product={product} isDragging={true} />
    </div>
  );
}

// ── Internet Device Card ──────────────────────────────────────────────────
function InternetDeviceCard({
  info,
  onClick,
}: {
  info: InternetDeviceInfo;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex-shrink-0 w-[240px] ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Left column header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold italic text-foreground">{info.sectionTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">{info.sectionSubtitle}</p>
      </div>

      {/* White device card */}
      <div
        className={`bg-white rounded-2xl p-5 shadow-xl flex flex-col items-center transition-all duration-150 ${
          onClick
            ? "hover:shadow-2xl hover:ring-2 hover:ring-violet-400 hover:scale-[1.01]"
            : ""
        }`}
      >
        <div className="w-full h-40 rounded-lg mb-4 overflow-hidden flex items-center justify-center bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={info.deviceImageSrc}
            alt={info.deviceName}
            className="object-contain w-full h-full"
          />
        </div>
        <h3 className="text-base font-bold text-slate-800 text-center">{info.deviceName}</h3>
        <p className="text-xs text-slate-500 text-center mt-1">{info.deviceSubtitle}</p>
        <p className="text-2xl font-black text-slate-800 mt-3">{info.price}</p>
        <button
          className="w-full mt-4 rounded-full py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#7c3aed" }}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {info.buttonText}
        </button>
        {onClick && (
          <p className="mt-2 text-[10px] text-slate-400">Haz clic para editar</p>
        )}
      </div>
    </div>
  );
}

// ── Internet Offer Card ───────────────────────────────────────────────────
function InternetOfferCard({
  product,
  isSelected,
  onClick,
  showGiftData,
}: {
  product: Product;
  isSelected: boolean;
  onClick: () => void;
  /** When true, shows "+3GB de regalo en redes sociales" (used for 304 / Internet móvil) */
  showGiftData?: boolean;
}) {
  const gbAmount = product.mb >= 1024
    ? `${(product.mb / 1024) % 1 === 0 ? (product.mb / 1024).toFixed(0) : (product.mb / 1024).toFixed(1)}GB`
    : `${product.mb}MB`;

  return (
    <div
      onClick={onClick}
      data-testid="product-card"
      className={cn(
        "bg-white rounded-xl p-4 shadow cursor-pointer transition-all duration-150 hover:shadow-lg hover:scale-[1.02]",
        isSelected && "ring-2 ring-violet-500 shadow-violet-200 shadow-lg"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-violet-600 font-black italic text-xs">PAQUETE</span>
          <p className="text-violet-700 font-black italic text-lg leading-tight">{gbAmount}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Vigencia</span>
          <p className="font-bold text-slate-700 text-sm">{product.dias} días</p>
        </div>
      </div>

      {/* Price */}
      <p className="text-2xl font-black text-slate-800">{formatPrice(product.monto)}</p>

      {/* Speed */}
      <div className="mt-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Vel. Descarga</span>
        <p className="font-bold text-slate-700 text-sm">5 Mbps</p>
      </div>

      {/* Gift data — Internet móvil (304) only */}
      {showGiftData && (
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 leading-tight">
            +3GB de regalo en redes sociales
          </span>
        </div>
      )}

      {/* Button */}
      <button
        className="w-full mt-3 rounded-full py-2 font-bold text-sm text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#7c3aed" }}
        tabIndex={-1}
      >
        {product.visualConfig.buttonText}
      </button>
    </div>
  );
}

// ── Internet Section Layout ───────────────────────────────────────────────
function InternetSectionLayout({
  products,
  selectedProduct,
  onSelectProduct,
  sectionId,
  deviceInfo,
  onSelectDevice,
}: {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (p: Product) => void;
  sectionId: string;
  deviceInfo?: InternetDeviceInfo;
  onSelectDevice?: (d: InternetDeviceInfo) => void;
}) {
  const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex justify-center">
      <div className="flex gap-8 items-start w-full max-w-4xl">
      {/* Left — device card (~35-40% width) */}
      <div className="flex-shrink-0 w-[35%] min-w-[200px] max-w-[280px]">
        {deviceInfo ? (
          <InternetDeviceCard
            info={deviceInfo}
            onClick={onSelectDevice ? () => onSelectDevice(deviceInfo) : undefined}
          />
        ) : null}
      </div>

      {/* Right — plans grid (~60% width) */}
      <div className="flex-1 min-w-0">
        {deviceInfo && (
          <div className="mb-4">
            <h2 className="text-xl font-bold italic text-foreground">{deviceInfo.plansTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">{deviceInfo.plansSubtitle}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {sorted.map((product) => (
            <InternetOfferCard
              key={product.id}
              product={product}
              isSelected={selectedProduct?.id === product.id}
              onClick={() => onSelectProduct(product)}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Haz clic en un plan para editar su contenido
        </p>
      </div>
      </div>
    </div>
  );
}

// ── JSON Preview Panel ────────────────────────────────────────────────────
function JsonPreviewPanel({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);

  const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="rounded-lg border border-border bg-card/50">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">Preview JSON técnico</span>
          <span className="text-xs text-muted-foreground">({products.length} cards)</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="overflow-x-auto">
            <pre
              className="p-4 text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre overflow-auto max-h-[480px]"
              style={{ background: "transparent" }}
            >
              {JSON.stringify(sorted, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Paquetes Section Layout ───────────────────────────────────────────────────
// Categorizes paquetes by operator group (215 = ACTIVACION / Nueva Línea,
// 216 = PORTABILIDAD / Portabilidad) and within each group by duration
// (anual 365d → semestral 180d → trimestral 90d).

function getPaqueteDuracionLabel(dias: number): string {
  if (dias >= 360) return "Anual";
  if (dias >= 170) return "Semestral";
  if (dias >= 80) return "Trimestral";
  return `${dias} días`;
}

const DURACION_SORT_ORDER: Record<string, number> = {
  Anual: 0,
  Semestral: 1,
  Trimestral: 2,
};

function PaquetesSectionLayout({
  products,
  selectedProduct,
  onSelectProduct,
}: {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (p: Product) => void;
}) {
  // Separate by grupo
  const grupos: Array<{ grupo: "ACTIVACION" | "PORTABILIDAD"; label: string; accentColor: string }> = [
    { grupo: "ACTIVACION", label: "Nueva Línea", accentColor: "text-violet-400" },
    { grupo: "PORTABILIDAD", label: "Portabilidad", accentColor: "text-emerald-400" },
  ];

  return (
    <div className="space-y-10">
      {grupos.map(({ grupo, label, accentColor }) => {
        const grupoProducts = products.filter((p) => p.grupo === grupo);
        if (grupoProducts.length === 0) return null;

        // Group by duration label
        const duracionMap = new Map<string, Product[]>();
        for (const p of grupoProducts) {
          const durLabel = getPaqueteDuracionLabel(p.dias);
          if (!duracionMap.has(durLabel)) duracionMap.set(durLabel, []);
          duracionMap.get(durLabel)!.push(p);
        }

        // Sort duration groups: anual → semestral → trimestral → other
        const sortedDuraciones = [...duracionMap.entries()].sort(([a], [b]) => {
          const oa = DURACION_SORT_ORDER[a] ?? 99;
          const ob = DURACION_SORT_ORDER[b] ?? 99;
          return oa - ob;
        });

        return (
          <div key={grupo}>
            {/* Group header */}
            <div className="mb-4 border-b border-border pb-2">
              <h2 className={`text-lg font-bold ${accentColor}`}>{label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {grupo === "ACTIVACION" ? "Operador 215 · Paquetes para línea nueva" : "Operador 216 · Paquetes de portabilidad"}
              </p>
            </div>

            <div className="space-y-6">
              {sortedDuraciones.map(([durLabel, durProducts]) => {
                const sorted = [...durProducts].sort((a, b) => a.sortOrder - b.sortOrder);
                return (
                  <div key={durLabel}>
                    {/* Duration subheader */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                        {durLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · {sorted[0]?.dias} días · {sorted.length} plan{sorted.length !== 1 ? "es" : ""}
                      </span>
                    </div>

                    {/* Horizontal scroll row of cards */}
                    <div className="flex gap-5 overflow-x-auto pb-3 pl-2 pr-2 pt-8 items-end">
                      {sorted.map((product) => {
                        const hasBadge = product.visualConfig.badgeStyle !== "none";
                        return (
                          <div
                            key={product.id}
                            style={{ paddingTop: "32px" }}
                            className="group relative flex-shrink-0 cursor-pointer"
                            onClick={() => onSelectProduct(product)}
                          >
                            {hasBadge && (
                              <ProductBadge
                                text={product.visualConfig.badgeText}
                                style={product.visualConfig.badgeStyle}
                                flag={product.visualConfig.badgeFlag}
                              />
                            )}
                            <ProductCardInner
                              product={product}
                              isSelected={selectedProduct?.id === product.id}
                              isDragging={false}
                            />
                            {selectedProduct?.id === product.id && (
                              <div
                                className="pointer-events-none absolute inset-0 ring-2 ring-white/80 ring-offset-1 ring-offset-transparent"
                                style={{ borderRadius: "30px", top: "32px" }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Map section id → contextual "nueva card" label
const SECTION_ADD_LABELS: Record<string, string> = {
  activacion: "Nueva oferta de activación",
  portabilidad: "Nueva oferta de portabilidad",
  recargas: "Nueva recarga",
  paquetes: "Nuevo paquete",
};

// ─── New Offer Dialog ─────────────────────────────────────────────────────────
// Collects only the essential fields before creating a card.
// Recargas: precio, vigencia, GB, comparte datos, redes sociales.
// Other commercial sections: precio, vigencia, GB, nombre.

interface NewOfferFields {
  nombre: string;
  monto: number;
  dias: number;
  mb: number;
  hotspot: boolean;
  redesSociales: boolean;
}

type DataUnit = "mb" | "gb";

function mbToDisplayValue(mb: number, unit: DataUnit): string {
  if (unit === "gb") {
    const gb = mb / 1024;
    return Number.isInteger(gb) ? String(gb) : gb.toFixed(2).replace(/\.00$/, "");
  }

  return String(mb);
}

function displayValueToMb(value: string, unit: DataUnit): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return unit === "gb" ? Math.round(numeric * 1024) : Math.round(numeric);
}

const SECTION_DEFAULT_NAMES: Record<string, string> = {
  activacion: "Nueva oferta",
  portabilidad: "Nueva oferta",
  recargas: "Nueva recarga",
  paquetes: "Nuevo paquete",
};

function NewOfferDialog({
  open,
  sectionId,
  sectionName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  sectionId: string;
  sectionName: string;
  onConfirm: (fields: NewOfferFields) => void;
  onCancel: () => void;
}) {
  const isRecarga = sectionId === "recargas";
  const sectionDefaults = getDefaultProductForSection(sectionId);
  const defaultName = SECTION_DEFAULT_NAMES[sectionId] ?? sectionDefaults.nombre;

  const [fields, setFields] = useState<NewOfferFields>({
    nombre: defaultName,
    monto: sectionDefaults.monto,
    dias: sectionDefaults.dias,
    mb: sectionDefaults.mb,
    hotspot: sectionDefaults.hotspot,
    redesSociales: sectionDefaults.redesSociales,
  });
  const [dataUnit, setDataUnit] = useState<DataUnit>("gb");
  const [dataInputValue, setDataInputValue] = useState<string>(
    mbToDisplayValue(sectionDefaults.mb, "gb")
  );

  // Reset form when dialog opens — use section-specific defaults each time
  useEffect(() => {
    if (open) {
      const d = getDefaultProductForSection(sectionId);
      setFields({
        nombre: SECTION_DEFAULT_NAMES[sectionId] ?? d.nombre,
        monto: d.monto,
        dias: d.dias,
        mb: d.mb,
        hotspot: d.hotspot,
        redesSociales: d.redesSociales,
      });
      setDataUnit("gb");
      setDataInputValue(mbToDisplayValue(d.mb, "gb"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDataUnitChange = (nextUnit: DataUnit) => {
    setDataInputValue(mbToDisplayValue(fields.mb, nextUnit));
    setDataUnit(nextUnit);
  };

  const handleDataInputChange = (value: string) => {
    setDataInputValue(value);
    setFields((f) => ({ ...f, mb: displayValueToMb(value, dataUnit) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(fields);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {SECTION_ADD_LABELS[sectionId] ?? "Nueva card"} — {sectionName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="new-nombre">Nombre interno</Label>
            <Input
              id="new-nombre"
              value={fields.nombre}
              onChange={(e) => setFields((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Plan 3GB 30 días"
              className="bg-input"
            />
          </div>

          {/* Precio */}
          <div className="space-y-1.5">
            <Label htmlFor="new-monto">Precio (MXN)</Label>
            <Input
              id="new-monto"
              type="number"
              min={0}
              value={fields.monto}
              onChange={(e) => setFields((f) => ({ ...f, monto: Number(e.target.value) || 0 }))}
              className="bg-input"
            />
          </div>

          {/* Vigencia */}
          <div className="space-y-1.5">
            <Label htmlFor="new-dias">Vigencia (días)</Label>
            <Input
              id="new-dias"
              type="number"
              min={1}
              value={fields.dias}
              onChange={(e) => setFields((f) => ({ ...f, dias: Number(e.target.value) || 1 }))}
              className="bg-input"
            />
          </div>

          {/* Datos (MB/GB) */}
          <div className="space-y-1.5">
            <Label htmlFor="new-mb">
              Datos
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-mb"
                type="number"
                min={0}
                step={dataUnit === "gb" ? "0.1" : "1"}
                value={dataInputValue}
                onChange={(e) => handleDataInputChange(e.target.value)}
                className="bg-input"
              />
              <select
                value={dataUnit}
                onChange={(e) => handleDataUnitChange(e.target.value as DataUnit)}
                className="h-10 rounded-md border border-input bg-input px-3 text-sm"
              >
                <option value="gb">GB</option>
                <option value="mb">MB</option>
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Payload al backend: <span className="font-medium text-foreground">{fields.mb} MB</span>
              {dataUnit === "gb"
                ? ` · ${dataInputValue || "0"} GB = ${fields.mb} MB`
                : ` · ${fields.mb} MB = ${(fields.mb / 1024).toFixed(2)} GB`}
            </p>
            <p className="text-[11px] text-muted-foreground">Podés capturarlo en MB o GB; internamente siempre se guarda en MB.</p>
          </div>

          {/* Comparte datos (Hotspot) — recargas specific */}
          {isRecarga && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="new-hotspot" className="cursor-pointer">Comparte datos (Hotspot)</Label>
              <Switch
                id="new-hotspot"
                checked={fields.hotspot}
                onCheckedChange={(v) => setFields((f) => ({ ...f, hotspot: v }))}
              />
            </div>
          )}

          {/* Redes sociales — recargas specific */}
          {isRecarga && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="new-redes" className="cursor-pointer">Redes sociales ilimitadas</Label>
              <Switch
                id="new-redes"
                checked={fields.redesSociales}
                onCheckedChange={(v) => setFields((f) => ({ ...f, redesSociales: v }))}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear oferta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductList({
  products,
  selectedProduct,
  onSelectProduct,
  onReorderProducts,
  onApplyColorToAll,
  onAddProduct,
  sectionName,
  sectionId,
  deviceInfoMap,
  onSelectDevice,
  disableBulkColorApply = false,
  bulkColorApplyDisabledReason,
  isLoading = false,
}: ProductListProps) {
  const isInternetSection = sectionId === "internetencasa" || sectionId === "internetportatil";
  const isPaquetesSection = sectionId === "paquetes";
  const isRecargasSection = sectionId === "recargas";
  const isCommercialSection = !isInternetSection && !!sectionId;
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "custom">("custom");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Tabs state for paquetes section (linea-nueva | portabilidad)
  const [paquetesTab, setPaquetesTab] = useState<"linea-nueva" | "portabilidad">("linea-nueva");
  // Tabs state for recargas section
  const [recargasTab, setRecargasTab] = useState<RecargasTab>("celular");
  // Pending scope for paquetes "Color a todos" — null means no submenu open
  const [pendingColorPreset, setPendingColorPreset] = useState<{ primary: string; secondary: string; name: string; gradient: string } | null>(null);

  // New offer dialog state
  const [showNewOfferDialog, setShowNewOfferDialog] = useState(false);

  // Flash state — briefly highlights the newest added card
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track products length to detect newly added card
  const prevProductsRef = useRef<Product[]>(products);
  useEffect(() => {
    const prev = prevProductsRef.current;
    if (products.length > prev.length) {
      // A card was added — find the one with the highest sortOrder (the new one)
      const sorted = [...products].sort((a, b) => b.sortOrder - a.sortOrder);
      const newCard = sorted[0];
      if (newCard) {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlashId(newCard.id);
        flashTimerRef.current = setTimeout(() => setFlashId(null), 1800);
      }
    }
    prevProductsRef.current = products;
  }, [products]);

  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);

  // Contextual label for "add" button
  const addLabel = sectionId && SECTION_ADD_LABELS[sectionId]
    ? SECTION_ADD_LABELS[sectionId]
    : "Nueva card";

  // Build and add a new product from dialog fields.
  // Non-editable fields (grupo, llamadas, sms, isPromo, observacion, producto,
  // visualConfig) are sourced from getDefaultProductForSection so new cards are
  // coherent with the target section instead of using the same generic defaults.
  //
  // New offers always go to the START of the carousel: we assign sortOrder=1 to
  // the new card and shift every existing product down by 1. The parent's
  // onReorderProducts is reused via onAddProduct (page.tsx persists the array).
  const handleNewOfferConfirm = (fields: { nombre: string; monto: number; dias: number; mb: number; hotspot: boolean; redesSociales: boolean }) => {
    setShowNewOfferDialog(false);
    if (!onAddProduct || !sectionId) return;
    const newId = `${sectionId}-new-${Date.now()}`;
    const sectionDefs = getDefaultProductForSection(sectionId);
    const newProduct: Product = {
      id: newId,
      offeringId: "",
      nombre: fields.nombre,
      // Section-specific non-editable fields
      grupo: sectionDefs.grupo,
      llamadas: sectionDefs.llamadas,
      sms: sectionDefs.sms,
      isPromo: sectionDefs.isPromo,
      observacion: sectionDefs.observacion,
      producto: sectionDefs.producto,
      // Fields from dialog
      monto: fields.monto,
      dias: fields.dias,
      mb: fields.mb,
      mbAnterior: null,
      hotspot: fields.hotspot,
      redesSociales: fields.redesSociales,
      // Visual config from section defaults, but override hotspot visibility
      visualConfig: {
        ...sectionDefs.visualConfig,
        showHotspot: fields.hotspot,
        socialNetworks: defaultSocialNetworks.map((s) => ({ ...s })),
      },
      // sortOrder = 1 so it lands at the START of the carousel.
      // page.tsx is responsible for adding it; we also reset sort to "custom"
      // so the user-facing sort doesn't re-arrange the new card.
      sortOrder: 1,
      active: true,
    };
    // Reset to custom so any active price-sort doesn't push the new card away.
    setSortOrder("custom");
    onAddProduct(newProduct);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px movement to distinguish click from drag
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(products, oldIndex, newIndex).map(
        (p, idx) => ({ ...p, sortOrder: idx + 1 })
      );
      onReorderProducts(reordered);
      setSortOrder("custom");
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleSort = (order: "asc" | "desc") => {
    if (isPaquetesSection) {
      // Scope sort to the active paquetes tab (linea-nueva=ACTIVACION / portabilidad=PORTABILIDAD)
      const expectedGrupo = paquetesTab === "linea-nueva" ? "ACTIVACION" : "PORTABILIDAD";
      const tabProducts = products.filter((p) => p.grupo === expectedGrupo);
      const otherProducts = products.filter((p) => p.grupo !== expectedGrupo);
      const sortedTab = [...tabProducts].sort((a, b) =>
        order === "asc" ? a.monto - b.monto : b.monto - a.monto
      ).map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
      onReorderProducts([...sortedTab, ...otherProducts]);
    } else if (isRecargasSection) {
      // Scope sort to the active recargas tab (by operadoraIds — celular includes 203+211)
      const tabOps = activeRecargasOperadoraIds;
      const tabProducts = products.filter((p) => tabOps.includes(p.operadoraId ?? -1));
      const otherProducts = products.filter((p) => !tabOps.includes(p.operadoraId ?? -1));
      const sortedTab = [...tabProducts].sort((a, b) =>
        order === "asc" ? a.monto - b.monto : b.monto - a.monto
      ).map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
      onReorderProducts([...sortedTab, ...otherProducts]);
    } else {
      const sorted = [...products].sort((a, b) => {
        if (order === "asc") return a.monto - b.monto;
        return b.monto - a.monto;
      }).map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
      onReorderProducts(sorted);
    }
    setSortOrder(order);
  };

  // For paquetes: sort implicitly by duration type (anual → semestral → trimestral)
  // then by price ascending within each type. Other sections use sortOrder.
  const PAQUETES_DURACION_ORDER: Record<string, number> = {
    Anual: 0,
    Semestral: 1,
    Trimestral: 2,
  };

  // All paquetes sorted (used for DnD context items — must include all for correct reorder)
  const allPaquetesSorted = isPaquetesSection
    ? [...products].sort((a, b) => {
        const aDur = PAQUETES_DURACION_ORDER[getPaqueteDuracionLabel(a.dias)] ?? 99;
        const bDur = PAQUETES_DURACION_ORDER[getPaqueteDuracionLabel(b.dias)] ?? 99;
        if (aDur !== bDur) return aDur - bDur;
        return a.monto - b.monto;
      })
    : [];

  // Filtered paquetes for current tab
  const tabFilteredPaquetes = isPaquetesSection
    ? allPaquetesSorted.filter((p) =>
        paquetesTab === "linea-nueva" ? p.grupo === "ACTIVACION" : p.grupo === "PORTABILIDAD"
      )
    : [];

  // Recargas: filter by active tab's operadoraIds — celular includes both 203 and 211
  // Paquetes tab (217): sort by period anual→semestral→trimestral then price asc
  // Other tabs: sort by price ascending
  const RECARGAS_PAQUETES_DURACION_ORDER: Record<string, number> = {
    Anual: 0,
    Semestral: 1,
    Trimestral: 2,
  };
  const activeRecargasOperadoraIds = RECARGAS_TABS.find((t) => t.value === recargasTab)?.operadoraIds ?? [203];
  const isPaquetesRecargasTab = activeRecargasOperadoraIds.includes(217);
  const RECARGAS_CELULAR_ORDER = [
    "120-30",
    "100-30",
    "100-15",
    "130-15",
    "150-30",
    "190-30",
    "250-30",
    "300-30",
    "500-30",
    "70-7",
    "50-7",
    "40-3",
    "30-3",
    "15-1",
  ] as const;
  const RECARGAS_CELULAR_ORDER_MAP = Object.fromEntries(
    RECARGAS_CELULAR_ORDER.map((key, index) => [key, index])
  ) as Record<string, number>;
  const tabFilteredRecargas = isRecargasSection
    ? (() => {
        const filtered = [...products].filter((p) => activeRecargasOperadoraIds.includes(p.operadoraId ?? -1));
        if (isPaquetesRecargasTab) {
          // Sort paquetes tab: anual→semestral→trimestral, then by price desc within each period
          return filtered.sort((a, b) => {
            const aDur = RECARGAS_PAQUETES_DURACION_ORDER[getPaqueteDuracionLabel(a.dias)] ?? 99;
            const bDur = RECARGAS_PAQUETES_DURACION_ORDER[getPaqueteDuracionLabel(b.dias)] ?? 99;
            if (aDur !== bDur) return aDur - bDur;
            return b.monto - a.monto;
          });
        }
        // Celular tab: explicit production order
        const isCelularTab = activeRecargasOperadoraIds.some((id) => [203, 211].includes(id));
        if (isCelularTab) {
          return filtered.sort((a, b) => {
            const aKey = `${a.monto}-${a.dias}`;
            const bKey = `${b.monto}-${b.dias}`;
            const aOrder = RECARGAS_CELULAR_ORDER_MAP[aKey] ?? 99;
            const bOrder = RECARGAS_CELULAR_ORDER_MAP[bKey] ?? 99;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.sortOrder - b.sortOrder;
          });
        }
        return filtered.sort((a, b) => a.monto - b.monto);
      })()
    : [];

  const sortedProducts = isPaquetesSection
    ? tabFilteredPaquetes
    : isRecargasSection
    ? tabFilteredRecargas
    : [...products].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeProduct = activeId ? products.find((p) => p.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{sectionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isInternetSection
              ? "Haz clic en un plan para editar su contenido"
              : isPaquetesSection
              ? "Seleccioná el tipo de plan · Ordenado por tipo y precio · Arrastra para reordenar · Haz clic para editar"
              : isRecargasSection
              ? "Seleccioná el grupo · Arrastra para reordenar · Haz clic para editar"
              : "Arrastra para reordenar · Haz clic para editar"}
          </p>
        </div>

        {/* Show sort/color controls for all commercial sections except internet */}
        {!isInternetSection && (
          <div className="flex items-center gap-2">
            {/* Nueva card — opens dialog to collect basic fields */}
            {onAddProduct && isCommercialSection && (
              <Button variant="default" size="sm" className="gap-2" onClick={() => setShowNewOfferDialog(true)} title={addLabel}>
                <Plus className="h-4 w-4" />
                {addLabel}
              </Button>
            )}

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por monto</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSort("desc")}>
                  Mayor a menor
                  {sortOrder === "desc" && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("asc")}>
                  Menor a mayor
                  {sortOrder === "asc" && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Apply color to all — standard sections */}
            {!isPaquetesSection && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={disableBulkColorApply}
                    title={bulkColorApplyDisabledReason}
                  >
                    <Palette className="h-4 w-4" />
                    Color a todos
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[360px]">
                  <DropdownMenuLabel>Aplicar gradiente a todas las cards</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        className="group flex items-center gap-2.5 rounded-lg p-2 transition-all hover:bg-[oklch(0.49_0.27_293/0.12)] focus:outline-none focus:ring-2 focus:ring-ring"
                        onClick={() => onApplyColorToAll(preset.primary, preset.secondary)}
                        title={preset.name}
                      >
                        <span
                          className="h-9 w-9 flex-shrink-0 rounded-md ring-1 ring-white/20"
                          style={{ backgroundImage: preset.gradient }}
                        />
                        <span className="text-xs text-muted-foreground group-hover:text-foreground leading-snug text-left break-words min-w-0">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Apply color to all — paquetes: step 1 pick preset, step 2 pick scope */}
            {isPaquetesSection && (
              <>
                {/* Step 1: choose gradient */}
                <DropdownMenu onOpenChange={(open) => { if (!open && pendingColorPreset) setPendingColorPreset(null); }}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={disableBulkColorApply}
                      title={bulkColorApplyDisabledReason}
                    >
                      <Palette className="h-4 w-4" />
                      Color a todos
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[360px]">
                    {!pendingColorPreset ? (
                      <>
                        <DropdownMenuLabel>Elegí el gradiente</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="grid grid-cols-2 gap-2 p-3">
                          {colorPresets.map((preset) => (
                            <button
                              key={preset.name}
                              className="group flex items-center gap-2.5 rounded-lg p-2 transition-all hover:bg-[oklch(0.49_0.27_293/0.12)] focus:outline-none focus:ring-2 focus:ring-ring"
                              onClick={(e) => {
                                e.preventDefault();
                                setPendingColorPreset(preset);
                              }}
                              title={preset.name}
                            >
                              <span
                                className="h-9 w-9 flex-shrink-0 rounded-md ring-1 ring-white/20"
                                style={{ backgroundImage: preset.gradient }}
                              />
                              <span className="text-xs text-muted-foreground group-hover:text-foreground leading-snug text-left break-words min-w-0">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <DropdownMenuLabel className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-sm ring-1 ring-white/20 shrink-0"
                            style={{ backgroundImage: pendingColorPreset.gradient }}
                          />
                          ¿A qué periodo aplicar?
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(
                          [
                            { scope: "todos" as PaquetesColorScope, label: "Todos los periodos" },
                            { scope: "anual" as PaquetesColorScope, label: "Solo Anual" },
                            { scope: "semestral" as PaquetesColorScope, label: "Solo Semestral" },
                            { scope: "trimestral" as PaquetesColorScope, label: "Solo Trimestral" },
                          ] as const
                         ).map(({ scope, label }) => (
                          <DropdownMenuItem
                            key={scope}
                            onClick={() => {
                              onApplyColorToAll(pendingColorPreset.primary, pendingColorPreset.secondary, scope, paquetesTab);
                              setPendingColorPreset(null);
                            }}
                          >
                            {label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-muted-foreground text-xs"
                          onClick={() => setPendingColorPreset(null)}
                        >
                          ← Volver a gradientes
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Internet sections: special device + plans layout ── */}
      {isInternetSection && sectionId ? (
        isLoading ? (
          <CarouselLoadingSkeleton cardCount={4} />
        ) : (
        <InternetSectionLayout
          products={products}
          selectedProduct={selectedProduct}
          onSelectProduct={onSelectProduct}
          sectionId={sectionId}
          deviceInfo={deviceInfoMap?.find((d) => d.sectionId === sectionId)}
          onSelectDevice={onSelectDevice}
        />
        )
      ) : isPaquetesSection ? (
        /* ── Paquetes section: tabs (Línea nueva / Portabilidad) + DnD carousel ── */
        <Tabs value={paquetesTab} onValueChange={(v) => setPaquetesTab(v as "linea-nueva" | "portabilidad")}>
          <TabsList className="mb-2 w-full justify-center">
            <TabsTrigger value="linea-nueva">
              Línea nueva
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                ({allPaquetesSorted.filter((p) => p.grupo === "ACTIVACION").length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="portabilidad">
              Portabilidad
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                ({allPaquetesSorted.filter((p) => p.grupo === "PORTABILIDAD").length})
              </span>
            </TabsTrigger>
          </TabsList>

          {(["linea-nueva", "portabilidad"] as const).map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={sortedProducts.map((p) => p.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {/* Render cards grouped by period with inline separators */}
                  {(() => {
                    // Build ordered groups: [["Anual", [...]], ["Semestral", [...]], ...]
                    const groupMap = new Map<string, Product[]>();
                    for (const p of sortedProducts) {
                      const label = getPaqueteDuracionLabel(p.dias);
                      if (!groupMap.has(label)) groupMap.set(label, []);
                      groupMap.get(label)!.push(p);
                    }
                    const groups = [...groupMap.entries()].sort(([a], [b]) => {
                      return (PAQUETES_DURACION_ORDER[a] ?? 99) - (PAQUETES_DURACION_ORDER[b] ?? 99);
                    });

                    return isLoading ? (
                      <CarouselLoadingSkeleton />
                    ) : (
                      <div className={cn(CAROUSEL_VIEWPORT_CLASSNAME, "cards-carousel-scroll flex gap-0 overflow-x-auto pb-4 pl-4 pr-2 pt-8 items-end")}>
                        {groups.map(([durLabel, durProducts], groupIdx) => (
                          <div key={durLabel} className="flex items-end gap-0 flex-shrink-0">
                            {/* Period separator — shown before each group (except first if it's at the very start) */}
                            <div className="flex-shrink-0 flex flex-col items-center self-stretch justify-end mr-1 ml-1">
                              {/* Vertical rule */}
                              {groupIdx > 0 && (
                                <div className="w-px bg-border/60 flex-1 mb-3 mx-3" style={{ minHeight: "60px" }} />
                              )}
                              {/* Period pill label */}
                              <div
                                className={cn(
                                  "mb-3 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap",
                                  durLabel === "Anual"
                                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                                    : durLabel === "Semestral"
                                    ? "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30"
                                    : "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                                )}
                              >
                                {durLabel}
                              </div>
                            </div>

                            {/* Cards for this period */}
                            <div className="flex gap-6 items-end">
                              {durProducts.map((product) => (
                                <SortableProductCard
                                  key={product.id}
                                  product={product}
                                  isSelected={selectedProduct?.id === product.id}
                                  isFlash={flashId === product.id}
                                  onClick={() => {
                                    if (!activeId) onSelectProduct(product);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </SortableContext>

                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}>
                  {activeProduct ? (
                    <DragOverlayCard product={activeProduct} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </TabsContent>
          ))}
        </Tabs>
      ) : isRecargasSection ? (
        /* ── Recargas section: tabs (Celular / Paquetes / Internet en casa / Internet móvil) + DnD carousel ── */
        <Tabs value={recargasTab} onValueChange={(v) => setRecargasTab(v as RecargasTab)}>
          <TabsList className="mb-2 w-full justify-center">
            {RECARGAS_TABS.map((tab) => {
              const count = products.filter((p) => tab.operadoraIds.includes(p.operadoraId ?? -1)).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    ({count})
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {RECARGAS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={sortedProducts.map((p) => p.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {isLoading ? (
                    <CarouselLoadingSkeleton />
                  ) : tab.operadoraIds.includes(217) ? (
                    /* Paquetes tab: render with period separators (anual→semestral→trimestral) */
                    (() => {
                      const groupMap = new Map<string, Product[]>();
                      for (const p of sortedProducts) {
                        const label = getPaqueteDuracionLabel(p.dias);
                        if (!groupMap.has(label)) groupMap.set(label, []);
                        groupMap.get(label)!.push(p);
                      }
                      const groups = [...groupMap.entries()].sort(([a], [b]) => {
                        return (RECARGAS_PAQUETES_DURACION_ORDER[a] ?? 99) - (RECARGAS_PAQUETES_DURACION_ORDER[b] ?? 99);
                      });
                      return (
                        <div className={cn(CAROUSEL_VIEWPORT_CLASSNAME, "cards-carousel-scroll flex gap-0 overflow-x-auto pb-4 pl-4 pr-2 pt-8 items-end")}>
                          {groups.map(([durLabel, durProducts], groupIdx) => (
                            <div key={durLabel} className="flex items-end gap-0 flex-shrink-0">
                              {/* Period separator */}
                              <div className="flex-shrink-0 flex flex-col items-center self-stretch justify-end mr-1 ml-1">
                                {groupIdx > 0 && (
                                  <div className="w-px bg-border/60 flex-1 mb-3 mx-3" style={{ minHeight: "60px" }} />
                                )}
                                <div
                                  className={cn(
                                    "mb-3 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap",
                                    durLabel === "Anual"
                                      ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                                      : durLabel === "Semestral"
                                      ? "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30"
                                      : "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                                  )}
                                >
                                  {durLabel}
                                </div>
                              </div>
                              {/* Cards for this period */}
                              <div className="flex gap-6 items-end">
                                {durProducts.map((product) => (
                                  <SortableProductCard
                                    key={product.id}
                                    product={product}
                                    isSelected={selectedProduct?.id === product.id}
                                    isFlash={flashId === product.id}
                                    onClick={() => {
                                      if (!activeId) onSelectProduct(product);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <div className={cn(CAROUSEL_VIEWPORT_CLASSNAME, "cards-carousel-scroll flex gap-6 overflow-x-auto pb-4 pl-4 pr-2 pt-8 items-end")}>
                      {sortedProducts.map((product) => (
                        <SortableProductCard
                          key={product.id}
                          product={product}
                          isSelected={selectedProduct?.id === product.id}
                          isFlash={flashId === product.id}
                          onClick={() => {
                            if (!activeId) onSelectProduct(product);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>

                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}>
                  {activeProduct ? (
                    <DragOverlayCard product={activeProduct} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        /* ── Standard sections: DnD carousel ── */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={sortedProducts.map((p) => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            {/* Each card wrapper has paddingTop:32px so all cards align at the same
                visual baseline regardless of badge. pt-8 on the scroll container
                gives headroom for the flag PNG that protrudes above the card. */}
            {isLoading ? (
              <CarouselLoadingSkeleton />
            ) : (
              <div className={cn(CAROUSEL_VIEWPORT_CLASSNAME, "cards-carousel-scroll flex gap-6 overflow-x-auto pb-4 pl-4 pr-2 pt-8 items-end")}>
                {sortedProducts.map((product) => (
                  <SortableProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProduct?.id === product.id}
                    isFlash={flashId === product.id}
                    onClick={() => {
                      // Only fire click if not dragging
                      if (!activeId) onSelectProduct(product);
                    }}
                  />
                ))}
              </div>
            )}
          </SortableContext>

          {/* Floating overlay rendered at cursor during drag */}
          <DragOverlay dropAnimation={{
            duration: 200,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}>
            {activeProduct ? (
              <DragOverlayCard product={activeProduct} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Instructions — only for standard DnD sections (including paquetes) */}
      {!isInternetSection && (
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <h3 className="font-medium text-foreground">Instrucciones</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>- Arrastra cualquier tarjeta para cambiar el orden en la landing</li>
            <li>- Haz clic en una tarjeta para editar sus propiedades</li>
            <li>- Usa &quot;Ordenar&quot; para ordenar por precio</li>
            <li>- Usa &quot;Color a todos&quot; para aplicar un color a todas las cards</li>
          </ul>
        </div>
      )}

      {/* JSON Preview Panel */}
      <JsonPreviewPanel products={products} />

      {/* New Offer Dialog — collects basic fields before creating a card */}
      {isCommercialSection && sectionId && (
        <NewOfferDialog
          open={showNewOfferDialog}
          sectionId={sectionId}
          sectionName={sectionName}
          onConfirm={handleNewOfferConfirm}
          onCancel={() => setShowNewOfferDialog(false)}
        />
      )}
    </div>
  );
}
