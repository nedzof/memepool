import { PrivateKey, P2PKH, Transaction, Script, PublicKey } from '@bsv/sdk'
import { BSVError } from '../types'
import type { UnlockingTemplate, UTXO } from '../types/bsv'

interface WhatsOnChainUTXO {
  tx_hash: string
  tx_pos: number
  value: number
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

/**
 * Simple testnet wallet service for development
 * This is a temporary solution for testing purposes
 */
export class TestnetWallet {
  private privateKey: PrivateKey
  private network: 'testnet'
  private address: string | null
  
  constructor(wifKey: string = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy') {
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
      this.address = pubKey.toAddress('testnet')
      console.log('Testnet wallet initialized with address:', this.address)
    } catch (error) {
      console.error('Failed to initialize testnet wallet:', error)
      throw new BSVError('WALLET_INIT_ERROR', 'Failed to initialize testnet wallet')
    }
  }

  getAddress(): string {
    if (!this.address) {
      throw new BSVError('WALLET_NOT_INITIALIZED', 'Wallet not initialized')
    }
    return this.address
  }

  getPrivateKey(): string {
    return this.privateKey.toWif([0xef]);
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

          throw new BSVError('API_ERROR', `HTTP error! status: ${response.status}, details: ${errorText}`)
        }

        return response
      } catch (error) {
        if (i === retries - 1) throw error
        const delay = baseDelay * Math.pow(2, i)
        console.log(`Request failed, waiting ${delay}ms before retry ${i + 1}/${retries}:`, error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new BSVError('MAX_RETRIES_ERROR', 'Max retries exceeded')
  }

  private async lock(pubKey: PublicKey): Promise<Script> {
    const p2pkh = new P2PKH()
    return p2pkh.lock(pubKey.toAddress(this.network))
  }

  // Get UTXOs from testnet
  async getUtxos(): Promise<UTXO[]> {
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

      // Transform WhatsOnChain UTXO format to BSV SDK format and fetch source transactions
      const formattedUtxos = await Promise.all(utxos.map(async utxo => {
        try {
          // Try to fetch source transaction with retry
          const txResponse = await this.fetchWithRetry(
            `https://api.whatsonchain.com/v1/bsv/test/tx/${utxo.tx_hash}/hex`
          )
          
          const txHex = await txResponse.text()
          const sourceTransaction = Transaction.fromHex(txHex)

          // Create unlocking template
          const unlockingTemplate: UnlockingTemplate = {
            script: Script.fromHex(''),
            satoshis: utxo.value,
            sign: async (tx: Transaction, inputIndex: number) => {
              const input = tx.inputs[inputIndex]
              if (!input.satoshis) {
                throw new BSVError('VALIDATION_ERROR', 'Input satoshis must be defined')
              }

              const pubKey = this.privateKey.toPublicKey()
              const p2pkh = new P2PKH()
              const lockingScript = p2pkh.lock(pubKey)
              const sigtype = 0x41 // SIGHASH_ALL | SIGHASH_FORKID
              const preimage = tx.getSignaturePreimage(inputIndex, lockingScript, input.satoshis, sigtype)
              const signature = this.privateKey.sign(preimage)
              
              const unlockingScript = Script.fromHex('')
              unlockingScript.add(signature.toBuffer())
              unlockingScript.add(pubKey.toBuffer())
              
              ;(input as any).script = unlockingScript
              return unlockingScript
            },
            estimateLength: () => 108 // Approximate length of signature + pubkey
          }

          return {
            txId: utxo.tx_hash,
            outputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            script: p2pkh.lock(pubKey), // Create new locking script for each UTXO
            unlockingTemplate: unlockingTemplate,
            sourceTransaction
          } as UTXO
        } catch (error) {
          console.warn(`Error fetching source transaction ${utxo.tx_hash}:`, error)
          // Create unlocking template for error case
          const unlockingTemplate: UnlockingTemplate = {
            script: Script.fromHex(''),
            satoshis: utxo.value,
            sign: async (tx: Transaction, inputIndex: number) => {
              const input = tx.inputs[inputIndex]
              if (!input.satoshis) {
                throw new BSVError('VALIDATION_ERROR', 'Input satoshis must be defined')
              }

              const pubKey = this.privateKey.toPublicKey()
              const p2pkh = new P2PKH()
              const lockingScript = p2pkh.lock(pubKey)
              const sigtype = 0x41 // SIGHASH_ALL | SIGHASH_FORKID
              const preimage = tx.getSignaturePreimage(inputIndex, lockingScript, input.satoshis, sigtype)
              const signature = this.privateKey.sign(preimage)
              
              const unlockingScript = Script.fromHex('')
              unlockingScript.add(signature.toBuffer())
              unlockingScript.add(pubKey.toBuffer())
              
              ;(input as any).script = unlockingScript
              return unlockingScript
            },
            estimateLength: () => 108 // Approximate length of signature + pubkey
          }
          // Continue without source transaction
          return {
            txId: utxo.tx_hash,
            outputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            script: p2pkh.lock(pubKey), // Create new locking script for each UTXO
            unlockingTemplate: unlockingTemplate
          } as UTXO
        }
      }))

      console.log('Final formatted UTXOs:', formattedUtxos)
      return formattedUtxos
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      throw new BSVError('UTXO_FETCH_ERROR', `Failed to get UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    console.log('Starting transaction signing...')
    try {
      // Validate inputs and check for insufficient funds
      let totalInput = 0
      let totalOutput = 0

      // Check inputs
      for (const input of tx.inputs) {
        if (!input.unlockingScriptTemplate) {
          throw new BSVError('VALIDATION_ERROR', 'Unlocking script template is required')
        }
        if (!input.sourceSatoshis) {
          throw new BSVError('VALIDATION_ERROR', 'Input satoshis must be defined')
        }
        totalInput += input.sourceSatoshis
      }

      // Calculate total output amount
      for (const output of tx.outputs) {
        if (!output.satoshis) {
          throw new BSVError('VALIDATION_ERROR', 'Output satoshis must be defined')
        }
        totalOutput += output.satoshis
      }

      // Check for insufficient funds
      if (totalInput < totalOutput) {
        throw new BSVError('INSUFFICIENT_FUNDS', `Total input (${totalInput}) is less than total output (${totalOutput})`)
      }

      // Sign all inputs using the SDK's sign() method
      await tx.sign()
      console.log('Transaction signed successfully')
      return tx
    } catch (error: any) {
      console.error('Failed to sign transaction:', error)
      throw new BSVError('SIGNING_ERROR', `Failed to sign transaction: ${error.message}`)
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
          throw new BSVError('BROADCAST_ERROR', `Broadcast failed: ${errorData.message || result}`)
        } catch (e) {
          throw new BSVError('BROADCAST_ERROR', `Broadcast failed: ${result}`)
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

      throw new BSVError('INVALID_RESPONSE', `Invalid response format from broadcast API: ${result}`)
    } catch (error) {
      console.error('Failed to broadcast transaction:', error)
      throw new BSVError('BROADCAST_ERROR', `Failed to broadcast transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
} 