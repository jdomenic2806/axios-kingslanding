/**
 * components/advertising-manager/image-viewer.tsx
 *
 * Lightbox that shows the FULL (heavy) image when an admin clicks a grid item,
 * mirroring the distributor experience. Includes a download action.
 */

import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBytes, type AdvertisingAsset } from "@/lib/advertising";

interface ImageViewerProps {
  asset: AdvertisingAsset | null;
  open: boolean;
  onClose: () => void;
}

export function ImageViewer({ asset, open, onClose }: ImageViewerProps) {
  if (!asset) return null;

  const handleDownload = async () => {
    const res = await fetch(asset.fullUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = asset.fileName || `${asset.title || "publicidad"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{asset.title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
          <img
            src={asset.fullUrl}
            alt={asset.title}
            className="mx-auto max-h-[65vh] w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            {asset.description && (
              <p className="truncate">{asset.description}</p>
            )}
            <p className="truncate">
              {asset.fileName || "imagen"} · {formatBytes(asset.sizeBytes)}
            </p>
          </div>
          <Button onClick={handleDownload} className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
