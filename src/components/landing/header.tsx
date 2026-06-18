"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Upload,
  Sun,
  Moon,
} from "lucide-react";
import { type Section } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Key used to persist theme preference in localStorage
const THEME_KEY = "landing-manager-theme";

/** Returns the initial theme: stored preference → dark as default */
function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

/** Applies the correct theme class on <html> and persists to localStorage */
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

interface HeaderProps {
  currentView: string;
  selectedSection: Section | null;
  /** True when there are unsaved/unpublished changes */
  isDirty: boolean;
  onPublish: () => void;
  onTogglePreview: () => void;
  showPreview: boolean;
  isPublishing?: boolean;
}

export function Header({
  currentView,
  selectedSection,
  isDirty,
  onPublish,
  onTogglePreview,
  showPreview,
  isPublishing = false,
}: HeaderProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Initialise theme from localStorage on first render (client only)
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
      <div className="flex items-center gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Landing Manager</span>
          {selectedSection && (
            <>
              <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {selectedSection.name}
              </span>
            </>
          )}
        </div>

        {/* Status badge */}
        {isDirty && (
          <Badge
            variant="outline"
            className="border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
          >
            Cambios pendientes
          </Badge>
        )}

        {selectedSection && !isDirty && (
          <Badge
            variant="outline"
            className={
              selectedSection.status === "published"
                ? "border-green-500/50 bg-green-500/10 text-green-500"
                : selectedSection.status === "modified"
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                  : "border-blue-500/50 bg-blue-500/10 text-blue-500"
            }
          >
            {selectedSection.status === "published"
              ? "Publicado"
              : selectedSection.status === "modified"
                ? "Modificado"
                : "Sin publicar"}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Dark / Light toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-foreground hover:text-foreground"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Preview Toggle */}
        {currentView === "products" && (
          <Button
            variant={showPreview ? "secondary" : "outline"}
            size="sm"
            onClick={onTogglePreview}
            className="gap-2 text-foreground hover:text-foreground"
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showPreview ? "Ocultar Preview" : "Preview"}
          </Button>
        )}

        {/* Publish — only enabled when there are pending changes */}
        <Button
          size="sm"
          onClick={onPublish}
          disabled={!isDirty || isPublishing}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isDirty ? (isPublishing ? "Guardando cambios pendientes" : "Publicar cambios pendientes") : "No hay cambios pendientes"}
        >
          <Upload className="h-4 w-4" />
          {isPublishing ? "Guardando…" : "Publicar"}
        </Button>
      </div>
    </header>
  );
}
