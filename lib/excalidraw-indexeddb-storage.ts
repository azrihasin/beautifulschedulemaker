import { ExcalidrawNote, NoteCard } from '@/lib/types/three-view-notes';

// Local type definition for Excalidraw notes (matching the store)
interface ExcalidrawNoteData {
  id: string;
  title: string;
  scene_data: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

class ExcalidrawIndexedDBStorage {
  private dbName = 'excalidraw-notes-app';
  private version = 1;
  private db: IDBDatabase | null = null;
  private storeName = 'excalidraw_notes';

  async init(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB for Excalidraw notes:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('IndexedDB not available');
    }
    return this.db;
  }

  async getAllNotes(): Promise<ExcalidrawNoteData[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getNoteById(id: string): Promise<ExcalidrawNoteData | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async createNote(title: string, sceneData: any): Promise<ExcalidrawNoteData> {
    const db = await this.ensureDB();
    
    const now = new Date().toISOString();
    const newNote: ExcalidrawNoteData = {
      id: `excalidraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      scene_data: sceneData,
      created_at: now,
      updated_at: now,
      user_id: 'local_user'
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(newNote);

      request.onsuccess = () => {
        resolve(newNote);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateNote(noteId: string, updates: Partial<ExcalidrawNoteData>): Promise<ExcalidrawNoteData | null> {
    const db = await this.ensureDB();
    
    return new Promise(async (resolve, reject) => {
      try {
        const existingNote = await this.getNoteById(noteId);
        if (!existingNote) {
          reject(new Error(`Note with id ${noteId} not found`));
          return;
        }

        const updatedNote: ExcalidrawNoteData = {
          ...existingNote,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(updatedNote);

        request.onsuccess = () => {
          resolve(updatedNote);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(noteId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async searchNotes(query: string): Promise<ExcalidrawNoteData[]> {
    const allNotes = await this.getAllNotes();
    
    if (!query.trim()) {
      return allNotes;
    }

    const searchTerm = query.toLowerCase();
    
    return allNotes.filter(note => {
      // Search in title
      const matchesTitle = note.title.toLowerCase().includes(searchTerm);
      
      // Search in scene data (basic text search)
      const sceneText = JSON.stringify(note.scene_data).toLowerCase();
      const matchesScene = sceneText.includes(searchTerm);
      
      return matchesTitle || matchesScene;
    });
  }

  async clearAllNotes(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Helper method to convert notes to NoteCard format
  convertToNoteCards(notes: ExcalidrawNoteData[]): NoteCard[] {
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      preview: note.title, // Using title as preview for simplicity
      colorAccent: '#3b82f6', // Default blue color
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
    }));
  }
}

export const excalidrawIndexedDBStorage = new ExcalidrawIndexedDBStorage();