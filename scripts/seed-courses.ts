#!/usr/bin/env tsx

/**
 * Seed default courses as examples
 * 
 * This script adds 2 example courses to demonstrate the course functionality
 * 
 * Usage:
 *   npx tsx scripts/seed-courses.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

async function seedCourses() {
  console.log('🌱 Seeding default courses...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Get the current user (you'll need to be authenticated)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('You must be authenticated to seed courses')
    }

    // Get the user's first timetable (or create one if none exists)
    let { data: timetables, error: timetableError } = await supabase
      .from('timetables')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (timetableError) {
      throw new Error(`Failed to fetch timetables: ${timetableError.message}`)
    }

    let timetableId: string
    
    if (!timetables || timetables.length === 0) {
      // Create a default timetable
      const { data: newTimetable, error: createError } = await supabase
        .from('timetables')
        .insert({
          user_id: user.id,
          name: 'My Timetable',
          background_image: null
        })
        .select('id')
        .single()

      if (createError || !newTimetable) {
        throw new Error(`Failed to create timetable: ${createError?.message}`)
      }
      
      timetableId = newTimetable.id
      console.log('📅 Created default timetable')
    } else {
      timetableId = timetables[0].id
    }

    // Define example courses
    const exampleCourses = [
      {
        user_id: user.id,
        timetable_id: timetableId,
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
        user_id: user.id,
        timetable_id: timetableId,
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

    // Check if courses already exist
    const { data: existingCourses, error: checkError } = await supabase
      .from('courses')
      .select('code')
      .eq('user_id', user.id)
      .eq('timetable_id', timetableId)
      .in('code', exampleCourses.map(c => c.code))

    if (checkError) {
      throw new Error(`Failed to check existing courses: ${checkError.message}`)
    }

    const existingCodes = existingCourses?.map(c => c.code) || []
    const coursesToInsert = exampleCourses.filter(c => !existingCodes.includes(c.code))

    if (coursesToInsert.length === 0) {
      console.log('📚 Example courses already exist, skipping...')
      return
    }

    // Insert the example courses
    const { error: insertError } = await supabase
      .from('courses')
      .insert(coursesToInsert)

    if (insertError) {
      throw new Error(`Failed to insert courses: ${insertError.message}`)
    }

    console.log('✅ Successfully seeded default courses!')
    console.log(`📚 Added ${coursesToInsert.length} example courses:`)
    coursesToInsert.forEach(course => {
      console.log(`   - ${course.code}: ${course.name}`)
    })

  } catch (error) {
    console.error('❌ Course seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedCourses()
}

export { seedCourses }