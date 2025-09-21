#!/usr/bin/env tsx

/**
 * Script to run the excalidraw_notes table migration
 * This creates the new table for the Three-View Notes System
 */

import { MigrationRunner } from '../lib/supabase/migrations'

async function runExcalidrawNotesMigration() {
  console.log('🚀 Running Excalidraw Notes migration...')
  
  try {
    const migrationRunner = new MigrationRunner()
    
    // Run the specific migration for excalidraw_notes
    await migrationRunner.runMigration('005_create_excalidraw_notes_table.sql')
    
    // Verify the schema
    const isValid = await migrationRunner.verifySchema()
    
    if (isValid) {
      console.log('✅ Migration completed successfully!')
      console.log('📋 excalidraw_notes table created with:')
      console.log('   - Proper columns (id, user_id, title, excalidraw_data, etc.)')
      console.log('   - Performance indexes (user_id, updated_at)')
      console.log('   - Row Level Security policies')
      console.log('   - Auto-updating timestamps')
    } else {
      console.log('❌ Schema verification failed')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runExcalidrawNotesMigration()
}

export { runExcalidrawNotesMigration }