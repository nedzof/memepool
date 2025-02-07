-- Create creators table first since it will be referenced by posts
CREATE TABLE IF NOT EXISTS creators (
  handle TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create posts table with foreign key to creators
CREATE TABLE IF NOT EXISTS posts (
  txid TEXT PRIMARY KEY,
  amount BIGINT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  locked_until BIGINT NOT NULL,
  handle_id TEXT NOT NULL REFERENCES creators(handle),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create locklikes table with foreign key to posts
CREATE TABLE IF NOT EXISTS locklikes (
  txid TEXT PRIMARY KEY,
  post_txid TEXT NOT NULL REFERENCES posts(txid),
  amount BIGINT NOT NULL,
  locked_until BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS posts_handle_id_idx ON posts(handle_id);
CREATE INDEX IF NOT EXISTS locklikes_post_txid_idx ON locklikes(post_txid);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

-- Insert a default 'anon' creator if it doesn't exist
INSERT INTO creators (handle) 
VALUES ('anon')
ON CONFLICT (handle) DO NOTHING; 