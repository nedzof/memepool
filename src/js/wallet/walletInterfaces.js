import { Buffer } from 'buffer';
import * as bitcoin from 'bitcoinjs-lib';
import { generateQRCode } from './qrCode.js';
import { fetchBalance } from './blockchain.js';

// Get balance from provider directly
async function getBalanceFromProvider() {
    try {
        if (window.unisat) {
            const accounts = await window.unisat.requestAccounts();
            if (!accounts || accounts.length === 0) throw new Error('No accounts found');
            const balance = await window.unisat.getBalance();
            return balance.total / 100000000; // Convert satoshis to BSV
        } else if (window.okxwallet) {
            const accounts = await window.okxwallet.requestAccounts();
            if (!accounts || accounts.length === 0) throw new Error('No accounts found');
            const balance = await window.okxwallet.getBalance();
            return balance.total / 100000000;
        }
        return 0;
    } catch (error) {
        console.error('Error getting balance from provider:', error);
        return 0;
    }
}

// Get balance with WhatsOnChain fallback
async function getBalance() {
    try {
        const address = this.getAddress();
        if (!address) {
            console.error('No address available');
            return 0;
        }
        return await fetchBalanceFromWhatsOnChain(address, true);
    } catch (error) {
        console.error('Error getting balance:', error);
        return 0;
    }
}

// Get address safely
async function getUnisatAddress() {
    try {
        const accounts = await window.unisat.requestAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        return accounts[0];
    } catch (error) {
        console.error('Error getting Unisat address:', error);
        return null;
    }
}

async function getOKXAddress() {
    try {
        const accounts = await window.okxwallet.requestAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        return accounts[0];
    } catch (error) {
        console.error('Error getting OKX address:', error);
        return null;
    }
}

// Initialize Unisat wallet interface
export async function initUnisatWallet() {
    if (!window.unisat) {
        throw new Error('Unisat wallet not found');
    }

    try {
        await window.unisat.requestAccounts();
        const address = await window.unisat.getAccounts().then(accounts => accounts[0]);
        
        return {
            type: 'unisat',
            getAddress: () => address,
            getPublicKey: () => address,
            getLegacyAddress: async () => address,
            getConnectionType: () => 'unisat',
            getBalance: async () => {
                try {
                    return await fetchBalance(address);
                } catch (error) {
                    console.error('Error getting balance:', error);
                    return 0;
                }
            }
        };
    } catch (error) {
        console.error('Error initializing Unisat wallet:', error);
        throw error;
    }
}

// Initialize OKX wallet interface
export async function initOKXWallet() {
    if (!window.okxwallet) {
        throw new Error('OKX wallet not found');
    }

    try {
        await window.okxwallet.request({ method: 'eth_requestAccounts' });
        const address = await window.okxwallet.request({ method: 'eth_accounts' }).then(accounts => accounts[0]);
        
        return {
            type: 'okx',
            getAddress: () => address,
            getPublicKey: () => address,
            getLegacyAddress: async () => address,
            getConnectionType: () => 'okx',
            getBalance: async () => {
                try {
                    return await fetchBalance(address);
                } catch (error) {
                    console.error('Error getting balance:', error);
                    return 0;
                }
            }
        };
    } catch (error) {
        console.error('Error initializing OKX wallet:', error);
        throw error;
    }
} 