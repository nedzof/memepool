import { bsv, SmartContract, Utils, toByteString, hash160 } from 'scrypt-ts'
import { BSVError } from '../types'
import { 
  BSVServiceInterface, 
  UTXO, 
  WalletProvider, 
  NetworkConfig,
  TransactionInput,
  TransactionOutput,
  SignedTransaction
} from '../types/bsv'
import { InscriptionSecurityService } from './inscription-security-service'
import { InscriptionMetadata } from '../types/inscription'

/**
 * Service for handling BSV blockchain interactions using sCrypt
 */
export class BSVService implements BSVServiceInterface {
  private network: bsv.Networks.Network
  private connected: boolean
  private wallet: WalletProvider
  private feeRate: number
  private apiUrl: string
  private privateKey: bsv.PrivateKey
  private securityService: InscriptionSecurityService

  constructor(config?: Partial<NetworkConfig>) {
    this.network = bsv.Networks.testnet
    this.connected = false
    this.feeRate = config?.feeRate || 1 // Standard fee rate (1 sat/kb)
    this.apiUrl = config?.apiUrl || 'https://api.whatsonchain.com/v1/bsv/test'
    
    // Initialize private key and wallet
    this.privateKey = bsv.PrivateKey.fromRandom()
    this.wallet = this.createDefaultWalletProvider()

    // Initialize security service with this instance
    this.securityService = new InscriptionSecurityService(this)
  }

  private createDefaultWalletProvider(): WalletProvider {
    return {
      getAddress: () => this.privateKey.toAddress().toString(),
      getPrivateKey: () => this.privateKey.toWIF(),
      getUtxos: async () => [],
      signTransaction: async (tx: bsv.Transaction) => {
        tx.sign(this.privateKey)
        return tx
      },
      broadcastTransaction: async (tx: bsv.Transaction) => {
        const response = await fetch(`${this.apiUrl}/tx/raw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txhex: tx.toString() })
        })
        if (!response.ok) {
          throw new BSVError('BROADCAST_ERROR', 'Failed to broadcast transaction')
        }
        const data = await response.json()
        return data.txid
      }
    }
  }

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/status`)
      if (!response.ok) {
        throw new Error('API connection failed')
      }
      const data = await response.json()
      this.connected = data.status === 'ok'
      return this.connected
    } catch (error) {
      throw new BSVError('CONNECTION_ERROR', 'Failed to connect to BSV network')
    }
  }

  async getWalletAddress(): Promise<string> {
    try {
      return this.wallet.getAddress()
    } catch (error) {
      throw new BSVError('WALLET_ERROR', 'Failed to get wallet address')
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await fetch(`${this.apiUrl}/address/${address}/unspent`)
      if (!response.ok) {
        throw new Error('Failed to fetch UTXOs')
      }
      
      const data = await response.json()
      const pubKey = this.privateKey.publicKey
      const pubKeyHash = hash160(toByteString(pubKey.toBuffer().toString('hex')))

      return Promise.all(data.map(async (utxo: any) => {
        const script = new bsv.Script(Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(utxo.value)))
        
        const unlockingTemplate = {
          script: new bsv.Script(''),
          satoshis: utxo.value,
          sign: async (tx: bsv.Transaction, inputIndex: number) => {
            tx.sign(this.privateKey)
            return tx.inputs[inputIndex].script
          },
          estimateLength: () => 108
        }

        return {
          txId: utxo.tx_hash,
          outputIndex: utxo.tx_pos,
          satoshis: utxo.value,
          script,
          unlockingTemplate
        } as UTXO
      }))
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      throw new BSVError('UTXO_FETCH_ERROR', 'Failed to get UTXOs')
    }
  }

  async getTransaction(txId: string): Promise<bsv.Transaction> {
    try {
      const response = await fetch(`${this.apiUrl}/tx/${txId}/raw`)
      if (!response.ok) {
        throw new Error('Failed to fetch transaction')
      }
      const txHex = await response.text()
      return new bsv.Transaction(txHex)
    } catch (error) {
      throw new BSVError('TX_FETCH_ERROR', 'Failed to get transaction')
    }
  }

  async createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction> {
    try {
      const tx = new bsv.Transaction()
      let totalInput = 0
      let totalOutput = 0
      
      // Add inputs
      for (const input of inputs) {
        const sourceTransaction = await this.getTransaction(input.sourceTXID)
        tx.addInput(new bsv.Transaction.Input({
          prevTxId: input.sourceTXID,
          outputIndex: input.sourceOutputIndex,
          script: input.script,
          output: new bsv.Transaction.Output({
            script: input.script,
            satoshis: input.sourceSatoshis
          })
        }))
        totalInput += input.sourceSatoshis
      }

      // Add outputs
      for (const output of outputs) {
        tx.addOutput(new bsv.Transaction.Output({
          script: output.script,
          satoshis: output.satoshis
        }))
        totalOutput += output.satoshis
      }

      // Calculate fee
      const fee = this.estimateFee(inputs.length, outputs.length)

      // Validate transaction
      const totalWithFee = totalOutput + fee
      if (totalWithFee > totalInput) {
        const available = totalInput - totalOutput
        throw new BSVError('TX_CREATE_ERROR', `Insufficient funds for fee. Required: ${fee}, Available: ${available}`)
      }

      // Sign transaction
      tx.sign(this.privateKey)

      return { tx, fee }
    } catch (error) {
      if (error instanceof BSVError) {
        throw error
      }
      console.error('Failed to create transaction:', error)
      throw new BSVError('TX_CREATE_ERROR', 'Failed to create transaction')
    }
  }

