"use client";

import { useState } from "react";
import { X, Monitor, Tablet, Smartphone } from "lucide-react";
import { type Product, type InternetDeviceInfo, formatDataSize, formatPrice } from "@/lib/mock-data";
import { ProductBadge, ProductCardInner } from "@/components/landing/card-preview-renderer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
  products: Product[];
  sectionName: string;
  sectionId?: string;
  deviceInfoMap?: InternetDeviceInfo[];
  onClose: () => void;
  open: boolean;
}

type DeviceSize = "desktop" | "tablet" | "mobile";

const deviceSizes: Record<DeviceSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

// Check if it's an Internet section (different layout)
const isInternetSection = (sectionId?: string) => {
  return sectionId === "internetencasa" || sectionId === "internetportatil";
};

export function PreviewPanel({ products, sectionName, sectionId, deviceInfoMap, onClose, open }: PreviewPanelProps) {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");

  const isInternet = isInternetSection(sectionId);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="right" 
        className="w-[70vw] max-w-none sm:max-w-none p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4">
          <div>
            <SheetTitle className="text-foreground">Preview</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Asi se vera en la landing
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Device toggles */}
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={deviceSize === "desktop" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceSize("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={deviceSize === "tablet" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceSize("tablet")}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={deviceSize === "mobile" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceSize("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Preview content */}
        <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-6">
          <div
            className="min-h-[500px] rounded-lg bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8 transition-all duration-300"
            style={{
              width: deviceSize === "desktop" ? "100%" : deviceSizes[deviceSize].width,
              maxWidth: "100%",
            }}
          >
            {/* Section title preview */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white">{sectionName}</h2>
              <p className="mt-2 text-slate-400">
                {isInternet ? "Conectate por primera vez" : "Elige el plan perfecto para ti"}
              </p>
            </div>

            {/* Different layout based on section type */}
            {isInternet ? (
              <InternetSectionPreview 
                products={products} 
                deviceSize={deviceSize}
                deviceInfo={deviceInfoMap?.find((d) => d.sectionId === sectionId)}
              />
            ) : (
              <MobileCardsPreview 
                products={products} 
                deviceSize={deviceSize} 
              />
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          {products.filter((p) => p.active).length} productos activos - {deviceSizes[deviceSize].label}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Mobile cards carousel preview (for activacion, portabilidad, recargas, paquetes)
function MobileCardsPreview({ products, deviceSize }: { products: Product[]; deviceSize: DeviceSize }) {
  return (
    // items-end ensures all cards (with uniform paddingTop for badge alignment) sit
    // at the same bottom edge, so visual card tops are aligned.
    // pt-8 gives headroom for the flag PNG that protrudes above the card top.
    <div
      className={cn(
        "flex gap-6 overflow-x-auto pb-4 pt-8",
        deviceSize === "mobile" ? "flex-col items-center" : "justify-start items-end"
      )}
    >
      {products
        .filter((p) => p.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((product) => (
          <PreviewProductCard
            key={product.id}
            product={product}
            compact={deviceSize === "mobile"}
          />
        ))}
    </div>
  );
}

// Internet section preview (device + packages grid)
function InternetSectionPreview({ 
  products, 
  deviceSize,
  deviceInfo,
}: { 
  products: Product[]; 
  deviceSize: DeviceSize;
  deviceInfo?: InternetDeviceInfo;
}) {
  const activeProducts = products.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder);
  
  return (
    <div className={cn(
      "flex",
      deviceSize === "mobile" ? "flex-col" : "justify-center"
    )}>
      <div className={cn(
        "flex gap-8",
        deviceSize === "mobile" ? "flex-col w-full" : "flex-row items-start w-full max-w-4xl"
      )}>
      {/* Left side - Device card (~35%) */}
      <div className={cn("flex-shrink-0", deviceSize !== "mobile" && "w-[35%] max-w-[260px]")}>
        <div className="mb-4">
          <h3 className="text-xl font-bold italic text-white">
            {deviceInfo?.sectionTitle ?? "Conéctate por primera vez"}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {deviceInfo?.sectionSubtitle ?? "Adquiere tu equipo y comienza a navegar."}
          </p>
        </div>
        
        {/* Device Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center relative overflow-hidden">
          {/* Card background image (decorative, 72×72 recommended) */}
          {deviceInfo?.cardBackgroundImageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deviceInfo.cardBackgroundImageSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none select-none"
            />
          )}
          {/* Device Image */}
          <div className="relative w-full h-40 rounded-lg mb-4 overflow-hidden flex items-center justify-center bg-slate-50">
            {deviceInfo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deviceInfo.deviceImageSrc}
                alt={deviceInfo.deviceName}
                className="object-contain w-full h-full"
              />
            ) : (
              <div className="text-slate-400 text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Device</span>
              </div>
            )}
          </div>
          
          <h4 className="text-base font-bold text-slate-800 text-center">
            {deviceInfo?.deviceName ?? "Dispositivo"}
          </h4>
          <p className="text-xs text-slate-500 text-center mt-1">
            {deviceInfo?.deviceSubtitle ?? ""}
          </p>
          
          <p className="text-2xl font-black text-slate-800 mt-3">
            {deviceInfo?.price ?? "$850.00"}
          </p>
          
          <button className="w-full mt-4 bg-violet-600 text-white rounded-full py-2.5 font-bold text-sm hover:bg-violet-700 transition-colors">
            {deviceInfo?.buttonText ?? "LO QUIERO"}
          </button>
        </div>
      </div>

      {/* Right side - Packages grid (~60%) */}
      <div className={cn("min-w-0", deviceSize !== "mobile" && "flex-1")}>
        <div className="mb-4">
          <h3 className="text-xl font-bold italic text-white">
            {deviceInfo?.plansTitle ?? "¿Ya tienes un equipo compatible?"}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {deviceInfo?.plansSubtitle ?? "Elige tu paquete preferido."}
          </p>
        </div>

        {/* Packages Grid */}
        <div className={cn(
          "grid gap-4",
          deviceSize === "mobile" ? "grid-cols-1" : "grid-cols-2"
        )}>
          {activeProducts.map((product) => (
            <InternetPackageCard key={product.id} product={product} />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

// Internet package card (white card with package info)
function InternetPackageCard({ product }: { product: Product }) {
  const gbAmount = product.mb >= 1024
    ? `${(product.mb / 1024) % 1 === 0 ? (product.mb / 1024).toFixed(0) : (product.mb / 1024).toFixed(1)}GB`
    : `${product.mb}MB`;
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-lg">
      {/* Header */}
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

      {/* Speed info */}
      <div className="mt-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Vel. Descarga</span>
        <p className="font-bold text-slate-700 text-sm">5 Mbps</p>
      </div>

      {/* Button */}
      <button
        className="w-full mt-3 rounded-full py-2 font-bold text-sm text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#7c3aed" }}
      >
        {product.visualConfig.buttonText}
      </button>
    </div>
  );
}

// Preview card wrapper — uniform paddingTop for badge alignment + delegates render to shared ProductCardInner
function PreviewProductCard({
  product,
}: {
  product: Product;
  compact?: boolean;
}) {
  const hasBadge = product.visualConfig.badgeStyle !== "none";

  return (
    <div
      className="relative flex-shrink-0"
      style={{ overflow: "visible", paddingTop: "32px", width: "100%", minWidth: "270px", maxWidth: "270px" }}
    >
      {hasBadge && (
        <ProductBadge
          text={product.visualConfig.badgeText}
          style={product.visualConfig.badgeStyle}
          flag={product.visualConfig.badgeFlag}
        />
      )}
      <ProductCardInner product={product} />
    </div>
  );
}
