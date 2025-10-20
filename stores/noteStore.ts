import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { 
  Note, 
  NoteContext, 
  NoteStore, 
  JSONContent 
} from "./types";

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Helper function to generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
        const { notes } = get();
        set({ isLoading: true, error: null, currentContext: context });

        try {
          // Find existing note based on context
          const existingNote = notes.find(note => 
            note.timetableId === context.timetableId &&
            note.courseId === context.courseId &&
            note.sessionId === context.sessionId
          );

          let note: Note;

          if (existingNote) {
            note = existingNote;
          } else {
            // Create a new note locally
            note = {
              id: generateId(),
              userId: 'local-user', // Since we don't have auth, use a placeholder
              timetableId: context.timetableId,
              courseId: context.courseId,
              sessionId: context.sessionId,
              content: createEmptyContent(),
              isPinned: false,
              tags: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Add to local state
            set(state => ({
              notes: [...state.notes, note],
              currentNote: note,
              currentContext: context,
              isLoading: false
            }));
          }

          set({
            currentNote: note,
            currentContext: context,
            isLoading: false
          });

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
          const currentNote = get().currentNote;
          if (!currentNote) {
            throw new Error('No current note to save');
          }

          const updatedNote: Note = {
            ...currentNote,
            ...noteUpdate,
            updatedAt: new Date()
          };

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
          const { notes } = get();
          // Simple text search in local notes
          const filteredNotes = notes.filter(note => {
            const contentText = JSON.stringify(note.content).toLowerCase();
            return contentText.includes(query.toLowerCase());
          });
          return filteredNotes.slice(0, 10); // Limit to 10 results
        } catch (error) {
          console.error('Failed to get notes for AI:', error);
          return [];
        }
      },

      // Offline support methods (simplified for local storage)
      syncOfflineChanges: async (): Promise<void> => {
        // No-op for local storage
        console.log('Local storage - no sync needed');
      },

      // Check connectivity (always true for local storage)
      checkConnectivity: async (): Promise<boolean> => {
        return true;
      },

      // Retry failed operations (no-op for local storage)
      retryFailedOperations: async (): Promise<void> => {
        // No-op for local storage
        console.log('Local storage - no retry needed');
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