# Excalidraw Notes Migration

## Overview

This migration creates the `excalidraw_notes` table for the Three-View Notes System, enabling users to create and manage visual notes using Excalidraw integration.

## Migration: 005_create_excalidraw_notes_table.sql

### What it creates:

1. **excalidraw_notes table** with the following structure:
   - `id`: UUID primary key (auto-generated)
   - `user_id`: Foreign key to auth.users table
   - `title`: Note title (default: 'Untitled Note')
   - `excalidraw_data`: JSONB field storing Excalidraw scene data
   - `preview_text`: Generated text preview for list view
   - `color_accent`: Hex color for visual accent (default: '#3b82f6')
   - `created_at`: Creation timestamp
   - `updated_at`: Last modification timestamp (auto-updated)
   - `context_type`: Note context ('timetable', 'course', 'session')
   - `context_id`: Associated context identifier

2. **Performance indexes**:
   - `idx_excalidraw_notes_user_id`: For user-specific queries
   - `idx_excalidraw_notes_updated_at`: For chronological sorting
   - `idx_excalidraw_notes_context`: For context-based filtering

3. **Row Level Security (RLS)**:
   - Users can only access their own notes
   - Policies for SELECT, INSERT, UPDATE, DELETE operations

4. **Triggers**:
   - Auto-update `updated_at` timestamp on modifications

## Running the Migration

### Option 1: Using the migration runner
```bash
npm run migrate
```

### Option 2: Manual execution in Supabase SQL Editor
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `005_create_excalidraw_notes_table.sql`
4. Execute the query

## Verification

After running the migration, verify the table was created:

```sql
-- Check table structure
\d excalidraw_notes;

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'excalidraw_notes';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE tablename = 'excalidraw_notes';
```

## TypeScript Integration

The database types have been automatically updated in `lib/supabase/database.types.ts` to include the new table structure. This provides full type safety when working with excalidraw notes in the application.

## Usage Example

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Create a new note
const { data, error } = await supabase
  .from('excalidraw_notes')
  .insert({
    user_id: userId,
    title: 'My Visual Note',
    excalidraw_data: sceneData,
    preview_text: 'Generated preview...',
    color_accent: '#3b82f6',
    context_type: 'timetable',
    context_id: timetableId
  });

// Fetch user's notes
const { data: notes } = await supabase
  .from('excalidraw_notes')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });
```

## Rollback

If you need to rollback this migration:

```sql
-- Remove the table (this will also remove indexes and policies)
DROP TABLE IF EXISTS excalidraw_notes CASCADE;

-- Remove the trigger function if no other tables use it
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Related Files

- **Migration**: `lib/supabase/migrations/005_create_excalidraw_notes_table.sql`
- **Types**: `lib/supabase/database.types.ts`
- **Utilities**: `lib/excalidraw-notes-utils.ts`
- **Type Definitions**: `lib/types/three-view-notes.ts`
- **Spec**: `.kiro/specs/three-view-notes-system/`