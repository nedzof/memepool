-- Insert more test creators first
INSERT INTO creators (handle, created_at) VALUES
  ('tech_insider', NOW() - INTERVAL '30 days'),
  ('crypto_sage', NOW() - INTERVAL '25 days'),
  ('meme_lord', NOW() - INTERVAL '20 days'),
  ('bsv_builder', NOW() - INTERVAL '15 days'),
  ('blockchain_news', NOW() - INTERVAL '10 days')
ON CONFLICT (handle) DO NOTHING;

-- Function to generate random BSV amount between 0.1 and 20
CREATE OR REPLACE FUNCTION random_bsv()
RETURNS BIGINT AS $$
BEGIN
  RETURN floor(random() * 1990000000 + 10000000)::BIGINT; -- Between 0.1 and 20 BSV in satoshis
END;
$$ LANGUAGE plpgsql;

-- Insert 100 test posts with varied content
INSERT INTO posts (txid, amount, content, media_url, locked_until, handle_id, created_at)
SELECT
  'test_' || gen_random_uuid() as txid,
  random_bsv() as amount,
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Breaking: ' || (
      CASE (RANDOM() * 4)::INT
        WHEN 0 THEN 'New breakthrough in Bitcoin scalability achieved! 🚀'
        WHEN 1 THEN 'Major enterprise adoption of BSV announced'
        WHEN 2 THEN 'Revolutionary DeFi protocol launches on BSV'
        ELSE 'Record-breaking transaction throughput demonstrated'
      END
    )
    WHEN 1 THEN 'Analysis: ' || (
      CASE (RANDOM() * 4)::INT
        WHEN 0 THEN 'Why BSV is the future of enterprise blockchain'
        WHEN 1 THEN 'Understanding the impact of massive scaling'
        WHEN 2 THEN 'The real value proposition of Bitcoin'
        ELSE 'How nanopayments transform digital commerce'
      END
    )
    WHEN 2 THEN 'Tutorial: ' || (
      CASE (RANDOM() * 4)::INT
        WHEN 0 THEN 'Building your first BSV application'
        WHEN 1 THEN 'Implementing micropayments in web apps'
        WHEN 2 THEN 'Advanced smart contract patterns on BSV'
        ELSE 'Optimizing for high-throughput applications'
      END
    )
    ELSE 'Update: ' || (
      CASE (RANDOM() * 4)::INT
        WHEN 0 THEN 'New milestone reached in BSV development'
        WHEN 1 THEN 'Major protocol upgrade successfully activated'
        WHEN 2 THEN 'Growing ecosystem of BSV applications'
        ELSE 'Increasing institutional interest in BSV'
      END
    )
  END as content,
  'https://placehold.co/600x400/1A1B23/00ffa3?text=BSV+' || (ROW_NUMBER() OVER ()) as media_url,
  830000 + (RANDOM() * 1000)::INT as locked_until,
  (
    CASE (RANDOM() * 5)::INT
      WHEN 0 THEN 'tech_insider'
      WHEN 1 THEN 'crypto_sage'
      WHEN 2 THEN 'meme_lord'
      WHEN 3 THEN 'bsv_builder'
      ELSE 'blockchain_news'
    END
  ) as handle_id,
  NOW() - (INTERVAL '1 day' * (RANDOM() * 30)::INT) as created_at
FROM generate_series(1, 100);

-- Add some locklikes to the posts
INSERT INTO locklikes (txid, post_txid, amount, locked_until, created_at)
SELECT
  'locklike_' || gen_random_uuid() as txid,
  p.txid as post_txid,
  random_bsv() as amount,
  p.locked_until + (RANDOM() * 100)::INT as locked_until,
  p.created_at + (INTERVAL '1 hour' * (RANDOM() * 24)::INT) as created_at
FROM posts p
WHERE p.txid LIKE 'test_%'
AND RANDOM() < 0.7 -- 70% chance of getting a locklike
UNION ALL
SELECT
  'locklike_' || gen_random_uuid() as txid,
  p.txid as post_txid,
  random_bsv() as amount,
  p.locked_until + (RANDOM() * 100)::INT as locked_until,
  p.created_at + (INTERVAL '1 hour' * (RANDOM() * 24)::INT) as created_at
FROM posts p
WHERE p.txid LIKE 'test_%'
AND RANDOM() < 0.4 -- 40% chance of getting a second locklike
UNION ALL
SELECT
  'locklike_' || gen_random_uuid() as txid,
  p.txid as post_txid,
  random_bsv() as amount,
  p.locked_until + (RANDOM() * 100)::INT as locked_until,
  p.created_at + (INTERVAL '1 hour' * (RANDOM() * 24)::INT) as created_at
FROM posts p
WHERE p.txid LIKE 'test_%'
AND RANDOM() < 0.2; -- 20% chance of getting a third locklike

-- Drop the helper function
DROP FUNCTION random_bsv(); 