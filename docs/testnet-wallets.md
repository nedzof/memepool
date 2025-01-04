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

- first transaction hash: 1d0bb09fe68d003df0438441381d521b437df601dc156e8b809a1168477e9ad6