# Frontend Components

## 1. Global Elements
1.1 Navigation Bar
  - Logo
  - Main bar:
      - How it works
      - Search bar (unified search for memes, users, transactions)
      - Marketplace
   - Wallet connection (supports OKX, Unisat, Phantom, Yours, or manual BSV wallet)

1.2 Wallet Integration
  - Multiple wallet support (OKX, Unisat, Phantom, Yours)
  - Manual wallet generation/import option
  - Secure key management
  - Transaction signing and verification
  - Balance display and management

1.3 Global Notifications
  - Toast notifications:
    - system for rewards
    - transaction notifications
  - Notification center with history

## 2. Home Page
### Meme Pipeline Layout

#### Main Pipeline Display

##### Left Section | "Next Up 🔜"
- Horizontal scrolling pipeline of upcoming memes
- Shows as thumbnail blocks flowing to the right
- Block contents:
  * Dimmed preview thumbnail
  * Countdown timer
  * Creator name
  * Preview stats

##### Center Section | "Now Live 🔥"
- Largest display area
- Currently active meme
- Features:
  * Full-size meme display
  * Large "COMPETE" button
  * Live stats display:
    - Active participants
    - Time up
    - Current ranking
  * Animated border indicating active status

##### Right Section | "Previous 📜"
- Horizontal scrolling pipeline of past memes
- Shows as thumbnail blocks flowing to the right
- Block contents (when hovering):
  * Faded preview thumbnail
  * Final stats
  * Winner indicators

### Submissions Grid

#### Desktop View

┌─────────┐ ┌─────────┐ ┌─────────┐
│ Block 1 │ │ Block 2 │ │ Block 3 │
└─────────┘ └─────────┘ └─────────┘
- 3-column grid
- Equal spacing
- Consistent heights
- Hover previews

#### Mobile View

┌─────────┐
│ Block 1 │
└─────────┘
┌─────────┐
│ Block 2 │
└─────────┘
- Single column
- Full width blocks
- Swipe navigation
- Pull-to-refresh

#### Block Components
- Meme content
- Creator details
- Engagement stats
- Time posted
- Action buttons

## 3. Round System
  - Block-synchronized countup timer
  - Current round status based on BSV block height
  - Submission gallery
  - Real-time engagement metrics

## 4. Wallet Integration  
   - Multi-wallet support
   - Transaction signing
   - Balance display

## 5. Notifications
   - Toast system
   - Max 20/minute
   - 3.5 s display time

## 6. Search Modal  T
### Search Categories
   - Creators (username, bio)
   - Memes (title, tags)
   - Transactions (TxID, block height)
   - Rounds (round number, date)
   
### Quick Filters
   - Top memes: 24h/7d/30d
   - Trending creators
   - Recent transactions
   - Active rounds