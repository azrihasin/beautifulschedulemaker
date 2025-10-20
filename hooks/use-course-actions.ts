import { useCallback, useState } from 'react';
import { useCourseStore } from '@/stores/courseStore';
import { useTimetableStore } from '@/stores/timetableStore';
import { createCourseForCurrentTimetable } from '@/lib/course-timetable-helpers';
import type { Course as StoreCourse } from '@/stores/types';

// Types for course actions matching the AI agent response contract
export interface CourseInput {
  code: string;
  name: string;
  color: string;
  sessions: SessionInput[];
}

export interface SessionInput {
  days: string[];      // ['MON', 'WED', 'FRI']
  startTime: string;   // '14:00'
  endTime: string;     // '15:20'
  location: string;    // 'ICT TEACH LAB 7'
}

export interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
  sessions: Session[];
}

export interface Session {
  session_id: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
}

// Enhanced update payload for partial updates
export interface CourseUpdatePayload {
  // Course identification
  id?: string;
  courseIdentifier?: string; // Course code or name
  
  // Course fields that can be updated
  code?: string;
  name?: string;
  color?: string;
  
  // Session updates - can be partial
  sessions?: Array<{
    session_id?: string;
    days?: string[];
    startTime?: string;
    endTime?: string;
    location?: string;
  }>;
  
  // Update type
  updateType?: 'full' | 'partial';
}

export type CourseAction = 
  | { type: 'addCourse', payload: CourseInput }
  | { type: 'addBulkCourses', payload: { courses: CourseInput[] } }
  | { type: 'updateCourse', payload: CourseUpdatePayload }
  | { type: 'deleteCourse', payload: { courseIdentifier: string } }
  | { type: 'resetCourses', payload: {} };

export interface ActionResult {
  success: boolean;
  error?: string;
  action: CourseAction;
  userMessage?: string; // User-friendly message for display
  suggestions?: string[]; // Helpful suggestions for the user
}

export interface BatchActionResult {
  success: boolean;
  results: ActionResult[];
  failedActions: CourseAction[];
  successfulActions: CourseAction[];
}

// Predefined color palette for automatic assignment
const COLOR_PALETTE = [
  "#FFB3BA", // Light Pink
  "#FFDFBA", // Light Orange
  "#BAFFC9", // Light Green
  "#BAE1FF", // Light Blue
  "#FFFFBA", // Light Yellow
  "#E1BAFF"  // Light Purple
];

