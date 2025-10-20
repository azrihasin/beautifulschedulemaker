import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { NoteCard } from "@/lib/types/three-view-notes";

// Local type definition for Excalidraw notes
interface ExcalidrawNote {
  id: string;
  title: string;
  scene_data: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

interface ExcalidrawNoteStore {
  // State
  notes: NoteCard[];
  excalidrawNotes: ExcalidrawNote[]; // Store actual notes separately
  currentNote: ExcalidrawNote | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadNotes: () => Promise<void>;
  loadNote: (noteId: string) => Promise<void>;
  createNote: (title: string, sceneData: any) => Promise<string | null>;
  updateNote: (noteId: string, title: string, sceneData: any) => Promise<ExcalidrawNote | null>;
  deleteNote: (noteId: string) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  
  // Utility
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// Serialization helpers for Date objects
const serializeState = (state: any) => {
  return {
    ...state,
    notes: (state.notes || []).map((n: NoteCard) => ({
      ...n,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
      updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt
    })),
    currentNote: state.currentNote ? {
      ...state.currentNote,
      created_at: state.currentNote.created_at instanceof Date ? state.currentNote.created_at : state.currentNote.created_at,
      updated_at: state.currentNote.updated_at instanceof Date ? state.currentNote.updated_at : state.currentNote.updated_at
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
      created_at: typeof state.currentNote.created_at === 'string' ? state.currentNote.created_at : state.currentNote.created_at,
      updated_at: typeof state.currentNote.updated_at === 'string' ? state.currentNote.updated_at : state.currentNote.updated_at
    } : null
  };
};

export const useExcalidrawNoteStore = create<ExcalidrawNoteStore>()(
  isBrowser ? persist(
    (set, get) => ({
      notes: [],
      excalidrawNotes: [],
      currentNote: null,
      isLoading: false,
      error: null,

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      loadNotes: async (): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          // For local storage, notes are already loaded from persistence
          // Just convert stored excalidrawNotes to NoteCard format
          const { excalidrawNotes } = get();
          const noteCards: NoteCard[] = excalidrawNotes.map(note => ({
            id: note.id,
            title: note.title,
            preview: note.title, // Use title as preview
            lastModified: new Date(note.updated_at),
            tags: []
          }));
          set({ notes: noteCards, isLoading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
          set({ error: errorMessage, isLoading: false });
        }
      },

      loadNote: async (noteId: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { excalidrawNotes } = get();
          const note = excalidrawNotes.find(n => n.id === noteId);
          if (!note) {
            set({ error: 'Note not found', isLoading: false });
            return;
          }
          set({ currentNote: note, isLoading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
          set({ error: errorMessage, isLoading: false });
        }
      },

      createNote: async (title: string, sceneData: any): Promise<string | null> => {
        set({ isLoading: true, error: null });
        try {
          const now = new Date().toISOString();
          const newNote: ExcalidrawNote = {
            id: `excalidraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            scene_data: sceneData,
            created_at: now,
            updated_at: now,
            user_id: 'local_user'
          };
          
          const { excalidrawNotes } = get();
          const updatedNotes = [...excalidrawNotes, newNote];
          
          set({ 
            excalidrawNotes: updatedNotes,
            currentNote: newNote,
            isLoading: false 
          });
          
          // Update notes list
          await get().loadNotes();
          return newNote.id;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
          set({ error: errorMessage, isLoading: false });
          return null;
        }
      },

      updateNote: async (noteId: string, title: string, sceneData: any): Promise<ExcalidrawNote | null> => {
        set({ isLoading: true, error: null });
        try {
          const { excalidrawNotes } = get();
          const noteIndex = excalidrawNotes.findIndex(n => n.id === noteId);
          
          if (noteIndex === -1) {
            set({ error: 'Note not found', isLoading: false });
            return null;
          }
          
          const updatedNote: ExcalidrawNote = {
            ...excalidrawNotes[noteIndex],
            title,
            scene_data: sceneData,
            updated_at: new Date().toISOString()
          };
          
          const updatedNotes = [...excalidrawNotes];
          updatedNotes[noteIndex] = updatedNote;
          
          set({ 
            excalidrawNotes: updatedNotes,
            currentNote: updatedNote,
            isLoading: false 
          });
          
          // Update notes list
          await get().loadNotes();
          return updatedNote;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
          set({ error: errorMessage, isLoading: false });
          return null;
        }
      },

      deleteNote: async (noteId: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { excalidrawNotes, currentNote } = get();
          
          // Remove from excalidraw notes
          const updatedExcalidrawNotes = excalidrawNotes.filter(note => note.id !== noteId);
          
          // Clear current note if it was deleted
          const newCurrentNote = currentNote?.id === noteId ? null : currentNote;
          
          set({ 
            excalidrawNotes: updatedExcalidrawNotes,
            currentNote: newCurrentNote,
            isLoading: false 
          });
          
          // Update notes list
          await get().loadNotes();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
          set({ error: errorMessage, isLoading: false });
        }
      },

      searchNotes: async (query: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { excalidrawNotes } = get();
          
          // Simple text search in local notes
          const filteredNotes = excalidrawNotes.filter(note => {
            const searchText = `${note.title} ${JSON.stringify(note.scene_data)}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
          });
          
          // Convert to NoteCard format
          const noteCards: NoteCard[] = filteredNotes.map(note => ({
            id: note.id,
            title: note.title,
            preview: note.title,
            lastModified: new Date(note.updated_at),
            tags: []
          }));
          
          set({ notes: noteCards, isLoading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to search notes';
          set({ error: errorMessage, isLoading: false });
        }
      },
    }),
    {
      name: 'excalidraw-note-store',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            return item ? deserializeState(JSON.parse(item)) : null;
          } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
          }
        },
        setItem: (name: string, value: any) => {
          try {
            const serializedValue = serializeState(value);
            localStorage.setItem(name, JSON.stringify(serializedValue));
          } catch (error) {
            console.error('Error writing to localStorage:', error);
          }
        },
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('Error removing from localStorage:', error);
          }
        }
      })),
      partialize: (state) => ({
        notes: state.notes,
        excalidrawNotes: state.excalidrawNotes,
        currentNote: state.currentNote,
      }),
    }
  ) : (set, get) => ({
    notes: [],
    excalidrawNotes: [],
    currentNote: null,
    isLoading: false,
    error: null,
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    loadNotes: async () => {},
    loadNote: async (noteId: string) => {},
    createNote: async (title: string, sceneData: any) => null,
    updateNote: async (noteId: string, title: string, sceneData: any) => null,
    deleteNote: async (noteId: string) => {},
    searchNotes: async (query: string) => {},
  })
);