import { create } from "zustand";
import { persist, createPersistConfig } from "../lib/zustand-indexeddb-persistence";
import type { SidebarStore } from "./types";

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      expandedTimetables: new Set<string>(),

      toggleSidebar: () =>
        set((state) => ({
          isCollapsed: !state.isCollapsed,
        })),

      toggleTimetable: (id: string) => {
        const { expandedTimetables } = get();
        if (expandedTimetables.has(id)) {
          const newExpanded = new Set(expandedTimetables);
          newExpanded.delete(id);
          set({ expandedTimetables: newExpanded });
        } else {
          const newExpanded = new Set(expandedTimetables);
          newExpanded.add(id);
          set({ expandedTimetables: newExpanded });
        }
      },

      expandTimetable: (id: string) => {
        const { expandedTimetables } = get();
        if (!expandedTimetables.has(id)) {
          const newExpanded = new Set(expandedTimetables);
          newExpanded.add(id);
          set({ expandedTimetables: newExpanded });
        }
      },

      collapseTimetable: (id: string) => {
        const { expandedTimetables } = get();
        if (expandedTimetables.has(id)) {
          const newExpanded = new Set(expandedTimetables);
          newExpanded.delete(id);
          set({ expandedTimetables: newExpanded });
        }
      },
    }),
    createPersistConfig("settings", {
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        expandedTimetables: state.expandedTimetables,
      }),
    })
  )
);