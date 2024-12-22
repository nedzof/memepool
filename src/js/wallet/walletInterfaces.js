import { fetchBalanceFromWhatsOnChain } from './blockchain.js';

// Get balance with WhatsOnChain
async function getBalance(address) {
    try {
        return await fetchBalanceFromWhatsOnChain(address);
    } catch (error) {
        console.error('Error getting balance:', error);
        return 0;
    }
}

// Initialize Unisat wallet interface
export async function initUnisatWallet() {
    if (!window.unisat) throw new Error('Unisat wallet not found');

    try {
        await window.unisat.requestAccounts();
        const address = await window.unisat.getAccounts().then(accounts => accounts[0]);
        if (!address) throw new Error('No address found');
        
        return {
            type: 'unisat',
            getAddress: () => address,
            getPublicKey: () => address,
            getBalance: () => getBalance(address)
        };
    } catch (error) {
        console.error('Error initializing Unisat wallet:', error);
        throw error;
    }
}

// Initialize OKX wallet interface
export async function initOKXWallet() {
    if (!window.okxwallet) throw new Error('OKX wallet not found');

    try {
        await window.okxwallet.request({ method: 'eth_requestAccounts' });
        const address = await window.okxwallet.request({ method: 'eth_accounts' }).then(accounts => accounts[0]);
        if (!address) throw new Error('No address found');
        
        return {
            type: 'okx',
            getAddress: () => address,
            getPublicKey: () => address,
            getBalance: () => getBalance(address)
        };
    } catch (error) {
        console.error('Error initializing OKX wallet:', error);
        throw error;
    }
}

// Initialize Phantom wallet interface
export async function initPhantomWallet() {
    if (!window.phantom) throw new Error('Phantom wallet not found');

    try {
        const provider = window.phantom?.solana;
        if (!provider?.isPhantom) {
            throw new Error('Phantom wallet is not installed');
        }

        await provider.connect();
        const address = provider.publicKey.toString();
        if (!address) throw new Error('No address found');
        
        return {
            type: 'phantom',
            getAddress: () => address,
            getPublicKey: () => address,
            getBalance: () => getBalance(address),
            disconnect: async () => {
                try {
                    await provider.disconnect();
                } catch (error) {
                    console.error('Error disconnecting Phantom wallet:', error);
                }
            }
        };
    } catch (error) {
        console.error('Error initializing Phantom wallet:', error);
        throw error;
    }
} 