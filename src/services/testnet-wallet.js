import { PrivateKey, P2PKH, Transaction, Script } from '@bsv/sdk';

/**
 * Simple testnet wallet service for development
 * This is a temporary solution for testing purposes
 */
export class TestnetWallet {
    constructor(wifKey = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy') {
        this.privateKey = PrivateKey.fromWif(wifKey);
        this.network = 'testnet';
        this.address = null;
        this.initialize();
    }

    initialize() {
        try {
            // Convert private key to address
            const pubKey = this.privateKey.toPublicKey();
            // Create P2PKH script
            const p2pkh = new P2PKH(pubKey);
            // Get locking script
            const lockingScript = p2pkh.lockingScript;
            // Get address from public key
            this.address = pubKey.toAddress(this.network);
            console.log('Testnet wallet initialized with address:', this.address);
        } catch (error) {
            console.error('Failed to initialize testnet wallet:', error);
        }
    }

    getAddress() {
        return this.address;
    }

    getPrivateKey() {
        return this.privateKey.toWif();
    }

    // Utility function for API calls with retry logic
    async fetchWithRetry(url, options = {}, retries = 3, baseDelay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Accept': 'application/json',
                    }
                });

                if (response.status === 429) {
                    const delay = baseDelay * Math.pow(2, i);
                    console.log(`Rate limited, waiting ${delay}ms before retry ${i + 1}/${retries}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                const delay = baseDelay * Math.pow(2, i);
                console.log(`Request failed, waiting ${delay}ms before retry ${i + 1}/${retries}:`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Mock methods to match BSV wallet interface
    async getUtxos() {
        try {
            const address = this.getAddress();
            console.log('Fetching UTXOs for address:', address);
            
            // Fetch UTXOs from WhatsOnChain API with retry
            const response = await this.fetchWithRetry(
                `https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`
            );
            
            const utxos = await response.json();
            console.log('Raw UTXOs from API:', utxos);

            // Create P2PKH script for our address
            const pubKey = this.privateKey.toPublicKey();
            const p2pkh = new P2PKH();
            const lockingScript = p2pkh.lock(pubKey.toAddress());
            const unlockingTemplate = p2pkh.unlock(this.privateKey);

            // Transform WhatsOnChain UTXO format to BSV SDK format and fetch source transactions
            const formattedUtxos = await Promise.all(utxos.map(async utxo => {
                try {
                    // Try to fetch source transaction with retry
                    const txResponse = await this.fetchWithRetry(
                        `https://api.whatsonchain.com/v1/bsv/test/tx/${utxo.tx_hash}/hex`
                    );
                    
                    const txHex = await txResponse.text();
                    const sourceTransaction = Transaction.fromHex(txHex);

                    return {
                        txId: utxo.tx_hash,
                        outputIndex: utxo.tx_pos,
                        satoshis: utxo.value,
                        script: lockingScript,
                        unlockingScriptTemplate: unlockingTemplate,
                        sourceTransaction: sourceTransaction
                    };
                } catch (error) {
                    console.warn(`Error fetching source transaction ${utxo.tx_hash}:`, error);
                    // Continue without source transaction
                    return {
                        txId: utxo.tx_hash,
                        outputIndex: utxo.tx_pos,
                        satoshis: utxo.value,
                        script: lockingScript,
                        unlockingScriptTemplate: unlockingTemplate
                    };
                }
            }));

            console.log('Final formatted UTXOs:', formattedUtxos);
            return formattedUtxos;
        } catch (error) {
            console.error('Failed to get UTXOs:', error);
            throw error;
        }
    }

    async signTransaction(tx) {
        try {
            console.log('Starting transaction signing...');
            console.log('Transaction inputs:', tx.inputs);
            
            // Sign all inputs with our private key
            for (let i = 0; i < tx.inputs.length; i++) {
                const input = tx.inputs[i];
                console.log(`Processing input ${i}:`, input);
                
                if (!input.sourceSatoshis) {
                    console.log(`Input ${i} missing sourceSatoshis, attempting to set from input...`);
                    const satoshis = input.satoshis || input.value;
                    console.log(`Found satoshis value for input ${i}:`, satoshis);
                    
                    if (!satoshis) {
                        console.error(`No satoshis value found for input ${i}`);
                        throw new Error(`Input ${i} missing satoshis value`);
                    }
                    
                    input.sourceSatoshis = satoshis;
                    console.log(`Set sourceSatoshis for input ${i}:`, input.sourceSatoshis);
                }
                
                console.log(`Signing input ${i} with sourceSatoshis:`, input.sourceSatoshis);
                await tx.sign(this.privateKey, i);
                console.log(`Successfully signed input ${i}`);
            }
            
            console.log('All inputs signed successfully');
            return tx;
        } catch (error) {
            console.error('Failed to sign transaction:', error);
            throw error;
        }
    }

    async broadcastTransaction(tx) {
        try {
            console.log('Broadcasting transaction...');
            const txHex = tx.toHex();
            console.log('Transaction hex:', txHex);

            // Try broadcasting with retry logic
            const response = await this.fetchWithRetry(
                'https://api.whatsonchain.com/v1/bsv/test/tx/raw',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ txhex: txHex })
                }
            );

            const result = await response.text();
            console.log('Broadcast result:', result);
            
            // The API can return the txid in multiple formats:
            // 1. JSON object with txid field: { txid: "hash" }
            // 2. Plain string hash: "hash"
            // 3. JSON-encoded string: "\"hash\""
            
            try {
                // Try parsing as JSON first
                const jsonResult = JSON.parse(result);
                
                // Case 1: JSON object with txid field
                if (typeof jsonResult === 'object' && jsonResult.txid) {
                    console.log('Transaction broadcast successful with JSON object response. TXID:', jsonResult.txid);
                    return jsonResult.txid;
                }
                
                // Case 3: JSON-encoded string
                if (typeof jsonResult === 'string' && jsonResult.match(/^[0-9a-f]{64}$/i)) {
                    console.log('Transaction broadcast successful with JSON string response. TXID:', jsonResult);
                    return jsonResult;
                }
            } catch (e) {
                // Case 2: Plain string hash
                if (result && typeof result === 'string' && result.match(/^[0-9a-f]{64}$/i)) {
                    console.log('Transaction broadcast successful with plain string response. TXID:', result);
                    return result;
                }
            }

            throw new Error(`Invalid response format from broadcast API: ${result}`);
        } catch (error) {
            console.error('Failed to broadcast transaction:', error);
            throw error;
        }
    }
}

// Create default testnet wallet instance
export const testnetWallet = new TestnetWallet(); 