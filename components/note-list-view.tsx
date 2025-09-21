"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { NoteCard as NoteCardType } from "@/lib/types/three-view-notes";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/note-card";
import { useExcalidrawNoteStore } from "@/stores";
import { FloatingNewNoteButton } from "@/components/floating-new-note-button";

// Skeleton card component for loading state
function NoteCardSkeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={cn(
        "rounded-xl p-6 bg-white shadow-sm border border-gray-100",
        "animate-pulse h-32 flex flex-col", // Match NoteCard height and layout
        className
      )}
      style={style}
    >
      <div className="flex flex-1">
        {/* Left border accent placeholder */}
        <div className="w-1 bg-gray-200 rounded-full mr-4 flex-shrink-0" />
        <div className="flex-1 flex flex-col space-y-3">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-200 rounded-md w-3/4" />
          {/* Preview text skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded-md w-full" />
            <div className="h-4 bg-gray-100 rounded-md w-2/3" />
          </div>
          {/* Metadata skeleton */}
          <div className="flex justify-between mt-auto">
            <div className="h-3 bg-gray-100 rounded-md w-16" />
            <div className="h-3 bg-gray-100 rounded-md w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ onCreateNewNote }: { onCreateNewNote: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center">
          <FileText className="w-12 h-12 text-blue-400" />
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-200 rounded-full opacity-60" />
        <div className="absolute -bottom-1 -left-2 w-4 h-4 bg-pink-200 rounded-full opacity-40" />
      </div>
      
      {/* Encouraging text */}
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        Start Your Visual Journey
      </h3>
      <p className="text-gray-600 mb-8 max-w-sm leading-relaxed">
        Create your first visual note with Excalidraw. Sketch ideas, draw diagrams, and bring your thoughts to life.
      </p>
      
      {/* Call to action */}
      <Button 
        onClick={onCreateNewNote}
        className="flex items-center gap-2 px-6 py-3 text-base font-medium"
      >
        <Plus className="w-5 h-5" />
        Create Your First Note
      </Button>
    </div>
  );
}

// Error state component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <RefreshCw className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Unable to Load Notes
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm">
        Something went wrong while loading your notes. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

// Main NoteListView component
interface NoteListViewProps {
  isVisible: boolean;
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  className?: string;
}

export function NoteListView({
  isVisible,
  onSelectNote,
  onCreateNewNote,
  className
}: NoteListViewProps) {
  const { 
    notes, 
    isLoading, 
    error, 
    loadNotes, 
    setError 
  } = useExcalidrawNoteStore();
  
  const [focusedNoteIndex, setFocusedNoteIndex] = React.useState<number>(-1);

  // Handle loading notes with error handling
  const handleLoadNotes = React.useCallback(async () => {
    try {
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    }
  }, [loadNotes, setError]);

  // Keyboard navigation for notes list
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (!notes.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedNoteIndex(prev => Math.min(prev + 1, notes.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedNoteIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedNoteIndex >= 0 && focusedNoteIndex < notes.length) {
          onSelectNote(notes[focusedNoteIndex].id);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedNoteIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedNoteIndex(notes.length - 1);
        break;
    }
  }, [notes, focusedNoteIndex, onSelectNote]);

  // Load notes on component mount
  React.useEffect(() => {
    if (isVisible) {
      handleLoadNotes();
    }
  }, [isVisible, handleLoadNotes]);

  // Reset focus when notes change
  React.useEffect(() => {
    setFocusedNoteIndex(-1);
  }, [notes]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={cn(
        "w-full h-full bg-gray-50/50 overflow-y-auto",
        "px-6 py-8",
        // Smooth entrance animation
        "animate-in fade-in-0 slide-in-from-right-2 duration-300",
        className
      )}
      role="region"
      aria-label="Notes list"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Visual Notes
        </h1>
        <p className="text-gray-600">
          Your collection of sketches and ideas
        </p>
      </div>

      {/* Content */}
      <div className="w-full">
        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <NoteCardSkeleton 
                key={i} 
                className="animate-in fade-in-0 duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex justify-center">
            <ErrorState onRetry={handleLoadNotes} />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && notes.length === 0 && (
          <div className="flex justify-center">
            <EmptyState onCreateNewNote={onCreateNewNote} />
          </div>
        )}

        {/* Notes list */}
        {!isLoading && !error && notes.length > 0 && (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            role="list"
            aria-label={`${notes.length} notes available`}
          >
            {notes.map((note, index) => (
              <div
                key={note.id}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
                role="listitem"
              >
                <NoteCard
                  note={note}
                  onClick={onSelectNote}
                  className={cn(
                    focusedNoteIndex === index && "ring-2 ring-primary ring-offset-2"
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating new note button */}
      <FloatingNewNoteButton onCreateNote={onCreateNewNote} />
    </div>
  );
}

