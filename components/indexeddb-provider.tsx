"use client";

import { useEffect } from "react";
import { backgroundImageStorage } from "../lib/indexeddb-storage";
import { useSettingsStore } from "../stores/settingsStore";

interface IndexedDBProviderProps {
  children: React.ReactNode;
}

export function IndexedDBProvider({ children }: IndexedDBProviderProps) {
  const loadBackgroundImage = useSettingsStore((state) => state.loadBackgroundImage);

  useEffect(() => {
    const initializeIndexedDB = async () => {
      try {
        await backgroundImageStorage.init();
        // Load background image from IndexedDB after initialization
        await loadBackgroundImage();
      } catch (error) {
        console.error("Failed to initialize IndexedDB for background images:", error);
      }
    };

    initializeIndexedDB();
  }, [loadBackgroundImage]);

  return <>{children}</>;
}