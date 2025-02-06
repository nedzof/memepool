# Clarion - Decentralized Truth Through Economic Signaling

Clarion leverages Bitcoin SV's nLockTime to create a real-time barometer of societal value. Users anonymously lock BSV to amplify information they deem critical, creating a self-regulating feed ranked purely by economic conviction. The platform takes 0.001% of each lock as its sole fee.

## How It Works

### Core Mechanics
1. **Post**: Submit text/URL via BSV transaction with OP_RETURN
2. **Lock**: Users lock BSV for 10min to boost posts (0.001% fee)
3. **Dynamic Feed**: Real-time ranking based on currently locked BSV
4. **Telegram Integration**: Top 100 posts streamed with lock amounts

```mermaid
graph TD
    A[User Posts] --> B[BSV OP_RETURN Anchoring]
    C[User Locks BSV] --> D[10min nLockTime Contract]
    D -->|0.001% Fee| E[Platform Wallet]
    B --> F[Post Database]
    D --> F
    F --> G[Real-Time Feed Engine]
    G --> H[Telegram Ranking]
    G --> I[Web View]
