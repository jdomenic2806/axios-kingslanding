"use client";

import {
  UserPlus,
  RefreshCw,
  Package,
  Zap,
  Home,
  Wifi,
  ChevronRight,
  Clock,
} from "lucide-react";
import { type Section } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SectionsGridProps {
  sections: Section[];
  onSelectSection: (section: Section) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-plus": UserPlus,
  "refresh-cw": RefreshCw,
  package: Package,
  zap: Zap,
  home: Home,
  wifi: Wifi,
};

export function SectionsGrid({ sections, onSelectSection }: SectionsGridProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Secciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra los productos de cada sección de la landing
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = iconMap[section.icon] || Package;
          const statusColor =
            section.status === "published"
              ? "bg-green-500"
              : section.status === "modified"
                ? "bg-orange-500"
                : "bg-blue-500";

          return (
            <Card
              key={section.id}
              className="group cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:bg-card/80"
              onClick={() => onSelectSection(section)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-medium text-foreground">{section.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {section.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {section.productCount} productos
                  </Badge>

                  {section.lastPublished && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(section.lastPublished).toLocaleDateString(
                          "es-MX",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
