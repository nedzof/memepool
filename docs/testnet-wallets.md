# Testnet Wallets

This document contains the details of the testnet wallets used for development and testing.

## Primary Wallet
- **Address**: n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ
- **Private Key (WIF)**: cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy
- **Initial Balance**: 0.00499520 BSV (499,520 satoshis)

## Secondary Wallet
- **Address**: moRTGUhu38rtCFys4YBPaGc4WgvfwB1PSK
- **Private Key (WIF)**: cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6
- **Initial Balance**: 0.00199808 BSV (199,808 satoshis)

## Usage
These wallets are used for:
1. Testing the inscription creation process
2. Testing the ownership transfer protocol
3. Verifying transaction confirmations
4. Testing the recovery process

## Important Notes
- These are testnet wallets, only for development and testing
- Never use these private keys on mainnet
- Keep a minimum balance for testing transactions
- Standard fee rate: 1 sat/KB 

## Inscription Verification
To verify an inscription, use the `verify-inscription.ts` script:

```bash
tsx scripts/verify-inscription.ts <txid>
```

Example transaction hashes for testing:
- Latest verified transaction: 2a2b08629121d59ee6ee762110668dc2240f9a2120d729dfeb692d5ce6bb25df

## Testing Scripts
The following TypeScript scripts are available for testing:

1. `test-inscription.ts` - Create and broadcast a new inscription
2. `verify-inscription.ts` - Verify an existing inscription
3. `test-ownership-transfer.ts` - Test ownership transfer of an inscription

All scripts use the testnet network and require the appropriate wallet credentials.

- first successful inscription transfer: 