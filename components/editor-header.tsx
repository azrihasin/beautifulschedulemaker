'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { EditorHeaderProps } from '@/lib/types/three-view-notes';
import { ChevronLeft, Loader2 } from 'lucide-react';

export function EditorHeader({
  title,
  onTitleChange,
  onBack,
  onSave,
  isSaving,
  hasUnsavedChanges = false,
  className,
}: EditorHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between h-16 flex-shrink-0",
      className
    )}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-md",
          "text-sm font-medium text-muted-foreground",
          "hover:text-foreground hover:bg-muted",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20"
        )}
        aria-label="Go back to note list"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Title Input */}
      <div className="flex-1 max-w-md mx-4">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={cn(
            "w-full text-xl font-semibold text-center",
            "bg-transparent border-none outline-none",
            "text-foreground placeholder-muted-foreground",
            "focus:ring-2 focus:ring-primary focus:ring-opacity-20",
            "rounded-md px-2 py-1"
          )}
          placeholder="Note title..."
          aria-label="Note title"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={isSaving || !hasUnsavedChanges}
        className={cn(
          "flex items-center space-x-2 px-4 py-2 rounded-md",
          "text-sm font-medium",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20"
        )}
        aria-label={isSaving ? "Saving note..." : "Save note"}
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isSaving ? 'Saving...' : 'Save'}</span>
      </button>
    </div>
  );
}

export default EditorHeader;