import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { TimetableStore, Timetable, CourseWithSessions } from "./types";
import { UIMessage } from "ai";
import {
  persist,
  createPersistConfig,
} from "../lib/zustand-indexeddb-persistence";
import { useSettingsStore } from "./settingsStore";

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, get) => ({
      timetables: [],
      activeTimetableId: null,
      isLoading: false,
      error: null,

      addTimetable: (): Timetable => {
        const { timetables, activeTimetableId, getTimetable } = get();
        const timetableCount = timetables.length + 1;
        const name = `Timetable ${timetableCount}`;

        // Get default background settings from settings store
        const settingsState = useSettingsStore.getState();
        let defaultBackgroundSettings = {
          backgroundImage: settingsState.backgroundImage || "/wallpaper.jpeg",
          backgroundSize: settingsState.backgroundSize || 300,
          backgroundPositionX: settingsState.backgroundPositionX || 50,
          backgroundPositionY: settingsState.backgroundPositionY || 50,
          backgroundRotation: settingsState.backgroundRotation || 0,
        };

        // If there's an active timetable, use its settings as priority over global defaults
        if (activeTimetableId) {
          const activeTimetable = getTimetable(activeTimetableId);
          if (activeTimetable) {
            defaultBackgroundSettings = {
              backgroundImage: activeTimetable.backgroundImage || defaultBackgroundSettings.backgroundImage,
              backgroundSize: activeTimetable.backgroundSize || defaultBackgroundSettings.backgroundSize,
              backgroundPositionX: activeTimetable.backgroundPositionX || defaultBackgroundSettings.backgroundPositionX,
              backgroundPositionY: activeTimetable.backgroundPositionY || defaultBackgroundSettings.backgroundPositionY,
              backgroundRotation: activeTimetable.backgroundRotation || defaultBackgroundSettings.backgroundRotation,
            };
          }
        }

        const newTimetable: Timetable = {
          id: uuidv4(),
          name,
          userId: "local-user",
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          ...defaultBackgroundSettings,
        };

        set((state) => ({
          timetables: [...state.timetables, newTimetable],
          activeTimetableId: newTimetable.id,
        }));

        return newTimetable;
      },

      setActiveTimetable: (id: string) => {
        set({ activeTimetableId: id });
      },

      updateTimetable: (updatedTimetable: Timetable) =>
        set((state) => ({
          timetables: state.timetables.map((timetable) =>
            timetable.id === updatedTimetable.id ? updatedTimetable : timetable
          ),
        })),

      getTimetable: (id: string): Timetable | undefined => {
        const { timetables } = get();
        return timetables.find((t) => t.id === id);
      },

      updateMany: (
        updates: Array<{
          id: string;
          updates: Partial<Omit<Timetable, "id" | "createdAt" | "courses">>;
        }>
      ): void => {
        const { updateTimetable, getTimetable } = get();
        updates.forEach(({ id, updates: timetableUpdates }) => {
          try {
            const timetable = getTimetable(id);
            if (timetable) {
              updateTimetable({
                ...timetable,
                ...timetableUpdates,
                updatedAt: new Date(),
              });
            }
          } catch (error) {
            console.error(`Failed to update timetable ${id}:`, error);
          }
        });
      },

      deleteTimetable: (id: string): void => {
        set((state) => {
          const filteredTimetables = state.timetables.filter(
            (t) => t.id !== id
          );
          let newActiveTimetableId = state.activeTimetableId;

          if (state.activeTimetableId === id) {
            newActiveTimetableId =
              filteredTimetables.length > 0 ? filteredTimetables[0].id : null;
          }

          return {
            timetables: filteredTimetables,
            activeTimetableId: newActiveTimetableId,
          };
        });
      },

      getTimetables: (): Timetable[] => {
        const { timetables } = get();
        return timetables;
      },

      getActiveTimetableId: (): string | null => {
        const { activeTimetableId } = get();
        return activeTimetableId;
      },

      // Background image methods
      setTimetableBackgroundImage: (timetableId: string, backgroundImage: string | null) => {
        const { updateTimetable, getTimetable } = get();
        const timetable = getTimetable(timetableId);
        if (timetable) {
          updateTimetable({
            ...timetable,
            backgroundImage,
            updatedAt: new Date(),
          });
        }
      },

      setTimetableBackgroundSize: (timetableId: string, backgroundSize: number) => {
        const { updateTimetable, getTimetable } = get();
        const timetable = getTimetable(timetableId);
        if (timetable) {
          updateTimetable({
            ...timetable,
            backgroundSize,
            updatedAt: new Date(),
          });
        }
      },

      setTimetableBackgroundPositionX: (timetableId: string, backgroundPositionX: number) => {
        const { updateTimetable, getTimetable } = get();
        const timetable = getTimetable(timetableId);
        if (timetable) {
          updateTimetable({
            ...timetable,
            backgroundPositionX,
            updatedAt: new Date(),
          });
        }
      },

      setTimetableBackgroundPositionY: (timetableId: string, backgroundPositionY: number) => {
        const { updateTimetable, getTimetable } = get();
        const timetable = getTimetable(timetableId);
        if (timetable) {
          updateTimetable({
            ...timetable,
            backgroundPositionY,
            updatedAt: new Date(),
          });
        }
      },

      setTimetableBackgroundRotation: (timetableId: string, backgroundRotation: number) => {
        const { updateTimetable, getTimetable } = get();
        const timetable = getTimetable(timetableId);
        if (timetable) {
          updateTimetable({
            ...timetable,
            backgroundRotation,
            updatedAt: new Date(),
          });
        }
      },

      getActiveTimetableBackground: () => {
        const { activeTimetableId, getTimetable } = get();
        if (!activeTimetableId) return null;
        
        const timetable = getTimetable(activeTimetableId);
        if (!timetable) return null;

        return {
          backgroundImage: timetable.backgroundImage || null,
          backgroundSize: timetable.backgroundSize || 300,
          backgroundPositionX: timetable.backgroundPositionX || 50,
          backgroundPositionY: timetable.backgroundPositionY || 50,
          backgroundRotation: timetable.backgroundRotation || 0,
        };
      },
    }),
    createPersistConfig("timetables", {
      partialize: (state) => ({
        timetables: state.timetables,
        activeTimetableId: state.activeTimetableId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.timetables.length > 0 && !state.activeTimetableId) {
          state.activeTimetableId = state.timetables[0].id;
        }
      },
    })
  )
);
