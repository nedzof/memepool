Memepool Documentation
The Decentralized Truth Machine

██████ weaponizes viral content markets to become humanity's financial conscience ██████. By merging AI-generated 3D memes with Bitcoin SV's micropayment capabilities, we create anonymous information battlefields where truth wins through economic proof, not algorithmic manipulation.

Web3 vs Web2: Truth Wars
Traditional Platforms

- Algorithmic amplification of rage/fear 
- Free propaganda channels for governments/corps
- Thought control via engagement-optimized feeds
Memepool's Truth Protocol

+ Virality = Locked BSV conviction 
+ 90% failed narratives fund future truth bombs
+ Immutable hypocrisy ledgers on blockchain
Battlefield	Memepool	Web2 Platforms
Truth Verification	Economic proof (BSV locks)	Likes/Bots
Failure Recycling	90%→Next Truth War	Value Blackhole
Censorship	On-chain immutability	Shadowban Tools
Core Mechanics: Truth Warfare
Anonymous Meme Nukes
Users submit ██████ memeized evidence packages ██████ containing:
Video comparisons (official statements vs reality)
Data clashes (reported stats vs raw numbers)
AI-generated "what if" scenarios mocking narratives
Economic Conviction Locks
Participants lock BSV to memes they believe will destroy mainstream narratives. Early lockers gain 10x rewards over latecomers.

Schrödinger's Truth Engine

````graph LR
    Joke -->|Mass Locking| Proto-Truth -->|BSV Threshold| AcceptedFact  
    MSM[Mainstream Media] -->|Forced Coverage| FeedbackLoop --> MoreLocks
````
Failed Propaganda Fuel
90% of BSV from unmemed narratives automatically funds future rounds. ██████ Governments accidentally finance truth by pushing flopped psyops ██████
Key Code Conflict Point

// Censorship impossibility once meme gains traction
function attemptCensor(memeId: string) {
  const locks = getChainLocks(memeId); // BSV blockchain
  if (locks > currentThreshold) {
    throw Error("Propaganda FAILED: Truth already economically verified");
  }
  // Too late - meme is now immutable
}
Let's discuss:

██████ placeholder tone - "weaponizes" vs "transforms"?
Depth of political references - acceptable risk?
How technical to keep the intro vs societal impact balance
Want to refine any section first?

## Block Round Lifecycle  
*A 10-minute competitive window where memes battle for virality through collective locking:*

### 1. **Pre-Round Threshold Adjustment**  
Before each round begins:  
```math
Tₙ = 0.7T_{prev} + 0.3\left(\frac{1}{12}\sum_{k=1}^{12} S_{last12}\right)
```  
Where:  
- `S_last12` = Total BSV locked in previous 12 blocks  
- Threshold auto-adjusts even if no new activity occurs  

### 2. Submission Phase  
*Creators pay a dynamic fee to participate - ensuring anti-spam while aligning costs with network activity.*

```typescript
// Gets current lock difficulty
function getLockDifficulty(threshold: number): number {
  const calculated = 0.000004 * Math.pow(threshold, 1.2);
  return Math.max(0.01, calculated); // $0.01 floor
}

// Creator submits meme
async function submitMeme(creator: string, memeData: string) {
  const currentThreshold = await getCurrentThreshold();
  const fee = getLockDifficulty(currentThreshold);
  
  // Lock BSV to blockchain
  const tx = await bsv.sendPayment({
    from: creator,
    to: MEMEPOOL_ADDRESS,
    amount: fee
  });
  
  // Store meme with locked TX ID
  storeMeme(memeData, tx.id); 
}
```

**Fixed Per-Block Fee**  
   - All creators pay same `Dₙ` during a block round  
   - Formula:  
     ```math
     Dₙ = \max(\$0.01,\ 0.000004Tₙ^{1.2})
     ```  
     Where `Tₙ` = pre-calculated threshold from last 12 blocks  

**Example Flow**:  
1. Block 150 starts with Tₙ = 1,000 BSV (from prior 12 blocks)  
2. Dₙ = max($0.01, 0.000004*1000^1.2) = $0.38  
3. All creators in Block 150 pay $0.38 to submit memes  
4. Paid BSV locks to memepool address become redeemable if meme goes viral  


### 3. **Locking Phase**  
*New users earn starter BSV by predicting 3/10 viral memes correctly, unlocking a faucet pass to either create content or grind more predictions – so no BSV needed to start.*

**Onboarding Flow**:  
```mermaid
graph TD
    A[New User] --> B{{Predict 3/10 Virals}}
    B -->|Success| C[Faucet Pass]
    C -->|Lock| D[Meme Creation]
    C -->|Grind| B
```


  *Participants lock BSV to signal belief in a meme's virality while securing their reward position. Locking BSV acts as a prediction that the meme will hit its threshold*

