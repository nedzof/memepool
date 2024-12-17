// Import BSV library
import * as bsvLib from '@bsv/sdk';

// Export BSV functionality
export const bsv = {
    Script: bsvLib.Script,
    Transaction: bsvLib.Transaction,
    Mnemonic: bsvLib.Mnemonic,
    // Add other BSV functionality as needed
};

// Export utility functions
export function generateMnemonic() {
    const mnemonic = bsvLib.Mnemonic.fromRandom();
    return mnemonic.toString();
}

export function validateMnemonic(mnemonic) {
    return bsvLib.Mnemonic.isValid(mnemonic);
}

export function createWalletFromMnemonic(mnemonic) {
    const mnemonicObj = bsvLib.Mnemonic.fromString(mnemonic);
    return bsvLib.Wallet.fromMnemonic(mnemonicObj);
}

export default bsv;
export class Wallet {
    // ... Wallet class implementation
} 