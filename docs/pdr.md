# Product Design Requirements

## Related Documentation
- [Specifications](./specifications.md) - For business rules and monetization
- [Frontend Implementation](./frontend.md) - For UI/UX implementation
- [Round System](./round_system.md) - For round mechanics

## 1. Product Vision
Memepool transforms static memes into 3D animations using AI, creating a competitive creative platform where creators and viewers participate in synchronized rounds for crypto rewards.

### Value Proposition
- Instant monetization of meme content
- Fair reward distribution system
- Competitive creative environment
- Community-driven content curation

## 2. User Stories

### Creator Stories
1. **Content Creation**
   - As a creator, I want to inscribe 3D memes and make money
   - As a creator, I want to preview my transformed content
   - As a creator, I want to track my content performance
   - As a creator, I want to understand my earnings

2. **Competition**
   - As a creator, I want to see my ranking in each round
   - As a creator, I want to understand voting patterns
   - As a creator, I want to improve my creation strategy

### Viewer Stories
1. **Content Discovery**
   - As a viewer, I want to browse trending memes
   - As a viewer, I want to find specific creators
   - As a viewer, I want to participate in rounds
   - As a viewer, I want to earn early viewer rewards

2. **Engagement**
   - As a viewer, I want to support creators I like
   - As a viewer, I want to track my viewing history
   - As a viewer, I want to share interesting memes

### Owner Stories
1. **Asset Management**
   - As an owner, I want to track my meme portfolio
   - As an owner, I want to monitor revenue streams
   - As an owner, I want to trade my meme assets
   - As an owner, I want to verify ownership history

2. **Market Participation**
   - As an owner, I want to list memes for sale
   - As an owner, I want to see market trends
   - As an owner, I want to manage multiple assets
   - As an owner, I want to receive instant payments

## 3. Feature Requirements

### Core Features
1. **Meme Transformation**
   - AI-powered 3D conversion
   - Preview capabilities
   - Edit options

2. **Round System**
   - Block synchronized rounds
   - Real-time engagement tracking
   - Transparent scoring
   - Instant rewards

3. **Marketplace**
   - Direct P2P trading
   - Price discovery mechanism
   - Ownership tracking
   - Transaction history

### User Experience
1. **Content Discovery**
   - Trending section
   - Creator profiles
   - Search functionality
   - Content filters

## 4. Toast Notification Requirements

1. Content Categories & Rules

Display Rules:
- Maximum 20 notifications per minute
- Each toast shows for exactly 3.5 seconds
- Maximum 2 toasts visible simultaneously
- Position: Bottom right corner
- Size: Maximum 300px width

Language Style Requirements:
Must Include:
- "fr fr", "no cap", "bussin"
- References to "ratio", "based", "chad"
- Mock corporate/formal language
- Platform references (LinkedIn, Excel, Facebook)
- Emojis: 💀 🔥 ⚡ 🚨 👑 ⏰ ⚠️

Never Use:
- Formal business language
- Complete sentences
- Professional terms
- Traditional punctuation
- More than 15 words per toast

Tone Requirements:
- Sarcastic towards corporate culture
- Dismissive of traditional technology
- Celebrates fast/chaotic decisions
- Mocks careful planning/thinking
- Emphasizes speed over process

Format Rules:
- Start with emoji when mocking (💀 or 🚨)
- Use brackets [X] for dynamic numbers
- Use quotation marks for user/creator names
- Use ALL CAPS for urgent notifications
- Use "..." for suspense in FOMO notifications

2. Required Notification Types / Examples

FOMO Notifications:
- "[X] boomers failed to understand your meme"
- "Your meme is making millennials feel ancient rn"
- "[Creator] is speed-running past your meme score"

Achievement Notifications:
- "Certified No-Boomer-Energy Award 🏆"
- "You've crashed [X] Excel spreadsheets with this meme"
- "Made [X] LinkedIn users question their existence"

Competition Notifications:
- "Only 2 gigachads ahead in meme race"
- "Your meme processing speed > [Boomer name]'s dial-up brain"
- "Out-meming 99% of Facebook users"

Social Proof Notifications:
- "[X] people canceled LinkedIn Premium to view your meme"
- "[Creator] says your meme isn't giving email signature energy"
- "Your meme caused [X] boomers to rage-quit"

Urgency Notifications:
- "Quick! Before boomers learn what [trend] means"
- "Only [X] mins before this becomes Facebook-tier"
- "⚡ Ratio potential detected: Act fast"

3. Required Dynamic Variables
- User counts [X]
- Creator names
- Time remaining
- Trend names
- Platform references (Facebook, LinkedIn, Excel etc)
- Achievement metrics

4. Notification Logic
- Randomize selection within categories
- Do not repeat same notification within 10 minutes
- Scale frequency based on user activity
- Prioritize notifications based on real-time events

## 5. Comments
### Sample Prompt for Toast Notification
Here's the improved prompt with a sharper focus on meme culture and generational humor:
Act as a Gen Z cultural psychology expert specializing in viral meme engagement. Design toast notifications that blend addictive engagement with generational humor for a meme platform. Focus on these categories:

FOMO Triggers:
1. "💀 [X] boomers just failed to understand your meme"
2. "🔥 Your meme is making millennials feel ancient rn"
3. "⚡ [Creator] is speed-running past your meme score"

Achievement Recognition:
1. "Certified No-Boomer-Energy Award 🏆"
2. "You've crashed [X] Excel spreadsheets with this meme"
3. "Achievement: Made [X] LinkedIn users question their existence"

Competition Triggers:
1. "Only 2 gigachads ahead of you in the meme race"
2. "Your meme processing speed > [Boomer name]'s dial-up brain"
3. "You're out-meming 99% of Facebook users (low difficulty)"

Social Proof:
1. "⚠️ [X] people canceled their LinkedIn Premium to view your meme"
2. "[Creator] says your meme isn't giving email signature energy"
3. "Your meme caused [X] boomers to rage-quit"

Urgency Triggers:
1. "Quick! Before the boomers learn what [trend] means"
2. "Trend alert: Only [X] mins before this becomes Facebook-tier"
3. "⚡ Ratio potential detected: Act fast"

Rules:
- Max 20 notifications/minute
- Each notification roasts corporate/boomer culture
- Notifications get spicier with user engagement
- Dynamic cringe detection algorithm
- Auto-detects and mocks corporate speech patterns

Analyze /docs for platform specifics and optimize for maximum generational humor impact.