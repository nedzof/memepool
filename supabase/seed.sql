-- Insert a test post
INSERT INTO posts (txid, amount, content, media_url, locked_until, handle_id, created_at)
VALUES (
  'test_txid_1',
  100000000, -- 1 BSV
  'Test post content',
  'https://placehold.co/600x400/1A1B23/00ffa3?text=Test+Post',
  830100, -- Some future block
  'anon',
  NOW()
)
ON CONFLICT (txid) DO NOTHING;

-- Insert a test locklike
INSERT INTO locklikes (txid, post_txid, amount, locked_until, created_at)
VALUES (
  'test_locklike_txid_1',
  'test_txid_1',
  50000000, -- 0.5 BSV
  830200, -- Some future block
  NOW()
)
ON CONFLICT (txid) DO NOTHING; 