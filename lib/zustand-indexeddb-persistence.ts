import { StateCreator } from "zustand";

const DB_NAME = "beautiful-schedule-maker";
const DB_VERSION = 1;
const STORES = {
  TIMETABLES: "timetables",
  COURSES: "courses", 
  CHATS: "chats",
  SETTINGS: "settings"
};

interface PersistOptions {
  name: string;
  debounceMs?: number;
  serialize?: (state: any) => string;
  deserialize?: (str: string) => any;
  partialize?: (state: any) => any;
  onRehydrateStorage?: () => (state: any) => void;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private get isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
  }

  async init(): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('IndexedDB is not available');
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        });
      };
    });

    return this.initPromise;
  }

  async getItem(storeName: string, key: string): Promise<any> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async setItem(storeName: string, key: string, value: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async removeItem(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const dbManager = new IndexedDBManager();

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const persist = <T>(
  config: StateCreator<T>,
  options: PersistOptions
) => {
  const {
    name,
    debounceMs = 300,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    partialize = (state: T) => state,
    onRehydrateStorage,
  } = options;

  const storeName = STORES[name.toUpperCase() as keyof typeof STORES] || name;

  return (set: any, get: any, api: any) => {
    const originalSet = set;
    let isHydrated = false;
    let hasHydrationError = false;

    const debouncedSave = debounce(async (state: T) => {
      if (!isHydrated || hasHydrationError) return;
      
      try {
        const stateToSave = partialize(state);
        const serializedState = serialize(stateToSave);
        await dbManager.setItem(storeName, "state", serializedState);
      } catch (error) {
        console.error(`Failed to persist ${name} state:`, error);
      }
    }, debounceMs);

    const persistedSet = (partial: any, replace?: boolean) => {
      const result = originalSet(partial, replace);
      const currentState = get();
      debouncedSave(currentState);
      return result;
    };

    const storeApi = config(persistedSet, get, api);

    const hydrate = async () => {
      if (typeof window === 'undefined') {
        isHydrated = true;
        return;
      }
      
      try {
        const persistedState = await dbManager.getItem(storeName, "state");
        if (persistedState) {
          const deserializedState = deserialize(persistedState);
          // Merge with existing state instead of replacing to preserve functions
          originalSet((currentState: T) => ({
            ...currentState,
            ...deserializedState
          }), false);
        }
        isHydrated = true;
        
        // Call onRehydrateStorage callback if provided
        if (onRehydrateStorage) {
          const callback = onRehydrateStorage();
          if (callback) {
            callback(get());
          }
        }
      } catch (error) {
        console.error(`Failed to hydrate ${name} state:`, error);
        hasHydrationError = true;
        isHydrated = true;
      }
    };

    // Only hydrate on client side
    if (typeof window !== 'undefined') {
      hydrate();
    } else {
      isHydrated = true;
    }

    return {
      ...storeApi,
      _persist: {
        rehydrate: hydrate,
        hasHydrated: () => isHydrated,
        clearStorage: () => dbManager.removeItem(storeName, "state"),
      },
    };
  };
};

export const createPersistConfig = (name: string, options: Partial<PersistOptions> = {}) => ({
  name,
  debounceMs: 300,
  serialize: (state: any) => JSON.stringify(state, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) };
    }
    return value;
  }),
  deserialize: (str: string) => JSON.parse(str, (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    if (value && typeof value === 'object' && value.__type === 'Set') {
      return new Set(value.value);
    }
    // Handle legacy date strings (for backward compatibility)
    if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  }),
  ...options,
});