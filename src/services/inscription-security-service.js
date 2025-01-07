import { BSVService } from './bsv-service.js';
import { TransactionVerificationService } from './transaction-verification-service.js';

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
            
            // Find OP_RETURN output
            const opReturnMatch = txHex.match(/006a([0-9a-f]*)/);
            if (!opReturnMatch) {
                throw new Error('No OP_RETURN output found in transaction');
            }
            
            // Extract the data after OP_RETURN
            const dataHex = opReturnMatch[1];
            console.log('Data hex length:', dataHex.length);
            
            // Find the start of the JSON data (7b is '{' in hex)
            const jsonStartIndex = dataHex.indexOf('7b227479706522');  // {"type" in hex
            if (jsonStartIndex === -1) {
                throw new Error('No JSON metadata found in inscription');
            }
            
            // Find the end of the JSON data by looking for the closing brace
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
            // Verify inscription format first
            const metadata = await this.verifyInscriptionFormat(txid);
            
            // Get transaction details
            const txResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`);
            if (!txResponse.ok) {
                throw new Error('Failed to fetch transaction details');
            }
            
            const txData = await txResponse.json();
            console.log('Transaction details:', txData);
            
            // Check confirmations
            if (!txData.confirmations || txData.confirmations < this.config.minConfirmations) {
                throw new Error(`Transaction needs at least ${this.config.minConfirmations} confirmation(s), current: ${txData.confirmations || 0}`);
            }
            console.log('Confirmations:', txData.confirmations);
            
            // Find the value output (first non-OP_RETURN output)
            const valueOutput = txData.vout.find(out => 
                !out.scriptPubKey.hex.startsWith('006a') && out.value > 0
            );
            
            if (!valueOutput) {
                throw new Error('No value output found in transaction');
            }
            
            console.log('Value output:', valueOutput);
            
            // Verify sender is current owner
            if (!valueOutput.scriptPubKey.addresses || 
                !valueOutput.scriptPubKey.addresses.includes(senderAddress)) {
                throw new Error('Sender is not the current owner of the inscription');
            }
            
            // Verify UTXO is unspent by checking if it's been spent in another transaction
            const spentResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${senderAddress}/unspent`);
            if (!spentResponse.ok) {
                throw new Error('Failed to check address unspent outputs');
            }
            
            const unspentOutputs = await spentResponse.json();
            console.log('Unspent outputs:', unspentOutputs);
            
            const isUnspent = unspentOutputs.some(utxo => 
                utxo.tx_hash === txid && utxo.tx_pos === valueOutput.n
            );
            
            if (!isUnspent) {
                throw new Error('Inscription UTXO has already been spent');
            }
            
            return true;
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