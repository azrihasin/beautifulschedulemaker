import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { CourseSession, CourseWithSessions } from "./types";
import type { CourseWithSessionsInput } from "../lib/supabase/database.types";
import { persist, createPersistConfig } from "../lib/zustand-indexeddb-persistence";

interface CourseStore {
  courses: CourseWithSessions[];
  isLoading: boolean;
  error: string | null;
  
  addCourse: (timetableId: string, course: CourseWithSessionsInput) => CourseWithSessions;
  addCoursesBulk: (timetableId: string, courses: CourseWithSessionsInput[]) => CourseWithSessions[];
  deleteCourse: (timetableId: string, courseCode: string) => void;
  updateCourse: (timetableId: string, courseId: string, updates: Partial<CourseWithSessions>) => void;
  getCourses: (timetableId: string) => CourseWithSessions[];
  resetCourses: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const createCourse = (course: Omit<CourseWithSessions, 'id' | 'createdAt' | 'updatedAt'>): CourseWithSessions => ({
  ...course,
  id: uuidv4(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      courses: [],
      isLoading: false,
      error: null,

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      getCourses: (timetableId: string): CourseWithSessions[] => {
        const { courses } = get();
        return courses.filter(course => course.timetable_id === timetableId);
      },

      addCourse: (timetableId: string, course: CourseWithSessionsInput): CourseWithSessions => {
        set({ isLoading: true, error: null });
        
        const courseWithSessionIds = {
          ...course,
          timetable_id: timetableId,
          sessions: course.sessions.map(session => ({
            ...session,
            session_id: session.session_id || uuidv4()
          }))
        };

        const newCourse = createCourse(courseWithSessionIds);
        set((state) => ({ 
          courses: [...state.courses, newCourse],
          isLoading: false 
        }));

        return newCourse;
      },

      addCoursesBulk: (timetableId: string, courses: CourseWithSessionsInput[]): CourseWithSessions[] => {
        set({ isLoading: true, error: null });
        
        try {
          const newCourses = courses.map(course => {
            const courseWithSessionIds = {
              ...course,
              timetable_id: timetableId,
              sessions: course.sessions.map(session => ({
                ...session,
                session_id: session.session_id || uuidv4()
              }))
            };
            return createCourse(courseWithSessionIds);
          });

          set((state) => ({ 
            courses: [...state.courses, ...newCourses],
            isLoading: false 
          }));

          return newCourses;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add courses in bulk',
            isLoading: false 
          });
          return [];
        }
      },

      updateCourse: (timetableId: string, courseId: string, updates: Partial<CourseWithSessions>): void => {
        set({ isLoading: true, error: null });
        
        set((state) => ({
          courses: state.courses.map((course) =>
            course.code === courseId && course.timetable_id === timetableId
              ? { ...course, ...updates, updatedAt: new Date() }
              : course
          ),
          isLoading: false
        }));
      },

      deleteCourse: (timetableId: string, courseCode: string): void => {
        set((state) => ({
          courses: state.courses.filter((course) => 
            !(course.code === courseCode && course.timetable_id === timetableId)
          ),
          isLoading: false,
          error: null
        }));
      },

      resetCourses: (): void => {
        set({ isLoading: true, error: null });
        set({ courses: [], isLoading: false });
      },
    }),
    createPersistConfig("courses", {
      partialize: (state) => ({ courses: state.courses }),
    })
  )
);
