/**
 * TypeScript type definitions for the Three-View Notes System
 * 
 * This file contains all the type definitions used throughout the
 * three-view notes system implementation.
 */

import { Database } from '@/lib/supabase/database.types';

// Database types from Supabase
export type ExcalidrawNoteRow = Database['public']['Tables']['excalidraw_notes']['Row'];
export type ExcalidrawNoteInsert = Database['public']['Tables']['excalidraw_notes']['Insert'];
export type ExcalidrawNoteUpdate = Database['public']['Tables']['excalidraw_notes']['Update'];

// View mode for the three-view system
export type ViewMode = 'timetable' | 'note-list' | 'note-editor';

// Enhanced note interface for application use
export interface ExcalidrawNote {
  id: string;
  user_id: string;
  title: string;
  excalidraw_data: any; // Excalidraw scene JSON data
  preview_text: string;
  color_accent: string;
  created_at: string;
  updated_at: string;
  context_type: 'timetable' | 'course' | 'session';
  context_id: string | null;
}

// Simplified note card interface for list view
export interface NoteCard {
  id: string;
  title: string;
  preview: string; // Truncated text preview
  colorAccent: string; // Left border color
  createdAt: Date;
  updatedAt: Date;
}

// Note context for determining note scope
export interface NoteContext {
  type: 'timetable' | 'course' | 'session';
  timetableId: string;
  courseId?: string; // Required for course/session types
  sessionId?: string; // Required for session type
}

// State management interfaces
export interface ThreeViewNotesState {
  currentView: ViewMode;
  selectedNoteId: string | null;
  isTransitioning: boolean;
  noteListData: NoteCard[];
}

// Store interface for the three-view notes system
export interface ThreeViewNotesStore {
  // View state
  currentView: ViewMode;
  isTransitioning: boolean;
  
  // Note data
  notes: NoteCard[];
  selectedNote: ExcalidrawNote | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  transitionToView: (view: ViewMode) => void;
  loadNotes: () => Promise<void>;
  selectNote: (noteId: string) => Promise<void>;
  createNewNote: () => Promise<void>;
  saveNote: (title: string, sceneData: any) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  
  // Utility
  generatePreview: (sceneData: any) => string;
  getRandomColorAccent: () => string;
}

// Component prop interfaces
export interface AddNoteButtonProps {
  onTransitionToNoteList: () => void;
  className?: string;
}

export interface NoteListViewProps {
  isVisible: boolean;
  notes: NoteCard[];
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  onLoadNotes: () => Promise<void>;
  className?: string;
}

export interface NoteCardProps {
  note: NoteCard;
  onClick: (noteId: string) => void;
  className?: string;
}

export interface FloatingNewNoteButtonProps {
  onCreateNote: () => void;
  className?: string;
}

export interface ExcalidrawNoteEditorProps {
  isVisible: boolean;
  noteId: string | null;
  onBack: () => void;
  onSave: (title: string, sceneData: any) => Promise<void>;
  className?: string;
}

export interface EditorHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

// Error handling interfaces
export interface ErrorState {
  type: 'network' | 'save' | 'load' | 'excalidraw';
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}

// Excalidraw integration types
export interface ExcalidrawScene {
  elements: any[]; // Excalidraw elements array
  appState: any; // Excalidraw app state
}

export interface ExcalidrawConfig {
  initialData?: ExcalidrawScene;
  onChange?: (elements: any[], appState: any) => void;
  UIOptions?: {
    canvasActions?: {
      loadScene?: boolean;
      saveToActiveFile?: boolean;
      export?: boolean;
    };
  };
}

// Utility function types
export type PreviewGenerator = (sceneData: any) => string;
export type ColorAccentGenerator = () => string;
export type SceneDataValidator = (data: any) => boolean;

// API response types
export interface NotesApiResponse {
  data: ExcalidrawNote[] | null;
  error: string | null;
}

export interface NoteApiResponse {
  data: ExcalidrawNote | null;
  error: string | null;
}

// Database operation types
export type NoteOperation = 'create' | 'read' | 'update' | 'delete';

export interface NoteOperationResult {
  success: boolean;
  data?: ExcalidrawNote;
  error?: string;
}

// Animation and transition types
export interface TransitionConfig {
  duration: number; // in milliseconds
  easing: string; // CSS easing function
  delay?: number; // optional delay
}

// Default values and constants
export const DEFAULT_NOTE_TITLE = 'Untitled Note';
export const DEFAULT_COLOR_ACCENT = '#3b82f6';
export const DEFAULT_TRANSITION_DURATION = 300; // Updated to match implementation
export const DEFAULT_PREVIEW_LENGTH = 100;

// Color palette for note accents
export const NOTE_COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#6b7280', // Gray
] as const;

export type NoteColorAccent = typeof NOTE_COLOR_PALETTE[number];