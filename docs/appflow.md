Flow 1:

graph TD
    A[User Enters App] --> B{Has Wallet?}
    B -->|No| C[Select Wallet Type]
    C --> D[Import/Create Wallet]
    B -->|Yes| E[Connect Wallet]
    D --> F[Wallet Connected]
    E --> F
    F --> G[Access Main Platform]
