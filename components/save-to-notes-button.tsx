"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { useNoteStore } from "@/stores/noteStore";
import { useTimetableStore } from "@/stores/timetableStore";
import { useCourseStore } from "@/stores/courseStore";
import { useNoteDrawer } from "@/hooks/use-note-drawer";
import type { NoteContext } from "@/stores/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveToNotesButtonProps {
  content: string;
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
  showContextOptions?: boolean;
}

export function SaveToNotesButton({ 
  content, 
  className,
  variant = "ghost",
  size = "sm",
  showContextOptions = false
}: SaveToNotesButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { saveFromChat } = useNoteStore();
  const { activeTimetableId } = useTimetableStore();
  const { courses } = useCourseStore();
  const { selectedContext } = useNoteDrawer();

  const handleSaveToNotes = async (context?: NoteContext) => {
    if (!activeTimetableId || !content.trim()) return;

    setIsSaving(true);
    try {
      // Determine the context to save to
      const contextToUse: NoteContext = context || selectedContext || {
        type: 'timetable',
        timetableId: activeTimetableId,
      };

      // Format the content for saving
      const timestamp = new Date().toLocaleString();
      const formattedContent = `**Saved from AI Chat** (${timestamp}):\n\n${content.trim()}\n\n---\n\n`;

      await saveFromChat(formattedContent, contextToUse);
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to save to notes:', error);
      // Could add toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeTimetableId) {
    return null; // Don't show button if no timetable is active
  }

  // Get current timetable courses for context options
  const timetableCourses = courses?.filter(course => course.timetable_id === activeTimetableId) || [];

  if (showContextOptions && timetableCourses.length > 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isSaving || !content.trim()}
            className={cn(
              "transition-all duration-200",
              isSaved && "text-green-600 bg-green-50 hover:bg-green-100",
              className
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            <span className="ml-1">
              {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save to Notes"}
            </span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => handleSaveToNotes({
              type: 'timetable',
              timetableId: activeTimetableId,
            })}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Timetable Notes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {timetableCourses.map(course => (
            <DropdownMenuItem
              key={course.id}
              onClick={() => handleSaveToNotes({
                type: 'course',
                timetableId: activeTimetableId,
                courseId: course.id,
              })}
            >
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: course.color }}
                />
                <span className="truncate">{course.code}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => handleSaveToNotes()}
      disabled={isSaving || !content.trim()}
      className={cn(
        "transition-all duration-200",
        isSaved && "text-green-600 bg-green-50 hover:bg-green-100",
        className
      )}
      title="Save this response to your notes"
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSaved ? (
        <Check className="h-4 w-4" />
      ) : (
        <BookOpen className="h-4 w-4" />
      )}
      <span className="ml-1">
        {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save to Notes"}
      </span>
    </Button>
  );
}