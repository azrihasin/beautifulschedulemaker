// TypeScript interfaces for sidebar and timetable stores

import { v4 as uuidv4 } from "uuid";
import { UIMessage } from "ai";

// Course-related interfaces
export interface CourseSession {
  session_id: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
}

export interface CourseWithSessions {
  id: string;
  name: string;
  code?: string;
  color?: string;
  timetable_id: string;
  sessions: CourseSession[];
  createdAt: Date;
  updatedAt: Date;
}

// Type alias for easier reference
export type Course = CourseWithSessions;

export interface Chat {
  id: string;
  name: string;
  timetableId: string;
  messages: UIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Timetable {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  backgroundImage?: string | null;
  backgroundSize?: number;
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  backgroundRotation?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Sidebar Store Interface
export interface SidebarStore {
  isCollapsed: boolean;
  expandedTimetables: Set<string>;
  
  toggleSidebar: () => void;
  toggleTimetable: (id: string) => void;
  expandTimetable: (id: string) => void;
  collapseTimetable: (id: string) => void;
}

// Timetable Store Interface
export interface TimetableStore {
  timetables: Timetable[];
  activeTimetableId: string | null;
  isLoading: boolean;
  error: string | null;
  
  addTimetable: () => Timetable;
  setActiveTimetable: (id: string) => void;
  updateTimetable: (updatedTimetable: Timetable) => void;
  deleteTimetable: (id: string) => void;
  getTimetables: () => Timetable[];
  getTimetable: (id: string) => Timetable | undefined;
  updateMany: (updates: Array<{ id: string; updates: Partial<Omit<Timetable, 'id' | 'createdAt' | 'courses'>> }>) => void;
  getActiveTimetableId: () => string | null;
  
  // Background image methods
  setTimetableBackgroundImage: (timetableId: string, backgroundImage: string | null) => void;
  setTimetableBackgroundSize: (timetableId: string, backgroundSize: number) => void;
  setTimetableBackgroundPositionX: (timetableId: string, backgroundPositionX: number) => void;
  setTimetableBackgroundPositionY: (timetableId: string, backgroundPositionY: number) => void;
  setTimetableBackgroundRotation: (timetableId: string, backgroundRotation: number) => void;
  getActiveTimetableBackground: () => {
    backgroundImage: string | null;
    backgroundSize: number;
    backgroundPositionX: number;
    backgroundPositionY: number;
    backgroundRotation: number;
  } | null;
}

// Chat Store Interface (simplified CRUD operations)
export interface ChatStore {
  chats: Chat[];
  activeChatId: string | null;
  // Track ongoing rename operations for UX
  renamingChats: Set<string>;
  
  // Basic CRUD operations
  addChat: (chat: Chat) => void;
  deleteChat: (id: string) => Promise<void>;
  updateChat: (updatedChat: Chat) => void;
  createChat: (timetableId: string) => Promise<Chat>;
  // Rename operation
  renameChat: (id: string, newName: string) => Promise<void>;
  
  // Navigation methods
  setActiveChat: (id: string) => void;
  clearActiveChat: () => void;
}

// Note-related types
export interface Note {
  id: string;
  userId: string;
  timetableId: string;
  courseId?: string;
  sessionId?: string;
  content: JSONContent; // Tiptap JSON format
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteContext {
  type: 'timetable' | 'course' | 'session';
  timetableId: string;
  courseId?: string;
  sessionId?: string;
}

// Tiptap JSON content type
export interface JSONContent {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: {
    type: string;
    attrs?: Record<string, any>;
  }[];
  text?: string;
}

// Note Store Interface
export interface NoteStore {
  notes: Note[];
  currentNote: Note | null;
  currentContext: NoteContext | null;
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  loadNote: (context: NoteContext) => Promise<Note>;
  saveNote: (note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  // Context management
  setCurrentContext: (context: NoteContext) => void;
  getCurrentNote: () => Note | null;
  
  // Organization features
  getOrganizedNotes: (timetableId: string) => Promise<{
    timetable: Note[];
    course: Note[];
    session: Note[];
  }>;
  getPinnedNotes: (timetableId: string) => Promise<Note[]>;
  togglePin: (noteId: string) => Promise<void>;
  
  // AI integration
  saveFromChat: (content: string, context: NoteContext) => Promise<void>;
  getNotesForAI: (query: string) => Promise<Note[]>;
  
  // Error handling and offline behavior
  setError: (error: string | null) => void;
  clearError: () => void;
  syncOfflineChanges: () => Promise<void>;
  checkConnectivity: () => Promise<boolean>;
  retryFailedOperations: () => Promise<void>;
}