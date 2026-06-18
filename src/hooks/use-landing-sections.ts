/**
 * hooks/use-landing-sections.ts
 *
 * Fetches the sections list from the real backend.
 * Falls back to mock data if the API is unavailable or returns an error.
 *
 * Returns:
 *   sections  — Section[] (real or fallback)
 *   isLoading — true while the first fetch is in-flight
 *   isFromApi — true if data came from the real backend
 *   error     — error message if the fetch failed (but fallback was used)
 */

import { useState, useEffect } from "react";
import type { Section } from "@/lib/mock-data";
import { sections as mockSections } from "@/lib/mock-data";
import { fetchSections } from "@/lib/api/landing-manager";
import { mapApiSectionToSection } from "@/lib/api/landing-mapper";

interface UseLandingSectionsResult {
  sections: Section[];
  isLoading: boolean;
  isFromApi: boolean;
  error: string | null;
}

export function useLandingSections(): UseLandingSectionsResult {
  const [sections, setSections] = useState<Section[]>(mockSections);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromApi, setIsFromApi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const apiSections = await fetchSections();
        if (cancelled) return;

        const mapped = apiSections
          .sort((a, b) => a.order - b.order)
          .map(mapApiSectionToSection);

        setSections(mapped.length > 0 ? mapped : mockSections);
        setIsFromApi(mapped.length > 0);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // Graceful fallback — keep mock data
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[use-landing-sections] API unavailable, using mock fallback:", msg);
        setSections(mockSections);
        setIsFromApi(false);
        setError(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { sections, isLoading, isFromApi, error };
}
