import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { 
  loadUserNotes, 
  loadNoteById, 
  saveNote, 
  deleteNote as deleteNoteFromDB,
  searchNotes
} from "@/lib/supabase/excalidraw-notes";
import { NoteCard } from "@/lib/types/three-view-notes";
import { ExcalidrawNote } from "@/lib/supabase/database.types";

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

interface ExcalidrawNoteStore {
  // State
  notes: NoteCard[];
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
      currentNote: null,
      isLoading: false,
      error: null,

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      loadNotes: async (): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await loadUserNotes();
          if (error) {
            set({ error, isLoading: false });
            return;
          }
          set({ notes: data || [], isLoading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
          set({ error: errorMessage, isLoading: false });
        }
      },

      loadNote: async (noteId: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await loadNoteById(noteId);
          if (error) {
            set({ error, isLoading: false });
            return;
          }
          set({ currentNote: data, isLoading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
          set({ error: errorMessage, isLoading: false });
        }
      },

      createNote: async (title: string, sceneData: any): Promise<string | null> => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await saveNote(null, title, sceneData);
          if (error) {
            set({ error, isLoading: false });
            return null;
          }
          
          // Refresh notes list
          await get().loadNotes();
          set({ currentNote: data, isLoading: false });
          return data?.id || null;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
          set({ error: errorMessage, isLoading: false });
          return null;
        }
      },

      updateNote: async (noteId: string, title: string, sceneData: any): Promise<ExcalidrawNote | null> => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await saveNote(noteId, title, sceneData);
          if (error) {
            set({ error, isLoading: false });
            return null;
          }
          
          // Refresh notes list
          await get().loadNotes();
          set({ currentNote: data, isLoading: false });
          return data;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
          set({ error: errorMessage, isLoading: false });
          return null;
        }
      },

      deleteNote: async (noteId: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await deleteNoteFromDB(noteId);
          if (error) {
            set({ error, isLoading: false });
            return;
          }
          
          // Remove from local state
          const currentNotes = get().notes;
          const updatedNotes = currentNotes.filter(note => note.id !== noteId);
          
          // Clear current note if it was deleted
          const currentNote = get().currentNote;
          const newCurrentNote = currentNote?.id === noteId ? null : currentNote;
          
          set({ 
            notes: updatedNotes, 
            currentNote: newCurrentNote,
            isLoading: false 
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
          set({ error: errorMessage, isLoading: false });
        }
      },

      searchNotes: async (query: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await searchNotes(query);
          if (error) {
            set({ error, isLoading: false });
            return;
          }
          set({ notes: data || [], isLoading: false });
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
        currentNote: state.currentNote,
      }),
    }
  ) : (set, get) => ({
    notes: [],
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