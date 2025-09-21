import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

// Local types for courses (no database dependency)
export interface CourseSession {
  session_id: string;
  day: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface CourseWithSessions {
  id: string;
  code: string;
  name: string;
  color: string;
  timetable_id: string;
  sessions: CourseSession[];
  created_at: Date;
  updated_at: Date;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Course store interface
interface CourseStore {
  courses: CourseWithSessions[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addCourse: (course: Omit<CourseWithSessions, 'id' | 'created_at' | 'updated_at'>) => CourseWithSessions;
  deleteCourse: (id: string) => void;
  updateCourse: (updatedCourse: CourseWithSessions) => void;
  resetCourses: () => void;
  loadCourses: (timetableId: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Helper function to create a new course with timestamps
const createCourse = (course: Omit<CourseWithSessions, 'id' | 'created_at' | 'updated_at'>): CourseWithSessions => ({
  ...course,
  id: uuidv4(),
  created_at: new Date(),
  updated_at: new Date(),
});

export const useCourseStore = create<CourseStore>()(isBrowser ? persist(
  (set, get) => ({
    courses: [],
    isLoading: false,
    error: null,

    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),

    loadCourses: (timetableId: string): void => {
      set({ isLoading: true, error: null });
      // Filter courses by timetable_id from local state
      const currentCourses = get().courses.filter(course => course.timetable_id === timetableId);
      set({ courses: currentCourses, isLoading: false });
    },

    addCourse: (course: Omit<CourseWithSessions, 'id' | 'created_at' | 'updated_at'>): CourseWithSessions => {
      set({ isLoading: true, error: null });
      
      // Ensure sessions have session_id
      const courseWithSessionIds = {
        ...course,
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

    updateCourse: (updatedCourse: CourseWithSessions): void => {
      set({ isLoading: true, error: null });
      
      const courseWithUpdatedTime = {
        ...updatedCourse,
        updated_at: new Date()
      };

      set((state) => ({
        courses: state.courses.map((course) =>
          course.id === updatedCourse.id ? courseWithUpdatedTime : course
        ),
        isLoading: false
      }));
    },

    deleteCourse: (id: string): void => {
      set({ isLoading: true, error: null });
      set((state) => ({
        courses: state.courses.filter((course) => course.id !== id),
        isLoading: false
      }));
    },

    resetCourses: (): void => {
      set({ isLoading: true, error: null });
      // Clear courses state and force localStorage update
      set({ courses: [], isLoading: false });
    },
  }),
  {
    name: 'course-store',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      courses: state.courses,
      // Don't persist loading states and errors
    }),
  }
) : (set, get) => ({
  courses: [],
  isLoading: false,
  error: null,
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
  loadCourses: (timetableId: string) => {},
  addCourse: (course: Omit<CourseWithSessions, 'id' | 'created_at' | 'updated_at'>): CourseWithSessions => {
    throw new Error('Not available in SSR');
  },
  updateCourse: (updatedCourse: CourseWithSessions) => {
    throw new Error('Not available in SSR');
  },
  deleteCourse: (id: string) => {
    throw new Error('Not available in SSR');
  },
  resetCourses: () => {
    throw new Error('Not available in SSR');
  },
}));
