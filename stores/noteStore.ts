import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { createClient } from "../lib/supabase/client";
import type { 
  Note, 
  NoteContext, 
  NoteStore, 
  DatabaseNote,
  JSONContent 
} from "./types";

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Supabase client
const supabase = createClient();

// Helper function to transform database note to Note
const transformDatabaseNote = (dbNote: DatabaseNote): Note => ({
  id: dbNote.id,
  userId: dbNote.user_id,
  timetableId: dbNote.timetable_id,
  courseId: dbNote.course_id,
  sessionId: dbNote.session_id,
  content: dbNote.content || { type: 'doc', content: [] },
  isPinned: dbNote.is_pinned,
  tags: dbNote.tags || [],
  createdAt: new Date(dbNote.created_at),
  updatedAt: new Date(dbNote.updated_at),
});

// Helper function to transform Note to database format
const transformNoteForDB = (note: Partial<Note>): Partial<DatabaseNote> => ({
  id: note.id,
  user_id: note.userId,
  timetable_id: note.timetableId,
  course_id: note.courseId,
  session_id: note.sessionId,
  content: note.content || { type: 'doc', content: [] },
  is_pinned: note.isPinned || false,
  tags: note.tags || [],
});

// Retry mechanism for Supabase operations
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
};



// Helper function to create empty note content
const createEmptyContent = (): JSONContent => ({
  type: 'doc',
  content: []
});

// Serialization helpers for Date objects
const serializeState = (state: any) => {
  return {
    ...state,
    notes: (state.notes || []).map((n: Note) => ({
      ...n,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
      updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt
    })),
    currentNote: state.currentNote ? {
      ...state.currentNote,
      createdAt: state.currentNote.createdAt instanceof Date ? state.currentNote.createdAt.toISOString() : state.currentNote.createdAt,
      updatedAt: state.currentNote.updatedAt instanceof Date ? state.currentNote.updatedAt.toISOString() : state.currentNote.updatedAt
    } : null
  };
};

const deserializeState = (state: any) => {
  return {
    ...state,
    notes: (state.notes || []).map((n: any) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt)
    })),
    currentNote: state.currentNote ? {
      ...state.currentNote,
      createdAt: new Date(state.currentNote.createdAt),
      updatedAt: new Date(state.currentNote.updatedAt)
    } : null
  };
};

