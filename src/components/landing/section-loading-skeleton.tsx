/**
 * components/landing/section-loading-skeleton.tsx
 *
 * Shown while isLoadingSection === true (API fetch in-flight).
 * Simple shimmer card placeholders using the shadcn Skeleton component.
 * Eliminates the mock→API reorder flash without complex animation.
 */

import { Skeleton } from "@/components/ui/skeleton";

interface SectionLoadingSkeletonProps {
  sectionName: string;
  /** Number of skeleton card placeholders to show (defaults to 5) */
  cardCount?: number;
}

export function SectionLoadingSkeleton({
  sectionName,
  cardCount = 8,
}: SectionLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Section title */}
      <h1 className="text-2xl font-semibold text-foreground">{sectionName}</h1>

      {/* Card placeholders row */}
      <div className="h-[442px] overflow-hidden rounded-[32px] border border-border/60 bg-card/40">
        <div className="cards-carousel-scroll flex h-full gap-6 overflow-x-hidden pb-4 pl-4 pr-2 pt-8 items-end">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Skeleton key={i} className="h-[410px] w-[270px] flex-shrink-0 rounded-[30px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
