// IndexedDB storage for background images only

interface BackgroundImageData {
  id: string;
  data: string; // base64 encoded image data
  timestamp: number;
}

class IndexedDBStorage {
  private dbName = 'timetable-app';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') {
      return; // Skip initialization on server side
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create background images store
        if (!db.objectStoreNames.contains('backgroundImages')) {
          const store = db.createObjectStore('backgroundImages', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveBackgroundImage(userId: string, imageData: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundImages'], 'readwrite');
      const store = transaction.objectStore('backgroundImages');
      
      const data: BackgroundImageData = {
        id: userId,
        data: imageData,
        timestamp: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBackgroundImage(userId: string): Promise<string | null> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundImages'], 'readonly');
      const store = transaction.objectStore('backgroundImages');
      const request = store.get(userId);

      request.onsuccess = () => {
        const result = request.result as BackgroundImageData | undefined;
        resolve(result?.data || null);
      };
      
      request.onerror = () => {
        console.error('Failed to get background image:', request.error);
        resolve(null); // Return null on error instead of rejecting
      };
    });
  }

  async removeBackgroundImage(userId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundImages'], 'readwrite');
      const store = transaction.objectStore('backgroundImages');
      const request = store.delete(userId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Storage interface compatibility for Zustand (not used for background images)
  getItem(name: string): string | null {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  }

  setItem(name: string, value: string): void {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  removeItem(name: string): void {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
}

// Create singleton instance
export const indexedDBStorage = new IndexedDBStorage();

// Background image storage interface
export const backgroundImageStorage = {
  init: () => indexedDBStorage.init(),
  saveImage: (id: string, data: string) => indexedDBStorage.saveBackgroundImage(id, data),
  getImage: async (id: string) => {
    const data = await indexedDBStorage.getBackgroundImage(id);
    return data ? { data } : null;
  },
  removeImage: (id: string) => indexedDBStorage.removeBackgroundImage(id)
};

// Initialize on import (browser only)
if (typeof window !== 'undefined') {
  indexedDBStorage.init().catch(console.error);
}