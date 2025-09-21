import { useState, useCallback } from "react";
import type { NoteContext } from "@/stores/types";

interface UseNoteDrawerReturn {
  isOpen: boolean;
  selectedContext: NoteContext | null;
  selectedElementId: string | null;
  openDrawer: (context: NoteContext, elementId?: string) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useNoteDrawer = (): UseNoteDrawerReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<NoteContext | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const openDrawer = useCallback((context: NoteContext, elementId?: string) => {
    setSelectedContext(context);
    setSelectedElementId(elementId || null);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    // Keep context and elementId for potential reopening
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    selectedContext,
    selectedElementId,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
};

// Helper functions for context detection
export const createTimetableContext = (timetableId: string): NoteContext => ({
  type: 'timetable',
  timetableId,
});

export const createCourseContext = (timetableId: string, courseId: string): NoteContext => ({
  type: 'course',
  timetableId,
  courseId,
});

export const createSessionContext = (
  timetableId: string, 
  courseId: string, 
  sessionId: string
): NoteContext => ({
  type: 'session',
  timetableId,
  courseId,
  sessionId,
});