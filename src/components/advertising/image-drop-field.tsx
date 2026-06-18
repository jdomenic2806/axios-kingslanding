/**
 * components/advertising-manager/image-drop-field.tsx
 *
 * A single image picker with drag-and-drop + click-to-browse + preview.
 * Used twice in the upload dialog: once for the thumbnail (miniatura),
 * once for the full image (pesada).
 */

import { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidImageFile, formatBytes } from "@/lib/advertising";
import { Button } from "@/components/ui/button";

interface ImageDropFieldProps {
  label: string;
  hint?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Optional preview URL for the selected file. */
  previewUrl: string | null;
}

export function ImageDropField({
  label,
  hint,
  file,
  onFileChange,
  previewUrl,
}: ImageDropFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const picked = files?.[0];
      if (!picked) return;
      if (!isValidImageFile(picked)) {
        setError("Formato no válido. Usá PNG, JPG o WEBP.");
        return;
      }
      setError(null);
      onFileChange(picked);
    },
    [onFileChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const clear = useCallback(() => {
    onFileChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileChange]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
          <img
            src={previewUrl}
            alt={label}
            className="mx-auto max-h-44 w-full object-contain"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-1.5">
            <span className="truncate text-xs text-muted-foreground">
              {file?.name} · {formatBytes(file?.size)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={clear}
              title="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm text-foreground">
            Arrastrá una imagen o{" "}
            <span className="text-primary underline">explorá</span>
          </div>
          <div className="text-xs text-muted-foreground">PNG, JPG o WEBP</div>
        </label>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
