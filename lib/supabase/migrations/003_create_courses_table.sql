-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#FFB3BA',
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_timetable_id ON courses(timetable_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_timetable ON courses(user_id, timetable_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- Create GIN index for JSONB sessions column for efficient querying
CREATE INDEX IF NOT EXISTS idx_courses_sessions_gin ON courses USING GIN (sessions);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own courses
CREATE POLICY "Users can view their own courses" ON courses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert courses for their own timetables
CREATE POLICY "Users can insert courses for their timetables" ON courses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM timetables 
      WHERE timetables.id = courses.timetable_id 
      AND timetables.user_id = auth.uid()
    )
  );

-- Users can only update their own courses
CREATE POLICY "Users can update their own courses" ON courses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own courses
CREATE POLICY "Users can delete their own courses" ON courses
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Stores course information tied to specific timetables and users';
COMMENT ON COLUMN courses.user_id IS 'References the user who owns this course';
COMMENT ON COLUMN courses.timetable_id IS 'References the timetable this course belongs to';
COMMENT ON COLUMN courses.code IS 'Course code (e.g., CSC 1100)';
COMMENT ON COLUMN courses.name IS 'Course name (e.g., Elements of Programming)';
COMMENT ON COLUMN courses.color IS 'Hex color code for timetable display';
COMMENT ON COLUMN courses.sessions IS 'JSONB array containing course session details (days, times, location)';