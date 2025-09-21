-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  session_id TEXT, -- References session_id from course sessions JSON
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- Tiptap JSON content
  is_pinned BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create trigger for updated_at
CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_user_timetable ON notes(user_id, timetable_id);
CREATE INDEX IF NOT EXISTS idx_notes_course ON notes(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_session ON notes(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_content ON notes USING GIN(content);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access notes for timetables they own
CREATE POLICY "Users can view notes for their own timetables" ON notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM timetables 
            WHERE timetables.id = notes.timetable_id 
            AND timetables.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert notes for their own timetables" ON notes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM timetables 
            WHERE timetables.id = notes.timetable_id 
            AND timetables.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update notes for their own timetables" ON notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM timetables 
            WHERE timetables.id = notes.timetable_id 
            AND timetables.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete notes for their own timetables" ON notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM timetables 
            WHERE timetables.id = notes.timetable_id 
            AND timetables.user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE notes IS 'Stores context-aware notes tied to timetables, courses, or sessions';
COMMENT ON COLUMN notes.user_id IS 'References the user who owns this note';
COMMENT ON COLUMN notes.timetable_id IS 'References the timetable this note belongs to';
COMMENT ON COLUMN notes.course_id IS 'Optional reference to a specific course (for course-level notes)';
COMMENT ON COLUMN notes.session_id IS 'Optional reference to a specific session (for session-level notes)';
COMMENT ON COLUMN notes.content IS 'Rich text content in Tiptap JSON format';
COMMENT ON COLUMN notes.is_pinned IS 'Whether this note is pinned for quick access';
COMMENT ON COLUMN notes.tags IS 'Array of tags for organization and search';