export const useNoteStore = create<NoteStore>()(
  isBrowser ? persist(
    (set, get) => ({
      notes: [],
      currentNote: null,
      currentContext: null,
      isLoading: false,
      error: null,

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      setCurrentContext: (context: NoteContext) => {
        set({ currentContext: context });
      },

      getCurrentNote: () => {
        return get().currentNote;
      },

      // Get notes organized hierarchically
      getOrganizedNotes: (timetableId: string) => {
        const notes = get().notes.filter(note => note.timetableId === timetableId);
        
        // Separate notes by type and sort by pinned status and update time
        const timetableNotes = notes
          .filter(note => note.courseId === undefined && note.sessionId === undefined)
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          });

        const courseNotes = notes
          .filter(note => note.courseId !== undefined && note.sessionId === undefined)
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          });

        const sessionNotes = notes
          .filter(note => note.sessionId !== undefined)
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          });

        return {
          timetable: timetableNotes,
          course: courseNotes,
          session: sessionNotes
        };
      },

      // Get pinned notes for quick access
      getPinnedNotes: (timetableId: string) => {
        return get().notes
          .filter(note => note.timetableId === timetableId && note.isPinned)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      },

      // Toggle pin status
      togglePin: async (noteId: string): Promise<void> => {
        const note = get().notes.find(n => n.id === noteId);
        if (!note) throw new Error('Note not found');
        
        await get().saveNote({ isPinned: !note.isPinned });
      },

      loadNote: async (context: NoteContext): Promise<Note> => {
        set({ isLoading: true, error: null, currentContext: context });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Build query based on context
          let query = supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('timetable_id', context.timetableId);

          // Add context-specific filters
          if (context.type === 'session' && context.sessionId) {
            query = query.eq('session_id', context.sessionId);
          } else if (context.type === 'course' && context.courseId) {
            query = query
              .eq('course_id', context.courseId)
              .is('session_id', null);
          } else if (context.type === 'timetable') {
            query = query
              .is('course_id', null)
              .is('session_id', null);
          }

          // Try to get existing note, but don't retry on "not found" errors
          let data: any;
          let error: any;

          try {
            const result = await query.single();
            data = result.data;
            error = result.error;
          } catch (queryError: any) {
            error = queryError;
          }

          let note: Note;

          if (error && error.code === 'PGRST116') {
            // Note doesn't exist, create a new one
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              userId: user.id,
              timetableId: context.timetableId,
              courseId: context.courseId,
              sessionId: context.sessionId,
              content: createEmptyContent(),
              isPinned: false,
              tags: [],
            };

            const dbNote = transformNoteForDB(newNote);
            const { data: insertedData, error: insertError } = await withRetry(async () => {
              return await supabase
                .from('notes')
                .insert(dbNote)
                .select()
                .single();
            });

            if (insertError) throw insertError;
            note = transformDatabaseNote(insertedData);
          } else if (error) {
            throw error;
          } else {
            note = transformDatabaseNote(data);
          }

          // Update local state
          set((state) => ({
            notes: state.notes.some(n => n.id === note.id) 
              ? state.notes.map(n => n.id === note.id ? note : n)
              : [...state.notes, note],
            currentNote: note,
            isLoading: false
          }));

          return note;
        } catch (error) {
          console.error('Failed to load note:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to load note';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      saveNote: async (noteUpdate: Partial<Note>): Promise<void> => {
        set({ error: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const currentNote = get().currentNote;
          if (!currentNote) {
            throw new Error('No current note to save');
          }

          const updatedNote: Note = {
            ...currentNote,
            ...noteUpdate,
            updatedAt: new Date()
          };

          const dbUpdate = transformNoteForDB(updatedNote);
          const { error } = await withRetry(async () => {
            return await supabase
              .from('notes')
              .update(dbUpdate)
              .eq('id', updatedNote.id)
              .eq('user_id', user.id);
          });

          if (error) throw error;

          // Update local state
          set((state) => ({
            notes: state.notes.map(n => n.id === updatedNote.id ? updatedNote : n),
            currentNote: updatedNote
          }));
        } catch (error) {
          console.error('Failed to save note:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to save note';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      deleteNote: async (id: string): Promise<void> => {
        set({ error: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const { error } = await withRetry(async () => {
            return await supabase
              .from('notes')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);
          });

          if (error) throw error;

          // Update local state
          set((state) => ({
            notes: state.notes.filter(n => n.id !== id),
            currentNote: state.currentNote?.id === id ? null : state.currentNote
          }));
        } catch (error) {
          console.error('Failed to delete note:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      saveFromChat: async (content: string, context: NoteContext): Promise<void> => {
        try {
          // Load the note for the given context
          const note = await get().loadNote(context);
          
          // Create new content to append
          const chatContent: JSONContent = {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: content
              }
            ]
          };

          // Append to existing content
          const updatedContent: JSONContent = {
            ...note.content,
            content: [
              ...(note.content.content || []),
              chatContent
            ]
          };

          // Save the updated note
          await get().saveNote({ content: updatedContent });
        } catch (error) {
          console.error('Failed to save from chat:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to save from chat';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      getNotesForAI: async (query: string): Promise<Note[]> => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // For now, return all notes for the user
          // In the future, this could be enhanced with full-text search
          const { data, error } = await withRetry(async () => {
            return await supabase
              .from('notes')
              .select('*')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false });
          });

          if (error) throw error;

          const notes = (data || []).map(transformDatabaseNote);
          
          // Update local cache
          set((state) => ({
            notes: notes
          }));

          return notes;
        } catch (error) {
          console.error('Failed to get notes for AI:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to get notes for AI';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Enhanced error handling and offline behavior
      syncOfflineChanges: async (): Promise<void> => {
        const state = get();
        const offlineChanges = state.notes.filter(note => 
          note.updatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        );

        if (offlineChanges.length === 0) return;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          for (const note of offlineChanges) {
            try {
              const dbUpdate = transformNoteForDB(note);
              await supabase
                .from('notes')
                .upsert(dbUpdate)
                .eq('id', note.id);
            } catch (error) {
              console.warn(`Failed to sync note ${note.id}:`, error);
            }
          }
        } catch (error) {
          console.warn('Failed to sync offline changes:', error);
        }
      },

      // Check network connectivity and provide user feedback
      checkConnectivity: async (): Promise<boolean> => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ error: 'Connection lost. Changes will be saved locally and synced when connection is restored.' });
            return false;
          }
          return true;
        } catch (error) {
          set({ error: 'Connection lost. Changes will be saved locally and synced when connection is restored.' });
          return false;
        }
      },

      // Retry failed operations
      retryFailedOperations: async (): Promise<void> => {
        const isOnline = await get().checkConnectivity();
        if (isOnline) {
          await get().syncOfflineChanges();
          set({ error: null });
        }
      },
    }),
    {
      name: 'note-store',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            if (!item) return null;
            try {
              const parsed = JSON.parse(item);
              return JSON.stringify({ state: deserializeState(parsed.state) });
            } catch {
              return item;
            }
          } catch (error) {
            console.warn('Failed to get item from localStorage:', error);
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            const parsed = JSON.parse(value);
            const serialized = JSON.stringify({ state: serializeState(parsed.state) });
            localStorage.setItem(name, serialized);
          } catch (error) {
            console.warn('Failed to set item in localStorage:', error);
            try {
              localStorage.setItem(name, value);
            } catch {
              // Silently fail if localStorage is not available
            }
          }
        },
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.warn('Failed to remove item from localStorage:', error);
          }
        }
      })),
      partialize: (state) => ({
        notes: state.notes,
        currentNote: state.currentNote,
        currentContext: state.currentContext,
        // Don't persist loading states and errors
      }),
    }
  ) : (set, get) => ({
    notes: [],
    currentNote: null,
    currentContext: null,
    isLoading: false,
    error: null,
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
    setCurrentContext: () => {},
    getCurrentNote: () => null,
    getOrganizedNotes: () => ({ timetable: [], course: [], session: [] }),
    getPinnedNotes: () => [],
    togglePin: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    loadNote: async (): Promise<Note> => { throw new Error('Not available in SSR'); },
    saveNote: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    deleteNote: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    saveFromChat: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    getNotesForAI: async (): Promise<Note[]> => { throw new Error('Not available in SSR'); },
    syncOfflineChanges: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    checkConnectivity: async (): Promise<boolean> => { throw new Error('Not available in SSR'); },
    retryFailedOperations: async (): Promise<void> => { throw new Error('Not available in SSR'); },
  })
);