import { BSVService } from './bsv-service.js';
import { TransactionVerificationService } from './transaction-verification-service.js';
import { InscriptionSecurityService } from './inscription-security-service.js';
import { Script, Transaction, P2PKH, PublicKey } from '@bsv/sdk';

/**
 * Service for handling ownership transfers of inscriptions
 */
export class OwnershipTransferService {
    constructor(bsvService, verificationService) {
        this.bsvService = bsvService || new BSVService();
        this.verificationService = verificationService || new TransactionVerificationService(this.bsvService);
        this.securityService = new InscriptionSecurityService(this.bsvService, this.verificationService);
    }

    /**
     * Fetch source transaction with retry logic
     * @private
     */
    async fetchSourceTransaction(txid) {
        try {
            // First try to get the raw transaction hex
            const hexResponse = await this.bsvService.wallet.fetchWithRetry(
                `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`
            );
            const txHex = await hexResponse.text();

            // Also get the full transaction data for verification
            const dataResponse = await this.bsvService.wallet.fetchWithRetry(
                `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`
            );
            const txData = await dataResponse.json();

            // Create transaction from hex
            const tx = Transaction.fromHex(txHex);

            // Verify and enhance outputs with script data from API
            tx.outputs = tx.outputs.map((output, index) => {
                const outputData = txData.vout[index];
                if (!outputData) {
                    throw new Error(`Missing output data for index ${index}`);
                }

                // Create script from ASM if available
                if (outputData.scriptPubKey && outputData.scriptPubKey.hex) {
                    output.script = Script.fromHex(outputData.scriptPubKey.hex);
                }

                return output;
            });

            return tx;
        } catch (error) {
            console.error('Failed to fetch source transaction:', error);
            throw error;
        }
    }

