import { useCourseStore } from '../stores/courseStore';
import { useTimetableStore } from '../stores/timetableStore';
import type { CourseWithSessions, CourseWithSessionsInput } from './supabase/database.types';
import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Helper functions to manage the relationship between courses and timetables
 */



/**
 * Create a new course tied to the current active timetable
 * @param courseData - Course data without user_id and timetable_id
 * @returns Promise<CourseWithSessions> - The created course
 */
export const createCourseForCurrentTimetable = async (
  courseData: CourseWithSessionsInput
): Promise<CourseWithSessions> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { activeTimetableId } = useTimetableStore.getState();
  if (!activeTimetableId) {
    throw new Error('No active timetable selected');
  }

  const { addCourse } = useCourseStore.getState();
  
  const courseWithoutTimetableId = {
    ...courseData,
    user_id: user.id
  };

  return addCourse(activeTimetableId, courseWithoutTimetableId);
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
export const createNewTimetableWithCourses = async (timetableName: string): Promise<string> => {
  const { addTimetable, setActiveTimetable } = useTimetableStore.getState();
  const { resetCourses } = useCourseStore.getState();
  
  // Create new timetable
  const newTimetableId = await addTimetable(timetableName);
  
  // Switch to the new timetable
  setActiveTimetable(newTimetableId);
  
  // Reset courses (will be empty for new timetable)
  await resetCourses();
  
  return newTimetableId;
};

/**
 * Delete a timetable and all its associated courses
 * @param timetableId - The ID of the timetable to delete
 */
export const deleteTimetableWithCourses = async (timetableId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Delete all courses for this timetable first
  const { error: coursesError } = await supabase
    .from('courses')
    .delete()
    .eq('user_id', user.id)
    .eq('timetable_id', timetableId);

  if (coursesError) {
    throw new Error(`Failed to delete courses: ${coursesError.message}`);
  }

  // Then delete the timetable
  const { deleteTimetable } = useTimetableStore.getState();
  await deleteTimetable(timetableId);
};

/**
 * Get all courses for the current timetable
 * @returns CourseWithSessions[] - Array of courses for the current timetable
 */
export const getCurrentTimetableCourses = (): CourseWithSessions[] => {
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