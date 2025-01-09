import { Script, Transaction, PrivateKey, PublicKey, P2PKH } from '@bsv/sdk'
import * as bsvSdk from '@bsv/sdk'
import { testnetWallet } from './testnet-wallet'
import { InscriptionSecurityService } from './inscription-security-service'
import { BSVError } from '../types'
import type { 
  BSVService as IBSVService,
  UTXO,
  TransactionInput,
  TransactionOutput,
  SignedTransaction,
  WalletKeys,
  NetworkConfig
} from '../types'

// SDK Types
interface SDKTransactionInput {
  sourceTransaction?: Transaction
  sourceTransactionHash: string
  sourceOutputIndex: number
  unlockingScript?: Script
  unlockingScriptTemplate?: P2PKH
  sequence?: number
}

interface SDKTransactionOutput {
  lockingScript: Script
  satoshis: number
  change?: boolean
}

interface SDKTransaction {
  addInput(input: SDKTransactionInput): SDKTransaction
  addOutput(output: SDKTransactionOutput): SDKTransaction
  sign(privateKey?: PrivateKey): Promise<SDKTransaction>
  toHex(): string
  fee(): Promise<number>
}

interface WalletProvider {
  getAddress(): Promise<string>
  getBalance(): Promise<number>
  signTransaction(tx: SDKTransaction): Promise<SignedTransaction>
  privateKey: PrivateKey
}

interface TransactionStatus {
  confirmed: boolean
  confirmations: number
  timestamp: number
}

export class BSVService implements IBSVService {
  private network: 'mainnet' | 'testnet'
  private connected: boolean
  private wallet: WalletProvider | null
  private bsv: typeof bsvSdk
  private securityService: InscriptionSecurityService
  private feeRate: number

  constructor(isTestMode = false) {
    this.network = 'testnet'
    this.connected = false
    this.wallet = null
    this.bsv = bsvSdk
    this.securityService = new InscriptionSecurityService()
    this.feeRate = 1 // Standard fee rate (1 sat/kb)

    // Auto-connect testnet wallet in development, but not in test mode
    if (process.env.NODE_ENV !== 'production' && !isTestMode) {
      this.wallet = testnetWallet as unknown as WalletProvider
      this.connected = true
    }
  }

  async connect(): Promise<boolean> {
    try {
      this.bsv = bsvSdk
      this.connected = true
      return true
    } catch (error) {
      console.error('Failed to connect to BSV testnet:', error)
      throw new BSVError('Failed to connect to BSV testnet', 'CONNECTION_ERROR')
    }
  }

  async connectWallet(): Promise<string> {
    try {
      if (!this.connected) {
        await this.connect()
      }

      if (process.env.NODE_ENV === 'development') {
        this.wallet = testnetWallet as unknown as WalletProvider
        const address = await this.wallet.getAddress()
        if (!address) throw new BSVError('Failed to get wallet address', 'WALLET_ADDRESS_ERROR')
        return address
      }

      // TODO: Implement proper wallet provider request
      const provider = { 
        getAddress: async () => {
          const addr = 'dummy'
          if (!addr) throw new BSVError('Failed to get wallet address', 'WALLET_ADDRESS_ERROR')
          return addr
        },
        getBalance: () => Promise.resolve(0),
        signTransaction: async (tx: SDKTransaction) => {
          await tx.sign()
          return {
            tx: tx as unknown as Transaction,
            inputs: [],
            outputs: [],
            fee: await tx.fee()
          }
        },
        privateKey: PrivateKey.fromRandom()
      } as WalletProvider

      this.wallet = provider
      return await this.wallet.getAddress()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      if (error instanceof BSVError) throw error
      throw new BSVError('Failed to connect wallet', 'WALLET_CONNECTION_ERROR')
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch UTXOs')
      }
      
      const data = await response.json()
      return data.map((utxo: any) => ({
        txid: utxo.tx_hash,
        vout: utxo.tx_pos,
        script: utxo.script_hex,
        satoshis: utxo.value,
        height: utxo.height,
        confirmations: utxo.confirmations
      }))
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      throw new BSVError('Failed to get UTXOs', 'UTXO_FETCH_ERROR')
    }
  }

  async createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction> {
    if (!this.wallet) {
      throw new BSVError('Wallet not connected', 'WALLET_NOT_CONNECTED')
    }

    try {
      const tx = new Transaction() as unknown as SDKTransaction
      
      // Add inputs
      inputs.forEach(input => {
        tx.addInput({
          sourceTransactionHash: input.sourceTransactionHash,
          sourceOutputIndex: input.sourceOutputIndex,
          unlockingScript: input.script,
          sequence: input.sequence
        })
      })

      // Add outputs
      outputs.forEach(output => {
        tx.addOutput({
          lockingScript: output.lockingScript,
          satoshis: output.satoshis,
          change: output.change
        })
      })

      // Sign transaction
      return await this.wallet.signTransaction(tx)
    } catch (error) {
      console.error('Failed to create transaction:', error)
      throw new BSVError('Failed to create transaction', 'TX_CREATE_ERROR')
    }
  }

  async broadcastTransaction(transaction: SignedTransaction): Promise<string> {
    try {
      const response = await fetch('https://api.whatsonchain.com/v1/bsv/test/tx/raw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txhex: transaction.tx.toHex()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to broadcast transaction')
      }

      const data = await response.json()
      return data.txid
    } catch (error) {
      console.error('Failed to broadcast transaction:', error)
      throw new BSVError('Failed to broadcast transaction', 'TX_BROADCAST_ERROR')
    }
  }

  async getTransactionDetails(txid: string): Promise<TransactionStatus> {
    try {
      const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction status')
      }
      
      const data = await response.json()
      return {
        confirmed: data.confirmations > 0,
        confirmations: data.confirmations || 0,
        timestamp: data.time || Date.now()
      }
    } catch (error) {
      console.error('Failed to get transaction details:', error)
      throw new BSVError('Failed to get transaction details', 'TX_DETAILS_ERROR')
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
} 