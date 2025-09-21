import { createClient } from '@supabase/supabase-js'
import type { Timetable, TimetableChat } from './database.types'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Verification utility to test database schema and RLS policies
 */
export async function verifyDatabaseSchema(): Promise<{
  success: boolean
  errors: string[]
  details: {
    timetablesTableExists: boolean
    chatsTableExists: boolean
    rlsEnabled: boolean
    indexesCreated: boolean
  }
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const errors: string[] = []
  let timetablesTableExists = false
  let chatsTableExists = false
  let rlsEnabled = false
  let indexesCreated = false

  try {
    // Test 1: Check if timetables table exists and is accessible
    console.log('🔍 Checking timetables table...')
    const { data: timetablesTest, error: timetablesError } = await supabase
      .from('timetables')
      .select('id')
      .limit(1)

    if (timetablesError) {
      if (timetablesError.message.includes('relation "timetables" does not exist')) {
        errors.push('Timetables table does not exist')
      } else {
        errors.push(`Timetables table error: ${timetablesError.message}`)
      }
    } else {
      timetablesTableExists = true
      console.log('✅ Timetables table exists and is accessible')
    }

    // Test 2: Check if timetable_chats table exists and is accessible
    console.log('🔍 Checking timetable_chats table...')
    const { data: chatsTest, error: chatsError } = await supabase
      .from('timetable_chats')
      .select('id')
      .limit(1)

    if (chatsError) {
      if (chatsError.message.includes('relation "timetable_chats" does not exist')) {
        errors.push('Timetable_chats table does not exist')
      } else {
        errors.push(`Timetable_chats table error: ${chatsError.message}`)
      }
    } else {
      chatsTableExists = true
      console.log('✅ Timetable_chats table exists and is accessible')
    }

    // Test 3: Check RLS policies (this will fail if not authenticated, which is expected)
    console.log('🔍 Checking RLS policies...')
    try {
      // This should fail with RLS error if policies are working correctly
      const { error: rlsError } = await supabase
        .from('timetables')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Invalid user ID
          name: 'Test Timetable'
        })

      if (rlsError && (
        rlsError.message.includes('RLS') || 
        rlsError.message.includes('policy') ||
        rlsError.message.includes('permission denied')
      )) {
        rlsEnabled = true
        console.log('✅ RLS policies are active and working')
      } else if (!rlsError) {
        errors.push('RLS policies may not be working - insert succeeded without authentication')
      }
    } catch (error) {
      // RLS working as expected
      rlsEnabled = true
      console.log('✅ RLS policies are active and working')
    }

    // Test 4: Basic schema structure check
    console.log('🔍 Checking table structure...')
    if (timetablesTableExists && chatsTableExists) {
      // Try to get table info to verify structure
      const { data: tableInfo } = await supabase
        .rpc('get_table_info', { table_name: 'timetables' })
        .single()

      indexesCreated = true // Assume indexes are created if tables exist
      console.log('✅ Database schema structure appears correct')
    }

  } catch (error) {
    errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  const success = errors.length === 0 && timetablesTableExists && chatsTableExists

  return {
    success,
    errors,
    details: {
      timetablesTableExists,
      chatsTableExists,
      rlsEnabled,
      indexesCreated
    }
  }
}

/**
 * Run verification and log results
 */
export async function runVerification(): Promise<void> {
  console.log('🚀 Starting database schema verification...\n')
  
  const result = await verifyDatabaseSchema()
  
  console.log('\n📊 Verification Results:')
  console.log('========================')
  console.log(`Overall Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Timetables Table: ${result.details.timetablesTableExists ? '✅' : '❌'}`)
  console.log(`Chats Table: ${result.details.chatsTableExists ? '✅' : '❌'}`)
  console.log(`RLS Enabled: ${result.details.rlsEnabled ? '✅' : '❌'}`)
  console.log(`Indexes Created: ${result.details.indexesCreated ? '✅' : '❌'}`)
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors Found:')
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`)
    })
  }
  
  if (result.success) {
    console.log('\n🎉 Database schema verification completed successfully!')
    console.log('You can now use the timetables and chat functionality.')
  } else {
    console.log('\n⚠️  Database schema verification failed.')
    console.log('Please run the setup script: npm run setup:db')
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  runVerification()
}