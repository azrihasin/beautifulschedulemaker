"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { NoteCardProps } from "@/lib/types/three-view-notes";

/**
 * Individual note card component with Apple design principles
 * 
 * Features:
 * - Rounded rectangle with subtle shadows
 * - Left border color accent from note data
 * - Typography with line clamping
 * - Hover and focus states
 * - Accessibility support
 * - Metadata display
 */
export function NoteCard({ note, onClick, className }: NoteCardProps) {
  return (
    <div
      onClick={() => onClick(note.id)}
      className={cn(
        "rounded-xl p-4 mb-3 bg-white shadow-sm border border-gray-100",
        "cursor-pointer transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:shadow-md hover:border-gray-200",
        "active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "h-32 flex flex-col", // Fixed height and flex column layout
        className
      )}
      tabIndex={0}
      role="button"
      aria-label={`Open note: ${note.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(note.id);
        }
      }}
    >
      <div className="flex flex-1">
        {/* Left border color accent */}
        <div 
          className="w-1 rounded-full mr-4 flex-shrink-0"
          style={{ backgroundColor: note.colorAccent }}
        />
        
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
            {note.title}
          </h3>
          
          {/* Preview text */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-2 flex-1">
            {note.preview || "No preview available"}
          </p>
          
          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
            <span>
              {new Date(note.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: new Date(note.updatedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </span>
            <span>
              {new Date(note.updatedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}