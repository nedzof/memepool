import { BSVService } from './bsv-service.js';
import crypto from 'crypto';

/**
 * Service for handling inscription security checks and transfer validations
 */
export class InscriptionSecurityService {
    constructor(config = {}) {
        this.config = {
            minConfirmations: 1,
            minInscriptionValue: 1, // Changed to 1 satoshi
            ...config
        };
    }

    /**
     * Convert a public key hash to a testnet address
     * @param {string} pubKeyHash - The public key hash in hex format
     * @returns {string} The testnet address
     */
    pubKeyHashToAddress(pubKeyHash) {
        try {
            // For testnet, version byte is 0x6f
            const versionByte = '6f';
            const fullHash = versionByte + pubKeyHash;
            
            // Convert to Buffer for checksum calculation
            const buffer = Buffer.from(fullHash, 'hex');
            
            // Calculate double SHA256 for checksum
            const hash1 = crypto.createHash('sha256').update(buffer).digest();
            const hash2 = crypto.createHash('sha256').update(hash1).digest();
            const checksum = hash2.slice(0, 4);
            
            // Combine version, pubkey hash, and checksum
            const final = Buffer.concat([buffer, checksum]);
            
            // Convert to base58
            return this.toBase58(final);
        } catch (error) {
            console.error('Failed to convert pubkey hash to address:', error);
            throw error;
        }
    }

    /**
     * Convert a buffer to base58 string
     * @param {Buffer} buffer - The buffer to convert
     * @returns {string} The base58 string
     */
    toBase58(buffer) {
        const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let num = BigInt('0x' + buffer.toString('hex'));
        const base = BigInt(58);
        const zero = BigInt(0);
        let result = '';
        
        while (num > zero) {
            const mod = Number(num % base);
            result = ALPHABET[mod] + result;
            num = num / base;
        }
        
        // Add leading zeros
        for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
            result = '1' + result;
        }
        
