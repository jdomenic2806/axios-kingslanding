/**
 * components/advertising-manager/advertising-card.tsx
 *
 * A single tile in the advertising grid. Shows the THUMBNAIL (miniatura).
 * Clicking the image opens the full (heavy) image in the viewer.
 * A dropdown menu exposes activate/deactivate and delete actions.
 */

import { MoreVertical, Eye, EyeOff, Trash2, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AdvertisingAsset } from "@/lib/advertising";

interface AdvertisingCardProps {
  asset: AdvertisingAsset;
  onView: (asset: AdvertisingAsset) => void;
  onToggleActive: (id: string) => void;
  onDelete: (asset: AdvertisingAsset) => void;
}

export function AdvertisingCard({
  asset,
  onView,
  onToggleActive,
  onDelete,
}: AdvertisingCardProps) {
  // Object URLs from a previous session won't load — detect failures gracefully.
  return (
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden border-border p-0 transition-all hover:border-primary/50",
        !asset.active && "opacity-60",
      )}
    >
      {/* Thumbnail (clickable) */}
      <button
        type="button"
        onClick={() => onView(asset)}
        className="relative block aspect-square w-full overflow-hidden bg-muted/40"
        title="Ver imagen en alta calidad"
      >
        <img
          src={asset.thumbnailUrl}
          alt={asset.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          onError={(e) => {
            // Object URL expired (simulated reload). Show a fallback.
            const img = e.currentTarget;
            img.style.display = "none";
            img.nextElementSibling?.classList.remove("hidden");
          }}
        />
        <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="h-6 w-6" />
          <span className="text-xs">Imagen no disponible</span>
        </div>

        {!asset.active && (
          <Badge
            variant="outline"
            className="absolute left-2 top-2 border-amber-500/50 bg-background/80 text-amber-500 backdrop-blur"
          >
            Oculta
          </Badge>
        )}
      </button>

      {/* Footer: title + actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
        <span className="truncate text-sm font-medium text-foreground" title={asset.title}>
          {asset.title}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(asset)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver imagen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(asset.id)}>
              {asset.active ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Mostrar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(asset)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
