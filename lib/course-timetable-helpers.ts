import { useCourseStore } from '../stores/courseStore';
import { useTimetableStore } from '../stores/timetableStore';
import type { Course } from '../stores/types';

/**
 * Helper functions to manage the relationship between courses and timetables
 */



/**
 * Create a new course tied to the current active timetable
 * @param courseData - Course data
 * @returns Promise<Course> - The created course
 */
export const createCourseForCurrentTimetable = async (
  courseData: Omit<Course, 'id'>
): Promise<Course> => {
  const { activeTimetableId } = useTimetableStore.getState();
  if (!activeTimetableId) {
    throw new Error('No active timetable selected');
  }

  const { addCourse } = useCourseStore.getState();
  
  return addCourse(activeTimetableId, courseData);
};

/**
 * Switch to a different timetable
 * @param timetableId - The ID of the timetable to switch to
 */
export const switchToTimetable = async (timetableId: string): Promise<void> => {
  const { setActiveTimetable } = useTimetableStore.getState();
  
  // Switch timetable
  setActiveTimetable(timetableId);
};

/**
 * Create a new timetable and initialize it with empty courses
 * @param timetableName - Name for the new timetable
 * @returns Promise<string> - The ID of the created timetable
 */
export const createNewTimetableWithCourses = async (timetableName?: string): Promise<string> => {
  const { addTimetable, setActiveTimetable, updateTimetable } = useTimetableStore.getState();
  const { resetCourses } = useCourseStore.getState();
  
  // Create new timetable
  const newTimetable = addTimetable();
  
  // Update name if provided
  if (timetableName) {
    updateTimetable({
      ...newTimetable,
      name: timetableName,
      updatedAt: new Date(),
    });
  }
  
  // Switch to the new timetable
  setActiveTimetable(newTimetable.id);
  
  // Reset courses (will be empty for new timetable)
  await resetCourses();
  
  return newTimetable.id;
};

/**
 * Delete a timetable and all its associated courses
 * @param timetableId - The ID of the timetable to delete
 */
export const deleteTimetableWithCourses = async (timetableId: string): Promise<void> => {
  // Delete courses for this timetable from local store
  const { resetCourses } = useCourseStore.getState();
  const { activeTimetableId } = useTimetableStore.getState();
  
  // If deleting the active timetable, reset courses
  if (activeTimetableId === timetableId) {
    await resetCourses();
  }

  // Delete the timetable from local store
  const { deleteTimetable } = useTimetableStore.getState();
  await deleteTimetable(timetableId);
};

/**
 * Get all courses for the current timetable
 * @returns Course[] - Array of courses for the current timetable
 */
export const getCurrentTimetableCourses = (): Course[] => {
  const { courses } = useCourseStore.getState();
  return courses;
};

/**
 * Check if the current timetable has any courses
 * @returns boolean - True if the current timetable has courses
 */
export const hasCoursesInCurrentTimetable = (): boolean => {
  const courses = getCurrentTimetableCourses();
  return courses.length > 0;
};

/**
 * Initialize course store when timetable changes
 * This should be called whenever the current timetable changes
 * @param timetableId - The ID of the timetable to initialize courses for
 */
export const initializeCoursesForTimetable = async (timetableId: string | null): Promise<void> => {
  if (!timetableId) {
    // If no timetable is selected, reset courses
    const { resetCourses } = useCourseStore.getState();
    await resetCourses();
    return;
  }
};

/**
 * Sync courses with the current timetable state
 * This ensures courses are always in sync with the active timetable
 */
export const syncCoursesWithTimetable = async (): Promise<void> => {
  const { activeTimetableId } = useTimetableStore.getState();
  await initializeCoursesForTimetable(activeTimetableId);
};