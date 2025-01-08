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
Tests the transfer of an inscription from one wallet to another on the testnet, including protection mechanisms.

### Usage
```bash
node scripts/test-ownership-transfer.mjs <inscription-txid>
```

### Parameters
- `inscription-txid`: Transaction ID of the inscription to transfer

### Process
1. Verifies inscription security:
   - Traces transaction chain to find latest owner
   - Verifies inscription format
   - Checks confirmation count
   - Validates UTXO status
   - Verifies protection marker

2. Creates transfer transaction:
   - Consumes inscription UTXO
   - Creates new protected output for recipient
   - Includes protection marker in recipient's output
   - Returns change to sender if needed

3. Broadcasts transaction and provides verification commands

### Output
The script will show:
- Security check results
- Transfer transaction creation
- New transaction ID
- Commands for verifying the transfer

### Notes
- Requires 6 confirmations for transfer completion
- Uses minimal amount (100 satoshis) for transfer
- Monitors transfer status for up to 5 minutes

## Verify Inscription Script

**File**: `scripts/verify-inscription.mjs`

### Purpose
Verifies an inscription's content, format, ownership, and protection status.

### Usage
```bash
node scripts/verify-inscription.mjs <txid>
```

### Process
1. Traces transaction chain:
   - Forward to find current owner
   - Backward to find original inscription

2. Verifies:
   - Inscription format and content
   - Protection marker presence
   - Current ownership
   - Creator information
   - Video data integrity

### Output
- Transaction details
- Inscription metadata
- Video data analysis
- Current owner information
- Creator verification
- Protection status

### Notes
- Extracts and saves the video file for verification
- Verifies MP4 format integrity
- Checks inscription format compliance
- Analyzes transaction fee rates

## Verify Ownership Script

**File**: `scripts/verify-ownership.mjs`

### Purpose
Traces and verifies the current owner of an inscription through the UTXO chain.

### Usage
```bash
node scripts/verify-ownership.mjs <txid>
```

### Process
1. Traces UTXO chain to latest transaction
2. Extracts owner from P2PKH script
3. Verifies protection marker
4. Shows ownership history

### Output
- Current owner address
- Transaction confirmations
- Protection status
- Balance information
- Ownership history

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