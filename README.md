Here's the revised README focusing purely on the locking/news signaling concept with your requested simplifications:

# Clarion - Truth Through Locked Conviction

Clarion surfaces what society *truly* values by ranking news/information based on anonymous BSV locking. No algorithms, influencers, or profiles—just raw financial signaling.

**Live Feed**: [t.me/clarionlive](https://t.me/clarionlive) *(Example Screenshot Below)*  
![Telegram feed showing ranked posts](https://i.imgur.com/4nQ2dbT.png)

## How It Works

### 1. Two Actions Only
```mermaid
graph LR
A[Post] -->|Embed in OP_RETURN| B(On-Chain Storage)
C[Lock] -->|0.001% Fee| D{Rankings Update}
B --> D
D --> E[Telegram Feed]

2. Core Mechanics
Post: Submit text/URL via BSV transaction (0.0001 BSV fee)
OP_RETURN "ClarionPost" "<content>" "<unixtime>"

Lock: Lock BSV on any post (Minimum 1 satoshi)
OP_RETURN "ClarionLock" "<txid>" "<amount>" "<nLockTime>"

Fee: 0.001% of locked amount (deducted automatically)
Lock Duration: 10 minutes (extendable)
3. Dynamic Ranking
Rank=∑(LockedAmount×(1−e−0.1t))where t=minutes remaining

New locks give immediate boosts that decay over 10 minutes

4. Telegram Integration
Bot parses BSV chain every block
Updates Top 50 list in real channel
Posts show:
🔺 #3 (+12) | 💰 4.2 BSV | ⏳ 8m left
"BREAKING: Fed admits inflation errors"
txid: 3f5b8c...a21d

Key Differences from Original
Removed	Added
Prediction markets	Pure locking mechanic
AI memes	Text/URL posts
Complex rewards	Simple 0.001% fee
Multi-phase rounds	Continuous 10m locks
ZK addresses	Full anonymity
Creator economics	No monetization
Simplified Architecture
.
├── chain/               # BSV interaction
│   ├── post.js          ~ Process OP_RETURN posts
│   └── lock.js          ~ Handle nLockTime contracts
├── feed/                # Ranking logic
│   ├── calculator.js    ~ Decaying lock formula
│   └── telegram-bot.js  ~ Push updates to channel
└── contracts/
    └── Lock.scrypt      # Time-lock escrow

Launch Strategy

Phase 1 (Now)
Fork hodlocker for basic locking

Phase 2 (1 Week)
Add Telegram bot with:
def update_rankings(): posts = get_chain_posts() sorted_posts = sorted(posts, key=lambda x: x['locked'], reverse=True) bot.edit_message(TOP50_MSG_ID, render_ranking(sorted_posts))

Phase 3 (2 Weeks)
Add Scrypt time-lock verification:

contract TimeLock {
    PubKey owner;
    int timeout;
    
    public function unlock(SigHashPreimage txPreimage) {
        require(Tx.checkLockTime(timeout));
        require(Tx.checkPreimage(txPreimage));
    }
}


Go Live in 3 Weeks - Focused purely on viral locking mechanic without legacy complexity.