```typescript
const MAX_LOCKS = 3; // Per user per round

const registerLock = (memeId: string, user: string) => {
  const locks = getUserLocksThisRound(user);
  if (locks >= MAX_LOCKS) {
    throw Error("Max 3 locks/round");
  }
  
  const globalPos = getChainLockCount() + 1;
  writeOrdinal(globalPos); // BSV timestamp
  trackParticipation(user); 
};
```

```mermaid
graph TD
    A[User Locks BSV] --> B{{Top 10%?}}
    B -->|Yes| C[10x-1x Reward Scaling]
    B -->|No| D[No Earnings]
    C --> E[Position Stored on BSV going to jackpot]
```


### 4. **Termination & Payout**  
**Success (S ≥ Tₙ):**  
```mermaid
graph TD
    A[Total Pool] --> B[Top 3 Memes: 50%] 
    A --> C[Top 10% Lockers: 49%]
    A --> D[Community Fund: 1%]
```

**New Reward Formula (10x Decay):**  
```math
Rᵥ = \frac{0.49\text{Pool}}{10N} \times \left(11 - \frac{10\text{LockPos}}{N}\right)
```
Where:  
- `N` = Total participants in round  
- Only top 10% (0.1N) qualify  
- First locker gets 10x last qualifier:  
  ```math
  \text{First Reward} = 10 \times \text{Last Qualifier Reward}
  ```

**Example**: 1000 participants (top 100 rewarded):  
- Position 1: `(11 - 10/1000) × 0.49/1000 ≈ 0.00539 BSV`  
- Position 100: `(11 - 1000/1000) × 0.49/1000 ≈ 0.00049 BSV`  
- Exact 10x difference maintained



**Failure (S < Tₙ):**  
- 90% → Next jackpot  
- 10% → Community fund  

## 🧮 Key Formulas

**1. Adaptive Threshold**

```math
T_{n+1} = 0.7T_n + 0.3\left(\frac{1}{12}\sum_{k=1}^{12} S_{n-k}\right)
```

**2. Lock Difficulty**  
```math
D_{n+1} = \begin{cases} 
0.000004T_{n+1}^{1.2} & \text{if ≥ \$0.01} \\
\$0.01 & \text{floor}
\end{cases}
```

**3. Reward Distribution**  
```math
Rᵥ = \frac{0.49\text{Pool}}{\sum_{k=1}^{N}\frac{1}{\sqrt{k}}} \times \frac{1}{\sqrt{\text{LockPos}}}
```

**4. Qualification & Decay**:  
```math
\text{Qualified} = \begin{cases} 
1 & \text{if LockPos ≤ 0.1N} \\
0 & \text{otherwise}
\end{cases}
```

**5. Decaying Multipliers**:  
```math
\text{Multiplier} = 11 - \frac{10\text{LockPos}}{N}
```
---

Here's a comprehensive Mermaid diagram capturing Memepool's full lifecycle:

```mermaid
%%{init: {'theme':'neutral', 'themeVariables': { 'primaryColor': '#ffd700', 'edgeLabelBackground':'#fff0d0'}}}%%
graph TD
    A[Start Round] --> B[Calculate Threshold Tₙ]
    B --> C[[Submission Phase]]
    C --> D[Creators Lock BSV Fee]
    D -->|Dynamic Fee Dₙ| E[Meme Minted]
    E --> F[[Locking Phase]]
    F --> G{New User?}
    G -->|Yes| H[Predict 3/10 Virals]
    H -->|Success| I[Get Faucet BSV]
    H -->|Fail| J[Cooldown 1hr]
    I --> F
    G -->|No| K[Lock BSV on Memes]
    K --> L{{≤3 Locks/Round?}}
    L -->|Yes| M[Record Lock Position]
    L -->|No| N[Blocked]
    M --> O[[Evaluation Phase]]
    O --> P{Total Locks ≥ Tₙ?}
    P -->|Success| Q[Distribute Rewards]
    Q --> R[Top 3 Memes:50%]
    Q --> S[Top 10% Lockers:49%]
    Q --> T[Community Fund:1%]
    S --> U[10x Decay Formula]
    P -->|Failure| V[Recycle Funds]
    V --> W[90% → Next Jackpot]
    V --> X[10% → Community Pool]
    W --> Y[Compound Virality]
    X --> Z[Subsidize New Creators]
    Z --> A
    Y --> A

    style A fill:#4CAF50,stroke:#388E3C
    style Q fill:#2196F3,stroke:#1976D2
    style V fill:#FF5722,stroke:#E64A19
    style H fill:#9C27B0,stroke:#7B1FA2
    linkStyle 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16 stroke:#FFD700,stroke-width:2px
```
