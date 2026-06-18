"use client";

/**
 * card-preview-renderer.tsx
 *
 * Shared card renderer used by:
 *  - product-list.tsx  (list/carousel view)
 *  - preview-panel.tsx (global preview sheet)
 *  - product-editor.tsx (live preview column inside editor sheet)
 *
 * Exports:
 *  - ProductBadge     — flag/ribbon/corner/promo badge overlay
 *  - ProductCardInner — the full card visual (background, price, data, socials, button)
 *
 * Rules:
 *  - No drag-and-drop logic here (belongs in product-list.tsx)
 *  - No editor state here (belongs in product-editor.tsx)
 *  - Renders purely from `product: Product` prop
 */

import { Wifi } from "lucide-react";
import { Star, Tag } from "lucide-react";
import { type Product, formatDataSize, formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

export const BADGE_TEXT_MAX = 13;

function formatDurationLabel(
  days: number,
  mode: Product["visualConfig"]["durationDisplayMode"] = "days"
): string {
  if (mode === "months-when-possible" && days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }

  return `${days} dias`;
}

// Social network image map (public/socials/)
export const SOCIAL_IMAGES: Record<string, string> = {
  facebook: "/socials/fb.png",
  whatsapp: "/socials/whpp.png",
  instagram: "/socials/ig.png",
  messenger: "/socials/mssg.png",
  telegram: "/socials/tlg.png",
  snapchat: "/socials/snp.png",
  x: "/socials/x.png",
};

// Flag image map — /public/flags/
const FLAG_IMAGES: Record<string, string> = {
  red: "/flags/flag-promo-red.png",
  orange: "/flags/flag-promo-orange.png",
  purple: "/flags/flag-promo-purple.png",
  black: "/flags/flag-promo-black.png",
  mundial: "/flags/flag-promo-mundial.png",
};

// ─── Badge text fitting ───────────────────────────────────────────────────────

interface BadgeTextStyle {
  fontSize: string;
  lineHeight: number;
  maxWidth: string;
  top: string;
  left: string;
}

function badgeTextStyle(text: string): BadgeTextStyle {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const longestWord = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  const totalChars = trimmed.replace(/\s+/g, "").length;

  if (wordCount === 1) {
    if (totalChars <= 5) {
      return { fontSize: "13px", lineHeight: 1.1, maxWidth: "68px", top: "6px", left: "4px" };
    } else if (totalChars <= 9) {
      return { fontSize: "11px", lineHeight: 1.1, maxWidth: "70px", top: "5px", left: "4px" };
    } else {
      return { fontSize: "9px", lineHeight: 1.15, maxWidth: "72px", top: "5px", left: "4px" };
    }
  }

  if (wordCount <= 3) {
    if (longestWord.length <= 6 && totalChars <= 12) {
      return { fontSize: "11px", lineHeight: 1.2, maxWidth: "66px", top: "4px", left: "5px" };
    } else if (totalChars <= 18) {
      return { fontSize: "10px", lineHeight: 1.2, maxWidth: "68px", top: "4px", left: "4px" };
    } else {
      return { fontSize: "9px", lineHeight: 1.2, maxWidth: "70px", top: "4px", left: "4px" };
    }
  }

  return { fontSize: "8.5px", lineHeight: 1.25, maxWidth: "72px", top: "3px", left: "4px" };
}

// ─── ProductBadge ─────────────────────────────────────────────────────────────

/**
 * Renders the flag/ribbon/corner/promo badge overlay on a card.
 *
 * The outer card wrapper must have:
 *   position: relative, overflow: visible, paddingTop: 32px (for ribbon/fire)
 */
export function ProductBadge({
  text,
  style,
  flag = "red",
}: {
  text: string;
  style: string;
  flag?: string;
}) {
  if (style === "none") return null;

  const flagSrc =
    FLAG_IMAGES[flag] ??
    (flag?.startsWith("blob:") || flag?.startsWith("/") || flag?.startsWith("http")
      ? flag
      : null) ??
    FLAG_IMAGES.red;

  const displayText = text?.trim() ?? "";
  const hasText = displayText.length > 0;

  switch (style) {
    case "fire":
    case "ribbon": {
      const ts = hasText
        ? badgeTextStyle(displayText)
        : { fontSize: "11px", lineHeight: 1.1, maxWidth: "70px", top: "5px", left: "4px" };
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "140px",
            height: "90px",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-27px",
              left: "-11px",
              width: "140px",
              height: "90px",
              backgroundImage: `url(${flagSrc})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              backgroundPosition: "top left",
            }}
          />
          {hasText && (
            <span
              style={{
                position: "absolute",
                top: ts.top,
                left: ts.left,
                zIndex: 31,
                rotate: "-20deg",
                color: "#EBE531",
                fontWeight: 900,
                fontSize: ts.fontSize,
                textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
                whiteSpace: "pre-line",
                lineHeight: ts.lineHeight,
                maxWidth: ts.maxWidth,
                wordBreak: "break-word",
              }}
            >
              {displayText}
            </span>
          )}
        </div>
      );
    }
    case "corner":
      if (!hasText) return null;
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 30,
            overflow: "hidden",
            borderTopRightRadius: "16px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #fde047, #f97316, #ef4444)",
              padding: "4px 12px 4px 20px",
              clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            <span className="text-[10px] font-black uppercase text-black flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {displayText}
            </span>
          </div>
        </div>
      );
    case "promo":
      if (!hasText) return null;
      return (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <div
            className="flex items-center gap-1 rounded-full px-3 py-1 shadow-lg"
            style={{ background: "#dc2626", color: "#fff" }}
          >
            <Tag className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase">{displayText}</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// ─── ProductCardInner ─────────────────────────────────────────────────────────

/**
 * The inner card visual — background gradient/image, price, data, socials, button.
 *
 * Used at a fixed 270px width in list/preview, and at 100% width inside a
 * constrained container in the editor live-preview column.
 *
 * Props:
 *  - product     — the product data to render
 *  - isSelected  — show selection ring
 *  - isDragging  — apply drag scale/rotation
 */
export function ProductCardInner({
  product,
  isSelected,
  isDragging,
}: {
  product: Product;
  isSelected?: boolean;
  isDragging?: boolean;
}) {
  const enabledSocials = product.visualConfig.socialNetworks.filter((s) => s.enabled);
  const socialBarColor =
    product.visualConfig.socialBarColor ?? product.visualConfig.secondaryColor;
  const noColor = product.visualConfig.noColor ?? false;

  const hasImage = !!product.visualConfig.cardBackgroundImageSrc;
  const cardBackground = noColor
    ? hasImage
      ? "transparent"
      : "rgba(15,15,25,0.55)"
    : `linear-gradient(180deg, ${product.visualConfig.primaryColor} 0%, ${product.visualConfig.secondaryColor} 100%)`;

  const bgImageOpacity = noColor
    ? 1
    : { soft: 0.10, medium: 0.20, strong: 0.35 }[
        product.visualConfig.cardBgIntensity ?? "medium"
      ];

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-all duration-200 border-0",
        isSelected && "ring-2 ring-white shadow-lg shadow-white/20",
        !isSelected && !isDragging && "group-hover:ring-1 group-hover:ring-white/50",
        isDragging && "shadow-2xl shadow-black/40",
      )}
      style={{
        width: "100%",
        minWidth: "270px",
        maxWidth: "270px",
        borderRadius: "30px",
        minHeight: "410px",
        background: cardBackground,
        boxShadow: "2px 2px 5px 0 #212529",
        transform: isDragging ? "scale(1.04) rotate(2deg)" : undefined,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-evenly",
      }}
    >
      {/* Card background image (decorative overlay) */}
      {product.visualConfig.cardBackgroundImageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.visualConfig.cardBackgroundImageSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ opacity: bgImageOpacity }}
        />
      )}
      {/* noColor + image: minimal text-protection scrim */}
      {noColor && product.visualConfig.cardBackgroundImageSrc && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.35) 100%)",
            zIndex: 1,
          }}
        />
      )}
      {/* Content wrapper */}
      <div className="relative flex flex-col justify-evenly flex-1" style={{ zIndex: 2 }}>
        {/* Top — Plan name (optional) + Price & Days */}
        <div className="flex flex-col items-center pt-5 px-3">
          {/* Plan name slot — collapses when disabled/empty so layout adjusts */}
          {product.visualConfig.showPlanName &&
            product.visualConfig.planName &&
            product.visualConfig.planName.trim() !== "" && (
              <span
                className="text-sm font-bold text-white/95 uppercase tracking-wide mb-1"
                style={{ textShadow: "0px 2px 3px rgba(0,0,0,0.35)" }}
              >
                {product.visualConfig.planName}
              </span>
            )}
          <span
            className="text-[2.6rem] font-black leading-none text-white"
            style={{ textShadow: "0px 4px 6px rgba(0,0,0,0.35)", fontWeight: 900 }}
          >
            {formatPrice(product.monto)}
          </span>
          <span className="text-xs text-white/70 mt-1">
            {formatDurationLabel(
              product.dias,
              product.visualConfig.durationDisplayMode
            )}
          </span>
        </div>

        {/* Middle */}
        <div className="flex flex-col items-center w-full gap-1">
          {/* Hotspot bar */}
          <div
            className={cn(
              "w-full flex items-center justify-center gap-1.5 text-xs text-white font-medium",
              !product.hotspot && "invisible",
            )}
            style={{ backgroundColor: "rgba(255,255,255,0.18)", height: "30px" }}
          >
            <Wifi className="h-3 w-3" />
            Comparte Datos
          </div>

          {/* Previous data strikethrough — text derived from mbAnterior */}
          <span
            className={cn(
              "text-xs text-white/90 mt-0.5",
              !product.visualConfig.showPreviousData && "invisible",
            )}
            style={{
              textDecoration: "line-through",
              textDecorationColor: "#ef4444",
              textDecorationThickness: "2px",
            }}
          >
            {`Antes ${
              product.mbAnterior != null
                ? product.mbAnterior >= 1024
                  ? Math.round(product.mbAnterior / 1024) + " GB"
                  : product.mbAnterior + " MB"
                : "—"
            }`}
          </span>

          {/* GB amount */}
          <span
            className="font-black text-white leading-none"
            style={{ fontSize: "3rem", textShadow: "0px 4px 6px rgba(0,0,0,0.35)" }}
          >
            {formatDataSize(product.mb)}
          </span>

          {/* Extra apps slot — optional, collapses when disabled */}
          {product.visualConfig.showExtraApps && (
            <div className="flex flex-col items-center w-full mt-1">
              {product.visualConfig.extraAppsText &&
                product.visualConfig.extraAppsText.trim() !== "" && (
                  <span
                    className="text-xs font-semibold text-white"
                  >
                    {product.visualConfig.extraAppsText}
                  </span>
                )}
              {product.visualConfig.extraApps &&
                product.visualConfig.extraApps.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                    {product.visualConfig.extraApps.map((app) => (
                      <div
                        key={app.id}
                        className="flex h-6 w-6 items-center justify-center rounded overflow-hidden bg-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={app.iconSrc}
                          alt={app.label ?? "App"}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Social label */}
          <span
            className={cn(
              "text-[10px] text-white/90 self-end px-3 mt-0.5 text-right",
              !(product.redesSociales && enabledSocials.length > 0) && "invisible",
            )}
          >
            + Redes sociales ilimitadas
          </span>

          {/* Social icons bar */}
          <div
            className={cn(
              "py-1.5 px-2",
              !(product.redesSociales && enabledSocials.length > 0) && "invisible",
            )}
            style={{
              backgroundColor: socialBarColor,
              clipPath: "polygon(10% 0%, 100% 0%, 100% 100%, 0% 100%)",
              width: "95%",
              alignSelf: "flex-end",
            }}
          >
            <div className="flex flex-wrap justify-center gap-1">
              {product.redesSociales &&
                enabledSocials.map((social) => {
                  // Prefer custom-uploaded icon over the default preset.
                  const imgSrc = social.customIcon ?? SOCIAL_IMAGES[social.id];
                  return (
                    <div
                      key={social.id}
                      className="flex h-[22px] w-[22px] items-center justify-center rounded overflow-hidden"
                    >
                      {imgSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgSrc}
                          alt={social.name}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Bottom — Button */}
        <div className="px-3 pb-4 flex justify-center">
          <button
            className="w-[68%] rounded-full px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: product.visualConfig.buttonColor,
              color: product.visualConfig.buttonTextColor,
            }}
            tabIndex={-1}
          >
            {product.visualConfig.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
