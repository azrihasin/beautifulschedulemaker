import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// IndexedDB storage removed - no longer needed
import type { SidebarStore } from "./types";

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export const useSidebarStore = create<SidebarStore>()(
  isBrowser ? persist(
    (set, get) => ({
      isCollapsed: false,
      expandedTimetables: new Set<string>(),

      toggleSidebar: () =>
        set((state) => ({
          isCollapsed: !state.isCollapsed,
        })),

      toggleTimetable: (id: string) => {
        const { expandedTimetables } = get();
        const newExpanded = new Set(expandedTimetables);
        
        if (newExpanded.has(id)) {
          newExpanded.delete(id);
        } else {
          newExpanded.add(id);
        }
        
        set({ expandedTimetables: newExpanded });
      },

      expandTimetable: (id: string) => {
        const { expandedTimetables } = get();
        const newExpanded = new Set(expandedTimetables);
        newExpanded.add(id);
        set({ expandedTimetables: newExpanded });
      },

      collapseTimetable: (id: string) => {
        const { expandedTimetables } = get();
        const newExpanded = new Set(expandedTimetables);
        newExpanded.delete(id);
        set({ expandedTimetables: newExpanded });
      },
    }),
    {
      name: 'sidebar-store',
      storage: createJSONStorage(() => localStorage),
      // Custom serialization for Set objects
      partialize: (state) => ({
        ...state,
        expandedTimetables: Array.from(state.expandedTimetables),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure expandedTimetables is always a Set
          if (Array.isArray(state.expandedTimetables)) {
            state.expandedTimetables = new Set(state.expandedTimetables);
          } else if (!(state.expandedTimetables instanceof Set)) {
            state.expandedTimetables = new Set();
          }
        }
      },
    }
  ) : (set, get) => ({
    isCollapsed: false,
    expandedTimetables: new Set<string>(),

    toggleSidebar: () =>
      set((state) => ({
        isCollapsed: !state.isCollapsed,
      })),

    toggleTimetable: (id: string) => {
      const { expandedTimetables } = get();
      const newExpanded = new Set(expandedTimetables);
      
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      
      set({ expandedTimetables: newExpanded });
    },

    expandTimetable: (id: string) => {
      const { expandedTimetables } = get();
      const newExpanded = new Set(expandedTimetables);
      newExpanded.add(id);
      set({ expandedTimetables: newExpanded });
    },

    collapseTimetable: (id: string) => {
      const { expandedTimetables } = get();
      const newExpanded = new Set(expandedTimetables);
      newExpanded.delete(id);
      set({ expandedTimetables: newExpanded });
    },
  })
);