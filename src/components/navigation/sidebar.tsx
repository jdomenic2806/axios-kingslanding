"use client";

import {
  LayoutDashboard,
  Package,
  Settings,
  History,
  Megaphone,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type Section } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: "sections" | "products" | "preview") => void;
  selectedSection: Section | null;
}

export function Sidebar({
  currentView,
  onNavigate,
  selectedSection,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Top group: cross-module routes (driven by React Router).
  const routeItems = [
    {
      id: "landing",
      label: "Landing Manager",
      icon: LayoutDashboard,
      path: "/",
      active: location.pathname === "/",
      onClick: () => {
        // Within the landing route, always reset to the sections view.
        if (location.pathname === "/") onNavigate("sections");
        else navigate("/");
      },
    },
    {
      id: "publicidad",
      label: "Publicidad",
      icon: Megaphone,
      path: "/publicidad",
      active: location.pathname.startsWith("/publicidad"),
      onClick: () => navigate("/publicidad"),
    },
  ];

  // Bottom group: landing-only utilities (kept from the original sidebar).
  const utilityItems = [
    {
      id: "history",
      label: "Historial",
      icon: History,
      onClick: () => {},
    },
    {
      id: "settings",
      label: "Configuración",
      icon: Settings,
      onClick: () => {},
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-16 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="font-bold text-primary-foreground">A</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {/* Cross-module routes */}
          {routeItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10",
                    item.active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                  onClick={item.onClick}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Separator */}
          <div className="my-1 border-t border-sidebar-border" />

          {/* Landing-only utilities */}
          {utilityItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10",
                    currentView === item.id &&
                      "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                  onClick={item.onClick}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Breadcrumb indicator */}
        {selectedSection && (
          <div className="border-t border-sidebar-border p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Package className="h-5 w-5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {selectedSection.name}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