  async broadcastTx(tx: bsv.Transaction): Promise<string> {
    return this.wallet.broadcastTransaction(tx)
  }

  estimateFee(inputCount: number, outputCount: number): number {
    // Base transaction size calculation
    const baseSize = 4 + // version
                    1 + // input count size
                    inputCount * (32 + 4 + 4) + // txid(32) + vout(4) + sequence(4)
                    inputCount * 107 + // ~107 bytes for typical P2PKH unlocking script
                    1 + // output count size
                    outputCount * 34 + // ~34 bytes per output
                    4 // locktime
    
    return Math.ceil(baseSize * this.feeRate)
  }

  async getTransactionStatus(txid: string): Promise<{ confirmations: number; timestamp: number }> {
    try {
      const response = await fetch(`${this.apiUrl}/tx/${txid}`)
      if (!response.ok) {
        throw new Error('Failed to fetch transaction status')
      }
      
      const data = await response.json()
      return {
        confirmations: data.confirmations || 0,
        timestamp: data.time || Date.now()
      }
    } catch (error) {
      console.error('Failed to get transaction details:', error)
      throw new BSVError('TX_DETAILS_ERROR', 'Failed to get transaction details')
    }
  }

  getNetworkConfig(): NetworkConfig {
    return {
      apiUrl: this.apiUrl,
      feeRate: this.feeRate
    }
  }

  /**
   * Creates an inscription transaction
   */
  async createInscriptionTransaction(
    metadata: InscriptionMetadata, 
    content: Buffer,
    holderScript: bsv.Script
  ): Promise<string> {
    try {
      // Get wallet address and UTXOs
      const address = await this.getWalletAddress()
      const utxos = await this.wallet.getUtxos()

      if (!utxos.length) {
        throw new BSVError('NO_UTXOS', 'No UTXOs available')
      }

      // Create transaction
      const tx = new bsv.Transaction()

      // Add input
      const selectedUtxo = utxos[0] // Use first UTXO for simplicity
      const pubKeyHash = hash160(toByteString(this.privateKey.publicKey.toBuffer().toString('hex')))
      const unlockingScript = Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(selectedUtxo.satoshis))
      
      tx.addInput(new bsv.Transaction.Input({
        prevTxId: selectedUtxo.txId,
        outputIndex: selectedUtxo.outputIndex,
        script: selectedUtxo.script,
        output: new bsv.Transaction.Output({
          satoshis: selectedUtxo.satoshis,
          script: new bsv.Script(unlockingScript)
        })
      }))

      // Add inscription data output
      const inscriptionScript = this.buildInscriptionScript(metadata, content)
      tx.addOutput(new bsv.Transaction.Output({
        satoshis: 0,
        script: inscriptionScript
      }))

      // Add holder output
      tx.addOutput(new bsv.Transaction.Output({
        satoshis: 1,
        script: holderScript
      }))

      // Calculate and add change output
      const fee = this.estimateFee(1, 2)
      const changeAmount = selectedUtxo.satoshis - 1 - fee

      if (changeAmount >= 546) {
        const changeScript = Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(changeAmount))
        tx.addOutput(new bsv.Transaction.Output({
          satoshis: changeAmount,
          script: new bsv.Script(changeScript)
        }))
      }

      // Sign and broadcast transaction
      tx.sign(this.privateKey)
      return this.broadcastTx(tx)

    } catch (error) {
      console.error('Failed to create inscription transaction:', error)
      throw error instanceof BSVError ? error : new BSVError('TX_CREATE_ERROR', 'Failed to create inscription transaction')
    }
  }

  private buildInscriptionScript(metadata: InscriptionMetadata, content: Buffer): bsv.Script {
    const metadataBuffer = Buffer.from(JSON.stringify(metadata))
    const parts = [
      'OP_FALSE',
      'OP_RETURN',
      metadataBuffer.toString('hex'),
      content.toString('hex')
    ]
    return new bsv.Script(bsv.Script.fromASM(parts.join(' ')).toHex())
  }

  async getPrivateKey(): Promise<bsv.PrivateKey> {
    return this.privateKey;
  }

  async getUTXO(txid: string): Promise<UTXO | null> {
    try {
      const tx = await this.getTransaction(txid);
      if (!tx) {
        return null;
      }

      const pubKey = this.privateKey.publicKey;
      const pubKeyHash = hash160(toByteString(pubKey.toBuffer().toString('hex')));
      const script = new bsv.Script(Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(1)));

      return {
        txId: txid,
        outputIndex: 0,
        satoshis: 1,
        script,
        tx
      };
    } catch (error) {
      console.error('Failed to get UTXO:', error);
      return null;
    }
  }
} 