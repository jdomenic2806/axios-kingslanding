/**
 * src/pages/landing/landing-page.tsx — Landing Manager screen
 *
 * Full landing manager UI: sections grid, product carousel, editor, preview.
 * Ported from app/landing-route.tsx (Next.js → Vite/React SPA).
 *
 * Changes from the original:
 *  - Removed "use client" directive (not needed in Vite)
 *  - process.env.NODE_ENV → import.meta.env.MODE
 *  - process.env.NEXT_PUBLIC_LANDING_V2 → import.meta.env.VITE_LANDING_V2
 *
 * Simulated Scope v2: The editor store (useEditorStore) is now the REAL
 * source of truth. products[] and deviceBlocks[] are read from the store;
 * component-local state no longer shadows them.
 *
 * Feature flag: landing.manager.v2
 *  - Enabled by default in development (import.meta.env.MODE === 'development').
 *  - In production: set VITE_LANDING_V2=true OR
 *    localStorage.setItem('flag:landing.manager.v2', 'true').
 *
 * Persistence model (publish-only):
 *  - Field edits are LOCAL ONLY — no backend call is fired while editing.
 *  - The `Publicar` button is the SOLE trigger for persisting field changes.
 *  - On publish: all products that differ from their last-persisted snapshot
 *    (captured when the section was loaded) are PATCHed to the backend.
 *  - Status toggle (active/inactive) and reorder remain immediate writes
 *    because they represent structural state changes, not copy/field edits.
 *  - Asset uploads (badge, background, social icons) are also immediate
 *    because they require a real upload + CDN URL before they can be used.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  type Product,
  type Section,
  type InternetDeviceInfo,
} from "@/lib/mock-data";
import { useLandingSections } from "@/hooks/use-landing-sections";
import { Sidebar } from "@/components/navigation/sidebar";
import { SectionsGrid } from "@/components/landing/sections-grid";
import { ProductEditor } from "@/components/landing/product-editor";
import { ProductList, type PaquetesColorScope, type PaquetesTabContext } from "@/components/landing/product-list";
import { SectionLoadingSkeleton } from "@/components/landing/section-loading-skeleton";
import { PreviewPanel } from "@/components/landing/preview-panel";
import { Header } from "@/components/landing/header";
import { UndoBar } from "@/components/landing/undo-bar";
import { ValidationBanner } from "@/components/landing/validation-banner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Trash2 } from "lucide-react";
import { useEditorStore } from "@/lib/stores/editor-store";
import { toast } from "sonner";
import { validateCard, type ValidationViolation } from "@/lib/schemas/landing";
import { getLandingManagerApiDisabledReason } from "@/lib/api/landing-manager";
import { persistItemEdit, persistItemStatus, persistItemReorder, type WriteResult } from "@/hooks/use-item-writes";
import { hasPersistableItemChanges } from "@/lib/api/landing-mapper";
import { hasTransientAssetUrls } from "@/lib/assets/transient-assets";
import {
  drainTrackedWritesBestEffort,
  enqueueTrackedWrite,
  flushTrackedWrites,
  type TrackedWriteEntry,
} from "./pending-persist";

// ─── Feature flag ─────────────────────────────────────────────────────────────

function isLandingV2Enabled(): boolean {
  if (import.meta.env.MODE === "development") return true;
  if (import.meta.env.VITE_LANDING_V2 === "true") return true;
  if (typeof window !== "undefined") {
    return localStorage.getItem("flag:landing.manager.v2") === "true";
  }
  return false;
}

type View = "sections" | "products" | "preview";

const UNSAVED_MSG = "Tenés cambios sin publicar. ¿Seguro que querés salir?";

// ─── LandingPage component ────────────────────────────────────────────────────

export default function LandingPage() {
  const [currentView, setCurrentView] = useState<View>("sections");
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<InternetDeviceInfo | null>(null);

  // ── Real sections from API (with mock fallback) ──────────────────────────
  const { sections, isFromApi: sectionsFromApi } = useLandingSections();

  // ── Editor store — source of truth for products and deviceBlocks ─────────
  const products = useEditorStore((s) => s.products);
  const deviceBlocks = useEditorStore((s) => s.deviceBlocks);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isLoadingSection = useEditorStore((s) => s.isLoadingSection);
  const sectionDataSource = useEditorStore((s) => s.sectionDataSource);
  const loadSection = useEditorStore((s) => s.loadSection);
  const setCard = useEditorStore((s) => s.setCard);
  const setDeviceBlock = useEditorStore((s) => s.setDeviceBlock);
  const setProducts = useEditorStore((s) => s.setProducts);
  const markSaved = useEditorStore((s) => s.markSaved);
  const resetEditorView = useEditorStore((s) => s.resetView);
  const clearPersisted = useEditorStore((s) => s.clearPersisted);
  const apiDisabledReason = getLandingManagerApiDisabledReason();

  // ── Validation state — driven by store (live) ────────────────────────────
  const [violations, setViolations] = useState<ValidationViolation[]>([]);
  const [validationDismissed, setValidationDismissed] = useState(false);

  // ── Phase 2+ panel state ─────────────────────────────────────────────────
  const [v2Enabled] = useState<boolean>(() => isLandingV2Enabled());

  // ── Derived: products filtered by active flag (for preview) ─────────────
  const visibleProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  // ── Derived: live validation violations across all products ───────────────
  // Only surfaces violations that matter for publishing (not blocking save).
  // This avoids false "copy required" banners when a user is mid-edit.
  useEffect(() => {
    if (!isDirty) {
      setViolations([]);
      return;
    }
    // Only run price checks while editing (non-blocking copy stays silent).
    // Full publish validation runs in handlePublish when the user explicitly clicks Publicar.
    const liveViolations: ValidationViolation[] = [];
    for (const p of products) {
      // price non-negative
      if (typeof p.monto === "number" && p.monto < 0) {
        liveViolations.push({
          field: "monto",
          rule: "price_non_negative",
          message: "El precio no puede ser negativo.",
          level: "blocking",
        });
      }
    }
    setViolations(liveViolations);
    if (liveViolations.length > 0) setValidationDismissed(false);
  }, [products, isDirty]);

  // ── Unsaved changes modal ────────────────────────────────────────────────
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [finalFlushError, setFinalFlushError] = useState<string | null>(null);
  const [isFinalFlushInFlight, setIsFinalFlushInFlight] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const pendingNonEditWritesRef = useRef<Map<string, TrackedWriteEntry>>(new Map());
  const pendingAssetOperationsRef = useRef(new Set<Promise<unknown>>());

  /**
   * Snapshot of products as they were last persisted to the backend.
   * Set when a section loads (after the API fetch completes).
   * Used by handlePublish to determine which products have changed
   * and need to be PATCHed.
   *
   * NOTE: status toggles and reorders update this ref immediately
   * (because those writes fire immediately), but field edits do NOT
   * update it — they are only persisted on Publicar.
   */
  const persistedProductsRef = useRef<Map<string, Product>>(new Map());

  const trackPendingAssetOperation = useCallback(async (promise: Promise<unknown>): Promise<unknown> => {
    setFinalFlushError(null);
    pendingAssetOperationsRef.current.add(promise);

    try {
      return await promise;
    } finally {
      pendingAssetOperationsRef.current.delete(promise);
    }
  }, []);

  const buildFinalFlushErrorMessage = useCallback((action: "publicar" | "salir") => {
    return `No se pudieron guardar todos los cambios antes de ${action}. Revisá tu conexión e intentá de nuevo.`;
  }, []);

  const buildTransientAssetErrorMessage = useCallback((action: "publicar" | "salir") => {
    return `Todavía hay assets locales o subidas pendientes antes de ${action}. Esperá a que terminen o volvé a subirlos para que queden realmente guardados.`;
  }, []);

  /**
   * Wait for in-flight asset uploads and any immediately-tracked writes
   * (status toggles, reorders) to settle before publish/leave.
   *
   * Field-edit PATCHes are NOT in-flight here — they are accumulated in
   * the store and fired explicitly by handlePublish via publishPendingFieldEdits.
   */
  const flushInFlightWritesOrReport = useCallback(async (action: "publicar" | "salir") => {
    setIsFinalFlushInFlight(true);
    setFinalFlushError(null);

    try {
      // Wait for any ongoing asset uploads
      while (pendingAssetOperationsRef.current.size > 0) {
        await Promise.allSettled(Array.from(pendingAssetOperationsRef.current));
      }

      // Flush tracked structural writes (status toggles, reorders)
      const pendingWriteFailures = await flushTrackedWrites(pendingNonEditWritesRef.current);

      if (pendingWriteFailures.length > 0) {
        setFinalFlushError(buildFinalFlushErrorMessage(action));
        setValidationDismissed(false);
        return false;
      }

      const { products: latestProducts, deviceBlocks: latestDeviceBlocks } = useEditorStore.getState();
      if (hasTransientAssetUrls(latestProducts, latestDeviceBlocks)) {
        setFinalFlushError(buildTransientAssetErrorMessage(action));
        setValidationDismissed(false);
        return false;
      }

      return true;
    } finally {
      setIsFinalFlushInFlight(false);
    }
  }, [buildFinalFlushErrorMessage, buildTransientAssetErrorMessage]);

  /**
   * Persist all field-edit changes accumulated since the last successful publish
   * (or since the section was loaded).
   *
   * Compares current products against `persistedProductsRef` and PATCHes every
   * product that has changed. On full success, advances the persisted snapshot.
   */
  const publishPendingFieldEdits = useCallback(async (
    sectionId: string,
    currentProducts: Product[]
  ): Promise<WriteResult[]> => {
    const failures: WriteResult[] = [];

    const patches = currentProducts
      .map((product) => {
        const itemKey = product.mongoId ?? product.offeringId;
        if (!itemKey) return null; // local-only product, skip
        const persisted = persistedProductsRef.current.get(product.id);
        if (persisted && !hasPersistableItemChanges(persisted, product)) return null;
        return { product, persisted };
      })
      .filter((entry): entry is { product: Product; persisted: Product | undefined } => entry !== null);

    if (patches.length === 0) return failures;

    const results = await Promise.all(
      patches.map(({ product, persisted }) =>
        persistItemEdit(sectionId, product, persisted)
      )
    );

    results.forEach((result, i) => {
      if (result.ok) {
        // Advance the persisted snapshot for successfully patched products
        const product = patches[i].product;
        persistedProductsRef.current.set(product.id, product);
      } else if (!result.error?.startsWith("local-only")) {
        console.warn("[landing-page] field edit persist failed:", result.error);
        failures.push(result);
      }
    });

    return failures;
  }, []);

  const applySectionCardBackground = useCallback((nextSrc?: string) => {
    const updatedProducts = useEditorStore.getState().products.map((product) => ({
      ...product,
      visualConfig: {
        ...product.visualConfig,
        cardBackgroundImageSrc: nextSrc,
      },
    }));

    setProducts(updatedProducts);
    setSelectedProduct((current) => current
      ? {
          ...current,
          visualConfig: {
            ...current.visualConfig,
            cardBackgroundImageSrc: nextSrc,
          },
        }
      : current);
  }, [setProducts]);

  useEffect(() => {
    const handler = () => {
      // Drain only structural writes (status toggles, reorders) best-effort on page hide.
      // Field edits are NOT auto-persisted on page close — the user must click Publicar.
      drainTrackedWritesBestEffort(pendingNonEditWritesRef.current, { keepalive: true });
    };

    window.addEventListener("pagehide", handler);

    return () => {
      window.removeEventListener("pagehide", handler);
      handler();
    };
  }, []);

  const handleUnsavedConfirm = async () => {
    const flushSucceeded = await flushInFlightWritesOrReport("salir");
    if (!flushSucceeded) return;

    setShowUnsavedModal(false);
    markSaved();
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const handleUnsavedCancel = () => {
    setShowUnsavedModal(false);
    pendingActionRef.current = null;
  };

  // ── Browser close / reload guard ─────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = UNSAVED_MSG;
      return UNSAVED_MSG;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Snapshot products when section finishes loading ──────────────────────
  // This establishes the "last persisted" baseline for publish diffing.
  // Runs once when isLoadingSection transitions from true → false (API fetch done).
  useEffect(() => {
    if (isLoadingSection) return;
    if (products.length === 0) return;
    const snapshot = new Map(products.map((p) => [p.id, p]));
    persistedProductsRef.current = snapshot;
  }, [isLoadingSection]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: products intentionally excluded — we only want the snapshot at load-complete,
  // not on every edit. The ref is updated incrementally by publish/status-toggle on success.

  // ── Internal navigation guard ─────────────────────────────────────────────
  const guardedNavigate = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setShowUnsavedModal(true);
    },
    [isDirty]
  );

  const handleSelectSection = (section: Section) => {
    guardedNavigate(() => {
      setSelectedSection(section);
      // Always fetches from API — no localStorage short-circuit
      loadSection(section.id);
      setCurrentView("products");
      setSelectedProduct(null);
    });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleBackToSections = () => {
    guardedNavigate(() => {
      setCurrentView("sections");
      setSelectedSection(null);
      setSelectedProduct(null);
      resetEditorView();
    });
  };

  // handleProductUpdate: apply to store (local-only for field edits).
  // Status toggle fires immediately to the backend (structural write).
  // Field edits are accumulated locally — persisted only when the user clicks Publicar.
  const handleProductUpdate = useCallback((updatedProduct: Product) => {
    const previousProduct = products.find((p) => p.id === updatedProduct.id);
    setCard(updatedProduct.id, updatedProduct);
    // Keep selectedProduct in sync (it's UI state, not content state)
    setSelectedProduct(updatedProduct);

    if (!selectedSection) return;

    const activeToggled = previousProduct?.active !== updatedProduct.active;
    if (activeToggled) {
      const itemKey = `status:${selectedSection.id}:${updatedProduct.offeringId || updatedProduct.id}`;

      // Status toggle: fires immediately — structural state change, not a copy edit.
      // Also update the persisted snapshot so publish doesn't re-PATCH active status.
      void enqueueTrackedWrite(pendingNonEditWritesRef.current, itemKey, (requestInit) =>
        persistItemStatus(selectedSection.id, updatedProduct, { requestInit })
      ).then((result) => {
        if (result.ok) {
          // Advance snapshot so publish skips the active field
          persistedProductsRef.current.set(updatedProduct.id, updatedProduct);
        } else if (result.error && !result.error.startsWith("local-only")) {
          console.warn("[landing-page] status persist failed:", result.error);
        }
      });
    }
    // Field edits: local only. No backend call here. Publish collects them all.
  }, [products, selectedSection, setCard]);

  const handleReorderProducts = useCallback((reorderedProducts: Product[]) => {
    setProducts(reorderedProducts);

    if (!selectedSection) return;

    const reorderKey = `reorder:${selectedSection.id}`;

    // Persist reorder to backend — optimistic, but track pending writes for final flush.
    void enqueueTrackedWrite(pendingNonEditWritesRef.current, reorderKey, (requestInit) =>
      persistItemReorder(selectedSection.id, reorderedProducts, { requestInit })
    ).then((result) => {
      if (!result.ok && result.error && !result.error.startsWith("local-only")) {
        console.warn("[landing-page] reorder persist failed:", result.error);
      }
    });
  }, [selectedSection, setProducts]);

  const handleApplyColorToAll = (
    primaryColor: string,
    secondaryColor: string,
    paquetesScope?: PaquetesColorScope,
    paquetesTab?: PaquetesTabContext,
  ) => {
    // For paquetes section, combine tab (grupo) + period scope filters.
    // Non-paquetes sections: paquetesTab is undefined → apply to all products.
    const shouldApply = (p: Product): boolean => {
      // If a tab context is present, restrict to that grupo first.
      if (paquetesTab) {
        const expectedGrupo = paquetesTab === "linea-nueva" ? "ACTIVACION" : "PORTABILIDAD";
        if (p.grupo !== expectedGrupo) return false;
      }
      // Then apply period scope within the tab.
      if (!paquetesScope || paquetesScope === "todos") return true;
      const dias = p.dias;
      if (paquetesScope === "anual") return dias >= 360;
      if (paquetesScope === "semestral") return dias >= 170 && dias < 360;
      if (paquetesScope === "trimestral") return dias >= 80 && dias < 170;
      return true;
    };
    const updated = products.map((p) =>
      shouldApply(p)
        ? { ...p, visualConfig: { ...p.visualConfig, primaryColor, secondaryColor } }
        : p
    );
    setProducts(updated);
  };

  const handleDeviceUpdate = (updatedDevice: InternetDeviceInfo) => {
    setDeviceBlock(updatedDevice.sectionId, updatedDevice);
    setSelectedDevice(updatedDevice);
  };

  // ── Publish — the ONLY trigger for persisting field edits to the backend ──
  // Flow:
  //   1. Wait for in-flight structural writes (status, reorder) and asset uploads.
  //   2. Run publish-rules validation (blocking violations abort).
  //   3. Diff current products vs persistedProductsRef → PATCH all changed ones.
  //   4. On success: mark saved + show toast.
  const handlePublish = async () => {
    // Simulated mode: only when there is no section selected (nothing to persist).
    // v2Enabled no longer gates real publish — if a section is selected we always
    // attempt real persistence so field edits (including title/planName) go through.
    if (!selectedSection) {
      console.log("[v0] Publishing changes (simulated — no section selected)...", products);
      markSaved();
      return;
    }

    // Step 1: settle in-flight structural writes and asset uploads
    const infraReady = await flushInFlightWritesOrReport("publicar");
    if (!infraReady) return;

    // Step 2: run publish-rules validation
    const allViolations: ValidationViolation[] = [];
    for (const p of products) {
      const result = validateCard(
        {
          monto: p.monto,
          title: p.nombre,
          copy: p.observacion,
          visibility: undefined,
        },
        "publish"
      );
      for (const b of result.blocking) {
        allViolations.push({ ...b, level: "blocking" as const });
      }
      for (const w of result.warnings) {
        allViolations.push({ ...w, level: "warning" as const });
      }
    }
    if (allViolations.some((v) => v.level === "blocking")) {
      setViolations(allViolations);
      setValidationDismissed(false);
      return;
    }

    // Step 3: PATCH all field-edited products (publish-only persistence)
    setIsFinalFlushInFlight(true);
    setFinalFlushError(null);
    let fieldEditFailures: WriteResult[] = [];
    try {
      fieldEditFailures = await publishPendingFieldEdits(selectedSection.id, products);
    } finally {
      setIsFinalFlushInFlight(false);
    }

    if (fieldEditFailures.length > 0) {
      setFinalFlushError(buildFinalFlushErrorMessage("publicar"));
      setValidationDismissed(false);
      return;
    }

    // Step 4: success
    setViolations(allViolations.filter((v) => v.level === "warning"));
    markSaved();
    toast.success("Cambios publicados", {
      description: `Sección "${selectedSection.name}" actualizada en el backend.`,
      duration: 3000,
    });
  };

  // ── Add new card ──────────────────────────────────────────────────────────
  // Receives a fully-formed product from the ProductList's new offer dialog.
  // Does NOT auto-open the editor so the user can see the new card in context
  // and choose when to edit it.
  //
  // New offers ALWAYS land at the START of the carousel. The dialog assigns
  // sortOrder=1 to the new product; here we shift every existing product's
  // sortOrder up by 1 so the new card occupies position 1 and order is stable.
  const handleAddProduct = (newProduct: Product) => {
    const shifted = products.map((p) => ({ ...p, sortOrder: p.sortOrder + 1 }));
    setProducts([newProduct, ...shifted]);
    // Do NOT auto-select: the user can click the card to open the editor when ready.
  };

  // ── Clear simulated data ───────────────────────────────────────────────────
  const handleClearSimulated = () => {
    clearPersisted();
    if (selectedSection) {
      // Reload from seed
      loadSection(selectedSection.id);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === "sections") handleBackToSections();
          else setCurrentView(view);
        }}
        selectedSection={selectedSection}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentView={currentView}
          selectedSection={selectedSection}
          isDirty={isDirty}
          onPublish={handlePublish}
          onTogglePreview={() => setShowPreview(!showPreview)}
          showPreview={showPreview}
          isPublishing={isFinalFlushInFlight}
        />

        {/* ── Data source banner ── */}
        {sectionDataSource === "api" && currentView === "products" ? (
          <div className="flex items-center gap-2 border-b border-green-500/30 bg-green-500/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" aria-hidden />
            <span className="text-xs text-green-700 dark:text-green-400 flex-1">
              <strong>Backend conectado</strong>
              {isLoadingSection && " — cargando…"}
              {!isLoadingSection && " — secciones y productos desde la API real."}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-green-500/50 text-green-700 dark:text-green-400"
            >
              API
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden />
            <span className="text-xs text-amber-600 dark:text-amber-400 flex-1">
              {currentView === "products" && isLoadingSection
                ? <><strong>Cargando desde API…</strong> — usando datos simulados mientras tanto.</>
                : <><strong>{apiDisabledReason ? "API real deshabilitada" : sectionsFromApi ? "Secciones desde API" : "Datos simulados"}</strong>
                    {" — "}
                    {currentView === "products"
                      ? apiDisabledReason ?? "productos con datos locales (API no disponible para este endpoint)."
                      : "los cambios se guardan localmente en este navegador."}
                  </>
              }
            </span>
            {currentView === "products" && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-6 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/20 px-2"
                onClick={handleClearSimulated}
                title="Limpiar datos simulados y recargar seed"
              >
                <Trash2 className="h-3 w-3" />
                Limpiar
              </Button>
            )}
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-amber-500/50 text-amber-600 dark:text-amber-400"
            >
              {apiDisabledReason ? "Config" : sectionsFromApi && currentView !== "products" ? "Parcial" : "Simulado"}
            </Badge>
          </div>
        )}

        {/* ── Phase 2+: toolbar row ── */}
        {v2Enabled && currentView === "products" && (
          <div className="flex items-center gap-2 border-b border-border bg-card/50 px-4 py-1.5">
            {/* Undo / Redo */}
            <UndoBar />
            {/* Note: visual preset feature fully removed from UI.
                Device image gallery is scoped to HBB/MiFi editing only (product-editor.tsx). */}
          </div>
        )}

        {finalFlushError && (
          <div className="px-4 pt-3">
            <ValidationBanner
              violations={[{
                field: "publish",
                rule: "final_flush_failed",
                message: finalFlushError,
                level: "blocking",
              }]}
              onDismiss={() => setFinalFlushError(null)}
            />
          </div>
        )}

        {/* ── Validation banner ── */}
        {violations.length > 0 && !validationDismissed && (
          <div className="px-4 pt-3">
            <ValidationBanner
              violations={violations}
              onDismiss={() => setValidationDismissed(true)}
            />
          </div>
        )}

        <main className="flex-1 overflow-auto p-6">
          {currentView === "sections" && (
            <SectionsGrid
              sections={sections}
              onSelectSection={handleSelectSection}
            />
          )}

          {currentView === "products" && selectedSection && (
            ["internetencasa", "internetportatil"].includes(selectedSection.id) && isLoadingSection ? (
              <SectionLoadingSkeleton sectionName={selectedSection.name} />
            ) : (
              <div className={isLoadingSection ? undefined : "animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"}>
                <ProductList
                  products={products}
                  selectedProduct={selectedProduct}
                  onSelectProduct={handleSelectProduct}
                  onReorderProducts={handleReorderProducts}
                  onApplyColorToAll={handleApplyColorToAll}
                  onAddProduct={handleAddProduct}
                  sectionName={selectedSection.name}
                  sectionId={selectedSection.id}
                  deviceInfoMap={deviceBlocks}
                  onSelectDevice={setSelectedDevice}
                  disableBulkColorApply={sectionDataSource === "api"}
                  bulkColorApplyDisabledReason={
                    sectionDataSource === "api"
                      ? "Color a todos queda deshabilitado con backend real hasta tener persistencia masiva segura."
                      : undefined
                  }
                  isLoading={isLoadingSection}
                />
              </div>
            )
          )}
        </main>
      </div>

      {/* Editor Sheet */}
      <ProductEditor
        product={selectedProduct}
        open={!!selectedProduct || !!selectedDevice}
        onUpdate={handleProductUpdate}
        onClose={() => { setSelectedProduct(null); setSelectedDevice(null); }}
        deviceInfo={selectedDevice}
        onUpdateDevice={handleDeviceUpdate}
        sectionKey={selectedSection?.slug}
        disableUnsupportedAssetUploads={sectionDataSource === "api"}
        onApplySectionCardBackground={applySectionCardBackground}
        trackPendingAssetOperation={trackPendingAssetOperation}
      />

      {/* Preview Sheet — shows only visibility-filtered cards */}
      <PreviewPanel
        products={visibleProducts}
        sectionName={selectedSection?.name || ""}
        sectionId={selectedSection?.id}
        deviceInfoMap={deviceBlocks}
        onClose={() => setShowPreview(false)}
        open={showPreview}
      />

      {/* Unsaved changes modal */}
      <AlertDialog open={showUnsavedModal} onOpenChange={setShowUnsavedModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin publicar. Vamos a intentar guardar lo pendiente antes de salir.
            </AlertDialogDescription>
            {finalFlushError && (
              <p className="text-sm text-red-500">{finalFlushError}</p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleUnsavedCancel}>
              Cancelar
            </AlertDialogCancel>
            <Button onClick={handleUnsavedConfirm} disabled={isFinalFlushInFlight}>
              {isFinalFlushInFlight ? "Guardando…" : "Intentar guardar y salir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
