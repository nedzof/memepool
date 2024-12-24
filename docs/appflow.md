Flow 1: User Authentication Flow
graph TD
    A[User Enters App] --> B{Has Wallet?}
    B -->|No| C[Select Wallet Type]
    C --> D[Import/Create Wallet]
    B -->|Yes| E[Connect Wallet]
    D --> F[Wallet Connected]
    E --> F
    F --> G[Access Main Platform]

Flow 2: Core Platform Flow
graph TD
    A[Main Platform] --> B{User Type}
    B -->|Creator| C[Creator Flow]
    B -->|Viewer| D[Viewer Flow]
    
    C --> E[Post Meme Video]
    E --> F[Pay BSV Fee]
    F --> G[Enter Active Round]
    
    D --> H[Browse Submission Grid]
    H --> I[Watch Videos]
    I --> J[Pay Per Second]

Flow 3: Payment Distribution Flow
graph TD
    A[User Payment] --> B{Split Payment}
    B -->|50%| C[Direct to Creator]
    B -->|50%| D[Pool Distribution]
    
    D --> E[Platform Fee 10%]
    D --> F[First 100 Users 20%]
    D --> G[Top 3 Creators 20%]

Flow 4: Round Management Flow
graph TD
    A[Bitcoin Block Timer] --> B[Start New Round]
    B --> C[Display Current Meme]
    C --> D[Accept Submissions]
    D --> E[Real-time Voting]
    E --> F[Update Leaderboard]
    F --> G[Block Found]
    G --> H[Distribute Rewards]
    H --> A
