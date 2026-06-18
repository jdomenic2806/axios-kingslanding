/**
 * components/advertising-manager/advertising-header.tsx
 *
 * Top bar for the Publicidad route. Mirrors the landing header's theme toggle
 * so dark/light stays consistent across modules (same localStorage key).
 */

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "landing-manager-theme";

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  localStorage.setItem(THEME_KEY, theme);
}

export function AdvertisingHeader() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Axios Admin</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">Publicidad</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="h-8 w-8 text-foreground hover:text-foreground"
        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
