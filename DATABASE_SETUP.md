# Database Setup and Seeding Guide

## Overview

This guide walks you through setting up and seeding your Supabase database for the LLM Timetable application.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the following environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Authentication Setup**: Ensure Supabase Auth is configured in your project.

## Step 1: Database Schema Setup

Run the database setup script to create the required tables:

```bash
npm run setup:db
```

This script creates:
- `timetables` table for storing user timetables
- `timetable_chats` table for storing chat conversations
- Row Level Security (RLS) policies
- Performance indexes
- Triggers for automatic timestamp updates

### Manual Setup (Alternative)

If the automated setup doesn't work, you can manually create the tables in the Supabase SQL Editor:

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the following SQL:

```sql
-- Create timetables table
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for timetables
CREATE TRIGGER update_timetables_updated_at 
    BEFORE UPDATE ON timetables 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timetables_user_id ON timetables(user_id);
CREATE INDEX IF NOT EXISTS idx_timetables_created_at ON timetables(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timetables_user_active ON timetables(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own timetables" ON timetables
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetables" ON timetables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetables" ON timetables
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetables" ON timetables
    FOR DELETE USING (auth.uid() = user_id);

-- Create timetable_chats table
CREATE TABLE IF NOT EXISTS timetable_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create trigger for timetable_chats
CREATE TRIGGER update_timetable_chats_updated_at 
    BEFORE UPDATE ON timetable_chats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for timetable_chats
CREATE INDEX IF NOT EXISTS idx_timetable_chats_timetable_id ON timetable_chats(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetable_chats_created_at ON timetable_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timetable_chats_timetable_created ON timetable_chats(timetable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timetable_chats_messages ON timetable_chats USING GIN (messages);

-- Enable RLS for timetable_chats
ALTER TABLE timetable_chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for timetable_chats
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
```

## Step 2: Verify Database Setup

Check if the database schema was created correctly:

```bash
npm run verify:db
```

## Step 3: Start the Application

Start your Next.js application:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Step 4: Create User Account

1. Navigate to `http://localhost:3000`
2. Sign up for a new account or log in with existing credentials
3. Complete the authentication process

## Step 5: Seed the Database

Once you're authenticated, run the seeding script:

```bash
npm run seed:db
```

This will create:
- 3 sample timetables with different themes
- Sample chat conversations for each timetable
- Demonstration data for testing the application

## Step 6: Explore Sample Data

After seeding, you can:

1. **View Timetables**: Check the sidebar for your sample timetables
2. **Test AI Chatbot**: Use the chat interface to add sample courses
3. **Add Sample Courses**: Try commands like:
   ```
   "Add CSC 2104 Data Structures on Monday to Thursday 9 AM to 12:50 PM in ICT Lab 7"
   "Add INFO 3205 Information Visualization on Monday and Wednesday 10 AM to 11:20 AM"
   "Add MATH 101 Introduction to Mathematics on Monday 9 AM to 10 AM in Main Hall A"
   ```

## Sample Courses Available

The application includes several sets of example courses in `utils/example_courses.ts`:

### Computer Science Courses
- CSC 2104: Data Structures and Algorithms I
- INFO 3205: Information Visualization  
- INFO 4205: Game Technology
- INFO 4302: Mobile Application Development
- INFO 4502: Cyber Law & Ethics
- INFO 4994: Final Year Project II

### General Studies Courses
- MATH 101: Introduction to Mathematics
- PHYS 102: Physics for Beginners
- CHEM 103: Basic Chemistry
- BIOL 104: Biology Essentials
- COMP 105: Programming Fundamentals
- HIST 106: World History
- ECON 107: Principles of Economics

## Troubleshooting

### Database Connection Issues
- Verify your Supabase URL and API key in `.env.local`
- Check that your Supabase project is active
- Ensure you have the correct permissions

### Authentication Issues
- Make sure Supabase Auth is enabled in your project
- Check email confirmation settings
- Verify redirect URLs are configured correctly

### Seeding Issues
- Ensure you're logged in before running the seed script
- Check that the database tables exist
- Verify RLS policies are not blocking operations

### Manual Data Entry
If automated seeding doesn't work, you can:
1. Create timetables manually through the web interface
2. Use the AI chatbot to add courses with natural language
3. Import course data using the JSON import feature

## Next Steps

After successful setup and seeding:

1. **Explore Features**: Test the AI chatbot, timetable management, and chat functionality
2. **Add Your Own Data**: Create your own timetables and courses
3. **Customize**: Modify the sample data in `utils/example_courses.ts` for your needs
4. **Deploy**: When ready, deploy your application with the seeded database

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify your Supabase project configuration
3. Review the database logs in Supabase Dashboard
4. Ensure all environment variables are correctly set

The database is now ready for use with sample data to help you explore and test the application's features!