"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { NoteCardProps } from "@/lib/types/three-view-notes";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExcalidrawNoteStore } from "@/stores";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteNote } = useExcalidrawNoteStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote(note.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    if (!isDeleting) {
      onClick(note.id);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          "rounded-xl p-4 mb-3 bg-white shadow-sm border border-gray-100",
          "cursor-pointer transition-all duration-200 ease-out",
          "hover:scale-[1.02] hover:shadow-md hover:border-gray-200",
          "active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "h-32 flex flex-col relative group", // Added relative and group for delete button
          isDeleting && "opacity-50 pointer-events-none",
          className
        )}
        tabIndex={0}
        role="button"
        aria-label={`Open note: ${note.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
      {/* Delete button - appears on hover */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className={cn(
            "absolute top-2 right-2 p-2 h-8 w-8",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "hover:bg-red-50 hover:text-red-600",
            "focus:opacity-100"
          )}
          aria-label={`Delete note: ${note.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{note.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}