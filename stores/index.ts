// Export all stores and types for easy importing
export { useSidebarStore } from './sidebarStore';
export { useTimetableStore } from './timetableStore';
export { useNoteStore } from './noteStore';
export { useExcalidrawNoteStore } from './excalidrawNoteStore';
export type {
  SidebarStore,
  TimetableStore,
  NoteStore,
  Timetable,
  Chat,
  ChatMessage,
  Note,
  NoteContext,
  JSONContent,
  CourseWithSessions,
  DatabaseTimetable,
  DatabaseChat,
  DatabaseNote,
} from './types';