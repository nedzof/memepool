Zeitgeist - Amplifying Truth Through Locked Conviction

Zeitgeist is a minimalist BSV protocol where users anonymously lock BSV to surface what matters in real-time. By staking value on information, the platform acts as society's truth barometer—ranking content purely by collective financial conviction, not algorithms.

🚀 Key Features
Post Anonymously: No accounts. Submit links/text via BSV OP_RETURN.
Lock BSV as Signal: Use nLockTime to stake on posts you believe in.
Dynamic Truth Feed: Live rankings sorted by locked BSV (0.001% platform fee).
Telegram Integration: Real-time updates of top locked narratives.
Scrypt Smart Contracts: Secure, auditable locking logic on-chain.
⚙️ How It Works
1. Post Content
// Submit post via BSV transaction
async function submitPost(content: string) {
  const tx = await bsv.sendPayment({
    from: 'burner', // Anonymous
    opReturn: ['Z_POST', content]
  });
  return tx.id; // post_id = TX hash
}

// Example OP_RETURN: Z_POST|https://news.com/earthquake

2. Lock BSV to Signal Value
```
// Lock BSV for 10 minutes to boost a post
async function lockBSV(postId: string, amount: number) {
  const fee = amount * 0.000001; // 0.0001% fee
  const lockTime = Math.floor(Date.now() / 1000) + 600; // 10 min

  const contract = new sCrypt.Contract(`
    // Locking contract with nLockTime
    @method
    public function unlock() {
      require(tx.time >= ${lockTime});
    }
  `);

  const tx = await contract.lock(amount - fee)
    .to(postId) // Link lock to post
    .withFee(fee)
    .execute();

  return tx.id;
}
```

3. Dynamic Feed Algorithm
```typescript
// Calculate post rankings every block 
function calculateRankings(posts: Post[]) {
  return posts.sort((a, b) => {
    return b.totalLocked - a.totalLocked; // Descending
  });
}
```

// Telegram Bot Update
```typescript
async function updateChannel() {
  const topPosts = await fetchRankedPosts();
  const message = topPosts.map((post, i) => 
    `${i+1}. [${post.lockedBSV} BSV] ${post.content}`
  ).join('\n');

  await bot.telegram.editMessageText(
    CHANNEL_ID, 
    LAST_MESSAGE_ID,
    undefined, 
    `🔴 LIVE ZEITGEIST RANKINGS:\n\n${message}`
  );
}
```

🏗 Architecture
```mermaid
    A[User] -->|Post with OP_RETURN| B[BSV Blockchain]
    A -->|Lock BSV with nLockTime| B
    C[Indexer] -->|Parse transactions| B
    C --> D[Ranking Engine]
    D -->|Top 50 Posts| E[Telegram Bot]
    E --> F[Real-time Feed]
    D --> G[APIs]
```
BSV Layer
Posts: OP_RETURN with Z_POST|content
Locks: P2SH transactions with nLockTime (10 minutes)
Indexer
Tracks Z_POST transactions and linked locks
Aggregates total locked BSV per post
Ranking Engine
Sorts posts by locked BSV, updates every block
Telegram Frontend
Auto-updating channel with latest rankings
💡 Incentives
For Users
Signal True Value: Lock BSV on underrated info to profit if it trends.
Early Recognition: First lockers gain visibility as posts rise.
0.001% Fee: Minimal cost to participate vs traditional platforms.
For Society
Truth Through Cost: Fake news dies when amplification isn't free.
Uncensorable History: All posts/locks immutable on BSV.
🛠 Setup
# Install dependencies
npm install scrypt-ts @bsv/sdk telegram-bot-api

# Run indexer
npx zeitgeist-indexer --network=mainnet

# Start Telegram bot
BOT_TOKEN=YOUR_TOKEN npx zeitgeist-bot

📈 Why Zeitgeist Wins
Traditional Media	Zeitgeist
Algorithms boost rage	Money amplifies truth
Shadowbanning rife	All content immutable
Celebrities dominate	Anonymous meritocracy
Free to spread lies	Fake news becomes unprofitable
```graph LR
    A[User Sees News] --> B{Value Check}
    B -->|Worth Locking BSV| C[Incentive to Verify]
    B -->|Not Worth Locking| D[Signal Fades]
    C --> E[Collective Truth Emerges]
```
