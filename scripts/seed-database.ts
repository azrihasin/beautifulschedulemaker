#!/usr/bin/env tsx

/**
 * Database seeding script for timetables
 * 
 * This script populates the database with sample timetable data
 * for testing and demonstration purposes.
 * 
 * Usage:
 *   npm run seed:db
 *   or
 *   npx tsx scripts/seed-database.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { courses_eg, courses_eg_2, courses_eg_3 } from '../utils/example_courses'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

// Transform example courses to match database schema
function transformCourseForDatabase(course: any) {
  return {
    code: course.code,
    name: course.name,
    color: course.color || '#FFB3BA', // Default color if not provided
    sessions: course.sessions.map((session: any) => ({
      days: Array.isArray(session.day) ? session.day : [session.day],
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location || 'TBD'
    }))
  }
}

async function seedDatabase() {
  console.log('🌱 Seeding database with sample timetable data...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user found.')
      console.log('📝 To seed the database, you need to:')
      console.log('   1. Start your application: npm run dev')
      console.log('   2. Sign up or log in through the web interface')
      console.log('   3. Run this script again')
      console.log('')
      console.log('💡 Alternatively, you can manually create timetables through the web interface.')
      return
    }

    console.log(`👤 Seeding data for user: ${user.email}`)

    // Combine all example courses
    const allCourses = [...courses_eg, ...courses_eg_2, ...courses_eg_3]
    
    // Create sample timetables
    const timetables = [
      {
        name: 'Fall 2024 - Computer Science',
        courses: [courses_eg[0], ...courses_eg_2.slice(1, 4)] // Mix of courses
      },
      {
        name: 'Spring 2024 - General Studies', 
        courses: courses_eg_3 // All general courses
      },
      {
        name: 'Summer 2024 - Intensive',
        courses: [courses_eg_2[0], courses_eg_3[4]] // Just a couple courses
      }
    ]

    for (const timetableData of timetables) {
      console.log(`📋 Creating timetable: ${timetableData.name}`)
      
      // Create timetable
      const { data: timetable, error: timetableError } = await supabase
        .from('timetables')
        .insert({
          user_id: user.id,
          name: timetableData.name
        })
        .select()
        .single()

      if (timetableError) {
        console.error(`❌ Failed to create timetable ${timetableData.name}:`, timetableError.message)
        continue
      }

      console.log(`✅ Created timetable: ${timetable.name} (ID: ${timetable.id})`)

      // Create a sample chat for this timetable
      const sampleMessages = [
        {
          id: `msg-${Date.now()}-1`,
          role: 'user' as const,
          content: `Help me plan my ${timetableData.name} schedule`,
          timestamp: new Date().toISOString()
        },
        {
          id: `msg-${Date.now()}-2`, 
          role: 'assistant' as const,
          content: `I'd be happy to help you plan your ${timetableData.name} schedule! I can help you add courses, modify times, or reorganize your timetable. What would you like to work on?`,
          timestamp: new Date().toISOString()
        }
      ]

      const { data: chat, error: chatError } = await supabase
        .from('timetable_chats')
        .insert({
          timetable_id: timetable.id,
          name: `${timetableData.name} Planning`,
          messages: sampleMessages
        })
        .select()
        .single()

      if (chatError) {
        console.error(`⚠️  Failed to create chat for ${timetableData.name}:`, chatError.message)
      } else {
        console.log(`💬 Created sample chat: ${chat.name}`)
      }

      console.log(`📚 Adding ${timetableData.courses.length} courses to ${timetableData.name}`)
      
      // Note: In a real application, courses would be stored as separate entities
      // For this demo, we're just creating the timetable structure
      // The actual course data would be managed through the application's course store
    }

    console.log('')
    console.log('✅ Database seeding completed successfully!')
    console.log('📊 Created sample timetables with chats')
    console.log('🎯 You can now:')
    console.log('   • View your timetables in the web interface')
    console.log('   • Use the AI chatbot to add the sample courses')
    console.log('   • Test the course management features')
    console.log('')
    console.log('💡 Sample courses available in utils/example_courses.ts')
    console.log('   You can ask the AI chatbot to add them like:')
    console.log('   "Add CSC 2104 Data Structures on Monday to Thursday 9 AM to 12:50 PM in ICT Lab 7"')

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedDatabase()
}

export { seedDatabase }