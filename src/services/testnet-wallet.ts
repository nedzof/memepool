import { bsv, Utils, toByteString, hash160 } from 'scrypt-ts'
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
 * Simple testnet wallet service for development using sCrypt
 */
export class TestnetWallet {
  private privateKey: bsv.PrivateKey
  private network: bsv.Networks.Network
  private address: string | null
  
  constructor(wifKey: string = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy') {
    this.privateKey = bsv.PrivateKey.fromWIF(wifKey)
    this.network = bsv.Networks.testnet
    this.address = null
    this.initialize()
  }

  private initialize(): void {
    try {
      // Convert private key to address using sCrypt's utilities
      const pubKey = this.privateKey.publicKey
      this.address = pubKey.toAddress(this.network).toString()
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
    return this.privateKey.toWIF()
  }

  // Utility function for API calls with retry logic
  async fetchWithRetry(
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

  // Get UTXOs from testnet
  async getUtxos(): Promise<UTXO[]> {
    try {
      const address = this.getAddress()
      console.log('Fetching UTXOs for address:', address)
      
      const response = await this.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`
      )
      
      const utxos: WhatsOnChainUTXO[] = await response.json()
      console.log('Raw UTXOs from API:', utxos)

      // Create P2PKH script using sCrypt's Utils
      const pubKey = this.privateKey.publicKey
      const pubKeyHash = hash160(toByteString(pubKey.toBuffer().toString('hex')))

      // Transform WhatsOnChain UTXO format to sCrypt format
      const formattedUtxos = await Promise.all(utxos.map(async utxo => {
        try {
          const txResponse = await this.fetchWithRetry(
            `https://api.whatsonchain.com/v1/bsv/test/tx/${utxo.tx_hash}/hex`
          )
          
          const txHex = await txResponse.text()
          const sourceTransaction = new bsv.Transaction(txHex)

          // Create unlocking template using sCrypt's Utils
          const unlockingTemplate: UnlockingTemplate = {
            script: new bsv.Script(''),
            satoshis: utxo.value,
            sign: async (tx: bsv.Transaction, inputIndex: number) => {
              const input = tx.inputs[inputIndex]
              if (!input.output?.satoshis) {
                throw new BSVError('VALIDATION_ERROR', 'Input satoshis must be defined')
              }

              const lockingScript = Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(input.output.satoshis))
              tx.sign(this.privateKey)
              return input.script
            },
            estimateLength: () => 108 // Approximate length of signature + pubkey
          }

          const script = new bsv.Script(Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(utxo.value)))

          return {
            txId: utxo.tx_hash,
            outputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            script,
            unlockingTemplate,
            sourceTransaction
          } as UTXO
        } catch (error) {
          console.warn(`Error fetching source transaction ${utxo.tx_hash}:`, error)
          // Create unlocking template for error case
          const unlockingTemplate: UnlockingTemplate = {
            script: new bsv.Script(''),
            satoshis: utxo.value,
            sign: async (tx: bsv.Transaction, inputIndex: number) => {
              const input = tx.inputs[inputIndex]
              if (!input.output?.satoshis) {
                throw new BSVError('VALIDATION_ERROR', 'Input satoshis must be defined')
              }

              const lockingScript = Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(input.output.satoshis))
              tx.sign(this.privateKey)
              return input.script
            },
            estimateLength: () => 108
          }

          const script = new bsv.Script(Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(utxo.value)))

          return {
            txId: utxo.tx_hash,
            outputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            script,
            unlockingTemplate
          } as UTXO
        }
      }))

      console.log('Final formatted UTXOs:', formattedUtxos)
      return formattedUtxos
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError('UTXO_FETCH_ERROR', `Failed to get UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async signTransaction(tx: bsv.Transaction): Promise<bsv.Transaction> {
    console.log('Starting transaction signing...')
    try {
      // Validate inputs and check for insufficient funds
      let totalInput = 0
      let totalOutput = 0

      // Check inputs
      for (const input of tx.inputs) {
        if (!input.output?.satoshis) {
          throw new BSVError('VALIDATION_ERROR', 'Input satoshis must be defined')
        }
        totalInput += input.output.satoshis
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

      // Sign transaction
      tx.sign(this.privateKey)

      console.log('Transaction signed successfully')
      return tx
    } catch (error: any) {
      console.error('Failed to sign transaction:', error)
      throw new BSVError('SIGNING_ERROR', `Failed to sign transaction: ${error.message}`)
    }
  }

  async broadcastTransaction(tx: bsv.Transaction): Promise<string> {
    try {
      console.log('Broadcasting transaction...')
      console.log('Transaction hex:', tx.toString())
      
      const response = await this.fetchWithRetry(
        'https://api.whatsonchain.com/v1/bsv/test/tx/raw',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ txhex: tx.toString() })
        }
      )

      const result = await response.text()
      
      // WoC returns txid as plain text
      if (result.match(/^[0-9a-f]{64}$/i)) {
        console.log('Transaction broadcast successful. TXID:', result)
        return result
      }
      
      // Try to parse as JSON in case it's an error response
      try {
        const jsonResult = JSON.parse(result)
        if (jsonResult.txid) {
          console.log('Transaction broadcast successful. TXID:', jsonResult.txid)
          return jsonResult.txid
        }
      } catch (e) {
        // Not JSON, continue to error
      }
      
      throw new BSVError('INVALID_RESPONSE', `Invalid response format from broadcast API: ${result}`)
    } catch (error) {
      console.error('Failed to broadcast transaction:', error)
      throw new BSVError('BROADCAST_ERROR', `Failed to broadcast transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
} 