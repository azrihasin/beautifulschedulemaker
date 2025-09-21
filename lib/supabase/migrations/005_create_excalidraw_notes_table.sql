-- Create excalidraw_notes table for the Three-View Notes System
-- This table stores Excalidraw-powered visual notes with proper user context

CREATE TABLE IF NOT EXISTS excalidraw_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  excalidraw_data JSONB NOT NULL DEFAULT '{}',
  preview_text TEXT DEFAULT '',
  color_accent TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  context_type TEXT DEFAULT 'timetable' CHECK (context_type IN ('timetable', 'course', 'session')),
  context_id TEXT
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_excalidraw_notes_user_id ON excalidraw_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_excalidraw_notes_updated_at ON excalidraw_notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_excalidraw_notes_context ON excalidraw_notes(context_type, context_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_excalidraw_notes_updated_at 
    BEFORE UPDATE ON excalidraw_notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE excalidraw_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own notes
CREATE POLICY "Users can view their own excalidraw notes" ON excalidraw_notes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert their own excalidraw notes" ON excalidraw_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update their own excalidraw notes" ON excalidraw_notes
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own excalidraw notes" ON excalidraw_notes
    FOR DELETE USING (auth.uid() = user_id);