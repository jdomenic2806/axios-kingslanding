/**
 * components/advertising-manager/upload-dialog.tsx
 *
 * Dialog to upload a new advertising asset. Requires TWO images:
 *   - Miniatura (thumbnail): light image shown in the admin grid.
 *   - Imagen pesada (full): high-quality image distributors download.
 *
 * On submit it calls the advertising store (simulated S3 + Mongo).
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { AdCategory } from "@/lib/advertising";
import { useAdvertisingStore } from "@/lib/stores/advertising-store";
import { ImageDropField } from "./image-drop-field";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AdCategory;
}

export function UploadDialog({ open, onOpenChange, category }: UploadDialogProps) {
  const addAsset = useAdvertisingStore((s) => s.addAsset);
  const isUploading = useAdvertisingStore((s) => s.isUploading);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [fullFile, setFullFile] = useState<File | null>(null);

  // Build/cleanup preview object URLs.
  const thumbnailPreview = useMemo(
    () => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : null),
    [thumbnailFile],
  );
  const fullPreview = useMemo(
    () => (fullFile ? URL.createObjectURL(fullFile) : null),
    [fullFile],
  );

  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  useEffect(() => {
    return () => {
      if (fullPreview) URL.revokeObjectURL(fullPreview);
    };
  }, [fullPreview]);

  // Reset form whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setThumbnailFile(null);
      setFullFile(null);
    }
  }, [open]);

  const canSubmit =
    title.trim().length > 0 && !!thumbnailFile && !!fullFile && !isUploading;

  const handleSubmit = async () => {
    if (!thumbnailFile || !fullFile) return;
    try {
      await addAsset({
        category,
        title,
        description,
        thumbnailFile,
        fullFile,
      });
      toast.success("Publicidad cargada", {
        description: `"${title.trim()}" se agregó al grid.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo cargar la imagen", {
        description: err instanceof Error ? err.message : "Error desconocido.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cargar publicidad</DialogTitle>
          <DialogDescription>
            Subí la miniatura (liviana, para el admin) y la imagen pesada (alta
            calidad, la que descargan los distribuidores).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ad-title">Título</Label>
            <Input
              id="ad-title"
              placeholder="Ej. Triple de gigas — Mayo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ad-description">Descripción (opcional)</Label>
            <Textarea
              id="ad-description"
              placeholder="Nota interna o detalle de la campaña…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageDropField
              label="Miniatura"
              hint="liviana"
              file={thumbnailFile}
              onFileChange={setThumbnailFile}
              previewUrl={thumbnailPreview}
            />
            <ImageDropField
              label="Imagen pesada"
              hint="alta calidad"
              file={fullFile}
              onFileChange={setFullFile}
              previewUrl={fullPreview}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isUploading ? "Cargando…" : "Cargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
