"use client";

import { useState, useEffect, useRef } from "react";
import { Palette, Type, Eye, EyeOff, Upload, ImageIcon, Flag } from "lucide-react";
import {
  type Product,
  type InternetDeviceInfo,
  badgeFlagOptions,
  colorPresets,
} from "@/lib/mock-data";
import { BADGE_TEXT_MAX, ProductBadge, ProductCardInner } from "@/components/landing/card-preview-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  deleteItemAsset,
  deleteSectionAsset,
  uploadSectionAsset,
  uploadItemAsset,
} from "@/lib/api/landing-manager";
import { isBlobUrl } from "@/lib/assets/transient-assets";

// Available card background images (public/backgrounds-images-cards/)
const CARD_BG_IMAGES: { src: string; label: string }[] = [
  { src: "/backgrounds-images-cards/bg-mundial.png", label: "Mundial" },
];

const STREAMING_ICON_PRESETS: { id: string; src: string; label: string }[] = [
  { id: "youtube", src: "/streaming/youtube.png", label: "YouTube" },
  { id: "tiktok", src: "/streaming/tiktok.png", label: "TikTok" },
  { id: "vix", src: "/streaming/vix.png", label: "ViX" },
  { id: "streaming-2", src: "/streaming/2.png", label: "Preset 2" },
];

// Social network image map (public/socials/)
const SOCIAL_IMAGES: Record<string, string> = {
  facebook: "/socials/fb.png",
  whatsapp: "/socials/whpp.png",
  instagram: "/socials/ig.png",
  messenger: "/socials/mssg.png",
  telegram: "/socials/tlg.png",
  snapchat: "/socials/snp.png",
  x: "/socials/x.png",
};

interface ProductEditorProps {
  product: Product | null;
  open: boolean;
  onUpdate: (product: Product) => void;
  onClose: () => void;
  /** When set, the editor shows device-info fields instead of product fields */
  deviceInfo?: InternetDeviceInfo | null;
  onUpdateDevice?: (device: InternetDeviceInfo) => void;
  /**
   * Backend section key (e.g. "cliente-nuevo") for asset uploads.
   * When provided, badge/background/socialIcon uploads persist to the real backend.
   * When absent, uploads fall back to local blob: URLs with an honest label.
   */
  sectionKey?: string;
  disableUnsupportedAssetUploads?: boolean;
  onApplySectionCardBackground?: (nextSrc?: string) => void;
  trackPendingAssetOperation?: (promise: Promise<unknown>) => Promise<unknown>;
}

