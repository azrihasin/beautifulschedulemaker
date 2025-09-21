// Example usage of useCourseActions hook
// This file demonstrates how the AI chatbot would use the course actions hook

import { useCourseActions, CourseAction } from './use-course-actions';

// Example: How the AI chatbot component would use the hook
export const ExampleUsage = () => {
  const { executeActions, isExecuting, findCourseByCodeOrName } = useCourseActions();

  // Example 1: Adding a new course from AI response
  const handleAIResponse = async (aiResponse: { response: string; actions: CourseAction[] }) => {
    console.log('AI Response:', aiResponse.response);
    
    const result = await executeActions(aiResponse.actions);
    
    if (result.success) {
      console.log('All actions executed successfully');
    } else {
      console.log(`${result.successfulActions.length} actions succeeded, ${result.failedActions.length} failed`);
      result.failedActions.forEach(action => {
        console.error('Failed action:', action);
      });
    }
  };

  // Example 2: Simulated AI response for adding a course
  const simulateAddCourseResponse = async () => {
    const aiResponse = {
      response: "I've added CSC 2100 Data Structures to your timetable for Monday and Wednesday from 2:00 PM to 3:20 PM.",
      actions: [
        {
          type: 'addCourse' as const,
          payload: {
            code: 'CSC 2100',
            name: 'DATA STRUCTURES',
            color: '#FFB3BA',
            sessions: [
              {
                days: ['MON', 'WED'],
                startTime: '14:00',
                endTime: '15:20',
                location: 'ICT LAB 5'
              }
            ]
          }
        }
      ]
    };

    await handleAIResponse(aiResponse);
  };

  // Example 3: Simulated AI response for updating a course
  const simulateUpdateCourseResponse = async () => {
    // First find the course to update
    const existingCourse = findCourseByCodeOrName('CSC 1100');
    
    if (!existingCourse) {
      console.log('Course not found');
      return;
    }

    const aiResponse = {
      response: "I've updated the time for CSC 1100 to 3:00 PM - 4:20 PM.",
      actions: [
        {
          type: 'updateCourse' as const,
          payload: {
            ...existingCourse,
            sessions: existingCourse.sessions.map(session => ({
              ...session,
              startTime: '15:00',
              endTime: '16:20'
            }))
          }
        }
      ]
    };

    await handleAIResponse(aiResponse);
  };

  // Example 4: Simulated AI response for deleting a course
  const simulateDeleteCourseResponse = async () => {
    const courseToDelete = findCourseByCodeOrName('CSC 1100');
    
    if (!courseToDelete) {
      console.log('Course not found');
      return;
    }

    const aiResponse = {
      response: "I've removed CSC 1100 from your timetable.",
      actions: [
        {
          type: 'deleteCourse' as const,
          payload: { courseIdentifier: courseToDelete.code }
        }
      ]
    };

    await handleAIResponse(aiResponse);
  };

  // Example 5: Simulated AI response for batch operations
  const simulateBatchOperations = async () => {
    const aiResponse = {
      response: "I've added two new courses and removed one course from your timetable.",
      actions: [
        {
          type: 'addCourse' as const,
          payload: {
            code: 'MATH 201',
            name: 'CALCULUS II',
            color: '#BAFFC9',
            sessions: [
              {
                days: ['TUE', 'THU'],
                startTime: '10:00',
                endTime: '11:20',
                location: 'MATH BUILDING'
              }
            ]
          }
        },
        {
          type: 'addCourse' as const,
          payload: {
            code: 'PHYS 101',
            name: 'PHYSICS I',
            color: '#BAE1FF',
            sessions: [
              {
                days: ['MON', 'WED', 'FRI'],
                startTime: '09:00',
                endTime: '10:00',
                location: 'PHYSICS LAB'
              }
            ]
          }
        },
        {
          type: 'deleteCourse' as const,
          payload: { courseIdentifier: 'CSC 1100' }
        }
      ]
    };

    await handleAIResponse(aiResponse);
  };

  return {
    simulateAddCourseResponse,
    simulateUpdateCourseResponse,
    simulateDeleteCourseResponse,
    simulateBatchOperations,
    isExecuting
  };
};