#!/usr/bin/env tsx

/**
 * Database setup script for timetables and chats
 * 
 * This script sets up the required database schema for the collapsible sidebar
 * timetables feature including tables, indexes, and RLS policies.
 * 
 * Usage:
 *   npm run setup:db
 *   or
 *   npx tsx scripts/setup-database.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

async function setupDatabase() {
  console.log('🚀 Setting up database schema for timetables and chats...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Read and execute the timetables migration
    console.log('📋 Creating timetables table...')
    const timetablesMigration = `
      -- Create timetables table
      CREATE TABLE IF NOT EXISTS timetables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL
      );

      -- Create updated_at trigger function if it doesn't exist
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create trigger for updated_at
      DROP TRIGGER IF EXISTS update_timetables_updated_at ON timetables;
      CREATE TRIGGER update_timetables_updated_at 
          BEFORE UPDATE ON timetables 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_timetables_user_id ON timetables(user_id);
      CREATE INDEX IF NOT EXISTS idx_timetables_created_at ON timetables(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_timetables_user_active ON timetables(user_id, is_active) WHERE is_active = true;

      -- Enable Row Level Security
      ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own timetables" ON timetables;
      DROP POLICY IF EXISTS "Users can insert their own timetables" ON timetables;
      DROP POLICY IF EXISTS "Users can update their own timetables" ON timetables;
      DROP POLICY IF EXISTS "Users can delete their own timetables" ON timetables;

      -- Create RLS policies
      CREATE POLICY "Users can view their own timetables" ON timetables
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own timetables" ON timetables
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own timetables" ON timetables
          FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own timetables" ON timetables
          FOR DELETE USING (auth.uid() = user_id);
    `

    // First, create a function to execute DDL statements
    const createExecutorFunction = `
      CREATE OR REPLACE FUNCTION execute_ddl_migration(sql_text text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
      END;
      $$;
    `

    const { error: functionError } = await supabase.rpc('exec', { sql: createExecutorFunction })
    if (functionError) {
      // Try alternative approach if exec function doesn't exist
      console.log('⚠️ exec function not available, trying direct table creation...')
      
      // Create tables using individual operations
      const { error: createTimetablesError } = await supabase
        .from('timetables')
        .select('id')
        .limit(1)
      
      if (createTimetablesError && createTimetablesError.message.includes('does not exist')) {
        throw new Error('Database tables do not exist. Please create them manually using the SQL migration files in lib/supabase/migrations/ or through the Supabase dashboard.')
      }
    } else {
      // Execute timetables migration using the function
      const { error: timetablesError } = await supabase.rpc('execute_ddl_migration', { sql_text: timetablesMigration })
      if (timetablesError) {
        throw new Error(`Timetables migration failed: ${timetablesError.message}`)
      }

      console.log('💬 Creating timetable_chats table...')
      const chatsMigration = `
        -- Create timetable_chats table
        CREATE TABLE IF NOT EXISTS timetable_chats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE NOT NULL,
          name TEXT NOT NULL,
          messages JSONB DEFAULT '[]'::jsonb NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        -- Create trigger for updated_at
        DROP TRIGGER IF EXISTS update_timetable_chats_updated_at ON timetable_chats;
        CREATE TRIGGER update_timetable_chats_updated_at 
            BEFORE UPDATE ON timetable_chats 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_timetable_chats_timetable_id ON timetable_chats(timetable_id);
        CREATE INDEX IF NOT EXISTS idx_timetable_chats_created_at ON timetable_chats(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_timetable_chats_timetable_created ON timetable_chats(timetable_id, created_at DESC);

        -- Create GIN index for JSONB messages for efficient querying
        CREATE INDEX IF NOT EXISTS idx_timetable_chats_messages ON timetable_chats USING GIN (messages);

        -- Enable Row Level Security
        ALTER TABLE timetable_chats ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view chats for their own timetables" ON timetable_chats;
        DROP POLICY IF EXISTS "Users can insert chats for their own timetables" ON timetable_chats;
        DROP POLICY IF EXISTS "Users can update chats for their own timetables" ON timetable_chats;
        DROP POLICY IF EXISTS "Users can delete chats for their own timetables" ON timetable_chats;

        -- Create RLS policies
        CREATE POLICY "Users can view chats for their own timetables" ON timetable_chats
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM timetables 
                    WHERE timetables.id = timetable_chats.timetable_id 
                    AND timetables.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can insert chats for their own timetables" ON timetable_chats
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM timetables 
                    WHERE timetables.id = timetable_chats.timetable_id 
                    AND timetables.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can update chats for their own timetables" ON timetable_chats
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM timetables 
                    WHERE timetables.id = timetable_chats.timetable_id 
                    AND timetables.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can delete chats for their own timetables" ON timetable_chats
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM timetables 
                    WHERE timetables.id = timetable_chats.timetable_id 
                    AND timetables.user_id = auth.uid()
                )
            );
      `

      const { error: chatsError } = await supabase.rpc('execute_ddl_migration', { sql_text: chatsMigration })
      if (chatsError) {
        throw new Error(`Chats migration failed: ${chatsError.message}`)
      }
    }

    // Run courses migration
    console.log('📋 Creating courses table...')
    const coursesMigrationPath = path.resolve(process.cwd(), 'lib/supabase/migrations/003_create_courses_table.sql')
    const coursesMigrationSQL = fs.readFileSync(coursesMigrationPath, 'utf8')
    
    const { error: coursesError } = await supabase.rpc('execute_ddl_migration', { sql_text: coursesMigrationSQL })
    if (coursesError) {
      throw new Error(`Courses migration failed: ${coursesError.message}`)
    }

    console.log('✅ Database schema setup completed successfully!')
    console.log('📊 Created tables: timetables, timetable_chats, courses')
    console.log('🔒 Row Level Security policies applied')
    console.log('⚡ Performance indexes created')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase()
}

export { setupDatabase }