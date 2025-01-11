import { Script, Transaction, PrivateKey, PublicKey, P2PKH } from '@bsv/sdk'
import * as bsvSdk from '@bsv/sdk'
import { TestnetWallet } from './testnet-wallet'
import { InscriptionSecurityService } from './inscription-security-service'
import { BSVError } from '../types'
import { 
  BSVServiceInterface, 
  UTXO, 
  WalletProvider, 
  NetworkConfig, 
  TransactionInput, 
  TransactionOutput 
} from '../types/bsv'
import { SignedTransaction } from '../types/services'

/**
 * Service for handling BSV blockchain interactions
 */
export class BSVService implements BSVServiceInterface {
  private network: 'mainnet' | 'testnet'
  private connected: boolean
  public wallet: WalletProvider
  private bsv: typeof bsvSdk
  private securityService: InscriptionSecurityService
  private feeRate: number
  private apiUrl: string

  constructor(isTestMode = false) {
    this.network = 'testnet'
    this.connected = false
    this.bsv = bsvSdk
    this.feeRate = 1 // Standard fee rate (1 sat/kb)
    this.apiUrl = process.env.BSV_API_URL || 'https://api.whatsonchain.com/v1/bsv/test'

    // Initialize with a default wallet provider
    this.wallet = this.createDefaultWalletProvider()

    // Auto-connect testnet wallet in development, but not in test mode
    if (process.env.NODE_ENV !== 'production' && !isTestMode) {
      this.wallet = new TestnetWallet() as unknown as WalletProvider
      this.connected = true
    }

    // Initialize security service with this instance
    this.securityService = new InscriptionSecurityService(this)
  }

  private createDefaultWalletProvider(): WalletProvider {
    return {
      privateKey: new PrivateKey(),
      fetchWithRetry: async (url: string, options?: RequestInit) => {
        const response = await fetch(url, options)
        if (!response.ok) {
          throw new BSVError('FETCH_ERROR', 'Failed to fetch data')
        }
        return response
      },
      getUtxos: async () => [],
      broadcastTransaction: async (tx: Transaction) => {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/test/tx/raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txhex: tx.toHex() })
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
      return data.status === 'ok'
    } catch (error) {
      throw new BSVError('CONNECTION_ERROR', 'Failed to connect to BSV network')
    }
  }

  async getWalletAddress(): Promise<string> {
    try {
      const response = await this.wallet.fetchWithRetry('https://api.whatsonchain.com/v1/bsv/test/address')
      const data = await response.json()
      return data.address
    } catch (error) {
      throw new BSVError('WALLET_ERROR', 'Failed to get wallet address')
    }
  }

  async connectWallet(): Promise<string> {
    try {
      const address = await this.getWalletAddress()
      if (!address) {
        throw new Error('Failed to get wallet address')
      }
      return address
    } catch (error) {
      throw new BSVError('WALLET_ERROR', 'Failed to connect wallet')
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`
      )
      
      const data = await response.json()
      return data.map((utxo: any) => ({
        txId: utxo.tx_hash,
        outputIndex: utxo.tx_pos,
        lockingScript: Script.fromHex(utxo.script_hex),
        satoshis: utxo.value
      }))
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      throw new BSVError('UTXO_FETCH_ERROR', 'Failed to get UTXOs')
    }
  }

  async createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction> {
    try {
      const tx = new Transaction()
      
      // Add inputs
      for (const input of inputs) {
        if (!input.script) {
          throw new BSVError('VALIDATION_ERROR', 'Script must be defined for inputs')
        }
        
        // Get source transaction if not provided
        let sourceTransaction = input.sourceTransaction
        if (!sourceTransaction && input.sourceTXID) {
          sourceTransaction = await this.getTransaction(input.sourceTXID)
        }

        // Create input with required properties
        const txInput = {
          sourceTXID: input.sourceTXID,
          sourceOutputIndex: input.sourceOutputIndex,
          sourceTransaction,
          unlockingScriptTemplate: input.unlockingScriptTemplate,
          sourceSatoshis: input.sourceSatoshis,
          script: input.script
        }

        tx.addInput(txInput as any)
      }

      // Add outputs
      for (const output of outputs) {
        if (!output.lockingScript) {
          throw new BSVError('VALIDATION_ERROR', 'Locking script must be defined for outputs')
        }
        
        // Create output with required properties
        const txOutput = {
          lockingScript: output.lockingScript,
          satoshis: output.satoshis,
          change: output.change
        }

        tx.addOutput(txOutput as any)
      }

      // Calculate fee and sign
      await tx.fee()
      await tx.sign()

      // Calculate actual fee based on transaction size
      const fee = this.estimateFee(inputs.length, outputs.length)

      return {
        tx,
        inputs,
        outputs,
        fee
      }
    } catch (error) {
      console.error('Failed to create transaction:', error)
      throw new BSVError('TX_CREATE_ERROR', 'Failed to create transaction')
    }
  }

  async broadcastTransaction(transaction: SignedTransaction): Promise<string> {
    return this.wallet.broadcastTransaction(transaction.tx)
  }

  async getTransactionStatus(txid: string): Promise<{ confirmations: number; timestamp: number }> {
    try {
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`
      )
      
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

  estimateFee(inputs: number, outputs: number): number {
    // Calculate total transaction size:
    // 1. Transaction version (4 bytes)
    // 2. Input count (1-9 bytes)
    // 3. Typical P2PKH input (148 bytes per input)
    // 4. Output count (1-9 bytes)
    // 5. P2PKH output (34 bytes per output)
    // 6. nLockTime (4 bytes)
    const txOverhead = 4 + 1 + (148 * inputs) + 1 + (34 * outputs) + 4
    
    // Convert to KB and ensure we round up to the next KB boundary
    const sizeInKb = txOverhead / 1024
    const roundedKb = Math.ceil(sizeInKb)
    
    // Calculate fee to ensure at least 1 sat/KB
    return Math.ceil(roundedKb * this.feeRate * 1.1) // Add 10% buffer
  }

  getNetworkConfig(): NetworkConfig {
    return {
      network: this.network,
      apiEndpoint: 'https://api.whatsonchain.com/v1/bsv/test',
      feePerKb: this.feeRate
    }
  }

  async getTransaction(txid: string): Promise<Transaction> {
    try {
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`
      )
      
      const txHex = await response.text()
      return Transaction.fromHex(txHex)
    } catch (error) {
      console.error('Failed to get transaction:', error)
      throw new BSVError('TX_FETCH_ERROR', 'Failed to get transaction')
    }
  }
} 