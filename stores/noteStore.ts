import { create } from "zustand";
import { noteIndexedDBStorage } from '../lib/note-indexeddb-storage';

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



export const useNoteStore = create<NoteStore>()(
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
      getOrganizedNotes: async (timetableId: string) => {
        try {
          const notes = await noteIndexedDBStorage.getNotesByTimetable(timetableId);
          
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
        } catch (error) {
          console.error('Failed to get organized notes:', error);
          return {
            timetable: [],
            course: [],
            session: []
          };
        }
      },

      // Get pinned notes for quick access
      getPinnedNotes: async (timetableId: string) => {
        try {
          return await noteIndexedDBStorage.getPinnedNotes(timetableId);
        } catch (error) {
          console.error('Failed to get pinned notes:', error);
          return [];
        }
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
          // Find existing note based on context using IndexedDB
          const existingNotes = await noteIndexedDBStorage.getNotesByContext(context);

          let note: Note;

          if (existingNotes.length > 0) {
            note = existingNotes[0];
          } else {
            // Create a new note using IndexedDB
            note = {
              id: generateId(),
              userId: 'local-user',
              timetableId: context.timetableId,
              courseId: context.courseId,
              sessionId: context.sessionId,
              content: createEmptyContent(),
              isPinned: false,
              tags: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Save to IndexedDB and get the created note
            note = await noteIndexedDBStorage.createNote(note);
          }

          // Update local state
          const allNotes = await noteIndexedDBStorage.getAllNotes();
          set({
            notes: allNotes,
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

          // Save to IndexedDB
          await noteIndexedDBStorage.updateNote(currentNote.id, updatedNote);

          // Update local state
          const allNotes = await noteIndexedDBStorage.getAllNotes();
          set({
            notes: allNotes,
            currentNote: updatedNote
          });
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
          // Delete from IndexedDB
          await noteIndexedDBStorage.deleteNote(id);

          // Update local state
          const allNotes = await noteIndexedDBStorage.getAllNotes();
          const currentNote = get().currentNote;
          set({
            notes: allNotes,
            currentNote: currentNote?.id === id ? null : currentNote
          });
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
          // Use IndexedDB search functionality
          const searchResults = await noteIndexedDBStorage.searchNotes(query);
          return searchResults;
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
    })
);