    /**
     * Create a transfer transaction
     * @param {string} inscriptionTxId - Transaction ID of the inscription
     * @param {string} recipientAddress - Recipient's wallet address
     * @param {Object} options - Transfer options
     * @param {number} options.value - Value in satoshis to transfer (default: 1)
     * @param {boolean} options.preserveScript - Whether to preserve the original script pattern
     * @param {Object} options.utxoData - UTXO data for script verification
     * @returns {Promise<string>} Transaction ID of the transfer
     */
    async createTransferTransaction(inscriptionTxId, recipientAddress, options = {}) {
        try {
            if (!this.bsvService.wallet) {
                throw new Error('Wallet not connected');
            }

            const senderAddress = await this.bsvService.getWalletAddress();
            console.log('Sender address:', senderAddress);

            // Validate transfer parameters
            await this.securityService.validateTransferParams({
                txid: inscriptionTxId,
                senderAddress,
                recipientAddress
            });

            // Verify ownership and security checks
            const securityCheck = await this.securityService.verifyOwnershipForTransfer(
                inscriptionTxId,
                senderAddress
            );

            if (!securityCheck.isValid) {
                throw new Error('Security check failed');
            }

            // Get all available UTXOs
            const allUtxos = await this.bsvService.wallet.getUtxos();
            if (!allUtxos || allUtxos.length === 0) {
                throw new Error('No UTXOs available');
            }

            // Find the inscription holder UTXO
            const inscriptionUtxo = allUtxos.find(utxo => utxo.txId === inscriptionTxId);
            if (!inscriptionUtxo) {
                throw new Error(`UTXO not found for transaction ${inscriptionTxId}`);
            }

            // Fetch source transaction to verify the script
            const sourceTransaction = await this.fetchSourceTransaction(inscriptionTxId);
            inscriptionUtxo.sourceTransaction = sourceTransaction;

            // Find the nonstandard output with MEME marker
            const dataResponse = await this.bsvService.wallet.fetchWithRetry(
                `https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionTxId}`
            );
            const txData = await dataResponse.json();

            // Find the output with nonstandard type and MEME marker
            const inscriptionOutput = txData.vout.find(out => 
                out.scriptPubKey.type === 'nonstandard' && 
                out.scriptPubKey.hex.includes('6a044d454d45')
            );

            if (!inscriptionOutput) {
                throw new Error('Inscription output not found in transaction');
            }

            console.log('Found inscription output:', {
                n: inscriptionOutput.n,
                value: inscriptionOutput.value,
                type: inscriptionOutput.scriptPubKey.type
            });

            // Update UTXO with correct script and output index
            inscriptionUtxo.script = Script.fromHex(inscriptionOutput.scriptPubKey.hex);
            inscriptionUtxo.outputIndex = inscriptionOutput.n;
            inscriptionUtxo.satoshis = Math.round(inscriptionOutput.value * 100000000); // Convert BSV to satoshis

            // Double check the output index
            if (typeof inscriptionUtxo.outputIndex !== 'number') {
                throw new Error('Invalid output index in inscription UTXO');
            }

            // Verify this is an inscription holder UTXO
            const currentScriptHex = inscriptionUtxo.script.toHex();
            if (!currentScriptHex.includes('6a044d454d45')) { // OP_RETURN MEME in hex
                throw new Error('Not an inscription holder UTXO - missing MEME marker');
            }

            console.log('Using inscription holder UTXO:', {
                txId: inscriptionUtxo.txId,
                outputIndex: inscriptionUtxo.outputIndex,
                satoshis: inscriptionUtxo.satoshis
            });

            // Create transaction
            const tx = new Transaction();

            // Create P2PKH unlocking script template for the inscription holder UTXO
            const p2pkhUnlock = new P2PKH();
            
            // Get the public key from the private key
            const pubKey = this.bsvService.wallet.privateKey.toPublicKey();
            console.log('Public key:', pubKey.toString());

            // Split the script into P2PKH and OP_RETURN parts
            const scriptAsm = inscriptionUtxo.script.toASM();
            const [p2pkhPart] = scriptAsm.split('OP_RETURN');
            
            // Create a temporary P2PKH script for signing
            const tempP2pkhScript = Script.fromASM(p2pkhPart.trim());

            // Create custom unlocking template for the nonstandard input
            const unlockingTemplate = {
                sign: async (tx, inputIndex) => {
                    // Get the input being signed
                    const input = tx.inputs[inputIndex];
                    
                    // Create signature using the P2PKH part only
                    const privateKey = this.bsvService.wallet.privateKey;
                    const sigtype = Script.Signing.SIGHASH_ALL | Script.Signing.SIGHASH_FORKID;
                    
                    // Create signature hash using P2PKH script
                    const preimage = tx.getPreimage(inputIndex, tempP2pkhScript, input.sourceSatoshis, sigtype);
                    const signature = privateKey.signWithPreimage(preimage);
                    
                    // Create unlocking script: <signature> <pubkey>
                    const unlockingScript = new Script()
                        .writeBuffer(signature)
                        .writeByte(sigtype)
                        .writeBuffer(pubKey.toBuffer());
                    
                    return unlockingScript;
                },
                estimateLength: () => 107 // Approximate length of signature + pubkey
            };
            
            // Add the inscription input with the custom unlocking template
            tx.addInput({
                sourceTXID: inscriptionUtxo.txId,
                sourceOutputIndex: inscriptionUtxo.outputIndex,
                sourceSatoshis: inscriptionUtxo.satoshis,
                script: tempP2pkhScript, // Use only the P2PKH part for verification
                unlockingScriptTemplate: unlockingTemplate,
                sourceTransaction: inscriptionUtxo.sourceTransaction
            });

            // Get additional UTXOs for fees if needed
            const feeUtxos = allUtxos.filter(utxo => {
                const scriptHex = utxo.script.toHex();
                return utxo.txId !== inscriptionTxId && !scriptHex.includes('4d454d45');
            });

            // Add fee UTXOs if available
            for (const utxo of feeUtxos) {
                if (!utxo.sourceTransaction) {
                    utxo.sourceTransaction = await this.fetchSourceTransaction(utxo.txId);
                }
                const standardUnlockingTemplate = p2pkhUnlock.unlock(this.bsvService.wallet.privateKey);
                tx.addInput({
                    sourceTXID: utxo.txId,
                    sourceOutputIndex: utxo.outputIndex,
                    sourceSatoshis: utxo.satoshis,
                    script: utxo.script,
                    unlockingScriptTemplate: standardUnlockingTemplate,
                    sourceTransaction: utxo.sourceTransaction
                });
            }

            // Create the inscription output script for recipient
            const recipientP2pkh = new P2PKH();
            const recipientPubKeyHash = recipientP2pkh.lock(recipientAddress).toASM().split(' ')[2];
            console.log('Recipient pubkey hash:', recipientPubKeyHash);

            // Create new script with recipient's pubkey hash and original OP_RETURN part
            const newP2pkhPart = `OP_DUP OP_HASH160 ${recipientPubKeyHash} OP_EQUALVERIFY OP_CHECKSIG`;
            const newScriptAsm = `${newP2pkhPart} OP_RETURN 4d454d45`; // MEME in hex
            console.log('New script ASM:', newScriptAsm);

            // Create the new script
            const lockingScript = Script.fromASM(newScriptAsm);
            console.log('New script hex:', lockingScript.toHex());

            // Add the inscription output (always 1 satoshi)
            tx.addOutput({
                lockingScript,
                satoshis: 1
            });

            // Add change output
            const totalInput = inscriptionUtxo.satoshis + feeUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
            const changeAmount = totalInput - 1; // Subtract 1 satoshi for inscription output

            if (changeAmount > 0) {
                const p2pkh = new P2PKH();
                const changeScript = p2pkh.lock(senderAddress);
                tx.addOutput({
                    lockingScript: changeScript,
                    satoshis: changeAmount
                });
            }

            // Calculate fee and adjust change output
            await tx.fee();

            // Sign all inputs
            for (let i = 0; i < tx.inputs.length; i++) {
                await tx.sign(this.bsvService.wallet.privateKey, i);
            }

            // Log the final transaction hex for debugging
            const finalTxHex = tx.toHex();
            console.log('Final transaction hex:', finalTxHex);

            // Broadcast transaction
            const txid = await this.bsvService.wallet.broadcastTransaction(tx);
            console.log('Transfer transaction broadcast:', txid);

            return txid;
        } catch (error) {
            console.error('Failed to create transfer transaction:', error);
            throw error;
        }
    }

