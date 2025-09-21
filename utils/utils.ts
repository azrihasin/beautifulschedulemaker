/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse, format, addMinutes } from 'date-fns';

export interface ScheduleData {
  timeSlots: string[];
  startTime: Date | null;
  endTime: Date | null;
  subjectColors: Record<string, string>;
  totalMinutes: number;
  activeDays: string[];
}

export const getScheduleData = (courses: any[]): ScheduleData => {
  // Flatten the sessions into individual course entries
  const flattenedCourses = courses.flatMap((course) =>
    course.sessions.map((session: any) => ({
      ...course,
      ...session,
    }))
  );

  if (flattenedCourses.length === 0) {
    return {
      timeSlots: [],
      startTime: null,
      endTime: null,
      subjectColors: {},
      totalMinutes: 0,
      activeDays: [],
    };
  }

  // Sort courses by start time
  const sortedCourses = [...flattenedCourses].sort((a, b) => {
    const startTimeA = parse(a.startTime, 'HH:mm', new Date());
    const startTimeB = parse(b.startTime, 'HH:mm', new Date());
    return startTimeA.getTime() - startTimeB.getTime();
  });

  // Determine the earliest start time and latest end time
  const firstCourse = sortedCourses[0];
  const lastCourse = sortedCourses[sortedCourses.length - 1];
  const startTime = parse(firstCourse.startTime, 'HH:mm', new Date());
  const endTime = parse(lastCourse.endTime, 'HH:mm', new Date());

  // Generate time slots every 30 minutes
  const slots: string[] = [];
  for (let time = startTime; time <= endTime; time = addMinutes(time, 30)) {
    slots.push(format(time, 'HH:mm'));
  }

  // Assign colors to subjects
  const subjectColors: Record<string, string> = {};
  courses.forEach((course) => {
    subjectColors[course.code] = course.color;
  });

  // Calculate total duration in minutes
  const totalMinutes = slots.length * 30;

  // Days array for sorting
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Determine active days and sort them
  const activeDays = Array.from(new Set(flattenedCourses.map((course) => course.day)))
    .sort((a, b) => daysOfWeek.indexOf(a) - daysOfWeek.indexOf(b));

  return {
    timeSlots: slots,
    startTime,
    endTime,
    subjectColors,
    totalMinutes,
    activeDays,
  };
};