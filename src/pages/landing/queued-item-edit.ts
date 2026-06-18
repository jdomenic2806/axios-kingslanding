import type { Product } from "@/lib/mock-data";
import type { WriteResult } from "@/hooks/use-item-writes";
import { hasPersistableItemChanges } from "@/lib/api/landing-mapper";

export async function waitForInFlightQueuedItemPersist(
  inFlightPromise: Promise<WriteResult>
): Promise<WriteResult> {
  return await inFlightPromise;
}

export function resolveQueuedItemPersistOutcome({
  result,
  baseProduct,
  persistedProduct,
  latestProduct,
}: {
  result: WriteResult;
  baseProduct: Product;
  persistedProduct: Product;
  latestProduct: Product;
}): {
  keepQueued: boolean;
  nextBaseProduct: Product;
} {
  if (!result.ok) {
    return {
      keepQueued: true,
      nextBaseProduct: baseProduct,
    };
  }

  return {
    keepQueued: hasPersistableItemChanges(persistedProduct, latestProduct),
    nextBaseProduct: persistedProduct,
  };
}
