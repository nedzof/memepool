import { PrivateKey, P2PKH, Transaction, Script, PublicKey } from '@bsv/sdk'
import { BSVError } from '@/types'
import type { TransactionInput } from '@/types'

interface WhatsOnChainUTXO {
  tx_hash: string
  tx_pos: number
  value: number
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

interface UnlockingTemplate {
  sign: (tx: Transaction, inputIndex: number) => Promise<Script>
  estimateLength: () => Promise<number>
}

interface FormattedUTXO {
  txId: string
  outputIndex: number
  satoshis: number
  script: Script
  unlockingTemplate: UnlockingTemplate
  sourceTransaction?: Transaction
}

interface ExtendedTransaction extends Transaction {
  inputs: Array<TransactionInput & {
    sourceSatoshis?: number
    satoshis?: number
    value?: number
  }>
}

/**
 * Simple testnet wallet service for development
 * This is a temporary solution for testing purposes
 */
export class TestnetWallet {
  private privateKey: PrivateKey
  private network: 'testnet'
  private address: string | null
  
  constructor(wifKey = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy') {
    this.privateKey = PrivateKey.fromWif(wifKey)
    this.network = 'testnet'
    this.address = null
    this.initialize()
  }

  private initialize(): void {
    try {
      // Convert private key to address
      const pubKey = this.privateKey.toPublicKey()
      // Get address from public key
      this.address = pubKey.toAddress()
      console.log('Testnet wallet initialized with address:', this.address)
    } catch (error) {
      console.error('Failed to initialize testnet wallet:', error)
      throw new BSVError('Failed to initialize testnet wallet', 'WALLET_INIT_ERROR')
    }
  }

  getAddress(): string {
    if (!this.address) {
      throw new BSVError('Wallet not initialized', 'WALLET_NOT_INITIALIZED')
    }
    return this.address
  }

  getPrivateKey(): string {
    return this.privateKey.toWif()
  }

