-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT NOT NULL,
  filter_time BOOLEAN DEFAULT true,
  filter_top BOOLEAN DEFAULT true,
  filter_following BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (user_id)
);

-- Create followed_creators table
CREATE TABLE IF NOT EXISTS followed_creators (
  user_id TEXT NOT NULL,
  creator_handle TEXT NOT NULL REFERENCES creators(handle),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (user_id, creator_handle)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS followed_creators_user_id_idx ON followed_creators(user_id);
CREATE INDEX IF NOT EXISTS followed_creators_creator_handle_idx ON followed_creators(creator_handle);

-- Add trigger to update user_preferences updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 