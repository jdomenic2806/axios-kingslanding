/**
 * src/routes/advertising-route.tsx — Route wrapper for /publicidad
 *
 * Lightweight shell that renders the shared sidebar, advertising header,
 * and AdvertisingPage. Kept separate from LandingRoute so the landing
 * products module is untouched.
 */

import { Sidebar } from "@/components/navigation/sidebar";
import { AdvertisingHeader } from "@/components/advertising/advertising-header";
import { AdvertisingPage } from "@/pages/advertising/advertising-page";

export default function AdvertisingRoute() {
  return (
    <div className="flex h-screen bg-background">
      {/* The sidebar drives cross-module routing itself; landing-only props are
          neutral here (no selected section, no internal view). */}
      <Sidebar currentView="publicidad" onNavigate={() => {}} selectedSection={null} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AdvertisingHeader />
        <main className="flex-1 overflow-auto p-6">
          <AdvertisingPage />
        </main>
      </div>
    </div>
  );
}
