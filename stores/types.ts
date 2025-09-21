// TypeScript interfaces for sidebar and timetable stores

import { UIMessage } from "ai";

export interface Timetable {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Chat {
  id: string;
  timetableId: string;
  name: string;
  messages: UIMessage[];
  createdAt: Date;
  updatedAt: Date;
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
  chats: Chat[];
  activeTimetableId: string | null;
  activeChatId: string | null;
  isLoading: boolean;
  error: string | null;
  renamingChats: Set<string>; // Track chats currently being renamed with animation
  
  // Timetable actions
  createTimetable: () => Promise<Timetable>;
  renameTimetable: (id: string, name: string) => Promise<void>;
  deleteTimetable: (id: string) => Promise<void>;
  setActiveTimetable: (id: string) => void;
  
  // Chat actions
  createTemporaryChat: (timetableId: string) => Chat;
  persistTemporaryChat: (tempChatId: string, firstMessageText: string) => Promise<Chat>;
  createChat: (timetableId: string, name?: string) => Promise<Chat>;
  renameChat: (id: string, name: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  setActiveChat: (id: string) => void;
  clearActiveChat: () => void;
  addMessage: (chatId: string, message: UIMessage) => Promise<void>;
  updateChatMessages: (chatId: string, messages: UIMessage[]) => Promise<void>;
  
  // Data sync
  loadTimetables: (forceRefresh?: boolean) => Promise<void>;
  syncFromSupabase: (userId: string) => Promise<void>;
  syncToSupabase: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Renaming animation helpers
  startRenamingAnimation: (chatId: string) => void;
  stopRenamingAnimation: (chatId: string) => void;
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
  getOrganizedNotes: (timetableId: string) => {
    timetable: Note[];
    course: Note[];
    session: Note[];
  };
  getPinnedNotes: (timetableId: string) => Note[];
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

// Database types for Supabase
export interface DatabaseTimetable {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface DatabaseChat {
  id: string;
  timetable_id: string;
  name: string;
  messages: any; // JSONB in database
  created_at: string;
  updated_at: string;
}

export interface DatabaseNote {
  id: string;
  user_id: string;
  timetable_id: string;
  course_id?: string;
  session_id?: string;
  content: any; // JSONB in database
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}