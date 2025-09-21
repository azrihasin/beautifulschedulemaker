-- Create table for tracking user token usage
CREATE TABLE IF NOT EXISTS user_token_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, usage_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_token_usage_user_date 
  ON user_token_usage(user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_user_token_usage_date 
  ON user_token_usage(usage_date);

-- Enable Row Level Security
ALTER TABLE user_token_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only see their own usage
CREATE POLICY "Users can view own token usage" ON user_token_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy - system can insert/update usage records
CREATE POLICY "System can manage token usage" ON user_token_usage
  FOR ALL USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_token_usage_updated_at 
  BEFORE UPDATE ON user_token_usage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_token_usage IS 'Tracks daily token usage per user for rate limiting';
COMMENT ON COLUMN user_token_usage.user_id IS 'Reference to auth.users.id';
COMMENT ON COLUMN user_token_usage.usage_date IS 'Date of usage (YYYY-MM-DD)';
COMMENT ON COLUMN user_token_usage.tokens_used IS 'Total tokens consumed on this date';
COMMENT ON COLUMN user_token_usage.request_count IS 'Total API requests made on this date';