#!/usr/bin/env tsx

/**
 * Run the courses table migration
 * 
 * This script runs the 003_create_courses_table.sql migration
 * 
 * Usage:
 *   npx tsx scripts/run-courses-migration.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

async function runCoursesMigration() {
  console.log('🚀 Running courses table migration...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Read the courses migration file
    const migrationPath = path.resolve(process.cwd(), 'lib/supabase/migrations/003_create_courses_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📋 Creating courses table...')
    
    // Execute the migration
    const { error } = await supabase.rpc('execute_ddl_migration', { sql_text: migrationSQL })
    if (error) {
      throw new Error(`Courses migration failed: ${error.message}`)
    }

    console.log('✅ Courses table migration completed successfully!')
    console.log('📊 Created table: courses')
    console.log('🔒 Row Level Security policies applied')
    console.log('⚡ Performance indexes created')

  } catch (error) {
    console.error('❌ Courses migration failed:', error)
    process.exit(1)
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runCoursesMigration()
}

export { runCoursesMigration }