    /**
     * Verify transfer completion
     * @param {string} transferTxId - Transaction ID of the transfer
     * @param {string} recipientAddress - Expected recipient address
     * @returns {Promise<boolean>} True if transfer is complete and valid
     */
    async verifyTransfer(transferTxId, recipientAddress) {
        try {
            // Check transaction confirmations
            const status = await this.bsvService.getTransactionStatus(transferTxId);
            if (status.confirmations < this.securityService.config.minConfirmations) {
                return false;
            }

            // Verify recipient ownership
            const isNewOwner = await this.verificationService.validateOwnership(recipientAddress, transferTxId);
            return isNewOwner;
        } catch (error) {
            console.error('Failed to verify transfer:', error);
            return false;
        }
    }

    /**
     * Get transfer status
     * @param {string} transferTxId - Transaction ID of the transfer
     * @returns {Promise<Object>} Transfer status details
     */
    async getTransferStatus(transferTxId) {
        try {
            const status = await this.bsvService.getTransactionStatus(transferTxId);
            return {
                confirmed: status.confirmations >= this.securityService.config.minConfirmations,
                confirmations: status.confirmations,
                timestamp: status.timestamp,
                complete: status.confirmations >= this.securityService.config.minConfirmations
            };
        } catch (error) {
            console.error('Failed to get transfer status:', error);
            throw error;
        }
    }
} 