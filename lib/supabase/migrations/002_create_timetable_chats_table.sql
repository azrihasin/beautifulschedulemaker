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

-- Create RLS policies
-- Users can only access chats for timetables they own
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