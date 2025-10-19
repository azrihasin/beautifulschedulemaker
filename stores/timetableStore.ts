import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { TimetableStore, Timetable, CourseWithSessions } from "./types";
import { UIMessage } from "ai";
import {
  persist,
  createPersistConfig,
} from "../lib/zustand-indexeddb-persistence";

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, get) => ({
      timetables: [],
      activeTimetableId: null,
      isLoading: false,
      error: null,

      addTimetable: (): Timetable => {
        const { timetables } = get();
        const timetableCount = timetables.length + 1;
        const name = `Timetable ${timetableCount}`;

        const newTimetable: Timetable = {
          id: uuidv4(),
          name,
          userId: "local-user",
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
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
