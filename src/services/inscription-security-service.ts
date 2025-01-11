import { BSVService } from './bsv-service'
import crypto from 'crypto'
import { BSVError } from '../types'

interface InscriptionSecurityConfig {
  minConfirmations?: number
  minInscriptionValue?: number
}

export interface InscriptionMetadata {
  type: string
  version: string
  content: {
    id: string
    title: string
    creator: string
    timestamp: string
    metadata?: {
      format?: string
      size?: number
      protected?: boolean
    }
  }
}

/**
 * Service for handling inscription security checks and transfer validations
 */
export class InscriptionSecurityService {
  private config: InscriptionSecurityConfig

  constructor(config: InscriptionSecurityConfig = {}) {
    this.config = {
      minConfirmations: 1,
      minInscriptionValue: 1, // Changed to 1 satoshi
      ...config
    }
  }

  /**
   * Convert a public key hash to a testnet address
   * @param pubKeyHash - The public key hash in hex format
   * @returns The testnet address
   */
  pubKeyHashToAddress(pubKeyHash: string): string {
    try {
      // Validate pubkey hash format (should be 40 hex chars)
      if (!/^[0-9a-fA-F]{40}$/.test(pubKeyHash)) {
        throw new BSVError('Invalid public key hash format', 'INVALID_PUBKEY_HASH')
      }

      // For testnet, version byte is 0x6f
      const versionByte = '6f'
      const fullHash = versionByte + pubKeyHash
      
      // Convert to Buffer for checksum calculation
      const buffer = Buffer.from(fullHash, 'hex')
      
      // Calculate double SHA256 for checksum
      const hash1 = crypto.createHash('sha256').update(buffer).digest()
      const hash2 = crypto.createHash('sha256').update(hash1).digest()
      const checksum = hash2.slice(0, 4)
      
      // Combine version, pubkey hash, and checksum
      const final = Buffer.concat([buffer, checksum])
      
      // Convert to base58
      return this.toBase58(final)
    } catch (error) {
      console.error('Failed to convert pubkey hash to address:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to convert pubkey hash: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ADDRESS_CONVERSION_ERROR')
    }
  }

  /**
   * Convert a buffer to base58 string
   * @param buffer - The buffer to convert
   * @returns The base58 string
   */
  private toBase58(buffer: Buffer): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let num = BigInt('0x' + buffer.toString('hex'))
    const base = BigInt(58)
    const zero = BigInt(0)
    let result = ''
    
    while (num > zero) {
      const mod = Number(num % base)
      result = ALPHABET[mod] + result
      num = num / base
    }
    
