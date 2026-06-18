/**
 * components/advertising-manager/toaster.tsx
 *
 * Self-contained Sonner toaster for this app.
 *
 * The shadcn ui/sonner.tsx variant depends on next-themes' useTheme(), but this
 * app manages the theme by toggling the `dark` class on <html> directly (see
 * header.tsx). To avoid requiring a ThemeProvider we read the theme from the
 * document element instead.
 */

import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function Toaster() {
  const [theme, setTheme] = useState<"dark" | "light">(readTheme);

  // Keep in sync if the user flips the theme via the header toggle.
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
    />
  );
}