export function ProductEditor({
  product,
  open,
  onUpdate,
  onClose,
  deviceInfo,
  onUpdateDevice,
  sectionKey,
  disableUnsupportedAssetUploads = false,
  onApplySectionCardBackground,
  trackPendingAssetOperation,
}: ProductEditorProps) {
  const [localProduct, setLocalProduct] = useState<Product | null>(product);
  const [localDevice, setLocalDevice] = useState<InternetDeviceInfo | null>(deviceInfo ?? null);
  const [deviceImageError, setDeviceImageError] = useState<string | null>(null);
  const [cardBgError, setCardBgError] = useState<string | null>(null);
  const [badgeFlagError, setBadgeFlagError] = useState<string | null>(null);
  const [cardBgUploading, setCardBgUploading] = useState(false);
  const [badgeFlagUploading, setBadgeFlagUploading] = useState(false);
  const [socialUploadingId, setSocialUploadingId] = useState<string | null>(null);
  const deviceImageInputRef = useRef<HTMLInputElement | null>(null);
  const productCardBgInputRef = useRef<HTMLInputElement | null>(null);
  const badgeFlagInputRef = useRef<HTMLInputElement | null>(null);
  const extraAppInputRef = useRef<HTMLInputElement | null>(null);
  // Per-social file input — keyed by social id so each row gets its own input.
  const socialCustomInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [extraAppError, setExtraAppError] = useState<string | null>(null);
  const [socialCustomError, setSocialCustomError] = useState<string | null>(null);
  const ownedObjectUrlsRef = useRef(new Set<string>());

  const trackAssetOperation = <T,>(promise: Promise<T>): Promise<T> => {
    return trackPendingAssetOperation ? trackPendingAssetOperation(promise) as Promise<T> : promise;
  };

  const rememberObjectUrl = (url: string | undefined) => {
    if (isBlobUrl(url)) ownedObjectUrlsRef.current.add(url);
  };

  const revokeOwnedObjectUrl = (url: string | undefined) => {
    if (!isBlobUrl(url) || !ownedObjectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    ownedObjectUrlsRef.current.delete(url);
  };

  const replaceOwnedObjectUrl = (currentUrl: string | undefined, nextUrl: string | undefined) => {
    if (currentUrl && currentUrl !== nextUrl) revokeOwnedObjectUrl(currentUrl);
    if (nextUrl) rememberObjectUrl(nextUrl);
  };

  useEffect(() => {
    setLocalProduct(product);
  }, [product]);

  useEffect(() => {
    setLocalDevice(deviceInfo ?? null);
  }, [deviceInfo]);

  const handleDeviceChange = <K extends keyof InternetDeviceInfo>(key: K, value: InternetDeviceInfo[K]) => {
    if (!localDevice) return;
    const updated = { ...localDevice, [key]: value };
    setLocalDevice(updated);
    onUpdateDevice?.(updated);
  };

  const handleDeviceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file) return;

    if (unsupportedBackendAssetsDisabled) {
      setDeviceImageError("Este upload queda deshabilitado con backend real hasta tener persistencia soportada.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setDeviceImageError("Solo podés subir imágenes para el device.");
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setDeviceImageError("La imagen supera 5 MB. Usá una más liviana.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    rememberObjectUrl(objectUrl);
    replaceOwnedObjectUrl(localDevice?.deviceImageSrc, objectUrl);
    setDeviceImageError(null);
    handleDeviceChange("deviceImageSrc", objectUrl as InternetDeviceInfo["deviceImageSrc"]);
  };

  const applyCardBackground = (nextUrl: string | undefined) => {
    const currentUrl = localProduct?.visualConfig.cardBackgroundImageSrc;
    replaceOwnedObjectUrl(currentUrl, nextUrl);

    if (sectionKey && onApplySectionCardBackground) {
      onApplySectionCardBackground(nextUrl);
      return;
    }

    handleVisualConfigChange("cardBackgroundImageSrc", nextUrl as Product["visualConfig"]["cardBackgroundImageSrc"]);
  };

  const handleCardBgUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !localProduct) return;

    if (!file.type.startsWith("image/")) {
      setCardBgError("Solo podés subir imágenes para el fondo.");
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setCardBgError("La imagen supera 10 MB. Usá una más liviana.");
      return;
    }

    setCardBgError(null);

    // Optimistic preview with local blob while upload is in-flight
    const previewUrl = URL.createObjectURL(file);
    rememberObjectUrl(previewUrl);
    applyCardBackground(previewUrl as Product["visualConfig"]["cardBackgroundImageSrc"]);

    // If we have the section key, persist to backend (section-level background)
    if (sectionKey) {
      setCardBgUploading(true);
      try {
        const result = await trackAssetOperation(uploadSectionAsset(sectionKey, file, "background", {
          name: file.name,
          alt: `Fondo de sección ${sectionKey}`,
        }));
        // Replace preview blob with the real S3 URL
        const realUrl = result.asset.url;
        applyCardBackground(realUrl as Product["visualConfig"]["cardBackgroundImageSrc"]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[product-editor] background upload failed, keeping local blob:", msg);
        setCardBgError("No se pudo subir al servidor. La imagen queda local por ahora.");
      } finally {
        setCardBgUploading(false);
      }
    }
    // else: no sectionKey → stays as local blob (honest label shown in UI)
  };

  const handleBadgeFlagUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !localProduct) return;

    if (!file.type.startsWith("image/")) {
      setBadgeFlagError("Solo podés subir imágenes para el badge.");
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setBadgeFlagError("La imagen supera 10 MB. Usá una más liviana.");
      return;
    }

    setBadgeFlagError(null);

    // Optimistic preview
    const previewUrl = URL.createObjectURL(file);
    rememberObjectUrl(previewUrl);
    // ProductBadge resolves unknown string keys as raw URLs — this works for blobs and S3 URLs alike
    replaceOwnedObjectUrl(localProduct.visualConfig.badgeFlag, previewUrl);
    handleVisualConfigChange("badgeFlag", previewUrl as Product["visualConfig"]["badgeFlag"]);

    // Persist to backend if we have section key + item id
    const badgeItemId = localProduct.mongoId ?? localProduct.offeringId;
    if (sectionKey && badgeItemId) {
      setBadgeFlagUploading(true);
      try {
        const result = await trackAssetOperation(uploadItemAsset(
          sectionKey,
          badgeItemId,
          file,
          "badge",
          { name: file.name, alt: `Badge de ${localProduct.nombre}` }
        ));
        const realUrl = result.asset.url;
        replaceOwnedObjectUrl(previewUrl, realUrl);
        handleVisualConfigChange("badgeFlag", realUrl as Product["visualConfig"]["badgeFlag"]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[product-editor] badge upload failed, keeping local blob:", msg);
        setBadgeFlagError("No se pudo subir al servidor. El badge queda local por ahora.");
      } finally {
        setBadgeFlagUploading(false);
      }
    }
    // else: no sectionKey / offeringId → stays as local blob
  };

  const isDeviceMode = !!deviceInfo && !product;
  const unsupportedBackendAssetsDisabled = disableUnsupportedAssetUploads;

  const handleChange = <K extends keyof Product>(key: K, value: Product[K]) => {
    if (!localProduct) return;
    const updated = { ...localProduct, [key]: value };
    setLocalProduct(updated);
    onUpdate(updated);
  };

  const handleVisualConfigChange = <K extends keyof Product["visualConfig"]>(
    key: K,
    value: Product["visualConfig"][K]
  ) => {
    if (!localProduct) return;
    const updated = {
      ...localProduct,
      visualConfig: { ...localProduct.visualConfig, [key]: value },
    };
    setLocalProduct(updated);
    onUpdate(updated);
  };

  const handleSocialNetworkToggle = (socialId: string, enabled: boolean) => {
    if (!localProduct) return;
    const updatedSocials = localProduct.visualConfig.socialNetworks.map((s) =>
      s.id === socialId ? { ...s, enabled } : s
    );
    handleVisualConfigChange("socialNetworks", updatedSocials);
  };

  // Upload a custom icon for a single social network.
  // Persists to backend (item socialIcon asset) when sectionKey + offeringId are available.
  // Falls back to local blob: with honest label when not.
  const handleSocialCustomUpload = async (socialId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !localProduct) return;

    if (!file.type.startsWith("image/")) {
      setSocialCustomError("Solo podés subir imágenes para el icono.");
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSocialCustomError("La imagen supera 10 MB. Usá una más liviana.");
      return;
    }

    setSocialCustomError(null);

    // Optimistic preview
    const previewUrl = URL.createObjectURL(file);
    rememberObjectUrl(previewUrl);
    const previousCustomIcon = localProduct.visualConfig.socialNetworks.find((social) => social.id === socialId)?.customIcon;
    replaceOwnedObjectUrl(previousCustomIcon, previewUrl);
    const applySocialIcon = (url: string) => {
      // We need to read localProduct at the time of mutation, not a stale closure.
      // Use the functional pattern via the setter chain to get the latest state.
      setLocalProduct((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          visualConfig: {
            ...prev.visualConfig,
            socialNetworks: prev.visualConfig.socialNetworks.map((s) =>
              s.id === socialId ? { ...s, customIcon: url } : s
            ),
          },
        };
        onUpdate(updated);
        return updated;
      });
    };

    applySocialIcon(previewUrl);

    const socialItemId = localProduct.mongoId ?? localProduct.offeringId;
    if (sectionKey && socialItemId) {
      setSocialUploadingId(socialId);
      try {
        const result = await trackAssetOperation(uploadItemAsset(
          sectionKey,
          socialItemId,
          file,
          "socialIcon",
          { name: file.name, alt: `Icono ${socialId}`, network: socialId }
        ));
        const realUrl = result.asset.url;
        replaceOwnedObjectUrl(previewUrl, realUrl);
        applySocialIcon(realUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[product-editor] social icon upload failed, keeping local blob:", msg);
        setSocialCustomError("No se pudo subir el icono al servidor. Queda local por ahora.");
      } finally {
        setSocialUploadingId(null);
      }
    }
  };

  const handleSocialCustomReset = (socialId: string) => {
    if (!localProduct) return;
    const previousSocial = localProduct.visualConfig.socialNetworks.find((s) => s.id === socialId);
    const previousCustomIcon = previousSocial?.customIcon;
    const updatedSocials = localProduct.visualConfig.socialNetworks.map((s) => {
      if (s.id !== socialId) return s;
      // Drop the customIcon key so the renderer falls back to the default asset.
      const { customIcon: _omit, ...rest } = s;
      return rest;
    });
    handleVisualConfigChange("socialNetworks", updatedSocials);
    revokeOwnedObjectUrl(previousCustomIcon);

    const resetSocialItemId = localProduct.mongoId ?? localProduct.offeringId;
    if (sectionKey && resetSocialItemId && previousCustomIcon && !isBlobUrl(previousCustomIcon)) {
      void trackAssetOperation(deleteItemAsset(sectionKey, resetSocialItemId, "socialIcon", socialId)).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[product-editor] social icon reset failed:", msg);
        setSocialCustomError("No se pudo resetear el icono en servidor.");
        handleVisualConfigChange(
          "socialNetworks",
          localProduct.visualConfig.socialNetworks.map((social) => (
            social.id === socialId ? { ...social, customIcon: previousCustomIcon } : social
          ))
        );
      });
    }
  };

  // Add a new extra app icon (uploaded by the user) to the card.
  const handleExtraAppUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !localProduct) return;

    if (unsupportedBackendAssetsDisabled) {
      setExtraAppError("Este upload queda deshabilitado con backend real hasta tener persistencia soportada.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setExtraAppError("Solo podés subir imágenes para los iconos.");
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setExtraAppError("La imagen supera 2 MB. Usá una más liviana.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    rememberObjectUrl(objectUrl);
    setExtraAppError(null);
    const current = localProduct.visualConfig.extraApps ?? [];
    const newApp = {
      id: `extra-${Date.now()}`,
      iconSrc: objectUrl,
      label: file.name,
    };
    handleVisualConfigChange("extraApps", [...current, newApp]);
  };

  const handleExtraAppRemove = (appId: string) => {
    if (!localProduct) return;
    const current = localProduct.visualConfig.extraApps ?? [];
    const removed = current.find((app) => app.id === appId);
    revokeOwnedObjectUrl(removed?.iconSrc);
    handleVisualConfigChange("extraApps", current.filter((a) => a.id !== appId));
  };

  const handleBadgePresetSelect = async (nextBadgeFlag: Product["visualConfig"]["badgeFlag"]) => {
    if (!localProduct) return;

    const previousBadgeFlag = localProduct.visualConfig.badgeFlag;
    replaceOwnedObjectUrl(previousBadgeFlag, undefined);
    handleVisualConfigChange("badgeFlag", nextBadgeFlag);

    const badgePresetItemId = localProduct.mongoId ?? localProduct.offeringId;
    if (
      sectionKey
      && badgePresetItemId
      && previousBadgeFlag
      && !isBlobUrl(previousBadgeFlag)
      && !["red", "orange", "purple", "black", "mundial"].includes(previousBadgeFlag)
    ) {
      try {
        await trackAssetOperation(deleteItemAsset(sectionKey, badgePresetItemId, "badge"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[product-editor] badge reset failed:", msg);
        setBadgeFlagError("No se pudo resetear el badge en servidor.");
        handleVisualConfigChange("badgeFlag", previousBadgeFlag as Product["visualConfig"]["badgeFlag"]);
      }
    }
  };

  const handleCardBackgroundRemove = async () => {
    if (!localProduct?.visualConfig.cardBackgroundImageSrc) return;

    const previousUrl = localProduct.visualConfig.cardBackgroundImageSrc;
    applyCardBackground(undefined);

    if (sectionKey && !isBlobUrl(previousUrl)) {
      try {
        await trackAssetOperation(deleteSectionAsset(sectionKey, "background"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[product-editor] background reset failed:", msg);
        setCardBgError("No se pudo quitar el fondo en servidor.");
        applyCardBackground(previousUrl);
      }
    }
  };

  const handleAddPresetExtraApp = (preset: (typeof STREAMING_ICON_PRESETS)[number]) => {
    if (!localProduct) return;
    const current = localProduct.visualConfig.extraApps ?? [];
    handleVisualConfigChange("extraApps", [
      ...current,
      {
        id: `preset-${preset.id}-${Date.now()}`,
        iconSrc: preset.src,
        label: preset.label,
      },
    ]);
  };

  // Internet products (HBB / MIFI) show only text-relevant fields
  const isInternetProduct = localProduct?.producto === "HBB" || localProduct?.producto === "MIFI";

  // Wide mode: standard product cards (not device, not HBB/MiFi internet)
  const isWideMode = !isDeviceMode && !!localProduct && !isInternetProduct;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          "p-0 flex flex-col gap-0",
          isWideMode
            ? "w-[75vw] max-w-none sm:max-w-none"
            : "w-[420px] sm:max-w-[420px]"
        )}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4 gap-0 shrink-0">
          <div className="min-w-0">
            <SheetTitle className="text-foreground">
              {isDeviceMode ? "Editar Dispositivo" : "Editar Producto"}
            </SheetTitle>
            {isDeviceMode && localDevice && (
              <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                {localDevice.deviceName}
              </p>
            )}
            {!isDeviceMode && localProduct && (
              <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                {localProduct.nombre}
              </p>
            )}
          </div>
        </SheetHeader>

        {/* ── Device editor mode ── */}
        {isDeviceMode && localDevice ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Dispositivo internet · Edita la información visible en la card del dispositivo.
              </div>

              {/* Device name */}
              <div className="space-y-2">
                <Label htmlFor="deviceName">Nombre del dispositivo</Label>
                <Input
                  id="deviceName"
                  value={localDevice.deviceName}
                  onChange={(e) => handleDeviceChange("deviceName", e.target.value)}
                  placeholder="Ej: Access CPE 18 LTE Blanco"
                  className="bg-input"
                />
              </div>

              {/* Device subtitle */}
              <div className="space-y-2">
                <Label htmlFor="deviceSubtitle">Subtítulo / descripción</Label>
                <Input
                  id="deviceSubtitle"
                  value={localDevice.deviceSubtitle}
                  onChange={(e) => handleDeviceChange("deviceSubtitle", e.target.value)}
                  placeholder="Ej: Router, Access, CPE 18 LTE Blanco"
                  className="bg-input"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="devicePrice">Precio visible</Label>
                <Input
                  id="devicePrice"
                  value={localDevice.price}
                  onChange={(e) => handleDeviceChange("price", e.target.value)}
                  placeholder="Ej: $850.00"
                  className="bg-input"
                />
              </div>

              {/* Section title (left column heading) */}
              <div className="space-y-2">
                <Label htmlFor="sectionTitle">Título de sección (izquierda)</Label>
                <Input
                  id="sectionTitle"
                  value={localDevice.sectionTitle}
                  onChange={(e) => handleDeviceChange("sectionTitle", e.target.value)}
                  placeholder="Ej: Conectate por primera vez"
                  className="bg-input"
                />
              </div>

              {/* Section subtitle */}
              <div className="space-y-2">
                <Label htmlFor="sectionSubtitle">Subtítulo de sección (izquierda)</Label>
                <Input
                  id="sectionSubtitle"
                  value={localDevice.sectionSubtitle}
                  onChange={(e) => handleDeviceChange("sectionSubtitle", e.target.value)}
                  placeholder="Ej: Adquiere tu equipo y comienza a navegar."
                  className="bg-input"
                />
              </div>

              {/* Plans title (right column heading) */}
              <div className="space-y-2">
                <Label htmlFor="plansTitle">Título de planes (derecha)</Label>
                <Input
                  id="plansTitle"
                  value={localDevice.plansTitle}
                  onChange={(e) => handleDeviceChange("plansTitle", e.target.value)}
                  placeholder="Ej: ¿Ya cuentas con un equipo compatible?"
                  className="bg-input"
                />
              </div>

              {/* Plans subtitle */}
              <div className="space-y-2">
                <Label htmlFor="plansSubtitle">Subtítulo de planes (derecha)</Label>
                <Input
                  id="plansSubtitle"
                  value={localDevice.plansSubtitle}
                  onChange={(e) => handleDeviceChange("plansSubtitle", e.target.value)}
                  placeholder="Ej: Elige tu paquete preferido y recibe tu SIM en casa."
                  className="bg-input"
                />
              </div>

              {/* Device image picker */}
              <div className="space-y-3">
                <Label>Imagen del dispositivo</Label>
                {/* Current preview */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={localDevice.deviceImageSrc}
                    alt="Preview actual"
                    className="h-16 w-16 object-contain rounded-md bg-white p-1"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Imagen actual</p>
                    <p className="text-[10px] text-muted-foreground truncate">{localDevice.deviceImageSrc}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Cargar imagen del dispositivo</p>
                      <p className="text-xs text-muted-foreground">
                        Subí un PNG, JPG o WebP para reemplazar la imagen del device.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={unsupportedBackendAssetsDisabled}
                    onClick={() => deviceImageInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Cargar imagen
                  </Button>

                  <input
                    ref={deviceImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleDeviceImageUpload}
                  />

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {unsupportedBackendAssetsDisabled
                      ? "Deshabilitado con backend real: este asset no tiene contrato de persistencia todavía."
                      : "Máx. 5 MB · solo local (sin persistencia backend — campo fuera de contrato)."}
                  </p>

                  {deviceImageError && (
                    <p className="mt-2 text-xs text-destructive">{deviceImageError}</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : localProduct && isWideMode ? (
          /* ── Standard product editor: two-column wide layout ── */
          <div className="min-h-0 flex-1 flex overflow-hidden">
            {/* Left column: live preview */}
            <div className="w-[50%] shrink-0 flex flex-col items-center justify-start gap-4 overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6 border-r border-border">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide w-full text-center mb-20">Preview en vivo</p>
              {/* Card wrapper with paddingTop for badge headroom */}
              <div
                className="relative"
                style={{ overflow: "visible", paddingTop: "15px", width: "270px" }}
              >
                {localProduct.visualConfig.badgeStyle !== "none" && (
                  <ProductBadge
                    text={localProduct.visualConfig.badgeText}
                    style={localProduct.visualConfig.badgeStyle}
                    flag={localProduct.visualConfig.badgeFlag}
                  />
                )}
                <ProductCardInner product={localProduct} />
              </div>
              <p className="text-[10px] text-slate-500 text-center px-4">
                Los cambios se reflejan en tiempo real
              </p>
            </div>

            {/* Right column: editor */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="p-5">
                  {/* ── Standard product editor (full tabs) ── */}
                <Tabs defaultValue="comercial" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="comercial" className="gap-1.5 text-xs">
                      <Type className="h-3.5 w-3.5" />
                      Comercial
                    </TabsTrigger>
                    <TabsTrigger value="visual" className="gap-1.5 text-xs">
                      <Palette className="h-3.5 w-3.5" />
                      Visual
                    </TabsTrigger>
                    <TabsTrigger value="visibilidad" className="gap-1.5 text-xs" data-testid="tab-visibilidad">
                      <Eye className="h-3.5 w-3.5" />
                      Visibilidad
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Comercial Tab ── */}
                  <TabsContent value="comercial" className="mt-4 space-y-4">
                    {/* Plan name — optional label above the price (e.g. "Plan GOL") */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-plan-name" className="flex items-center gap-2 cursor-pointer">
                          {localProduct.visualConfig.showPlanName ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          Mostrar nombre del plan (arriba del precio)
                        </Label>
                        <Switch
                          id="show-plan-name"
                          checked={localProduct.visualConfig.showPlanName ?? false}
                          onCheckedChange={(checked) =>
                            handleVisualConfigChange("showPlanName", checked)
                          }
                        />
                      </div>
                      {localProduct.visualConfig.showPlanName && (
                        <>
                          <Input
                            value={localProduct.visualConfig.planName ?? ""}
                            onChange={(e) =>
                              handleVisualConfigChange("planName", e.target.value)
                            }
                            placeholder="Ej: Plan GOL"
                            className="bg-input"
                            maxLength={24}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Texto opcional · Si está vacío o desactivado, la card ajusta su layout automáticamente.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor="monto">Precio (MXN)</Label>
                      <Input
                        id="monto"
                        type="number"
                        value={localProduct.monto}
                        onChange={(e) =>
                          handleChange("monto", parseInt(e.target.value) || 0)
                        }
                        className="bg-input"
                      />
                    </div>

                    {/* Days */}
                    <div className="space-y-2">
                      <Label htmlFor="dias">Dias de vigencia</Label>
                      <Input
                        id="dias"
                        type="number"
                        value={localProduct.dias}
                        onChange={(e) =>
                          handleChange("dias", parseInt(e.target.value) || 0)
                        }
                        className="bg-input"
                      />
                      <div className="space-y-1.5 rounded-lg border border-border p-3">
                        <Label htmlFor="duration-display-mode" className="text-xs text-muted-foreground">
                          Cómo mostrar la vigencia en la card
                        </Label>
                        <select
                          id="duration-display-mode"
                          value={localProduct.visualConfig.durationDisplayMode ?? "days"}
                          onChange={(e) =>
                            handleVisualConfigChange(
                              "durationDisplayMode",
                              e.target.value as Product["visualConfig"]["durationDisplayMode"]
                            )
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm shadow-xs outline-none"
                        >
                          <option value="days">Mostrar tal cual en días</option>
                          <option value="months-when-possible">Mostrar meses si aplica (60 → 2 meses)</option>
                        </select>
                        <p className="text-[10px] text-muted-foreground">
                          Solo convierte a meses cuando la vigencia sea múltiplo de 30. Si no, se mantiene en días.
                        </p>
                      </div>
                    </div>

                    {/* MB */}
                    <div className="space-y-2">
                      <Label htmlFor="mb">Datos (MB)</Label>
                      <Input
                        id="mb"
                        type="number"
                        value={localProduct.mb}
                        onChange={(e) =>
                          handleChange("mb", parseInt(e.target.value) || 0)
                        }
                        className="bg-input"
                      />
                      <p className="text-xs text-muted-foreground">
                        1024 MB = 1 GB. Actual: {(localProduct.mb / 1024).toFixed(1)} GB
                      </p>
                    </div>

                    {/* Hotspot toggle — texto fijo "Comparte Datos" */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="hotspot" className="flex items-center gap-2 cursor-pointer">
                          {localProduct.hotspot ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          Mostrar &quot;Comparte Datos&quot;
                        </Label>
                        <Switch
                          id="hotspot"
                          checked={localProduct.hotspot}
                          onCheckedChange={(checked) => {
                            const updated = {
                              ...localProduct,
                              hotspot: checked,
                              visualConfig: { ...localProduct.visualConfig, showHotspot: checked },
                            };
                            setLocalProduct(updated);
                            onUpdate(updated);
                          }}
                        />
                      </div>
                      {localProduct.hotspot && (
                        <p className="text-xs text-muted-foreground">
                          El texto <span className="font-medium text-foreground">Comparte Datos</span> es fijo y no editable.
                        </p>
                      )}
                    </div>

                    {/* Previous data toggle + GB input — persiste en mbAnterior (número) */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          {localProduct.visualConfig.showPreviousData ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          Texto tachado &quot;Antes X GB&quot;
                        </Label>
                        <Switch
                          checked={localProduct.visualConfig.showPreviousData}
                          onCheckedChange={(checked) => {
                            const updated = {
                              ...localProduct,
                              mbAnterior: checked ? (localProduct.mbAnterior ?? 0) : null,
                              visualConfig: { ...localProduct.visualConfig, showPreviousData: checked },
                            };
                            setLocalProduct(updated);
                            onUpdate(updated);
                          }}
                        />
                      </div>
                      {localProduct.visualConfig.showPreviousData && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Antes</span>
                            <Input
                              type="number"
                              min={0}
                              value={
                                localProduct.mbAnterior != null
                                  ? localProduct.mbAnterior >= 1024
                                    ? Math.round(localProduct.mbAnterior / 1024)
                                    : localProduct.mbAnterior
                                  : ""
                              }
                              onChange={(e) => {
                                const gb = parseInt(e.target.value) || 0;
                                const updated = {
                                  ...localProduct,
                                  mbAnterior: gb * 1024,
                                  visualConfig: { ...localProduct.visualConfig, showPreviousData: true },
                                };
                                setLocalProduct(updated);
                                onUpdate(updated);
                              }}
                              placeholder="0"
                              className="bg-input w-24"
                            />
                            <span className="text-sm text-muted-foreground">GB</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            El texto <span className="font-medium text-foreground">Antes</span> es fijo. Solo ingresá la cantidad de GB.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Extra apps — optional "Incluye Apps Streaming" + icons */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 cursor-pointer">
                          {localProduct.visualConfig.showExtraApps ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          Incluir apps extras (texto + iconos)
                        </Label>
                        <Switch
                          checked={localProduct.visualConfig.showExtraApps ?? false}
                          onCheckedChange={(checked) =>
                            handleVisualConfigChange("showExtraApps", checked)
                          }
                        />
                      </div>
                      {localProduct.visualConfig.showExtraApps && (
                        <>
                          <Input
                            value={localProduct.visualConfig.extraAppsText ?? ""}
                            onChange={(e) =>
                              handleVisualConfigChange("extraAppsText", e.target.value)
                            }
                            placeholder="Ej: Incluye Apps Streaming"
                            className="bg-input"
                            maxLength={40}
                          />
                          {/* Existing icons */}
                          {(localProduct.visualConfig.extraApps ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {localProduct.visualConfig.extraApps!.map((app) => (
                                <div
                                  key={app.id}
                                  className="relative h-10 w-10 rounded-md border border-border bg-white/5 overflow-hidden group"
                                  title={app.label ?? "App"}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={app.iconSrc}
                                    alt={app.label ?? "App"}
                                    className="h-full w-full object-contain p-0.5"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleExtraAppRemove(app.id)}
                                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl px-1 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Quitar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Iconos por default</Label>
                              <span className="text-[10px] text-muted-foreground">Elegí uno si no querés subir archivo</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {STREAMING_ICON_PRESETS.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleAddPresetExtraApp(preset)}
                                  className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2 transition-all hover:border-primary hover:bg-primary/5"
                                  title={`Agregar ${preset.label}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={preset.src}
                                    alt={preset.label}
                                    className="h-8 w-8 object-contain"
                                  />
                                  <span className="text-[9px] text-muted-foreground leading-none">{preset.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Add icon */}
                          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2 h-7 text-xs"
                                disabled={unsupportedBackendAssetsDisabled}
                                onClick={() => extraAppInputRef.current?.click()}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Subir icono
                              </Button>
                              <span className="text-[10px] text-muted-foreground">
                                {unsupportedBackendAssetsDisabled
                                  ? "Deshabilitado con backend real"
                                  : "Máx. 2 MB · ~24×24 px"}
                              </span>
                            </div>
                            <input
                              ref={extraAppInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              className="hidden"
                             onChange={handleExtraAppUpload}
                            />
                            {unsupportedBackendAssetsDisabled && (
                              <p className="mt-1.5 text-[10px] text-muted-foreground">
                                Los uploads personalizados de apps extra quedan deshabilitados hasta tener persistencia backend real.
                              </p>
                            )}
                            {extraAppError && (
                              <p className="mt-1.5 text-xs text-destructive">{extraAppError}</p>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Si lo desactivás, este espacio se colapsa y el resto de la card se reacomoda.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Badge — toggle → imagen → texto */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      {/* Toggle principal */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-muted-foreground" />
                          <Label className="cursor-pointer">Usar badge</Label>
                        </div>
                        <Switch
                          checked={localProduct.visualConfig.badgeStyle !== "none"}
                          onCheckedChange={(checked) => {
                            handleVisualConfigChange(
                              "badgeStyle",
                              checked ? "ribbon" : "none"
                            );
                          }}
                        />
                      </div>

                      {localProduct.visualConfig.badgeStyle !== "none" && (
                        <>
                          {/* Imagen del badge */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Imagen del badge</Label>
                              <span className="text-[10px] text-muted-foreground">~160×90 px</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {badgeFlagOptions.map((opt) => {
                                const isSelected = localProduct.visualConfig.badgeFlag === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    title={opt.name}
                                    onClick={() => { void handleBadgePresetSelect(opt.id as Product["visualConfig"]["badgeFlag"]); }}
                                    className={cn(
                                      "flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 transition-all",
                                      isSelected
                                        ? "border-primary bg-primary/10 scale-[1.04]"
                                        : "border-border opacity-60 hover:opacity-100"
                                    )}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={opt.src}
                                      alt={opt.name}
                                      className="h-9 w-14 object-contain rounded"
                                    />
                                    <span className="text-[9px] text-muted-foreground leading-none">{opt.name}</span>
                                    {isSelected && <span className="text-[9px] text-primary font-bold leading-none">✓</span>}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Upload custom badge image */}
                            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 h-7 text-xs"
                                  disabled={badgeFlagUploading}
                                  onClick={() => badgeFlagInputRef.current?.click()}
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                  {badgeFlagUploading ? "Subiendo…" : "Subir imagen propia"}
                                </Button>
                                <span className="text-[10px] text-muted-foreground">
                                  Máx. 10 MB
                                  {sectionKey && localProduct.offeringId
                                    ? " · Se sube a S3"
                                    : " · Local"}
                                </span>
                              </div>
                              <input
                                ref={badgeFlagInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleBadgeFlagUpload}
                              />
                              {badgeFlagError && (
                                <p className="mt-1.5 text-xs text-destructive">{badgeFlagError}</p>
                              )}
                              {/* Show custom preview if a custom URL (blob: or https:) is set */}
                              {localProduct.visualConfig.badgeFlag &&
                                !["red","orange","purple","black","mundial"].includes(localProduct.visualConfig.badgeFlag) && (
                                <div className="mt-2 flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={localProduct.visualConfig.badgeFlag}
                                    alt="Badge personalizado"
                                    className="h-9 w-14 object-contain rounded border border-border bg-white p-0.5"
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    {localProduct.visualConfig.badgeFlag.startsWith("blob:")
                                      ? "Badge local (no guardado en servidor)"
                                      : "Badge personalizado activo (S3)"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Texto del badge */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="badgeText" className="text-xs text-muted-foreground">Texto del badge</Label>
                              <span className={`text-[10px] tabular-nums ${
                                localProduct.visualConfig.badgeText.length >= BADGE_TEXT_MAX
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}>
                                {localProduct.visualConfig.badgeText.length}/{BADGE_TEXT_MAX}
                              </span>
                            </div>
                            <Input
                              id="badgeText"
                              value={localProduct.visualConfig.badgeText}
                              onChange={(e) =>
                                handleVisualConfigChange(
                                  "badgeText",
                                  e.target.value.slice(0, BADGE_TEXT_MAX)
                                )
                              }
                              placeholder="Ej: ¡OFERTA!, PREMIUM, +10GB"
                              className="bg-input"
                              maxLength={BADGE_TEXT_MAX}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Máx {BADGE_TEXT_MAX} caracteres · Menos es más legible
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Toggles: redes sociales ilimitadas + producto activo */}
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="redesSociales" className="cursor-pointer">
                            Redes Sociales Ilimitadas
                          </Label>
                          <Switch
                            id="redesSociales"
                            checked={localProduct.redesSociales}
                            onCheckedChange={(checked) =>
                              handleChange("redesSociales", checked)
                            }
                          />
                        </div>

                        {/* Social Networks selection — visible only when redesSociales is on */}
                        {localProduct.redesSociales && (
                          <div className="space-y-2 pt-1 border-t border-border">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Redes a mostrar</Label>
                              <span className="text-[10px] text-muted-foreground">Click para activar · Subir icono custom (160×90 px sugerido)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {localProduct.visualConfig.socialNetworks.map((social) => {
                                // Prefer the custom-uploaded icon over the default.
                                const imgSrc = social.customIcon ?? SOCIAL_IMAGES[social.id];
                                const hasCustom = !!social.customIcon;
                                return (
                                  <div
                                    key={social.id}
                                    className={cn(
                                      "relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                                      social.enabled
                                        ? "border-primary bg-primary/10"
                                        : "border-border opacity-60"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded overflow-hidden",
                                        !social.enabled && "grayscale"
                                      )}
                                      onClick={() => handleSocialNetworkToggle(social.id, !social.enabled)}
                                      title={`${social.enabled ? "Ocultar" : "Mostrar"} ${social.name}`}
                                    >
                                      {imgSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={imgSrc} alt={social.name} className="h-full w-full object-contain" />
                                      ) : (
                                        <span className="text-white text-xs font-bold bg-muted-foreground rounded w-full h-full flex items-center justify-center">
                                          {social.name.charAt(0)}
                                        </span>
                                      )}
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        className="text-[9px] underline text-muted-foreground hover:text-foreground disabled:opacity-40"
                                        disabled={socialUploadingId === social.id}
                                        onClick={() => socialCustomInputRefs.current[social.id]?.click()}
                                        title="Subir icono custom"
                                      >
                                        {socialUploadingId === social.id ? "…" : hasCustom ? "Cambiar" : "Subir"}
                                      </button>
                                      {hasCustom && (
                                        <button
                                          type="button"
                                          className="text-[9px] text-muted-foreground hover:text-destructive"
                                          onClick={() => handleSocialCustomReset(social.id)}
                                          title="Usar icono por defecto"
                                        >
                                          ↺
                                        </button>
                                      )}
                                    </div>
                                    <input
                                      ref={(el) => { socialCustomInputRefs.current[social.id] = el; }}
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => handleSocialCustomUpload(social.id, e)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            {socialCustomError && (
                              <p className="text-xs text-destructive">{socialCustomError}</p>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </TabsContent>

                   {/* ── Visual Tab ── */}
                   <TabsContent value="visual" className="mt-4 space-y-4">
                     {/* No-color toggle — suppresses gradient so bg image dominates */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <Label className="cursor-pointer">Sin color de fondo</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Imagen de fondo a máxima intensidad, sin gradiente
                        </p>
                      </div>
                      <Switch
                        checked={localProduct.visualConfig.noColor ?? false}
                        onCheckedChange={(checked) =>
                          handleVisualConfigChange("noColor", checked)
                        }
                      />
                    </div>

                    {/* Color Presets — gradient grid, applies primary + secondary at once */}
                    <div className={cn("space-y-3 rounded-lg border border-border p-3", (localProduct.visualConfig.noColor ?? false) && "opacity-50 pointer-events-none")}>
                      <Label>Gradientes predefinidos</Label>
                      <p className="text-xs text-muted-foreground">Aplica primario y secundario al mismo tiempo</p>
                      <div className="grid grid-cols-4 gap-2">
                        {colorPresets.map((preset) => {
                          const isActive =
                            localProduct.visualConfig.primaryColor === preset.primary &&
                            localProduct.visualConfig.secondaryColor === preset.secondary;
                          return (
                            <button
                              key={preset.name}
                              title={preset.name}
                              onClick={() => {
                                const updated = {
                                  ...localProduct,
                                  visualConfig: {
                                    ...localProduct.visualConfig,
                                    primaryColor: preset.primary,
                                    secondaryColor: preset.secondary,
                                  },
                                };
                                setLocalProduct(updated);
                                onUpdate(updated);
                              }}
                              className={cn(
                                "flex flex-col items-center gap-1 rounded-lg p-1 transition-all hover:scale-105 focus:outline-none",
                                isActive
                                  ? "ring-2 ring-white ring-offset-1 ring-offset-background scale-105"
                                  : "opacity-80 hover:opacity-100"
                              )}
                            >
                              <span
                                className="h-7 w-full rounded-md ring-1 ring-white/20"
                                style={{ backgroundImage: preset.gradient }}
                              />
                              <span className="text-[9px] text-muted-foreground leading-tight text-center line-clamp-2 w-full">{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    <div className={cn("grid grid-cols-2 gap-3", (localProduct.visualConfig.noColor ?? false) && "opacity-50 pointer-events-none")}>
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Color primario</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            id="primaryColor"
                            value={localProduct.visualConfig.primaryColor}
                            onChange={(e) =>
                              handleVisualConfigChange("primaryColor", e.target.value)
                            }
                            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                          />
                          <Input
                            value={localProduct.visualConfig.primaryColor}
                            onChange={(e) =>
                              handleVisualConfigChange("primaryColor", e.target.value)
                            }
                            className="flex-1 bg-input font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Color secundario</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            id="secondaryColor"
                            value={localProduct.visualConfig.secondaryColor}
                            onChange={(e) =>
                              handleVisualConfigChange("secondaryColor", e.target.value)
                            }
                            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                          />
                          <Input
                            value={localProduct.visualConfig.secondaryColor}
                            onChange={(e) =>
                              handleVisualConfigChange("secondaryColor", e.target.value)
                            }
                            className="flex-1 bg-input font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Social Bar Color */}
                    {localProduct.redesSociales && (
                      <div className="space-y-2 rounded-lg border border-border p-3">
                        <div>
                          <Label>Color del cintillo de redes</Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Fondo del bloque donde aparecen los íconos de redes sociales
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            id="socialBarColor"
                            value={localProduct.visualConfig.socialBarColor ?? localProduct.visualConfig.secondaryColor}
                            onChange={(e) =>
                              handleVisualConfigChange("socialBarColor", e.target.value)
                            }
                            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                          />
                          <Input
                            value={localProduct.visualConfig.socialBarColor ?? localProduct.visualConfig.secondaryColor}
                            onChange={(e) =>
                              handleVisualConfigChange("socialBarColor", e.target.value)
                            }
                            className="flex-1 bg-input font-mono text-xs"
                          />
                          {localProduct.visualConfig.socialBarColor && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground h-9 px-2 text-xs shrink-0"
                              onClick={() => handleVisualConfigChange("socialBarColor", undefined)}
                              title="Usar color secundario por defecto"
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                        {!localProduct.visualConfig.socialBarColor && (
                          <p className="text-[10px] text-muted-foreground">Usando color secundario por defecto</p>
                        )}
                      </div>
                    )}

                    {/* Card background image */}
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <div>
                        <Label className="flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Imagen de fondo de card
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Imagen decorativa sobre el gradiente · Recomendado: 72×72 px (PNG transparente)
                        </p>
                      </div>

                      {/* Preset options */}
                      <div className="flex flex-wrap gap-2">
                        {/* None option */}
                        <button
                          onClick={() => { void handleCardBackgroundRemove(); }}
                          disabled={!!sectionKey && cardBgUploading}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all disabled:opacity-50",
                            !localProduct.visualConfig.cardBackgroundImageSrc
                              ? "border-primary bg-primary/10"
                              : "border-border opacity-60 hover:opacity-100"
                          )}
                        >
                          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground">Ninguno</span>
                          </div>
                        </button>
                        {/* Available presets */}
                        {CARD_BG_IMAGES.map((img) => (
                          <button
                            key={img.src}
                            disabled={!!sectionKey}
                            onClick={() => handleVisualConfigChange("cardBackgroundImageSrc", img.src)}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all disabled:cursor-not-allowed disabled:opacity-40",
                              localProduct.visualConfig.cardBackgroundImageSrc === img.src
                                ? "border-primary bg-primary/10 scale-[1.03]"
                                : "border-border opacity-60 hover:opacity-100"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.src}
                              alt={img.label}
                              className="h-9 w-9 object-contain rounded bg-white"
                            />
                            <span className="text-[10px] text-muted-foreground">{img.label}</span>
                            {localProduct.visualConfig.cardBackgroundImageSrc === img.src && (
                              <span className="text-[10px] text-primary font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {sectionKey && (
                        <p className="text-[10px] text-muted-foreground">
                          Con backend real, el fondo se persiste a nivel sección. Los presets locales quedan deshabilitados para evitar desincronización entre cards.
                        </p>
                      )}

                      {/* Current preview + intensity selector */}
                      {localProduct.visualConfig.cardBackgroundImageSrc && (
                        <>
                          <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={localProduct.visualConfig.cardBackgroundImageSrc}
                              alt="Fondo actual"
                              className="h-10 w-10 object-contain rounded bg-white p-1"
                            />
                            <p className="text-xs text-muted-foreground flex-1 truncate">Fondo aplicado</p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-7 px-2 text-xs shrink-0"
                                onClick={() => { void handleCardBackgroundRemove(); }}
                              >
                                Quitar
                              </Button>
                          </div>

                          {/* Intensity selector — hidden when noColor is on (image already at full intensity) */}
                          {!(localProduct.visualConfig.noColor ?? false) && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Intensidad de la imagen</Label>
                              <div className="flex gap-2">
                                {(["soft", "medium", "strong"] as const).map((level) => {
                                  const labels = { soft: "Suave", medium: "Media", strong: "Fuerte" };
                                  const isActive = (localProduct.visualConfig.cardBgIntensity ?? "medium") === level;
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => handleVisualConfigChange("cardBgIntensity", level)}
                                      className={cn(
                                        "flex-1 rounded-lg border-2 py-1.5 text-xs font-medium transition-all",
                                        isActive
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border text-muted-foreground hover:border-muted-foreground"
                                      )}
                                    >
                                      {labels[level]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {(localProduct.visualConfig.noColor ?? false) && (
                            <p className="text-[11px] text-muted-foreground">
                              Imagen a intensidad máxima (modo sin color)
                            </p>
                          )}
                        </>
                      )}

                      {/* Upload custom */}
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={cardBgUploading}
                          onClick={() => productCardBgInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          {cardBgUploading ? "Subiendo…" : "Subir fondo propio"}
                        </Button>
                        <input
                          ref={productCardBgInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleCardBgUpload}
                        />
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          Máx. 10 MB · PNG transparente recomendado
                          {sectionKey
                            ? " · Se sube a S3 y aplica a toda la sección"
                            : " · Local/simulado (sin backend conectado)"}
                        </p>
                        {cardBgError && (
                          <p className="mt-1.5 text-xs text-destructive">{cardBgError}</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Visibilidad Tab ── */}
                  <TabsContent value="visibilidad" className="mt-4 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Controla si esta oferta se muestra en el carrusel de la landing.
                      Las ofertas inactivas mantienen su posición pero se ocultan del usuario final.
                    </p>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="active-vis" className="cursor-pointer text-sm font-medium">
                          {localProduct.active ? "Activa" : "Inactiva"}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {localProduct.active
                            ? "La oferta es visible en la landing."
                            : "La oferta está oculta. Solo visible en este editor."}
                        </p>
                      </div>
                      <Switch
                        id="active-vis"
                        checked={localProduct.active}
                        onCheckedChange={(checked) => handleChange("active", checked)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                </div>
              </div>
            </div>
          </div>

        ) : localProduct ? (
          /* ── Internet / narrow product editor: single column ── */
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="p-5">
              {isInternetProduct ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Plan de internet · Solo se editan los textos visibles en la card.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombre-int">Nombre del plan</Label>
                    <Input
                      id="nombre-int"
                      value={localProduct.nombre}
                      onChange={(e) => handleChange("nombre", e.target.value)}
                      placeholder="Ej: Internet Casa 40GB"
                      className="bg-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monto-int">Precio (MXN)</Label>
                    <Input
                      id="monto-int"
                      type="number"
                      value={localProduct.monto}
                      onChange={(e) => handleChange("monto", parseInt(e.target.value) || 0)}
                      className="bg-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dias-int">Días de vigencia</Label>
                    <Input
                      id="dias-int"
                      type="number"
                      value={localProduct.dias}
                      onChange={(e) => handleChange("dias", parseInt(e.target.value) || 0)}
                      className="bg-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mb-int">Datos (MB)</Label>
                    <Input
                      id="mb-int"
                      type="number"
                      value={localProduct.mb}
                      onChange={(e) => handleChange("mb", parseInt(e.target.value) || 0)}
                      className="bg-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      1024 MB = 1 GB · Actual:{" "}
                      {(localProduct.mb / 1024) % 1 === 0
                        ? (localProduct.mb / 1024).toFixed(0)
                        : (localProduct.mb / 1024).toFixed(1)}{" "}
                      GB
                    </p>
                  </div>


                </div>
              ) : (
                /* Standard product narrow-mode tabs (fallback, shouldn't normally render) */
                <Tabs defaultValue="comercial" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="comercial" className="gap-1.5 text-xs">
                      <Type className="h-3.5 w-3.5" />Comercial
                    </TabsTrigger>
                    <TabsTrigger value="visual" className="gap-1.5 text-xs">
                      <Palette className="h-3.5 w-3.5" />Visual
                    </TabsTrigger>
                    <TabsTrigger value="visibilidad" className="gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" />Visibilidad
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="comercial" className="mt-4">
                    <p className="text-xs text-muted-foreground">Abrí en modo ancho para ver el preview en vivo.</p>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>

        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            Selecciona un producto para editar
          </div>
        )}

        {/* Footer close button */}
        <div className="border-t border-border p-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cerrar editor
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
