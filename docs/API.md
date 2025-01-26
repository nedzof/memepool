# Memepool API Documentation

## Wallet Integration

### Wallet Interface

```typescript
interface Wallet {
  type: WalletType;
  name: string;
  icon: string;
  address: string;
  balance: number;
  
  // Core Methods
  isAvailable(): boolean;
  initiateLogin(): Promise<void>;
  getBalance(): Promise<number>;
  getAddress(): Promise<string>;
  
  // Transaction Methods
  sendPayment(to: string, amount: number): Promise<string>;
  signMessage(message: string): Promise<string>;
  verifyMessage(message: string, signature: string, address: string): Promise<boolean>;
}
```

### Wallet Types

```typescript
enum WalletType {
  BSV = 'bsv',
  Manual = 'manual',
  Imported = 'imported'
}
```

## API Endpoints

### Authentication

```typescript
POST /api/auth/login
Content-Type: application/json

{
  "walletAddress": string,
  "signature": string,
  "message": string
}

Response:
{
  "token": string,
  "user": {
    "id": string,
    "address": string,
    "balance": number
  }
}
```

### Memes

```typescript
// Submit new meme
POST /api/memes
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  "file": File,
  "title": string,
  "description": string,
  "tags": string[]
}

Response:
{
  "id": string,
  "txId": string,
  "status": "pending" | "minted"
}

// Get meme details
GET /api/memes/:id
Authorization: Bearer <token>

Response:
{
  "id": string,
  "creator": string,
  "title": string,
  "description": string,
  "fileUrl": string,
  "txId": string,
  "locks": number,
  "status": "pending" | "minted" | "viral" | "failed"
}

// List memes
GET /api/memes
Authorization: Bearer <token>

Query Parameters:
- status: "pending" | "minted" | "viral" | "failed"
- creator: string (wallet address)
- page: number
- limit: number

Response:
{
  "memes": Array<Meme>,
  "total": number,
  "page": number,
  "pages": number
}
```

### Locks

```typescript
// Lock BSV on meme
POST /api/locks
Content-Type: application/json
Authorization: Bearer <token>

{
  "memeId": string,
  "amount": number
}

Response:
{
  "id": string,
  "txId": string,
  "position": number,
  "timestamp": string
}

// Get user locks
GET /api/locks
Authorization: Bearer <token>

Query Parameters:
- memeId: string
- status: "active" | "completed"
- page: number
- limit: number

Response:
{
  "locks": Array<Lock>,
  "total": number,
  "page": number,
  "pages": number
}
```

### Rewards

```typescript
// Claim rewards
POST /api/rewards/claim
Content-Type: application/json
Authorization: Bearer <token>

{
  "lockId": string
}

Response:
{
  "txId": string,
  "amount": number
}

// Get user rewards
GET /api/rewards
Authorization: Bearer <token>

Query Parameters:
- status: "pending" | "claimed"
- page: number
- limit: number

Response:
{
  "rewards": Array<Reward>,
  "total": number,
  "page": number,
  "pages": number
}
```

## WebSocket Events

```typescript
// Connect wallet
socket.on('wallet:connect', (data: {
  address: string,
  balance: number
}));

// Meme status update
socket.on('meme:update', (data: {
  id: string,
  status: string,
  locks: number
}));

// New lock registered
socket.on('lock:new', (data: {
  memeId: string,
  position: number,
  amount: number
}));

// Reward available
socket.on('reward:available', (data: {
  lockId: string,
  amount: number
}));
```

## Error Handling

All API endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error response format:
```typescript
{
  "error": {
    "code": string,
    "message": string,
    "details?: any
  }
}
``` 