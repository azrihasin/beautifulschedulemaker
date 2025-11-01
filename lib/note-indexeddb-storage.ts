import { Note, NoteContext } from '../stores/types';

class NoteIndexedDBStorage {
  private dbName = 'notes-app';
  private version = 1;
  private db: IDBDatabase | null = null;
  private storeName = 'notes';

  async init(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB for notes:', request.error);
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
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('timetableId', 'timetableId', { unique: false });
          store.createIndex('courseId', 'courseId', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('isPinned', 'isPinned', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          
          // Compound indexes for context queries
          store.createIndex('timetable_context', ['timetableId', 'courseId', 'sessionId'], { unique: false });
          store.createIndex('pinned_timetable', ['isPinned', 'timetableId'], { unique: false });
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

  private serializeNote(note: Partial<Note>): any {
    return {
      ...note,
      createdAt: note.createdAt ? note.createdAt.getTime() : undefined,
      updatedAt: note.updatedAt ? note.updatedAt.getTime() : undefined,
    };
  }

  private deserializeNote(data: any): Note {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  async getAllNotes(): Promise<Note[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const notes = request.result.map(data => this.deserializeNote(data));
        resolve(notes);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getNoteById(id: string): Promise<Note | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          resolve(this.deserializeNote(request.result));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getNotesByContext(context: NoteContext): Promise<Note[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timetable_context');
      
      const keyRange = IDBKeyRange.only([
        context.timetableId,
        context.courseId || null,
        context.sessionId || null
      ]);
      
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const notes = request.result.map(data => this.deserializeNote(data));
        resolve(notes);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const db = await this.ensureDB();
    
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(this.serializeNote(newNote));

      request.onsuccess = () => {
        resolve(newNote);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const db = await this.ensureDB();
    
    return new Promise(async (resolve, reject) => {
      try {
        const existingNote = await this.getNoteById(id);
        if (!existingNote) {
          reject(new Error(`Note with id ${id} not found`));
          return;
        }

        const updatedNote: Note = {
          ...existingNote,
          ...updates,
          id,
          updatedAt: new Date(),
        };

        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(this.serializeNote(updatedNote));

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

  async deleteNote(id: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async searchNotes(query: string): Promise<Note[]> {
    const allNotes = await this.getAllNotes();
    
    if (!query.trim()) {
      return allNotes;
    }

    const searchTerm = query.toLowerCase();
    
    return allNotes.filter(note => {
      // Search in content (assuming it's JSON with text)
      const contentText = this.extractTextFromContent(note.content);
      const matchesContent = contentText.toLowerCase().includes(searchTerm);
      
      // Search in tags
      const matchesTags = note.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      
      return matchesContent || matchesTags;
    });
  }

  private extractTextFromContent(content: any): string {
    if (!content) return '';
    
    if (typeof content === 'string') {
      return content;
    }
    
    if (content.content && Array.isArray(content.content)) {
      return content.content
        .map((node: any) => this.extractTextFromContent(node))
        .join(' ');
    }
    
    if (content.text) {
      return content.text;
    }
    
    return '';
  }

  async getNotesByTimetable(timetableId: string): Promise<Note[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timetableId');
      const request = index.getAll(timetableId);

      request.onsuccess = () => {
        const notes = request.result.map(data => this.deserializeNote(data));
        resolve(notes);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getPinnedNotes(timetableId: string): Promise<Note[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('pinned_timetable');
      const keyRange = IDBKeyRange.only([true, timetableId]);
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const notes = request.result.map(data => this.deserializeNote(data));
        resolve(notes);
      };

      request.onerror = () => {
        reject(request.error);
      };
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
}

export const noteIndexedDBStorage = new NoteIndexedDBStorage();