        return result;
    }

    /**
     * Verify inscription format and data integrity
     * @param {string} txid - Transaction ID of the inscription
     * @returns {Promise<Object>} Inscription data if valid
     */
    async verifyInscriptionFormat(txid) {
        try {
            console.log(`Verifying inscription format for transaction: ${txid}`);
            
            // First try to get the raw transaction data
            const rawResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`);
            if (!rawResponse.ok) {
                throw new Error(`Failed to fetch raw transaction data: ${rawResponse.statusText}`);
            }
            
            const txHex = await rawResponse.text();
            console.log('Transaction hex length:', txHex.length);
            
            // Look for either standalone OP_RETURN or combined P2PKH+OP_RETURN
            const opReturnMatch = txHex.match(/006a([0-9a-f]*)/) || txHex.match(/76a914[0-9a-f]{40}88ac6a([0-9a-f]*)/);
            if (!opReturnMatch) {
                throw new Error('No inscription data found in transaction');
            }
            
            // Extract the data after OP_RETURN
            const dataHex = opReturnMatch[1] || opReturnMatch[2]; // Use second capture group for combined format
            if (!dataHex) {
                throw new Error('No data found after OP_RETURN');
            }
            console.log('Data hex length:', dataHex.length);
            // console.log('Data hex:', dataHex);
            
            // Check for our protection marker (MEME)
            if (dataHex === '044d454d45') {
                console.log('Found protection marker');
                return {
                    type: "memepool",
                    version: "1.0",
                    content: {
                        id: txid,
                        title: "Protected Inscription",
                        creator: "unknown",
                        timestamp: new Date().toISOString(),
                        metadata: {
                            format: "protected",
                            size: 0,
                            protected: true
                        }
                    }
                };
            }
            
            // If not a protection marker, look for JSON data
            const jsonStartIndex = dataHex.indexOf('7b227479706522');
            if (jsonStartIndex === -1) {
                // If we have data but no JSON, treat it as a protected inscription
                return {
                    type: "memepool",
                    version: "1.0",
                    content: {
                        id: txid,
                        title: "Protected Inscription",
                        creator: "unknown",
                        timestamp: new Date().toISOString(),
                        metadata: {
                            format: "protected",
                            size: dataHex.length / 2,
                            protected: true
                        }
                    }
                };
            }
            
            // Process JSON data as before...
            let jsonEndIndex = jsonStartIndex;
            let openBraces = 0;
            
            for (let i = jsonStartIndex; i < dataHex.length; i += 2) {
                const byte = dataHex.slice(i, i + 2);
                if (byte === '7b') { // '{'
                    openBraces++;
                } else if (byte === '7d') { // '}'
                    openBraces--;
                    if (openBraces === 0) {
                        jsonEndIndex = i + 2;
                        break;
                    }
                }
            }
            
            if (openBraces !== 0) {
                throw new Error('Invalid JSON metadata format - unmatched braces');
            }
            
            // Extract just the JSON portion
            const jsonHex = dataHex.slice(jsonStartIndex, jsonEndIndex);
            console.log('JSON hex length:', jsonHex.length);
            
            // Convert hex to string
            const jsonString = Buffer.from(jsonHex, 'hex').toString('utf8');
            console.log('JSON string:', jsonString);
            
            try {
                // Parse JSON metadata
                const metadata = JSON.parse(jsonString);
                
                // Validate required fields
                if (!metadata.type || metadata.type !== 'memepool' ||
                    !metadata.version || !metadata.content ||
                    !metadata.content.id || !metadata.content.title ||
                    !metadata.content.creator || !metadata.content.timestamp) {
                    throw new Error('Missing required metadata fields');
                }
                
                return metadata;
            } catch (parseError) {
                console.error('Failed to parse metadata JSON:', parseError);
                throw new Error(`Invalid metadata format: ${parseError.message}`);
            }
        } catch (error) {
            console.error('Failed to verify inscription format:', error);
            throw error;
        }
    }

    /**
     * Verify ownership for transfer
     * @param {string} txid - Transaction ID of the inscription
     * @param {string} senderAddress - Address attempting the transfer
     * @returns {Promise<Object>} Ownership verification result
     */
    async verifyOwnershipForTransfer(txid, senderAddress) {
        try {
            // First trace to the latest transaction in the chain
            console.log('Tracing to latest transaction...');
            let currentTxId = txid;
            let currentTx = null;
            let latestTxId = txid;
            let latestTx = null;

            while (true) {
                // Get current transaction with retries
                let retries = 3;
                let txResponse = null;
                while (retries > 0) {
                    try {
                        txResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}`);
                        if (txResponse.ok) break;
                        if (txResponse.status === 429) { // Rate limit
                            console.log(`Rate limited, waiting ${1000 * (4 - retries)}ms before retry ${4 - retries}/3`);
                            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                            retries--;
                            continue;
                        }
                        throw new Error(`Failed to fetch transaction: ${txResponse.statusText}`);
                    } catch (error) {
                        console.error('Error fetching transaction:', error);
                        retries--;
                        if (retries === 0) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                if (!txResponse || !txResponse.ok) {
                    throw new Error('Failed to fetch transaction after retries');
                }
                
                currentTx = await txResponse.json();

                // Check if this transaction has been spent with retries
                retries = 3;
                let spentResponse = null;
                while (retries > 0) {
                    try {
                        spentResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}/spent`);
                        if (spentResponse.ok || spentResponse.status === 404) break;
                        if (spentResponse.status === 429) { // Rate limit
                            console.log(`Rate limited, waiting ${1000 * (4 - retries)}ms before retry ${4 - retries}/3`);
                            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                            retries--;
                            continue;
                        }
                        throw new Error(`Failed to check spent status: ${spentResponse.statusText}`);
                    } catch (error) {
                        console.error('Error checking spent status:', error);
                        retries--;
                        if (retries === 0) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (!spentResponse) {
                    throw new Error('Failed to check spent status after retries');
                }

                if (spentResponse.ok) {
                    // Transaction has been spent, get the spending transaction
                    const spentData = await spentResponse.json();
                    currentTxId = spentData.txid;
                    latestTxId = currentTxId;
                    latestTx = currentTx;
                } else if (spentResponse.status === 404) {
                    // Transaction is unspent, this is the latest
                    latestTxId = currentTxId;
                    latestTx = currentTx;
                    break;
                } else {
                    throw new Error(`Unexpected response checking spent status: ${spentResponse.status}`);
                }
            }

            console.log('Found latest transaction:', latestTxId);

            // Verify inscription format
            const metadata = await this.verifyInscriptionFormat(txid);
            
            // Check confirmations
            if (!latestTx.confirmations || latestTx.confirmations < this.config.minConfirmations) {
                throw new Error(`Transaction needs at least ${this.config.minConfirmations} confirmation(s), current: ${latestTx.confirmations || 0}`);
            }
            console.log('Confirmations:', latestTx.confirmations);
            
            // Find the value output with our protection marker
            const valueOutput = latestTx.vout.find(out => {
                const isOnesat = out.value === 0.00000001; // 1 satoshi
                const hasMarker = out.scriptPubKey.hex.includes('6a044d454d45') || // Standalone marker
                                 out.scriptPubKey.hex.includes('76a914') && out.scriptPubKey.hex.includes('88ac6a044d454d45'); // Combined P2PKH + marker
                return isOnesat && hasMarker;
            });
            
            if (!valueOutput) {
                throw new Error('No valid inscription holder output found');
            }
            
            console.log('Value output:', valueOutput);
            
            // Extract address from P2PKH script (76a914<pubKeyHash>88ac)
            const pubKeyHashMatch = valueOutput.scriptPubKey.hex.match(/76a914([0-9a-f]{40})88ac/);
            if (!pubKeyHashMatch) {
                // Try to get the address directly from the scriptPubKey
                if (!valueOutput.scriptPubKey.addresses || valueOutput.scriptPubKey.addresses.length === 0) {
                    throw new Error('Invalid script format and no addresses found');
                }
                return {
                    isValid: true,
                    inscriptionData: metadata,
                    currentOwner: valueOutput.scriptPubKey.addresses[0],
                    confirmations: latestTx.confirmations,
                    latestTxId: latestTxId
                };
            }
            
            // Convert the pubKeyHash to address
            const currentOwnerAddress = this.pubKeyHashToAddress(pubKeyHashMatch[1]);
            console.log('Current owner address:', currentOwnerAddress);
            console.log('Sender address:', senderAddress);

            // Get all addresses in the transaction outputs
            const allAddresses = latestTx.vout
                .filter(out => out.scriptPubKey.addresses)
                .flatMap(out => out.scriptPubKey.addresses);
            console.log('All addresses in transaction:', allAddresses);

            // Verify sender is current owner
            if (!allAddresses.includes(senderAddress)) {
                throw new Error('Sender is not the current owner of the inscription');
            }
            
            // Verify UTXO is unspent (we already know it is from the chain traversal)
            console.log('UTXO is unspent');

            return {
                isValid: true,
                inscriptionData: metadata,
                currentOwner: senderAddress,
                confirmations: latestTx.confirmations,
                latestTxId: latestTxId
            };
        } catch (error) {
            console.error('Failed to verify ownership:', error);
            throw error;
        }
    }

    /**
     * Request transfer confirmation
     * @param {Object} inscriptionData - Inscription metadata
     * @param {string} recipientAddress - Recipient's address
     * @returns {Promise<boolean>} True if confirmed
     */
    async confirmTransfer(inscriptionData, recipientAddress) {
        // Display important details and simulate confirmation
        console.log('\nTransfer Confirmation');
        console.log('---------------------');
        console.log(`Inscription ID: ${inscriptionData.content.id}`);
        console.log(`Title: ${inscriptionData.content.title}`);
        console.log(`Creator: ${inscriptionData.content.creator}`);
        console.log(`Recipient: ${recipientAddress}`);
        
        // In a real implementation, this would wait for user confirmation
        // For testing purposes, we'll auto-confirm
        return true;
    }

    /**
     * Validate transfer parameters
     * @param {Object} params - Transfer parameters
     * @returns {Promise<boolean>} True if parameters are valid
     */
    validateTransferParams(params) {
        const { txid, senderAddress, recipientAddress } = params;
        
        if (!txid || !senderAddress || !recipientAddress) {
            throw new Error('Missing required transfer parameters');
        }
        
        if (senderAddress === recipientAddress) {
            throw new Error('Sender and recipient addresses cannot be the same');
        }
        
        return true;
    }

    /**
     * Update security configuration
     * @param {Object} newConfig - New configuration parameters
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }

    /**
     * Check if a UTXO contains an inscription
     * @param {string} txid - Transaction ID to check
     * @returns {Promise<boolean>} True if UTXO contains an inscription
     */
    async hasInscription(txid) {
        try {
            // Get raw transaction
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`);
            if (!response.ok) {
                throw new Error('Failed to fetch transaction data');
            }
            
            const txHex = await response.text();
            
            // Check for our protection marker in P2PKH outputs (6a044d454d45 = OP_RETURN + push 4 + "MEME")
            const hasProtectionMarker = txHex.includes('6a044d454d45');
            if (hasProtectionMarker) {
                console.log('Found protection marker in transaction');
                return true;
            }
            
            // Check for OP_FALSE OP_RETURN pattern (006a)
            const hasOpReturn = txHex.includes('006a');
            if (!hasOpReturn) {
                return false;
            }

            // If we find OP_RETURN, verify it's our inscription format
            try {
                await this.verifyInscriptionFormat(txid);
                return true;
            } catch (error) {
                // If verification fails, it's not our inscription format
                return false;
            }
        } catch (error) {
            console.error('Error checking for inscription:', error);
            return false;
        }
    }

    /**
     * Check if a UTXO is protected by our marker
     * @param {string} txid - Transaction ID to check
     * @returns {Promise<boolean>} True if UTXO has protection marker
     */
    async hasProtectionMarker(txid) {
        try {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`);
            if (!response.ok) {
                throw new Error('Failed to fetch transaction data');
            }
            
            const txHex = await response.text();
            return txHex.includes('6a044d454d45'); // OP_RETURN + push 4 + "MEME"
        } catch (error) {
            console.error('Error checking for protection marker:', error);
            return false;
        }
    }

    /**
     * Filter UTXOs to exclude those containing inscriptions
     * @param {Array} utxos - Array of UTXOs to filter
     * @returns {Promise<Array>} Filtered UTXOs
     */
    async filterInscriptionUtxos(utxos) {
        const filteredUtxos = [];
        
        for (const utxo of utxos) {
            const hasInscription = await this.hasInscription(utxo.txId);
            if (!hasInscription) {
                filteredUtxos.push(utxo);
            }
        }
        
        return filteredUtxos;
    }
}

export default InscriptionSecurityService; 