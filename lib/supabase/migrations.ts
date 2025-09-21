import { createClient } from './client'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Migration runner for Supabase database schema
 * This utility helps apply database migrations programmatically
 */
export class MigrationRunner {
  private supabase = createClient()

  /**
   * Run a specific migration file
   */
  async runMigration(migrationFile: string): Promise<void> {
    try {
      const migrationPath = join(process.cwd(), 'lib/supabase/migrations', migrationFile)
      const sql = readFileSync(migrationPath, 'utf-8')
      
      const { error } = await this.supabase.rpc('exec_sql', { sql })
      
      if (error) {
        throw new Error(`Migration failed: ${error.message}`)
      }
      
      console.log(`✅ Migration ${migrationFile} applied successfully`)
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migrationFile}:`, error)
      throw error
    }
  }

  /**
   * Run all migrations in order
   */
  async runAllMigrations(): Promise<void> {
    const migrations = [
      '001_create_timetables_table.sql',
      '002_create_timetable_chats_table.sql',
      '003_create_courses_table.sql',
      '004_create_notes_table.sql',
      '005_create_excalidraw_notes_table.sql'
    ]

    for (const migration of migrations) {
      await this.runMigration(migration)
    }
  }

  /**
   * Check if tables exist and are properly configured
   */
  async verifySchema(): Promise<boolean> {
    try {
      // Check if timetables table exists
      const { data: timetablesExists } = await this.supabase
        .from('timetables')
        .select('id')
        .limit(1)

      // Check if timetable_chats table exists
      const { data: chatsExists } = await this.supabase
        .from('timetable_chats')
        .select('id')
        .limit(1)

      // Check if courses table exists
      const { data: coursesExists } = await this.supabase
        .from('courses')
        .select('id')
        .limit(1)

      // Check if notes table exists
      const { data: notesExists } = await this.supabase
        .from('notes')
        .select('id')
        .limit(1)

      // Check if excalidraw_notes table exists
      const { data: excalidrawNotesExists } = await this.supabase
        .from('excalidraw_notes')
        .select('id')
        .limit(1)

      return timetablesExists !== null && chatsExists !== null && coursesExists !== null && notesExists !== null && excalidrawNotesExists !== null
    } catch (error) {
      console.error('Schema verification failed:', error)
      return false
    }
  }
}

/**
 * Utility function to create the exec_sql function in Supabase
 * This needs to be run once in the Supabase SQL editor with admin privileges
 */
export const CREATE_EXEC_SQL_FUNCTION = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`