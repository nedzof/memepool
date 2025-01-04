# Testnet Wallets

This document contains the details of the testnet wallets used for development and testing.

## Primary Wallet
- **Address**: n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ
- **Private Key (WIF)**: cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy
- **Initial Balance**: 0.00499520 BSV (499,520 satoshis)

## Secondary Wallet
- **Address**: moRTGUhu38rtCFys4YBPaGc4WgvfwB1PSK
- **Private Key (WIF)**: cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6
- **Initial Balance**: 0.00000000 BSV (0 satoshis)

## Usage
These wallets are used for:
1. Testing the inscription creation process
2. Testing the ownership transfer protocol
3. Verifying transaction confirmations
4. Testing the recovery process

## Funding
To fund these wallets:
1. Visit https://faucet.bitcoincloud.net
2. Enter the wallet address
3. Request test BSV

## Important Notes
- These are testnet wallets, only for development and testing
- Never use these private keys on mainnet
- Keep a minimum balance for testing transactions
- Standard fee rate: 1 sat/KB 

## Inscription Verification
To verify an inscription, use the `verify-inscription.mjs` script.

```bash
node scripts/verify-inscription.mjs <txid>
```

- first transaction hash: bac0c81eca6239fa5ab9ac2cccf72dde96b4a2a8c0d7a079992b27b70dfaf459
- second transaction hash: 8eeb73e61e343ff4f9d56dbf9c090c9d7c40aea6bec22c1f247ddd343876eae6
- third (final optimized) transaction hash: 78ec47dcbce5fa62a0c7a2fa2f9badad47f065a3c572621826796f714eaa0bd8
