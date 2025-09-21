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

-- Create RLS policies
CREATE POLICY "Users can view their own timetables" ON timetables
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetables" ON timetables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetables" ON timetables
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetables" ON timetables
    FOR DELETE USING (auth.uid() = user_id);