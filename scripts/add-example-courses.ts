#!/usr/bin/env tsx

/**
 * Add example courses to the current user's timetable
 * 
 * This script adds 2 example courses using the course helper functions
 * 
 * Usage:
 *   npx tsx scripts/add-example-courses.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { createCourseForCurrentTimetable } from '../lib/course-timetable-helpers'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

async function addExampleCourses() {
  console.log('📚 Adding example courses...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Define example courses
    const exampleCourses = [
      {
        code: 'CSC 1100',
        name: 'Elements of Programming',
        color: '#FFB3BA',
        sessions: [
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room 101'
          },
          {
            day: 'Wednesday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room 101'
          },
          {
            day: 'Friday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room 101'
          }
        ]
      },
      {
        code: 'MATH 2001',
        name: 'Calculus II',
        color: '#BAFFC9',
        sessions: [
          {
            day: 'Tuesday',
            startTime: '11:00',
            endTime: '12:30',
            location: 'Math Building 205'
          },
          {
            day: 'Thursday',
            startTime: '11:00',
            endTime: '12:30',
            location: 'Math Building 205'
          }
        ]
      }
    ]

    let successCount = 0
    let errorCount = 0

    // Add each course using the helper function
    for (const courseData of exampleCourses) {
      try {
        await createCourseForCurrentTimetable(supabase, courseData)
        console.log(`✅ Added: ${courseData.code} - ${courseData.name}`)
        successCount++
      } catch (error) {
        console.error(`❌ Failed to add ${courseData.code}:`, error)
        errorCount++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`✅ Successfully added: ${successCount} courses`)
    if (errorCount > 0) {
      console.log(`❌ Failed to add: ${errorCount} courses`)
    }
    
    if (successCount > 0) {
      console.log('\n🎉 Example courses have been added to your current timetable!')
      console.log('You can now see them in the timetable view.')
    }

  } catch (error) {
    console.error('❌ Failed to add example courses:', error)
    process.exit(1)
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  addExampleCourses()
}

export { addExampleCourses }