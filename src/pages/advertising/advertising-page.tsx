/**
 * pages/advertising/advertising-page.tsx
 *
 * Route page for the "Publicidad" module (/publicidad).
 *
 * Loads the advertising list from the real backend on mount.
 *
 * Honest degradation:
 *   - `active` and `sortOrder` are local-only (no backend contract).
 *     Toggling visibility or reordering applies for the session only.
 */

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Megaphone, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { AdCategory, AdvertisingAsset } from "@/lib/advertising";
import { useAdvertisingStore } from "@/lib/stores/advertising-store";
import { AdvertisingCard } from "@/components/advertising/advertising-card";
import { UploadDialog } from "@/components/advertising/upload-dialog";
import { ImageViewer } from "@/components/advertising/image-viewer";

const ACTIVE_CATEGORY: AdCategory = "publicidad";

export function AdvertisingPage() {
  const assets = useAdvertisingStore((s) => s.assets);
  const isLoading = useAdvertisingStore((s) => s.isLoading);
  const loadError = useAdvertisingStore((s) => s.loadError);
  const toggleActive = useAdvertisingStore((s) => s.toggleActive);
  const removeAsset = useAdvertisingStore((s) => s.removeAsset);
  const load = useAdvertisingStore((s) => s.load);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewing, setViewing] = useState<AdvertisingAsset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdvertisingAsset | null>(null);

  // Load from backend on mount
  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(
    () =>
      assets
        .filter((a) => a.category === ACTIVE_CATEGORY)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [assets],
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const title = pendingDelete.title;
    try {
      await removeAsset(pendingDelete.id);
      setPendingDelete(null);
      toast.success("Publicidad eliminada", { description: `"${title}" se quitó del grid.` });
    } catch (err) {
      toast.error("No se pudo eliminar", {
        description: err instanceof Error ? err.message : "Error desconocido.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Publicidad y manuales
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cargá la publicidad que ven los distribuidores. Cada pieza lleva su
            miniatura (liviana) y la imagen pesada que se descarga.
          </p>
        </div>

        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <ImagePlus className="h-4 w-4" />
          Cargar publicidad
        </Button>
      </div>

      {/* Degradation notice: active/sortOrder are session-only */}
      <p className="text-xs text-muted-foreground">
        Nota: visibilidad y orden se aplican solo para esta sesión (no se guardan en el servidor).
      </p>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando publicidades…</span>
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-foreground">No se pudieron cargar las publicidades</p>
            <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Grid or empty state */}
      {!isLoading && !loadError && (
        items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Todavía no hay publicidad</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cargá tu primera pieza para que aparezca en el grid de distribuidores.
              </p>
            </div>
            <Button onClick={() => setUploadOpen(true)} className="mt-1 gap-2">
              <ImagePlus className="h-4 w-4" />
              Cargar publicidad
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((asset) => (
              <AdvertisingCard
                key={asset.id}
                asset={asset}
                onView={setViewing}
                onToggleActive={toggleActive}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )
      )}

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        category={ACTIVE_CATEGORY}
      />

      {/* Full-image viewer */}
      <ImageViewer
        asset={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar publicidad</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Vas a eliminar "${pendingDelete.title}". Esta acción no se puede deshacer.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="gap-2 bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
