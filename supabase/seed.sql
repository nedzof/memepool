-- Clear existing test data
DELETE FROM locklikes WHERE txid LIKE 'test_%';
DELETE FROM posts WHERE txid LIKE 'test_%';

-- Insert 9 test posts
INSERT INTO posts (txid, amount, content, media_url, locked_until, handle_id, created_at)
VALUES 
  (
    'test_txid_1',
    500000000, -- 5 BSV
    'Breaking: Major technological breakthrough in quantum computing announced! 🚀 #tech #innovation',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Quantum+Computing',
    830100,
    'anon',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'test_txid_2',
    200000000, -- 2 BSV
    'New study reveals unexpected benefits of meditation on brain plasticity 🧠 #health #science',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Meditation+Study',
    830150,
    'anon',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'test_txid_3',
    1000000000, -- 10 BSV
    'Exclusive: Revolutionary green energy breakthrough could transform power generation 🌿',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Green+Energy',
    830200,
    'anon',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'test_txid_4',
    150000000, -- 1.5 BSV
    'AI system achieves human-level performance in complex problem-solving tasks 🤖 #AI #future',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=AI+Achievement',
    830250,
    'anon',
    NOW() - INTERVAL '4 hours'
  ),
  (
    'test_txid_5',
    750000000, -- 7.5 BSV
    'Breakthrough in sustainable agriculture could revolutionize food production 🌾 #sustainability',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Sustainable+Agriculture',
    830300,
    'anon',
    NOW() - INTERVAL '5 hours'
  ),
  (
    'test_txid_6',
    300000000, -- 3 BSV
    'New space telescope captures unprecedented images of distant galaxies ✨ #space #astronomy',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Space+Discovery',
    830350,
    'anon',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'test_txid_7',
    900000000, -- 9 BSV
    'Major breakthrough in fusion energy research brings us closer to unlimited clean power 🌟',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Fusion+Energy',
    830400,
    'anon',
    NOW() - INTERVAL '7 hours'
  ),
  (
    'test_txid_8',
    400000000, -- 4 BSV
    'Revolutionary medical treatment shows promising results in clinical trials 💊 #medicine',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Medical+Breakthrough',
    830450,
    'anon',
    NOW() - INTERVAL '8 hours'
  ),
  (
    'test_txid_9',
    600000000, -- 6 BSV
    'Groundbreaking discovery in particle physics challenges standard model 🔬 #physics #science',
    'https://placehold.co/600x400/1A1B23/00ffa3?text=Physics+Discovery',
    830500,
    'anon',
    NOW() - INTERVAL '9 hours'
  );

-- Insert locklikes for the posts
INSERT INTO locklikes (txid, post_txid, amount, locked_until, created_at)
VALUES
  -- Locklikes for post 1
  ('test_locklike_1_1', 'test_txid_1', 300000000, 830150, NOW() - INTERVAL '30 minutes'),
  ('test_locklike_1_2', 'test_txid_1', 200000000, 830200, NOW() - INTERVAL '20 minutes'),
  
  -- Locklikes for post 2
  ('test_locklike_2_1', 'test_txid_2', 400000000, 830250, NOW() - INTERVAL '1 hour'),
  
  -- Locklikes for post 3
  ('test_locklike_3_1', 'test_txid_3', 500000000, 830300, NOW() - INTERVAL '2 hours'),
  ('test_locklike_3_2', 'test_txid_3', 300000000, 830350, NOW() - INTERVAL '1.5 hours'),
  ('test_locklike_3_3', 'test_txid_3', 200000000, 830400, NOW() - INTERVAL '1 hour'),
  
  -- Locklikes for post 5
  ('test_locklike_5_1', 'test_txid_5', 250000000, 830350, NOW() - INTERVAL '4 hours'),
  ('test_locklike_5_2', 'test_txid_5', 150000000, 830400, NOW() - INTERVAL '3.5 hours'),
  
  -- Locklikes for post 7
  ('test_locklike_7_1', 'test_txid_7', 600000000, 830450, NOW() - INTERVAL '6 hours'),
  ('test_locklike_7_2', 'test_txid_7', 400000000, 830500, NOW() - INTERVAL '5.5 hours'),
  
  -- Locklikes for post 9
  ('test_locklike_9_1', 'test_txid_9', 350000000, 830550, NOW() - INTERVAL '8 hours'),
  ('test_locklike_9_2', 'test_txid_9', 250000000, 830600, NOW() - INTERVAL '7.5 hours'); 