import { create } from "zustand";
import { NoteCard } from "@/lib/types/three-view-notes";
import { excalidrawIndexedDBStorage } from '../lib/excalidraw-indexeddb-storage';

// Local type definition for Excalidraw notes
interface ExcalidrawNote {
  id: string;
  title: string;
  scene_data: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

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
  createNoteFromInput: (title: string, input: string | object) => Promise<string | null>;
  updateNote: (noteId: string, updates: Partial<ExcalidrawNote>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  
  // Utility
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}



export const useExcalidrawNoteStore = create<ExcalidrawNoteStore>()((set, get) => ({
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
      await excalidrawIndexedDBStorage.init();
      const notes = await excalidrawIndexedDBStorage.getAllNotes();
      
      // Convert to NoteCard format
      const noteCards: NoteCard[] = excalidrawIndexedDBStorage.convertToNoteCards(notes);
      
      set({ 
        notes: noteCards,
        excalidrawNotes: notes,
        isLoading: false 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      set({ error: errorMessage, isLoading: false });
    }
  },

  loadNote: async (noteId: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const note = await excalidrawIndexedDBStorage.getNoteById(noteId);
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
      const newNote = await excalidrawIndexedDBStorage.createNote(title, sceneData);
      
      set({ 
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

  createNoteFromInput: async (title: string, input: string | object): Promise<string | null> => {
    set({ isLoading: true, error: null });
    try {
      let sceneData: any;

      if (typeof input === 'string') {
        try {
          sceneData = JSON.parse(input);
          if (!sceneData.elements || !Array.isArray(sceneData.elements)) {
            sceneData = {
              elements: [{
                type: "text",
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                id: `text_${Date.now()}`,
                fillStyle: "solid",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 1,
                opacity: 100,
                angle: 0,
                x: 100,
                y: 100,
                strokeColor: "#1e1e1e",
                backgroundColor: "transparent",
                width: 200,
                height: 25,
                seed: Math.floor(Math.random() * 1000000),
                groupIds: [],
                frameId: null,
                roundness: null,
                boundElements: [],
                updated: 1,
                link: null,
                locked: false,
                fontSize: 20,
                fontFamily: 1,
                text: input,
                textAlign: "left",
                verticalAlign: "top",
                containerId: null,
                originalText: input,
                lineHeight: 1.25
              }],
              appState: {
                gridSize: null,
                viewBackgroundColor: "#ffffff"
              },
              files: {}
            };
          }
        } catch (parseError) {
          sceneData = {
            elements: [{
              type: "text",
              version: 1,
              versionNonce: Math.floor(Math.random() * 1000000),
              isDeleted: false,
              id: `text_${Date.now()}`,
              fillStyle: "solid",
              strokeWidth: 1,
              strokeStyle: "solid",
              roughness: 1,
              opacity: 100,
              angle: 0,
              x: 100,
              y: 100,
              strokeColor: "#1e1e1e",
              backgroundColor: "transparent",
              width: 200,
              height: 25,
              seed: Math.floor(Math.random() * 1000000),
              groupIds: [],
              frameId: null,
              roundness: null,
              boundElements: [],
              updated: 1,
              link: null,
              locked: false,
              fontSize: 20,
              fontFamily: 1,
              text: input,
              textAlign: "left",
              verticalAlign: "top",
              containerId: null,
              originalText: input,
              lineHeight: 1.25
            }],
            appState: {
              gridSize: null,
              viewBackgroundColor: "#ffffff"
            },
            files: {}
          };
        }
      } else {
        sceneData = input;
        if (!sceneData.elements || !Array.isArray(sceneData.elements)) {
          throw new Error('Invalid Excalidraw JSON: missing or invalid elements array');
        }
      }

      const newNote = await excalidrawIndexedDBStorage.createNote(title, sceneData);
      
      set({ 
        currentNote: newNote,
        isLoading: false 
      });
      
      await get().loadNotes();
      return newNote.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note from input';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  updateNote: async (noteId: string, updates: Partial<ExcalidrawNote>): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const updatedNote = await excalidrawIndexedDBStorage.updateNote(noteId, updates);
      
      if (!updatedNote) {
        set({ error: 'Note not found', isLoading: false });
        return;
      }
      
      set({ 
        currentNote: updatedNote,
        isLoading: false 
      });
      
      // Update notes list
      await get().loadNotes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      set({ error: errorMessage, isLoading: false });
    }
  },

  deleteNote: async (noteId: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await excalidrawIndexedDBStorage.deleteNote(noteId);
      
      set({ 
        currentNote: null,
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
      const filteredNotes = await excalidrawIndexedDBStorage.searchNotes(query);
      
      // Convert to NoteCard format
      const noteCards: NoteCard[] = excalidrawIndexedDBStorage.convertToNoteCards(filteredNotes);
      
      set({ notes: noteCards, isLoading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search notes';
      set({ error: errorMessage, isLoading: false });
    }
  },
}));