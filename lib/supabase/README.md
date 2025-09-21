# Supabase Database Schema

This directory contains the database schema and migration files for the timetables and chat functionality.

## Database Tables

### `timetables`
Stores user timetables with the following structure:
- `id` (UUID, Primary Key) - Unique identifier
- `user_id` (UUID, Foreign Key) - References auth.users(id)
- `name` (TEXT) - User-defined name for the timetable
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp (auto-updated)
- `is_active` (BOOLEAN) - Soft delete flag

### `timetable_chats`
Stores chat conversations associated with timetables:
- `id` (UUID, Primary Key) - Unique identifier
- `timetable_id` (UUID, Foreign Key) - References timetables(id)
- `name` (TEXT) - Chat conversation name
- `messages` (JSONB) - Array of chat messages
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp (auto-updated)

## Security

### Row Level Security (RLS)
Both tables have RLS enabled with policies that ensure:
- Users can only access their own timetables
- Users can only access chats for timetables they own
- All CRUD operations are restricted to the authenticated user

### Indexes
Performance indexes are created for:
- User-based queries (`user_id`)
- Time-based sorting (`created_at DESC`)
- Composite queries (`user_id, is_active`)
- JSONB message searching (GIN index)

## Setup

### Option 1: Automated Setup (Recommended)
Run the setup script to automatically create all tables, indexes, and policies:

```bash
npm run setup:db
```

### Option 2: Manual Setup
If you prefer to run the migrations manually in the Supabase SQL editor:

1. Copy and paste the contents of `migrations/001_create_timetables_table.sql`
2. Copy and paste the contents of `migrations/002_create_timetable_chats_table.sql`

### Option 3: Supabase CLI
If you're using the Supabase CLI:

```bash
supabase migration new create_timetables_table
supabase migration new create_timetable_chats_table
# Copy the SQL content to the generated migration files
supabase db push
```

## Usage

### TypeScript Types
Import the generated types for type-safe database operations:

```typescript
import { Timetable, TimetableChat, ChatMessage } from './database.types'
import { createClient } from './client'

const supabase = createClient()

// Type-safe operations
const { data: timetables } = await supabase
  .from('timetables')
  .select('*')
  .eq('user_id', userId)
```

### Example Queries

#### Create a new timetable
```typescript
const { data, error } = await supabase
  .from('timetables')
  .insert({
    user_id: userId,
    name: 'Fall 2024 Schedule'
  })
  .select()
  .single()
```

#### Create a chat for a timetable
```typescript
const { data, error } = await supabase
  .from('timetable_chats')
  .insert({
    timetable_id: timetableId,
    name: 'Course Planning Chat',
    messages: []
  })
  .select()
  .single()
```

#### Update chat messages
```typescript
const { error } = await supabase
  .from('timetable_chats')
  .update({
    messages: [...existingMessages, newMessage]
  })
  .eq('id', chatId)
```

## Migration Files

- `migrations/001_create_timetables_table.sql` - Creates the timetables table with indexes and RLS
- `migrations/002_create_timetable_chats_table.sql` - Creates the timetable_chats table with indexes and RLS
- `migrations.ts` - TypeScript migration runner utility
- `database.types.ts` - Generated TypeScript types for the database schema

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure the user is authenticated and `auth.uid()` returns a valid UUID
2. **Foreign Key Violations**: Verify that the referenced timetable exists and belongs to the user
3. **JSONB Errors**: Ensure messages are valid JSON arrays when inserting/updating

### Verification
To verify the schema is set up correctly:

```typescript
import { MigrationRunner } from './migrations'

const runner = new MigrationRunner()
const isValid = await runner.verifySchema()
console.log('Schema valid:', isValid)
```