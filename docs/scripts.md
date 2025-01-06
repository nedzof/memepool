# Memepool Scripts Documentation

This document provides detailed information about the utility scripts available in the Memepool project.

## Table of Contents
1. [Test Inscription Script](#test-inscription-script)
2. [Test Ownership Transfer Script](#test-ownership-transfer-script)
3. [Verify Inscription Script](#verify-inscription-script)
4. [Verify Ownership Script](#verify-ownership-script)

## Test Inscription Script

**File**: `scripts/test-inscription.mjs`

### Purpose
Creates a test inscription on the BSV testnet using a provided video file.

### Usage
```bash
node scripts/test-inscription.mjs <video-file-path>
```

### Parameters
- `video-file-path`: Path to the MP4 video file to inscribe (max 5 seconds, max 100MB)

### Example
```bash
node scripts/test-inscription.mjs ./test_videos/sample.mp4
```

### Output
The script will output:
- Wallet address being used
- Latest block hash
- Inscription data details
- Transaction ID of the created inscription
- Transaction status

### Notes
- Uses the testnet wallet with private key from `testnet-wallet.js`
- Fee rate is set to 1.1 sats/KB minimum
- Creates inscription with 100 satoshis value output

## Test Ownership Transfer Script

**File**: `scripts/test-ownership-transfer.mjs`

### Purpose
Tests the transfer of an inscription from the primary wallet to a secondary wallet on the testnet.

### Usage
```bash
node scripts/test-ownership-transfer.mjs
```

### Configuration
The script uses two predefined testnet wallets:
- Primary wallet: `cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy`
- Secondary wallet: `cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6`

### Output
The script will show:
- Primary and secondary wallet addresses
- Current ownership verification
- Transfer transaction creation
- Transfer status monitoring
- Final ownership verification

### Notes
- Requires 6 confirmations for transfer completion
- Uses minimal amount (100 satoshis) for transfer
- Monitors transfer status for up to 5 minutes

## Verify Inscription Script

**File**: `scripts/verify-inscription.mjs`

### Purpose
Verifies an inscription's content, format, and ownership on the BSV testnet.

### Usage
```bash
node scripts/verify-inscription.mjs <txid>
```

### Parameters
- `txid`: Transaction ID of the inscription to verify

### Example
```bash
node scripts/verify-inscription.mjs 78ec47dcbce5fa62a0c7a2fa2f9badad47f065a3c572621826796f714eaa0bd8
```

### Output
The script provides detailed information about:
- Transaction status and confirmations
- Inscription metadata
- Video data analysis
- Current ownership
- Fee analysis

### Notes
- Extracts and saves the video file for verification
- Verifies MP4 format integrity
- Checks inscription format compliance
- Analyzes transaction fee rates

## Verify Ownership Script

**File**: `scripts/verify-ownership.mjs`

### Purpose
Traces and verifies the current owner of an inscription by following the transaction chain.

### Usage
```bash
node scripts/verify-ownership.mjs <txid> [expected-owner]
```

### Parameters
- `txid`: Transaction ID of the inscription to check
- `expected-owner` (optional): Address to verify against current ownership

### Example
```bash
node scripts/verify-ownership.mjs 78ec47dcbce5fa62a0c7a2fa2f9badad47f065a3c572621826796f714eaa0bd8
```

### Output
The script shows:
- Initial owner address
- Transfer history (if any)
- Current owner address
- Current owner's balance
- Transaction chain details

### Notes
- Follows the UTXO chain to find current ownership
- Verifies unspent status of outputs
- Shows complete ownership history
- Provides balance information for the current owner

## Common Issues and Troubleshooting

### Rate Limiting
If you encounter rate limiting from the WhatsOnChain API:
- Wait a few minutes before retrying
- Reduce the frequency of script executions
- Use different wallets for testing

### Transaction Not Found
If a transaction is not found:
- Verify the transaction ID is correct
- Check if you're using the right network (testnet)
- Wait for transaction propagation (if recent)

### Insufficient Funds
If you get insufficient funds errors:
- Fund the testnet wallet using a faucet
- Ensure UTXOs are confirmed
- Check if the wallet has enough balance for fees

### API Connection Issues
If you experience API connection problems:
- Check your internet connection
- Verify the WhatsOnChain API status
- Ensure you're using the correct network endpoints 