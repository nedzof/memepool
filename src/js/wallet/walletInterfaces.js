import { Buffer } from 'buffer';
import * as bitcoin from 'bitcoinjs-lib';
import { generateQRCode } from '../modals/qrCode.js';
import { fetchBalanceFromWhatsOnChain } from '../utils/blockchain.js';

// Wallet interface creation
export async function createWalletInterface(walletType, accounts, publicKey) {
    try {
        console.log(`Creating wallet interface for ${walletType}...`);
        
        // Clean public key (remove 0x prefix if present)
        const cleanPubKey = publicKey.replace('0x', '');
        console.log('Cleaned public key:', cleanPubKey);

        // Convert public key to bytes
        const pubKeyBytes = cleanPubKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        console.log('Public key bytes:', pubKeyBytes);

        // Create legacy address using bitcoinjs-lib
        const { address: legacyAddress } = bitcoin.payments.p2pkh({
            pubkey: Buffer.from(pubKeyBytes),
            network: bitcoin.networks.bitcoin
        });
        console.log('Legacy address calculated:', legacyAddress);

        // Generate QR code with the legacy address
        await generateQRCode(legacyAddress);

        // Create a wallet interface
        return {
            getAddress: () => accounts[0],
            getLegacyAddress: () => legacyAddress,
            getPublicKey: () => publicKey,
            getBalance: async () => {
                try {
                    return await fetchBalanceFromWhatsOnChain(legacyAddress);
                } catch (error) {
                    console.error('Error getting balance:', error);
                    return 0;
                }
            },
            getPrivateKey: () => {
                throw new Error(`Private key access not available through ${walletType} Wallet`);
            },
            getUtxos: async () => {
                throw new Error(`UTXO access not available through ${walletType} Wallet`);
            },
            send: async (toAddress, amount) => {
                try {
                    const txHash = await window[walletType.toLowerCase()].bitcoin.sendTransaction({
                        to: toAddress,
                        value: '0x' + (amount * 1e8).toString(16)
                    });
                    return { txid: txHash };
                } catch (error) {
                    throw new Error('Failed to send transaction: ' + error.message);
                }
            }
        };
    } catch (error) {
        throw new Error(`Failed to create ${walletType} wallet interface: ${error.message}`);
    }
}

// Initialize UniSat wallet
export async function initUnisatWallet() {
    try {
        console.log('Initializing UniSat Wallet...');
        if (!window.unisat) {
            throw new Error('UniSat Wallet not found. Please install UniSat Wallet extension.');
        }

        const accounts = await window.unisat.requestAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in UniSat Wallet');
        }

        const publicKey = await window.unisat.getPublicKey();
        return await createWalletInterface('UniSat', accounts, publicKey);
    } catch (error) {
        throw new Error('Failed to initialize UniSat Wallet: ' + error.message);
    }
}

// Initialize OKX wallet
export async function initOKXWallet() {
    try {
        console.log('Initializing OKX Wallet...');
        if (!window.okxwallet) {
            throw new Error('OKX Wallet not found. Please install OKX Wallet extension.');
        }

        const accounts = await window.okxwallet.bitcoin.requestAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in OKX Wallet');
        }

        const publicKey = await window.okxwallet.bitcoin.getPublicKey();
        return await createWalletInterface('OKX', accounts, publicKey);
    } catch (error) {
        throw new Error('Failed to initialize OKX Wallet: ' + error.message);
    }
} 