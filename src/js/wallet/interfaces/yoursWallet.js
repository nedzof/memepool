export async function initYoursWallet() {
    const provider = initProvider();
    if (!provider) {
        throw new Error('Yours Wallet not initialized');
    }

    try {
        const isConnected = await provider.isConnected();
        if (!isConnected) {
            await provider.connect();
        }

        const addresses = await provider.getAddresses();
        
        return {
            type: 'yours',
            provider: provider,
            getAddress: async () => {
                const addresses = await provider.getAddresses();
                return addresses.ordinal;
            },
            getPublicKey: async () => {
                return await provider.connect();
            },
            getLegacyAddress: async () => {
                const addresses = await provider.getAddresses();
                return addresses.payment;
            },
            getConnectionType: () => 'yours',
            getBalance: async () => {
                try {
                    const balance = await provider.getBalance();
                    return parseFloat(balance);
                } catch (error) {
                    console.error('Error getting Yours Wallet balance:', error);
                    return 0;
                }
            },
            isConnected: () => provider.isConnected(),
            disconnect: () => {
                if (typeof provider.disconnect === 'function') {
                    return provider.disconnect();
                }
            },
            on: (event, callback) => {
                if (typeof provider.on === 'function') {
                    try {
                        provider.on(event, callback);
                    } catch (error) {
                        console.warn(`Warning: Event '${event}' not supported by wallet`);
                    }
                }
            }
        };
    } catch (error) {
        console.error('Error initializing Yours Wallet:', error);
        throw error;
    }
}

function initProvider() {
    if ('yours' in window) {
        const provider = window.yours;
        if (provider?.isReady) {
            return provider;
        }
    }
    
    // Open Yours wallet website in new tab
    window.open('https://yours.org', '_blank');
    return null;
} 