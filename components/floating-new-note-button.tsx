"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FloatingNewNoteButtonProps } from "@/lib/types/three-view-notes";
import { Plus } from "lucide-react";

/**
 * Floating Action Button for creating new notes
 * 
 * Features:
 * - Circular design with prominent shadow
 * - Fixed positioning in bottom-right corner
 * - Bounce entrance and hover animations
 * - Proper touch target size
 * - Accessibility support
 */
export function FloatingNewNoteButton({ onCreateNote, className }: FloatingNewNoteButtonProps) {
  return (
    <button
      onClick={onCreateNote}
      className={cn(
        // Positioning and size
        "fixed bottom-6 right-6 w-14 h-14",
        // Shape and styling
        "rounded-full bg-primary text-primary-foreground",
        "shadow-lg hover:shadow-xl",
        // Animations and transitions
        "transition-all duration-200 ease-out",
        "hover:scale-110 active:scale-95",
        "animate-in zoom-in-50 duration-300",
        // Focus states
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        // Z-index to float above content
        "z-50",
        className
      )}
      aria-label="Create new note"
      title="Create new note"
    >
      <Plus className="w-6 h-6 mx-auto" />
    </button>
  );
}