  // Utility function for API calls with retry logic
  private async fetchWithRetry(
    url: string, 
    options: FetchOptions = {}, 
    retries = 3, 
    baseDelay = 1000
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Accept': 'application/json',
          }
        })

        if (response.status === 429) {
          const delay = baseDelay * Math.pow(2, i)
          console.log(`Rate limited, waiting ${delay}ms before retry ${i + 1}/${retries}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Response error (${response.status}):`, errorText)
          
          // Try to parse as JSON for more details
          try {
            const errorJson = JSON.parse(errorText)
            console.error('Parsed error details:', errorJson)
          } catch (e) {
            // Error text wasn't JSON, that's fine
          }

          throw new BSVError(
            `HTTP error! status: ${response.status}, details: ${errorText}`,
            'API_ERROR'
          )
        }

        return response
      } catch (error) {
        if (i === retries - 1) throw error
        const delay = baseDelay * Math.pow(2, i)
        console.log(`Request failed, waiting ${delay}ms before retry ${i + 1}/${retries}:`, error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new BSVError('Max retries exceeded', 'MAX_RETRIES_ERROR')
  }

  // Get UTXOs from testnet
  async getUtxos(): Promise<FormattedUTXO[]> {
    try {
      const address = this.getAddress()
      console.log('Fetching UTXOs for address:', address)
      
      // Fetch UTXOs from WhatsOnChain API with retry
      const response = await this.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`
      )
      
      const utxos: WhatsOnChainUTXO[] = await response.json()
      console.log('Raw UTXOs from API:', utxos)

      // Create P2PKH script for our address
      const pubKey = this.privateKey.toPublicKey()
      const p2pkh = new P2PKH()
      const lockingScript = p2pkh.lock(pubKey.toAddress())

      // Create unlocking template
      const unlockingTemplate: UnlockingTemplate = {
        sign: async (tx: Transaction, inputIndex: number) => {
          const input = (tx as ExtendedTransaction).inputs[inputIndex]
          if (!input.sourceSatoshis) {
            throw new BSVError('Missing sourceSatoshis', 'INVALID_INPUT')
          }
          const sigtype = 0x41 // SIGHASH_ALL | SIGHASH_FORKID
          const signature = this.privateKey.sign(tx.toHex())
          const pubKey = this.privateKey.toPublicKey()
          const pubKeyHex = pubKey.toString()
          return Script.fromASM(`${signature.toString('hex')} ${pubKeyHex}`)
        },
        estimateLength: async () => 108 // Approximate length of signature + pubkey
      }

      // Transform WhatsOnChain UTXO format to BSV SDK format and fetch source transactions
      const formattedUtxos = await Promise.all(utxos.map(async utxo => {
        try {
          // Try to fetch source transaction with retry
          const txResponse = await this.fetchWithRetry(
            `https://api.whatsonchain.com/v1/bsv/test/tx/${utxo.tx_hash}/hex`
          )
          
          const txHex = await txResponse.text()
          const sourceTransaction = Transaction.fromHex(txHex)

          return {
            txId: utxo.tx_hash,
            outputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            script: lockingScript,
            unlockingTemplate,
            sourceTransaction
          }
        } catch (error) {
          console.warn(`Error fetching source transaction ${utxo.tx_hash}:`, error)
          // Continue without source transaction
          return {
            txId: utxo.tx_hash,
            outputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            script: lockingScript,
            unlockingTemplate
          }
        }
      }))

      console.log('Final formatted UTXOs:', formattedUtxos)
      return formattedUtxos
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      throw new BSVError(
        `Failed to get UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UTXO_FETCH_ERROR'
      )
    }
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    try {
      console.log('Starting transaction signing...')
      console.log('Transaction inputs:', tx.inputs)
      
      // Sign all inputs with our private key
      const extendedTx = tx as ExtendedTransaction
      
      for (let i = 0; i < extendedTx.inputs.length; i++) {
        const input = extendedTx.inputs[i]
        console.log(`Processing input ${i}:`, input)
        
        if (!input.sourceSatoshis) {
          console.log(`Input ${i} missing sourceSatoshis, attempting to set from input...`)
          const satoshis = input.satoshis || input.value
          console.log(`Found satoshis value for input ${i}:`, satoshis)
          
          if (!satoshis) {
            console.error(`No satoshis value found for input ${i}`)
            throw new BSVError(`Input ${i} missing satoshis value`, 'INVALID_INPUT')
          }
          
          input.sourceSatoshis = satoshis
          console.log(`Set sourceSatoshis for input ${i}:`, input.sourceSatoshis)
        }
        
        console.log(`Signing input ${i} with sourceSatoshis:`, input.sourceSatoshis)
        const signature = this.privateKey.sign(tx.toHex())
        const pubKey = this.privateKey.toPublicKey()
        const pubKeyHex = pubKey.toString()
        input.script = Script.fromASM(`${signature.toString('hex')} ${pubKeyHex}`)
        console.log(`Successfully signed input ${i}`)
      }
      
      console.log('All inputs signed successfully')
      return tx
    } catch (error) {
      console.error('Failed to sign transaction:', error)
      throw new BSVError(
        `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNING_ERROR'
      )
    }
  }

  async broadcastTransaction(tx: Transaction): Promise<string> {
    try {
      console.log('Broadcasting transaction...')
      const txHex = tx.toHex()
      console.log('Transaction hex:', txHex)

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
      )

      const result = await response.text()
      console.log('Broadcast result:', result)

      // If we got an error response, try to parse it
      if (!response.ok) {
        try {
          const errorData = JSON.parse(result)
          throw new BSVError(`Broadcast failed: ${errorData.message || result}`, 'BROADCAST_ERROR')
        } catch (e) {
          throw new BSVError(`Broadcast failed: ${result}`, 'BROADCAST_ERROR')
        }
      }
      
      // The API can return the txid in multiple formats:
      // 1. JSON object with txid field: { txid: "hash" }
      // 2. Plain string hash: "hash"
      // 3. JSON-encoded string: "\"hash\""
      
      try {
        // Try parsing as JSON first
        const jsonResult = JSON.parse(result)
        
        // Case 1: JSON object with txid field
        if (typeof jsonResult === 'object' && jsonResult.txid) {
          console.log('Transaction broadcast successful with JSON object response. TXID:', jsonResult.txid)
          return jsonResult.txid
        }
        
        // Case 3: JSON-encoded string
        if (typeof jsonResult === 'string' && jsonResult.match(/^[0-9a-f]{64}$/i)) {
          console.log('Transaction broadcast successful with JSON string response. TXID:', jsonResult)
          return jsonResult
        }
      } catch (e) {
        // Case 2: Plain string hash
        if (result && typeof result === 'string' && result.match(/^[0-9a-f]{64}$/i)) {
          console.log('Transaction broadcast successful with plain string response. TXID:', result)
          return result
        }
      }

      throw new BSVError(`Invalid response format from broadcast API: ${result}`, 'INVALID_RESPONSE')
    } catch (error) {
      console.error('Failed to broadcast transaction:', error)
      throw new BSVError(
        `Failed to broadcast transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BROADCAST_ERROR'
      )
    }
  }
} 