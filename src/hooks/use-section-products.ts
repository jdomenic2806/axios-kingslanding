/**
 * hooks/use-section-products.ts
 *
 * Fetches a section's items from the real backend (GET /sections/:key/full).
 * Merges API visual overrides with mock telco data (prices, GB, days, etc.).
 * Falls back to pure mock data if the API is unavailable.
 *
 * This hook is called imperatively by the editor store's loadSection action
 * so it is NOT a React hook — it's an async helper used inside the store.
 *
 * Exported as a plain async function for use from the store / page.
 */

import type { Product } from "@/lib/mock-data";
import { getProductsBySection } from "@/lib/mock-data";
import { fetchSectionFull } from "@/lib/api/landing-manager";
import { sectionIdToBackendKey, mergeApiWithMockProducts, mapApiSectionFull } from "@/lib/api/landing-mapper";

export interface SectionProductsResult {
  products: Product[];
  isFromApi: boolean;
  error: string | null;
}

/**
 * Load products for a section by sectionId (frontend id like "activacion").
 * Always resolves — never rejects.
 */
export async function loadSectionProducts(sectionId: string): Promise<SectionProductsResult> {
  const mockProducts = getProductsBySection(sectionId);
  const backendKey = sectionIdToBackendKey(sectionId);

  try {
    const fullData = await fetchSectionFull(backendKey);
    const { products: apiProducts } = mapApiSectionFull(fullData);

    // Merge: keep mock telco data, apply API visual overrides
    const merged = mergeApiWithMockProducts(mockProducts, apiProducts);

    return {
      products: merged,
      isFromApi: true,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[use-section-products] API unavailable for "${sectionId}", using mock:`, msg);
    return {
      products: mockProducts,
      isFromApi: false,
      error: msg,
    };
  }
}