    // Add leading zeros
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      result = '1' + result
    }
    
    return result
  }

  /**
   * Verify inscription format and data integrity
   * @param txid - Transaction ID of the inscription
   * @returns Inscription data if valid
   */
  async verifyInscriptionFormat(txid: string): Promise<InscriptionMetadata> {
    try {
      console.log(`Verifying inscription format for transaction: ${txid}`)
      
      // First try to get the raw transaction data
      const rawResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`)
      if (!rawResponse.ok) {
        throw new BSVError(`Failed to fetch raw transaction data: ${rawResponse.statusText}`, 'API_ERROR')
      }
      
      const txHex = await rawResponse.text()
      console.log('Transaction hex length:', txHex.length)
      
      // Look for either standalone OP_RETURN or combined P2PKH+OP_RETURN
      const opReturnMatch = txHex.match(/006a([0-9a-f]*)/) || txHex.match(/76a914[0-9a-f]{40}88ac6a([0-9a-f]*)/)
      if (!opReturnMatch) {
        throw new BSVError('No inscription data found in transaction', 'INVALID_INSCRIPTION')
      }
      
      // Extract the data after OP_RETURN
      const dataHex = opReturnMatch[1] || opReturnMatch[2] // Use second capture group for combined format
      if (!dataHex) {
        throw new BSVError('No data found after OP_RETURN', 'INVALID_INSCRIPTION')
      }
      console.log('Data hex length:', dataHex.length)
      
      // Check for our protection marker (MEME)
      if (dataHex === '044d454d45') {
        console.log('Found protection marker')
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
        }
      }
      
      // If not a protection marker, look for JSON data
      const jsonStartIndex = dataHex.indexOf('7b227479706522')
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
        }
      }
      
      // Process JSON data
      let jsonEndIndex = jsonStartIndex
      let openBraces = 0
      
      for (let i = jsonStartIndex; i < dataHex.length; i += 2) {
        const byte = dataHex.slice(i, i + 2)
        if (byte === '7b') { // '{'
          openBraces++
        } else if (byte === '7d') { // '}'
          openBraces--
          if (openBraces === 0) {
            jsonEndIndex = i + 2
            break
          }
        }
      }
      
      if (openBraces !== 0) {
        throw new BSVError('Invalid JSON metadata format - unmatched braces', 'INVALID_INSCRIPTION')
      }
      
      // Extract just the JSON portion
      const jsonHex = dataHex.slice(jsonStartIndex, jsonEndIndex)
      console.log('JSON hex length:', jsonHex.length)
      
      // Convert hex to string
      const jsonString = Buffer.from(jsonHex, 'hex').toString('utf8')
      console.log('JSON string:', jsonString)
      
      try {
        // Parse JSON metadata
        const metadata = JSON.parse(jsonString) as InscriptionMetadata
        
        // Validate required fields
        if (!metadata.type || metadata.type !== 'memepool' ||
            !metadata.version || !metadata.content ||
            !metadata.content.id || !metadata.content.title ||
            !metadata.content.creator || !metadata.content.timestamp) {
          throw new BSVError('Missing required metadata fields', 'INVALID_INSCRIPTION')
        }
        
        return metadata
      } catch (parseError) {
        console.error('Failed to parse metadata JSON:', parseError)
        throw new BSVError(`Invalid metadata format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 'INVALID_INSCRIPTION')
      }
    } catch (error) {
      console.error('Failed to verify inscription format:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to verify inscription format: ${error instanceof Error ? error.message : 'Unknown error'}`, 'INVALID_INSCRIPTION')
    }
  }

  /**
   * Verify ownership for transfer
   * @param txid - Transaction ID of the inscription
   * @param senderAddress - Address attempting the transfer
   * @returns Ownership verification result
   */
  async verifyOwnershipForTransfer(txid: string, senderAddress: string): Promise<boolean> {
    try {
      // First trace to the latest transaction in the chain
      console.log('Tracing to latest transaction...')
      let currentTxId = txid
      let currentTx: any = null
      let latestTxId = txid
      let latestTx: any = null

      while (true) {
        // Get current transaction with retries
        let retries = 3
        let txResponse: Response | null = null
        while (retries > 0) {
          try {
            txResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}`)
            if (txResponse.ok) break
            if (txResponse.status === 429) { // Rate limit
              console.log(`Rate limited, waiting ${1000 * (4 - retries)}ms before retry ${4 - retries}/3`)
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
              retries--
              continue
            }
            throw new BSVError(`Failed to fetch transaction: ${txResponse.statusText}`, 'API_ERROR')
          } catch (error) {
            console.error('Error fetching transaction:', error)
            retries--
            if (retries === 0) throw error
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        if (!txResponse || !txResponse.ok) {
          throw new BSVError('Failed to fetch transaction after retries', 'API_ERROR')
        }
        
        currentTx = await txResponse.json()

        // Check if this transaction has been spent with retries
        retries = 3
        let spentResponse: Response | null = null
        while (retries > 0) {
          try {
            spentResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}/spent`)
            if (spentResponse.ok || spentResponse.status === 404) break
            if (spentResponse.status === 429) { // Rate limit
              console.log(`Rate limited, waiting ${1000 * (4 - retries)}ms before retry ${4 - retries}/3`)
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
              retries--
              continue
            }
            throw new BSVError(`Failed to check spent status: ${spentResponse.statusText}`, 'API_ERROR')
          } catch (error) {
            console.error('Error checking spent status:', error)
            retries--
            if (retries === 0) throw error
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        if (!spentResponse) {
          throw new BSVError('Failed to check spent status after retries', 'API_ERROR')
        }

        if (spentResponse.status === 404) {
          // This transaction hasn't been spent, so it's the latest
          latestTxId = currentTxId
          latestTx = currentTx
          break
        }

        // Get the next transaction in the chain
        const spentData = await spentResponse.json()
        currentTxId = spentData.spentTxid
      }

      // Verify the latest transaction belongs to the sender
      const outputs = latestTx.vout
      let found = false
      for (const output of outputs) {
        if (output.scriptPubKey.addresses && output.scriptPubKey.addresses.includes(senderAddress)) {
          found = true
          break
        }
      }

      if (!found) {
        console.log('Sender address not found in latest transaction outputs')
        return false
      }

      // Check confirmations if required
      if (this.config.minConfirmations && this.config.minConfirmations > 0) {
        const confirmations = latestTx.confirmations || 0
        if (confirmations < this.config.minConfirmations) {
          console.log(`Insufficient confirmations: ${confirmations} < ${this.config.minConfirmations}`)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Failed to verify ownership:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to verify ownership: ${error instanceof Error ? error.message : 'Unknown error'}`, 'OWNERSHIP_ERROR')
    }
  }

  /**
   * Confirm transfer parameters and requirements
   * @param inscriptionData - The inscription metadata
   * @param recipientAddress - The recipient's address
   * @returns True if transfer is valid
   */
  async confirmTransfer(inscriptionData: InscriptionMetadata, recipientAddress: string): Promise<boolean> {
    try {
      // Validate inscription data
      if (!inscriptionData || !inscriptionData.content || !inscriptionData.content.id) {
        throw new BSVError('Invalid inscription data', 'INVALID_INSCRIPTION')
      }

      // Validate recipient address (basic format check)
      if (!recipientAddress || !/^[123mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(recipientAddress)) {
        throw new BSVError('Invalid recipient address', 'INVALID_ADDRESS')
      }

      return true
    } catch (error) {
      console.error('Failed to confirm transfer:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to confirm transfer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TRANSFER_ERROR')
    }
  }

  /**
   * Validate transfer parameters
   * @param params - The transfer parameters
   * @returns True if parameters are valid
   */
  validateTransferParams(params: Record<string, unknown>): boolean {
    const requiredFields = ['inscriptionId', 'recipientAddress', 'fee']
    for (const field of requiredFields) {
      if (!params[field]) {
        throw new BSVError(`Missing required field: ${field}`, 'INVALID_PARAMS')
      }
    }
    return true
  }

  /**
   * Update service configuration
   * @param newConfig - New configuration options
   */
  updateConfig(newConfig: InscriptionSecurityConfig): void {
    this.config = {
      ...this.config,
      ...newConfig
    }
  }

  /**
   * Check if a transaction contains an inscription
   * @param txid - Transaction ID to check
   * @returns True if transaction contains an inscription
   */
  async hasInscription(txid: string): Promise<boolean> {
    try {
      const rawResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`)
      if (!rawResponse.ok) {
        throw new BSVError(`Failed to fetch transaction: ${rawResponse.statusText}`, 'API_ERROR')
      }

      const txHex = await rawResponse.text()
      
      // Look for OP_RETURN
      const opReturnMatch = txHex.match(/006a([0-9a-f]*)/) || txHex.match(/76a914[0-9a-f]{40}88ac6a([0-9a-f]*)/)
      if (!opReturnMatch) {
        return false
      }

      // Extract the data after OP_RETURN
      const dataHex = opReturnMatch[1] || opReturnMatch[2]
      if (!dataHex) {
        return false
      }

      // Look for JSON data or protection marker
      return dataHex === '044d454d45' || dataHex.indexOf('7b227479706522') !== -1
    } catch (error) {
      console.error('Failed to check for inscription:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to check for inscription: ${error instanceof Error ? error.message : 'Unknown error'}`, 'API_ERROR')
    }
  }

  /**
   * Check if a transaction contains a protection marker
   * @param txid - Transaction ID to check
   * @returns True if transaction contains a protection marker
   */
  async hasProtectionMarker(txid: string): Promise<boolean> {
    try {
      const rawResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`)
      if (!rawResponse.ok) {
        throw new BSVError(`Failed to fetch transaction: ${rawResponse.statusText}`, 'API_ERROR')
      }

      const txHex = await rawResponse.text()
      
      // Look for OP_RETURN with protection marker
      const opReturnMatch = txHex.match(/006a044d454d45/) || txHex.match(/76a914[0-9a-f]{40}88ac6a044d454d45/)
      return !!opReturnMatch
    } catch (error) {
      console.error('Failed to check for protection marker:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to check for protection marker: ${error instanceof Error ? error.message : 'Unknown error'}`, 'API_ERROR')
    }
  }

  /**
   * Filter UTXOs to find those containing inscriptions
   * @param utxos - Array of UTXOs to filter
   * @returns Array of UTXOs containing inscriptions
   */
  async filterInscriptionUtxos(utxos: any[]): Promise<any[]> {
    try {
      const inscriptionUtxos = []
      
      for (const utxo of utxos) {
        if (await this.hasInscription(utxo.txid)) {
          inscriptionUtxos.push(utxo)
        }
      }
      
      return inscriptionUtxos
    } catch (error) {
      console.error('Failed to filter inscription UTXOs:', error)
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError(`Failed to filter inscription UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'UTXO_ERROR')
    }
  }
} 