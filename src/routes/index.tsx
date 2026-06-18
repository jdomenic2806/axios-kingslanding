/**
 * src/routes/index.tsx — Router root
 *
 * Routes:
 *   /            → LandingRoute    (Landing Manager — products module)
 *   /publicidad  → AdvertisingRoute (advertising/image manager)
 *
 * React Router (BrowserRouter) is mounted here so any route can use
 * navigation hooks. A single Sonner <Toaster> is mounted globally
 * so any route can fire toasts.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingRoute from "./landing-route";
import AdvertisingRoute from "./advertising-route";
import { Toaster } from "@/components/advertising/toaster";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/publicidad" element={<AdvertisingRoute />} />
        {/* Unknown paths fall back to the landing manager. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