export const useCourseActions = () => {
  const { updateCourse, deleteCourse, resetCourses, getCourses } = useCourseStore();
  const { activeTimetableId } = useTimetableStore();
  const courses = getCourses(activeTimetableId || '');
  const [isExecuting, setIsExecuting] = useState(false);

  // Store snapshot for rollback functionality
  const createSnapshot = useCallback(() => {
    return JSON.parse(JSON.stringify(courses));
  }, [courses]);

  // Helper function to get next available color from palette
  const getNextAvailableColor = useCallback((): string => {
    const usedColors = courses.map((course: any) => course.color);
    
    // Find first unused color from palette
    for (const color of COLOR_PALETTE) {
      if (!usedColors.includes(color)) {
        return color;
      }
    }
    
    // If all colors are used, cycle back to the beginning
    const colorIndex = courses.length % COLOR_PALETTE.length;
    return COLOR_PALETTE[colorIndex];
  }, [courses]);

  // Helper function to assign colors to multiple courses
  const assignColorsToCoursesArray = useCallback((coursesArray: CourseInput[]): CourseInput[] => {
    const usedColors = courses.map((course: any) => course.color);
    let colorIndex = 0;
    
    return coursesArray.map((course, index) => {
      // Find next available color
      let assignedColor = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
      
      // Skip colors that are already used (for the first few assignments)
      while (usedColors.includes(assignedColor) && colorIndex < COLOR_PALETTE.length) {
        colorIndex++;
        assignedColor = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
      }
      
      colorIndex++;
      
      return {
        ...course,
        color: assignedColor
      };
    });
  }, [courses]);

  // Execute a single course action with comprehensive error handling
  const executeSingleAction = useCallback((action: CourseAction): ActionResult => {
    try {
      switch (action.type) {
        case 'addCourse':
          // Comprehensive validation with user-friendly messages
          const validation = validateCourseAction(action);
          if (!validation.valid) {
            // Create specific suggestions based on the validation error
            let suggestions: string[] = [];
            
            if (validation.error?.includes('Days are required')) {
              suggestions = [
                'Use day names like "Monday", "Wed", or "MWF"',
                'Make sure to include: course code, course name, days, times, and location',
                'Example: "Add CSC 1100 Elements of Programming on Monday and Wednesday from 2:00 PM to 3:20 PM in ICT Lab 7"'
              ];
            } else if (validation.error?.includes('Start time is required')) {
              suggestions = [
                'Use formats like "2:00 PM" or "14:00"',
                'Make sure to include: course code, course name, days, times, and location',
                'Example: "Add CSC 1100 Elements of Programming on Monday and Wednesday from 2:00 PM to 3:20 PM in ICT Lab 7"'
              ];
            } else if (validation.error?.includes('Location is required')) {
              suggestions = [
                'Specify where the class meets (e.g., "ICT Lab 7")',
                'Make sure to include: course code, course name, days, times, and location',
                'Example: "Add CSC 1100 Elements of Programming on Monday and Wednesday from 2:00 PM to 3:20 PM in ICT Lab 7"'
              ];
            } else if (validation.error?.includes('Invalid color format')) {
              suggestions = [
                'must be a valid hex color code (e.g., "#FFB3BA")',
                'Colors are assigned automatically, you don\'t need to specify them'
              ];
            } else if (validation.error?.includes('Invalid day format')) {
              suggestions = [
                'use full names like "Monday" or abbreviations like "Mon"',
                'Valid days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'
              ];
            } else if (validation.error?.includes('End time') && validation.error?.includes('must be after start time')) {
              // Extract times from error message for suggestion
              const timeMatch = validation.error.match(/End time \(([^)]+)\) must be after start time \(([^)]+)\)/);
              if (timeMatch) {
                const endTime = timeMatch[1];
                const startTime = timeMatch[2];
                suggestions = [
                  `Did you mean ${startTime} to ${endTime}?`,
                  'Make sure end time is after start time',
                  'Use clear time formats like "2:00 PM to 3:20 PM"'
                ];
              } else {
                suggestions = [
                  'Make sure end time is after start time',
                  'Use clear time formats like "2:00 PM to 3:20 PM"'
                ];
              }
            } else if (validation.error?.includes('Invalid start time format')) {
              suggestions = [
                'Use 24-hour format like "14:00" or provide times like "2:00 PM"',
                'Valid time formats: "14:00", "2:00 PM", "2 PM"'
              ];
            } else {
              suggestions = [
                'Make sure to include: course code, course name, days, times, and location',
                'Example: "Add CSC 1100 Elements of Programming on Monday and Wednesday from 2:00 PM to 3:20 PM in ICT Lab 7"'
              ];
            }
            
            return {
              success: false,
              error: validation.error,
              action,
              userMessage: `I couldn't add the course: ${validation.error}`,
              suggestions
            };
          }
          
          // Check for duplicate courses
          const existingCourse = findCourseByCodeOrName(action.payload.code);
          if (existingCourse) {
            return {
              success: false,
              error: `Course ${action.payload.code} already exists`,
              action,
              userMessage: `You already have ${action.payload.code} (${existingCourse.name}) in your timetable.`,
              suggestions: [
                `Did you want to update the existing course instead?`,
                `Try: "Update ${action.payload.code} time to [new time]"`
              ]
            };
          }
          
          try {
            // Assign color if not provided
             const courseWithColor = {
               ...action.payload,
               color: action.payload.color || getNextAvailableColor(courses)
             };
            
            // Use helper function to create course with proper user_id and timetable_id
            await createCourseForCurrentTimetable(courseWithColor);
            return { 
              success: true, 
              action,
              userMessage: `Successfully added ${courseWithColor.code} - ${courseWithColor.name} to your timetable!`
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add course';
            return {
              success: false,
              error: errorMessage,
              action,
              userMessage: `Failed to add course: ${errorMessage}`,
              suggestions: [
                'Please make sure you have an active timetable selected',
                'Try refreshing the page and try again'
              ]
            };
          }

        case 'addBulkCourses':
          // Validate bulk course payload first
          if (!action.payload.courses || action.payload.courses.length === 0) {
            return {
              success: false,
              error: 'At least one course is required for bulk addition. Please provide course details.',
              action,
              userMessage: 'I need at least one course to add. Please provide course details.',
              suggestions: [
                'Include course information like: code, name, days, times, and location',
                'Example: "Add CSC 1100 Elements of Programming on Monday and Wednesday from 2:00 PM to 3:20 PM in ICT Lab 7"'
              ]
            };
          }
          
          if (action.payload.courses.length > 10) {
            return {
              success: false,
              error: `Too many courses (${action.payload.courses.length}). Maximum 10 courses can be added at once. Try adding them in smaller batches.`,
              action,
              userMessage: `You're trying to add ${action.payload.courses.length} courses, but I can only handle 10 at a time.`,
              suggestions: [
                'Try adding them in smaller batches',
                'Add the first 10 courses, then add the remaining ones separately'
              ]
            };
          }
          
          // Process each course in the bulk operation with detailed feedback
          const bulkResults: ActionResult[] = [];
          let successCount = 0;
          const successfulCourses: string[] = [];
          const failedCourses: string[] = [];
          
          for (let i = 0; i < action.payload.courses.length; i++) {
            const courseInput = action.payload.courses[i];
            try {
              // Create individual addCourse action for each course
              const individualAction: CourseAction = { type: 'addCourse', payload: courseInput };
              const result = executeSingleAction(individualAction);
              bulkResults.push(result);
              
              if (result.success) {
                successCount++;
                successfulCourses.push(`${courseInput.code} - ${courseInput.name}`);
              } else {
                failedCourses.push(`${courseInput.code || 'Unknown'}: ${result.error}`);
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
              failedCourses.push(`${courseInput.code || `Course ${i + 1}`}: ${errorMsg}`);
              bulkResults.push({
                success: false,
                error: errorMsg,
                action: { type: 'addCourse', payload: courseInput }
              });
            }
          }
          
          // Create comprehensive summary message
          let userMessage = '';
          const suggestions: string[] = [];
          
          if (successCount > 0) {
            userMessage = `Successfully added ${successCount} course${successCount > 1 ? 's' : ''}:\n• ${successfulCourses.join('\n• ')}`;
          }
          
          if (failedCourses.length > 0) {
            if (successCount > 0) {
              userMessage += `\n\nHowever, ${failedCourses.length} course${failedCourses.length > 1 ? 's' : ''} could not be added:\n• ${failedCourses.join('\n• ')}`;
            } else {
              userMessage = `I couldn't add any of the ${failedCourses.length} courses:\n• ${failedCourses.join('\n• ')}`;
            }
            
            suggestions.push('Please check the failed courses and try adding them individually');
            suggestions.push('Make sure each course has: code, name, days, times, and location');
          }
          
          // Return summary result for bulk operation
          return {
            success: successCount > 0, // Success if at least one course was added
            action,
            error: successCount === 0 ? 'No courses could be added from the bulk operation' : undefined,
            userMessage,
            suggestions: suggestions.length > 0 ? suggestions : undefined
          };

        case 'updateCourse':
          // Check if course identifier is provided
          if (!action.payload.id && !action.payload.courseIdentifier) {
            return {
              success: false,
              error: 'Course identifier is required for updates. Please specify the course code (e.g., "CSC 1100") or course name.',
              action,
              userMessage: 'I need to know which course to update.',
              suggestions: [
                'Please specify the course code (e.g., "CSC 1100") or course name',
                'Example: "Update CSC 1100 time to 3:00 PM"',
                'Example: "Change Elements of Programming location to Room 205"'
              ]
            };
          }
          
          // Find course by ID or identifier with helpful error messages
          let courseToUpdate: any = null;
          
          if (action.payload.id) {
            courseToUpdate = courses.find((c: any) => c.id === action.payload.id);
          } else if (action.payload.courseIdentifier) {
            courseToUpdate = findCourseByCodeOrName(action.payload.courseIdentifier);
          }
          
          if (!courseToUpdate) {
            const identifier = action.payload.id || action.payload.courseIdentifier || 'unknown';
            const courseList = courses.map((c: any) => `${c.code} - ${c.name}`).join('\n• ');
            
            return {
              success: false,
              error: `Course "${identifier}" not found`,
              action,
              userMessage: `I couldn't find a course called "${identifier}" in your timetable.`,
              suggestions: courses.length > 0 ? [
                'Here are your current courses:',
                `• ${courseList}`,
                'Please check the course code or name and try again.'
              ] : [
                'You don\'t have any courses in your timetable yet.',
                'Try adding a course first with: "Add [course code] [course name] on [days] from [time] in [location]"'
              ]
            };
          }
          
          // Validate update payload
          const updateValidation = validateCourseAction(action);
          if (!updateValidation.valid) {
            // Create specific suggestions based on the validation error (same logic as add course)
            let suggestions: string[] = [];
            
            if (updateValidation.error?.includes('End time') && updateValidation.error?.includes('must be after start time')) {
              // Extract times from error message for suggestion
              const timeMatch = updateValidation.error.match(/End time \(([^)]+)\) must be after start time \(([^)]+)\)/);
              if (timeMatch) {
                const endTime = timeMatch[1];
                const startTime = timeMatch[2];
                suggestions = [
                  `Did you mean ${startTime} to ${endTime}?`,
                  'Make sure end time is after start time',
                  'Use clear time formats like "2:00 PM to 3:20 PM"'
                ];
              } else {
                suggestions = [
                  'Make sure end time is after start time',
                  'Use clear time formats like "2:00 PM to 3:20 PM"'
                ];
              }
            } else {
              suggestions = [
                'Make sure time formats are correct (e.g., "2:00 PM" or "14:00")',
                'Use valid day names (e.g., "Monday", "Wed", "Friday")',
                'Example: "Change CSC 1100 time to 3:00 PM to 4:20 PM"'
              ];
            }
            
            return {
              success: false,
              error: updateValidation.error,
              action,
              userMessage: `I couldn't update ${courseToUpdate.code}: ${updateValidation.error}`,
              suggestions
            };
          }
          
          // Create updated course object by merging existing data with updates
          const updatedCourse = mergePartialCourseUpdate(courseToUpdate, action.payload);
          
          // Final validation of the merged course
          const finalValidation = validateCourseAction({ type: 'addCourse', payload: updatedCourse });
          if (!finalValidation.valid) {
            // Create specific suggestions based on the validation error (same logic as add course)
            let suggestions: string[] = [];
            
            if (finalValidation.error?.includes('End time') && finalValidation.error?.includes('must be after start time')) {
              // Extract times from error message for suggestion
              const timeMatch = finalValidation.error.match(/End time \(([^)]+)\) must be after start time \(([^)]+)\)/);
              if (timeMatch) {
                const endTime = timeMatch[1];
                const startTime = timeMatch[2];
                suggestions = [
                  `Did you mean ${startTime} to ${endTime}?`,
                  'Make sure end time is after start time',
                  'Use clear time formats like "2:00 PM to 3:20 PM"'
                ];
              } else {
                suggestions = [
                  'Make sure end time is after start time',
                  'Use clear time formats like "2:00 PM to 3:20 PM"'
                ];
              }
            } else {
              suggestions = [
                'Please check that all required fields are still present after the update',
                'Make sure times are in the correct format and end time is after start time'
              ];
            }
            
            return {
              success: false,
              error: finalValidation.error,
              action,
              userMessage: `The update would create an invalid course: ${finalValidation.error}`,
              suggestions
            };
          }
          
          updateCourse(activeTimetableId || '', courseToUpdate.id, updatedCourse);
          return { 
            success: true, 
            action,
            userMessage: `Successfully updated ${courseToUpdate.code} - ${courseToUpdate.name}!`
          };

        case 'deleteCourse':
          // Find course by identifier with helpful error messages
          const courseToDelete = findCourseByCodeOrName(action.payload.courseIdentifier);
          if (!courseToDelete) {
            const courseList = courses.map((c: any) => `${c.code} - ${c.name}`).join('\n• ');
            
            // Look for similar courses
            const similarCourses = courses.filter((c: any) => {
              const identifier = action.payload.courseIdentifier.toLowerCase();
              return c.code.toLowerCase().includes(identifier) || 
                     c.name.toLowerCase().includes(identifier) ||
                     identifier.includes(c.code.toLowerCase()) ||
                     identifier.includes(c.name.toLowerCase());
            });
            
            const suggestions = [];
            if (courses.length > 0) {
              suggestions.push('Here are your current courses:');
              // Add each course as a separate suggestion item for better test matching
              courses.forEach((c: any) => {
                suggestions.push(`• ${c.code} - ${c.name}`);
              });
            } else {
              suggestions.push('You don\'t have any courses in your timetable to delete.');
            }
            
            if (similarCourses.length > 0) {
              const similarList = similarCourses.map((c: any) => `${c.code} - ${c.name}`).join(', ');
              suggestions.push(`Did you mean one of these similar courses: ${similarList}?`);
            }
            
            return {
              success: false,
              error: `Course "${action.payload.courseIdentifier}" not found`,
              action,
              userMessage: `I couldn't find a course called "${action.payload.courseIdentifier}" in your timetable.`,
              suggestions
            };
          }
          
          const courseInfo = `${courseToDelete.code} - ${courseToDelete.name}`;
          deleteCourse(activeTimetableId || '', courseToDelete.id);
          return { 
            success: true, 
            action,
            userMessage: `Successfully deleted ${courseInfo} from your timetable.`
          };

        case 'resetCourses':
          const courseCount = courses.length;
          resetCourses();
          return { 
            success: true, 
            action,
            userMessage: courseCount > 0 
              ? `Successfully cleared all ${courseCount} courses from your timetable.`
              : 'Your timetable was already empty.'
          };

        default:
          return {
            success: false,
            error: `Unknown action type: ${(action as any).type}`,
            action,
            userMessage: `I don't know how to handle the action "${(action as any).type}".`,
            suggestions: [
              'Supported actions are: add course, update course, delete course, reset courses',
              'Try rephrasing your request or contact support if this error persists.'
            ]
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        action,
        userMessage: `Something went wrong: ${errorMessage}`,
        suggestions: [
          'Please try again with a different approach',
          'If the problem persists, try refreshing the page'
        ]
      };
    }
  }, [addCourse, updateCourse, deleteCourse, resetCourses, courses]);

  // Enhanced execute multiple actions with comprehensive error handling and rollback
  const executeActions = useCallback(async (actions: CourseAction[]): Promise<BatchActionResult> => {
    if (!actions || actions.length === 0) {
      return {
        success: true,
        results: [],
        failedActions: [],
        successfulActions: []
      };
    }

    setIsExecuting(true);
    const snapshot = createSnapshot();
    const results: ActionResult[] = [];
    const failedActions: CourseAction[] = [];
    const successfulActions: CourseAction[] = [];
    const executionStartTime = Date.now();

    try {
      console.log(`Starting batch execution of ${actions.length} actions`);
      
      // Execute actions sequentially with enhanced error handling
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const actionStartTime = Date.now();
        
        try {
          console.log(`Executing action ${i + 1}/${actions.length}:`, action.type);
          
          const result = executeSingleAction(action);
          results.push(result);

          if (result.success) {
            successfulActions.push(action);
            console.log(`Action ${i + 1} completed successfully in ${Date.now() - actionStartTime}ms`);
          } else {
            failedActions.push(action);
            console.error(`Action ${i + 1} failed:`, result.error, action);
            
            // For critical failures, consider stopping execution
            if (result.error?.includes('Critical') || result.error?.includes('Fatal')) {
              console.error('Critical failure detected, stopping batch execution');
              break;
            }
          }
        } catch (actionError) {
          console.error(`Unexpected error in action ${i + 1}:`, actionError);
          
          const errorResult: ActionResult = {
            success: false,
            error: actionError instanceof Error ? actionError.message : 'Unexpected action error',
            action,
            userMessage: `Failed to execute ${action.type}: ${actionError instanceof Error ? actionError.message : 'Unknown error'}`,
            suggestions: [
              'Please try the action again',
              'Check that all required information is provided',
              'If the problem persists, try refreshing the page'
            ]
          };
          
          results.push(errorResult);
          failedActions.push(action);
        }
      }

      const executionTime = Date.now() - executionStartTime;
      const batchResult: BatchActionResult = {
        success: failedActions.length === 0,
        results,
        failedActions,
        successfulActions
      };

      console.log(`Batch execution completed in ${executionTime}ms:`, {
        total: actions.length,
        successful: successfulActions.length,
        failed: failedActions.length,
        success: batchResult.success
      });

      // Enhanced rollback mechanism for critical failures
      if (failedActions.length > 0 && failedActions.length === actions.length) {
        console.warn('All actions failed, considering rollback');
        
        // Check if rollback is needed (e.g., if we modified state before failure)
        const currentState = JSON.stringify(courses);
        const snapshotState = JSON.stringify(snapshot);
        
        if (currentState !== snapshotState) {
          console.log('State changed during failed batch, rollback may be needed');
          // For now, we'll log this but not automatically rollback
          // In the future, we could implement automatic rollback for certain scenarios
        }
      }

      return batchResult;

    } catch (criticalError) {
      const executionTime = Date.now() - executionStartTime;
      console.error(`Critical error during batch action execution after ${executionTime}ms:`, criticalError);
      
      // Enhanced error recovery - attempt to restore from snapshot
      try {
        const currentState = JSON.stringify(courses);
        const snapshotState = JSON.stringify(snapshot);
        
        if (currentState !== snapshotState) {
          console.log('Attempting state recovery from snapshot due to critical error');
          // Note: Actual rollback would require store-level support
          // For now, we'll just log the need for rollback
        }
      } catch (rollbackError) {
        console.error('Failed to perform rollback:', rollbackError);
      }
      
      // Create error results for all remaining actions
      const remainingActions = actions.slice(results.length);
      const errorResults: ActionResult[] = remainingActions.map(action => ({
        success: false,
        error: criticalError instanceof Error ? criticalError.message : 'Critical batch execution error',
        action,
        userMessage: `Batch execution failed: ${criticalError instanceof Error ? criticalError.message : 'Unknown critical error'}`,
        suggestions: [
          'Please try executing actions individually',
          'Check your internet connection',
          'Try refreshing the page if the problem persists'
        ]
      }));
      
      results.push(...errorResults);
      
      return {
        success: false,
        results,
        failedActions: actions,
        successfulActions: []
      };
    } finally {
      setIsExecuting(false);
    }
  }, [executeSingleAction, createSnapshot, courses]);

  // Helper function to find course by code or name
  const findCourseByCodeOrName = useCallback((identifier: string): Course | undefined => {
    if (!identifier) return undefined;
    
    const normalizedIdentifier = identifier.toLowerCase().trim();
    
    // First try exact match by code
    let course = courses.find((course: any) => 
      course.code.toLowerCase() === normalizedIdentifier
    );
    
    if (course) return course;
    
    // Then try exact match by name
    course = courses.find((course: any) => 
      course.name.toLowerCase() === normalizedIdentifier
    );
    
    if (course) return course;
    
    // Finally try partial matching for course names
    course = courses.find((course: any) => 
      course.name.toLowerCase().includes(normalizedIdentifier) ||
      normalizedIdentifier.includes(course.name.toLowerCase())
    );
    
    return course;
  }, [courses]);

  // Helper function to normalize course code
  const normalizeCourseCode = useCallback((code: string): string => {
    return code.trim().toUpperCase().replace(/\s+/g, ' ').replace(/([A-Z]+)(\d+)/, '$1 $2');
  }, []);

  // Helper function to normalize course name
  const normalizeCourseName = useCallback((name: string): string => {
    return name.trim().toUpperCase().replace(/\s+/g, ' ');
  }, []);

  // Helper function to normalize location
  const normalizeLocation = useCallback((location: string): string => {
    return location.trim().toUpperCase().replace(/\s+/g, ' ');
  }, []);

  // Helper function to format time to 12-hour format for user display
  const formatTimeTo12Hour = useCallback((time24: string): string => {
    const [hour, minute] = time24.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  }, []);

  // Helper function to merge partial course updates
  const mergePartialCourseUpdate = useCallback((existingCourse: any, updates: CourseUpdatePayload): any => {
    const updatedCourse = { ...existingCourse };
    
    // Update basic course fields if provided
    if (updates.code) updatedCourse.code = normalizeCourseCode(updates.code);
    if (updates.name) updatedCourse.name = normalizeCourseName(updates.name);
    if (updates.color) updatedCourse.color = updates.color;
    
    // Handle session updates
    if (updates.sessions && updates.sessions.length > 0) {
      if (updates.updateType === 'full') {
        // Full session replacement
        updatedCourse.sessions = updates.sessions.map((session: any, index: number) => ({
          ...session,
          session_id: session.session_id || existingCourse.sessions[index]?.session_id || `session-${Date.now()}-${index}`,
          location: session.location ? normalizeLocation(session.location) : session.location
        }));
      } else {
        // Partial session updates
        updatedCourse.sessions = existingCourse.sessions.map((existingSession: any) => {
          // Find matching update session by session_id or apply to all if no specific session_id
          const sessionUpdate = updates.sessions!.find((s: any) => 
            s.session_id === existingSession.session_id
          ) || (updates.sessions!.length === 1 && !updates.sessions![0].session_id ? updates.sessions![0] : null);
          
          if (sessionUpdate) {
            return {
              ...existingSession,
              days: sessionUpdate.days || existingSession.days,
              startTime: sessionUpdate.startTime || existingSession.startTime,
              endTime: sessionUpdate.endTime || existingSession.endTime,
              location: sessionUpdate.location ? normalizeLocation(sessionUpdate.location) : existingSession.location
            };
          }
          
          return existingSession;
        });
        
        // If no session_id was specified and we have session updates, apply to all sessions
        if (updates.sessions.length === 1 && !updates.sessions[0].session_id) {
          const sessionUpdate = updates.sessions[0];
          updatedCourse.sessions = updatedCourse.sessions.map((session: any) => ({
            ...session,
            days: sessionUpdate.days || session.days,
            startTime: sessionUpdate.startTime || session.startTime,
            endTime: sessionUpdate.endTime || session.endTime,
            location: sessionUpdate.location ? normalizeLocation(sessionUpdate.location) : session.location
          }));
        }
      }
    }
    
    return updatedCourse;
  }, [normalizeCourseCode, normalizeCourseName, normalizeLocation]);

  // Helper function to validate course action payload with detailed error messages
  const validateCourseAction = useCallback((action: CourseAction): { valid: boolean; error?: string } => {
    switch (action.type) {
      case 'addCourse':
        // Check required fields with specific error messages
        if (!action.payload.code?.trim()) {
          return { valid: false, error: 'Course code is required (e.g., "CSC 1100")' };
        }
        if (!action.payload.name?.trim()) {
          return { valid: false, error: 'Course name is required (e.g., "Elements of Programming")' };
        }
        if (!action.payload.sessions?.length) {
          return { valid: false, error: 'At least one session with days, times, and location is required' };
        }
        
        // Validate color format
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(action.payload.color)) {
          return { valid: false, error: 'Invalid color format: must be a valid hex color code (e.g., "#FFB3BA")' };
        }
        
        // Validate each session with detailed feedback
        for (let i = 0; i < action.payload.sessions.length; i++) {
          const session = action.payload.sessions[i];
          const sessionRef = action.payload.sessions.length > 1 ? ` in session ${i + 1}` : '';
          
          if (!session.days?.length) {
            return { valid: false, error: `Days are required${sessionRef}. Use day names like "Monday", "Wed", or "MWF"` };
          }
          if (!session.startTime) {
            return { valid: false, error: `Start time is required${sessionRef}. Use formats like "2:00 PM" or "14:00"` };
          }
          if (!session.endTime) {
            return { valid: false, error: `End time is required${sessionRef}. Use formats like "3:20 PM" or "15:20"` };
          }
          if (!session.location?.trim()) {
            return { valid: false, error: `Location is required${sessionRef}. Specify where the class meets (e.g., "ICT Lab 7")` };
          }
          
          // Validate time format with helpful messages
          const timeRegex = /^\d{2}:\d{2}$/;
          if (!timeRegex.test(session.startTime)) {
            return { valid: false, error: `Invalid start time format "${session.startTime}"${sessionRef}. Use 24-hour format like "14:00" or provide times like "2:00 PM"` };
          }
          if (!timeRegex.test(session.endTime)) {
            return { valid: false, error: `Invalid end time format "${session.endTime}"${sessionRef}. Use 24-hour format like "15:20" or provide times like "3:20 PM"` };
          }
          
          // Validate time values are within valid ranges
          const [startHour, startMin] = session.startTime.split(':').map(Number);
          const [endHour, endMin] = session.endTime.split(':').map(Number);
          
          if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
            return { valid: false, error: `Invalid start time format "${session.startTime}"${sessionRef}. Use 24-hour format like "14:00" or provide times like "2:00 PM"` };
          }
          if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
            return { valid: false, error: `Invalid end time format "${session.endTime}"${sessionRef}. Use 24-hour format like "15:20" or provide times like "3:20 PM"` };
          }
          
          // Validate time logic with clear explanation
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (endMinutes <= startMinutes) {
            const startTime12 = formatTimeTo12Hour(session.startTime);
            const endTime12 = formatTimeTo12Hour(session.endTime);
            return { valid: false, error: `End time (${endTime12}) must be after start time (${startTime12})${sessionRef}` };
          }
          
          // Validate days format with suggestions
          const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
          const invalidDays = session.days.filter(day => !validDays.includes(day));
          if (invalidDays.length > 0) {
            const dayMapping = {
              'M': 'MON', 'T': 'TUE', 'W': 'WED', 'R': 'THU', 'F': 'FRI', 'S': 'SAT', 'U': 'SUN'
            };
            const suggestions = invalidDays.map(day => {
              const mapped = (dayMapping as any)[day.toUpperCase()];
              return mapped ? `"${day}" → "${mapped}"` : `"${day}" (use full names like "Monday" or abbreviations like "Mon")`;
            }).join(', ');
            
            return { valid: false, error: `Invalid day format${sessionRef}: ${invalidDays.join(', ')}. Suggestions: ${suggestions}` };
          }
        }
        break;

      case 'addBulkCourses':
        if (!action.payload.courses?.length) {
          return { valid: false, error: 'At least one course is required for bulk addition. Please provide course details.' };
        }
        if (action.payload.courses.length > 10) {
          return { valid: false, error: `Too many courses (${action.payload.courses.length}). Maximum 10 courses can be added at once. Try adding them in smaller batches.` };
        }
        
        // Validate each course in the bulk operation with detailed feedback
        for (let i = 0; i < action.payload.courses.length; i++) {
          const courseValidation = validateCourseAction({ type: 'addCourse', payload: action.payload.courses[i] });
          if (!courseValidation.valid) {
            const courseName = action.payload.courses[i].code || action.payload.courses[i].name || `Course ${i + 1}`;
            return { valid: false, error: `${courseName}: ${courseValidation.error}` };
          }
        }
        break;

      case 'updateCourse':
        // Must have either ID or courseIdentifier
        if (!action.payload.id && !action.payload.courseIdentifier) {
          return { valid: false, error: 'Course identifier is required for updates. Please specify the course code (e.g., "CSC 1100") or course name.' };
        }
        
        // If sessions are provided, validate them with helpful messages
        if (action.payload.sessions) {
          for (let i = 0; i < action.payload.sessions.length; i++) {
            const session = action.payload.sessions[i];
            const sessionRef = action.payload.sessions.length > 1 ? ` in session ${i + 1}` : '';
            
            // Validate time format if provided
            if (session.startTime && !/^\d{2}:\d{2}$/.test(session.startTime)) {
              return { valid: false, error: `Invalid start time format "${session.startTime}"${sessionRef}. Use 24-hour format like "14:00" or provide times like "2:00 PM"` };
            }
            if (session.endTime && !/^\d{2}:\d{2}$/.test(session.endTime)) {
              return { valid: false, error: `Invalid end time format "${session.endTime}"${sessionRef}. Use 24-hour format like "15:20" or provide times like "3:20 PM"` };
            }
            
            // Validate time logic if both times are provided
            if (session.startTime && session.endTime) {
              const [startHour, startMin] = session.startTime.split(':').map(Number);
              const [endHour, endMin] = session.endTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              
              if (endMinutes <= startMinutes) {
                const startTime12 = formatTimeTo12Hour(session.startTime);
                const endTime12 = formatTimeTo12Hour(session.endTime);
                return { valid: false, error: `End time (${endTime12}) must be after start time (${startTime12})${sessionRef}` };
              }
            }
            
            // Validate days format if provided
            if (session.days) {
              const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
              const invalidDays = session.days.filter(day => !validDays.includes(day));
              if (invalidDays.length > 0) {
                return { valid: false, error: `Invalid day format${sessionRef}: ${invalidDays.join(', ')}. Use full names like "Monday" or abbreviations like "Mon"` };
              }
            }
          }
        }
        
        // Validate color format if provided
        if (action.payload.color && !/^#[0-9A-Fa-f]{6}$/.test(action.payload.color)) {
          return { valid: false, error: 'Invalid color format: must be a valid hex color code (e.g., "#FFB3BA")' };
        }
        break;

      case 'deleteCourse':
        if (!action.payload.courseIdentifier?.trim()) {
          return { valid: false, error: 'Course identifier is required for deletion. Please specify the course code (e.g., "CSC 1100") or course name you want to delete.' };
        }
        break;

      case 'resetCourses':
        // No validation needed for reset
        break;

      default:
        return { valid: false, error: `Unknown action type: ${(action as any).type}. Supported actions are: add course, update course, delete course, reset courses.` };
    }

    return { valid: true };
  }, []);

  return {
    executeActions,
    executeSingleAction,
    findCourseByCodeOrName,
    validateCourseAction,
    getNextAvailableColor,
    assignColorsToCoursesArray,
    mergePartialCourseUpdate,
    normalizeCourseCode,
    normalizeCourseName,
    normalizeLocation,
    isExecuting,
    courses
  };
};