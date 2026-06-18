"use client";

/**
 * components/landing-manager/undo-bar.tsx
 *
 * Minimal undo/redo toolbar wired to useEditorStore.
 *
 * Phase 2: standalone component, ready to embed in ProductEditor or Header.
 * Phase 4: wired into app/page.tsx after local state is migrated to the store.
 *
 * Design: buttons are disabled when the corresponding stack is empty.
 */

import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/stores/editor-store";

interface UndoBarProps {
  /** Optional className for layout integration */
  className?: string;
}

export function UndoBar({ className }: UndoBarProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={undo}
        disabled={!canUndo}
        title={`Deshacer${canUndo ? ` (${undoStack.length} cambio${undoStack.length !== 1 ? "s" : ""})` : ""}`}
        className="h-8 w-8"
        aria-label="Deshacer último cambio"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={redo}
        disabled={!canRedo}
        title={`Rehacer${canRedo ? ` (${redoStack.length} cambio${redoStack.length !== 1 ? "s" : ""})` : ""}`}
        className="h-8 w-8"
        aria-label="Rehacer último cambio"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
