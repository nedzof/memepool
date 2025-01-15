import { Transaction, Script, P2PKH, PublicKey, PrivateKey } from '@bsv/sdk'
import { bsv } from 'scrypt-ts'
import { BSVError } from '../src/types'
import { TestnetWallet } from '../src/services/testnet-wallet'
import { InscriptionMetadata } from '../src/types/inscription'
import cbor from 'cbor'

describe('TestnetWallet', () => {
  const testPrivateKey = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy'
  let wallet: TestnetWallet
  let recipientAddress: string

  beforeEach(() => {
    wallet = new TestnetWallet(testPrivateKey)
    // Create a testnet recipient address using scrypt-ts
    const recipientPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    recipientAddress = recipientPrivKey.toPublicKey().toAddress(bsv.Networks.testnet).toString()
  })

  describe('Wallet Initialization', () => {
    it('should initialize with default private key', () => {
      const defaultWallet = new TestnetWallet()
      expect(defaultWallet.getAddress()).toBeDefined()
    })

    it('should initialize with custom private key', () => {
      const customWallet = new TestnetWallet(testPrivateKey)
      expect(customWallet.getAddress()).toBeDefined()
      expect(customWallet.getPrivateKey()).toBe(testPrivateKey)
    })

    it('should throw on invalid private key', () => {
      // The SDK throws its own error for invalid WIF keys
      expect(() => new TestnetWallet('invalid-key')).toThrow('Invalid base58 character')
    })
  })

  describe('UTXO Management', () => {
    let mockFetch: jest.SpyInstance

    beforeEach(() => {
      mockFetch = jest.spyOn(global, 'fetch')
    })

    afterEach(() => {
      mockFetch.mockRestore()
    })

    it('should fetch and format UTXOs correctly', async () => {
      const mockUtxos = [{
        tx_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tx_pos: 0,
        value: 1000
      }]

      // Create a valid P2PKH transaction
      const privKey = PrivateKey.fromWif(testPrivateKey)
      const pubKey = privKey.toPublicKey()
      const p2pkh = new P2PKH()
      const lockingScript = p2pkh.lock(pubKey.toAddress('testnet'))
      
      const sourceTx = new Transaction()
      sourceTx.addOutput({
        lockingScript,
        satoshis: 1000
      })
      
      const mockTxHex = sourceTx.toHex()

      mockFetch
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUtxos),
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockTxHex),
          status: 200,
          headers: new Headers({ 'content-type': 'text/plain' })
        }))

      const utxos = await wallet.getUtxos()
      expect(utxos).toHaveLength(1)
      expect(utxos[0].txId).toBe(mockUtxos[0].tx_hash)
      expect(utxos[0].satoshis).toBe(mockUtxos[0].value)
      expect(utxos[0].unlockingTemplate).toBeDefined()
      expect(utxos[0].script).toBeDefined()
      expect(utxos[0].outputIndex).toBe(mockUtxos[0].tx_pos)
    })

    it('should handle API errors gracefully', async () => {
      // Mock all fetch calls to reject with network error
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')))
      await expect(wallet.getUtxos()).rejects.toThrow(BSVError)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should retry on rate limit', async () => {
      mockFetch
        .mockImplementationOnce(() => Promise.resolve({ 
          ok: false, 
          status: 429,
          text: () => Promise.resolve('Rate limited'),
          headers: new Headers({ 'content-type': 'text/plain' })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        }))

      const utxos = await wallet.getUtxos()
      expect(utxos).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Transaction Signing', () => {
    const p2pkh = new P2PKH()
    const privateKey = PrivateKey.fromWif(testPrivateKey)

    let sourceTx: Transaction
    let mockInput: any

    beforeEach(() => {
      // Create source transaction
      sourceTx = new Transaction()
      const inputScript = Script.fromHex('76a91400112233445566778899aabbccddeeff0123456788ac')
      sourceTx.addOutput({
        lockingScript: inputScript,
        satoshis: 1000
      })

      // Create unlocking template
      const unlockTemplate = p2pkh.unlock(privateKey)

      // Setup mock input
      mockInput = {
        sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceOutputIndex: 0,
        sourceSatoshis: 1000,
        script: inputScript,
        unlockingScriptTemplate: unlockTemplate,
        sourceTransaction: sourceTx
      }
    })

    it('should sign a transaction', async () => {
      const tx = new Transaction()
      tx.addInput(mockInput)
      tx.addOutput({
        satoshis: 900,
        lockingScript: p2pkh.lock(recipientAddress)
      })

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.inputs.length).toBe(1)
      expect(signedTx.outputs.length).toBe(1)
    })

    it('should handle insufficient funds', async () => {
      const tx = new Transaction()
      tx.addInput(mockInput)
      tx.addOutput({
        satoshis: 1100, // More than available
        lockingScript: p2pkh.lock(recipientAddress)
      })

      await expect(wallet.signTransaction(tx)).rejects.toThrow(BSVError)
    })

    it('should validate input scripts', async () => {
      const tx = new Transaction()
      const invalidInput = { ...mockInput }
      delete invalidInput.unlockingScriptTemplate
      tx.addInput(invalidInput)
      tx.addOutput({
        satoshis: 900,
        lockingScript: p2pkh.lock(recipientAddress)
      })

      await expect(wallet.signTransaction(tx)).rejects.toThrow(BSVError)
    })

    it('should handle multiple inputs and outputs', async () => {
      const tx = new Transaction()
      tx.addInput(mockInput)
      tx.addInput({
        ...mockInput,
        sourceTXID: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      })
      tx.addOutput({
        satoshis: 500,
        lockingScript: p2pkh.lock(recipientAddress)
      })
      tx.addOutput({
        satoshis: 1400,
        lockingScript: p2pkh.lock(wallet.getAddress())
      })

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx.inputs.length).toBe(2)
      expect(signedTx.outputs.length).toBe(2)
    })

    it('should handle block height locktime', async () => {
      // Set locktime to a future block height (less than 500000000)
      const currentBlockHeight = 800000 // Example block height
      const tx = new Transaction()
      tx.version = 2 // Enable locktime
      tx.lockTime = currentBlockHeight + 100 // Lock for 100 blocks
      tx.addInput({
        ...mockInput,
        sequenceNumber: 0xfffffffe // Enable locktime by setting sequence number
      })
      tx.addOutput({
        satoshis: 900,
        lockingScript: p2pkh.lock(recipientAddress)
      })
      
      const signedTx = await wallet.signTransaction(tx)
      const txHex = signedTx.toHex()
      // Verify the transaction hex contains the correct locktime
      // Locktime is stored in little-endian format in the last 4 bytes
      const locktimeHex = txHex.slice(-8)
      const locktime = parseInt(locktimeHex.match(/../g)!.reverse().join(''), 16)
      expect(locktime).toBe(currentBlockHeight + 100)
    })

    it('should handle timestamp locktime', async () => {
      // Set locktime to a future timestamp (greater than 500000000)
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600 // Lock for 1 hour
      const tx = new Transaction()
      tx.version = 2 // Enable locktime
      tx.lockTime = futureTimestamp
      tx.addInput({
        ...mockInput,
        sequenceNumber: 0xfffffffe // Enable locktime by setting sequence number
      })
      tx.addOutput({
        satoshis: 900,
        lockingScript: p2pkh.lock(recipientAddress)
      })
      
      const signedTx = await wallet.signTransaction(tx)
      const txHex = signedTx.toHex()
      // Verify the transaction hex contains the correct locktime
      // Locktime is stored in little-endian format in the last 4 bytes
      const locktimeHex = txHex.slice(-8)
      const locktime = parseInt(locktimeHex.match(/../g)!.reverse().join(''), 16)
      expect(locktime).toBe(futureTimestamp)
    })

    it('should validate locktime constraints', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600
      const tx = new Transaction()
      tx.version = 2 // Enable locktime
      tx.lockTime = futureTimestamp // Set a locktime
      tx.addInput({
        ...mockInput,
        sequenceNumber: 0xffffffff // Disable locktime with max sequence number
      })
      tx.addOutput({
        satoshis: 900,
        lockingScript: p2pkh.lock(recipientAddress)
      })
      
      // Should throw because sequence number disables locktime
      await expect(wallet.signTransaction(tx)).rejects.toThrow(BSVError)
    })
  })

  describe('MEME Marker Scripts', () => {
    const p2pkh = new P2PKH()
    const privateKey = PrivateKey.fromWif(testPrivateKey)
    const pubKey = privateKey.toPublicKey()
    let mockInput: any

    beforeEach(() => {
      // Create source transaction
      const sourceTx = new Transaction()
      const inputScript = Script.fromHex('76a91400112233445566778899aabbccddeeff0123456788ac')
      sourceTx.addOutput({
        lockingScript: inputScript,
        satoshis: 1000
      })

      // Create unlocking template
      const unlockTemplate = p2pkh.unlock(privateKey)

      // Setup mock input
      mockInput = {
        sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceOutputIndex: 0,
        sourceSatoshis: 1000,
        script: inputScript,
        unlockingScriptTemplate: unlockTemplate,
        sourceTransaction: sourceTx
      }
    })

    it('should create MEME marker script', () => {
      // Create base P2PKH script
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      
      // Create MEME marker
      const memeMarker = Script.fromHex('6a044d454d45') // OP_RETURN MEME
      
      // Combine scripts
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())
      
      // Verify script structure
      const scriptHex = combinedScript.toHex()
      expect(scriptHex).toContain('6a044d454d45') // Contains MEME marker
      expect(scriptHex).toContain(p2pkhScript.toHex()) // Contains P2PKH script
    })

    it('should validate MEME marker preservation', async () => {
      // Create transaction with MEME marker output
      const tx = new Transaction()
      tx.addInput(mockInput)

      // Create combined P2PKH + MEME marker script
      const p2pkhScript = p2pkh.lock(recipientAddress)
      const memeMarker = Script.fromHex('6a044d454d45')
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())

      tx.addOutput({
        lockingScript: combinedScript,
        satoshis: 1 // Inscription outputs are always 1 satoshi
      })

      // Add change output
      tx.addOutput({
        lockingScript: p2pkh.lock(pubKey.toAddress('testnet')),
        satoshis: 900
      })

      const signedTx = await wallet.signTransaction(tx)
      const outputHex = signedTx.outputs[0].lockingScript.toHex()
      expect(outputHex).toContain('6a044d454d45') // MEME marker preserved
    })

    it('should detect MEME marker in script', () => {
      // Create test scripts
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      const memeMarker = Script.fromHex('6a044d454d45')
      
      // Test script with marker
      const withMarker = Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())
      expect(withMarker.toHex()).toContain('6a044d454d45')
      
      // Test script without marker
      const withoutMarker = Script.fromHex(p2pkhScript.toHex())
      expect(withoutMarker.toHex()).not.toContain('6a044d454d45')
    })

    it('should verify marker position in script', () => {
      // Create test scripts
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      const memeMarker = Script.fromHex('6a044d454d45')
      
      // Test correct position (P2PKH + MEME)
      const correctPosition = Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())
      const correctHex = correctPosition.toHex()
      
      // Test incorrect position (MEME + P2PKH)
      const incorrectPosition = Script.fromHex(memeMarker.toHex() + p2pkhScript.toHex())
      const incorrectHex = incorrectPosition.toHex()
      
      // Verify marker positions
      const markerIndex = correctHex.indexOf('6a044d454d45')
      const p2pkhIndex = correctHex.indexOf(p2pkhScript.toHex())
      expect(markerIndex).toBeGreaterThan(p2pkhIndex) // MEME marker should come after P2PKH
      
      // Verify scripts are different
      expect(correctHex).not.toBe(incorrectHex)
    })

    it('should estimate combined script size correctly', () => {
      // Create base P2PKH script
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      const memeMarker = Script.fromHex('6a044d454d45')
      
      // Get individual sizes
      const p2pkhSize = p2pkhScript.toHex().length / 2 // Convert from hex to bytes
      const markerSize = memeMarker.toHex().length / 2
      
      // Create combined script
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())
      const combinedSize = combinedScript.toHex().length / 2
      
      // Verify size estimation
      expect(combinedSize).toBe(p2pkhSize + markerSize)
    })

    it('should separate and parse combined script', () => {
      // Create combined script
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      const memeMarker = Script.fromHex('6a044d454d45')
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())
      const combinedHex = combinedScript.toHex()
      
      // Separate scripts
      const markerIndex = combinedHex.indexOf('6a044d454d45')
      const extractedP2PKH = Script.fromHex(combinedHex.slice(0, markerIndex))
      const extractedMarker = Script.fromHex(combinedHex.slice(markerIndex))
      
      // Verify P2PKH part
      expect(extractedP2PKH.toHex()).toBe(p2pkhScript.toHex())
      
      // Verify MEME marker part
      expect(extractedMarker.toHex()).toBe(memeMarker.toHex())
      
      // Verify the scripts can be recombined
      const recombined = Script.fromHex(extractedP2PKH.toHex() + extractedMarker.toHex())
      expect(recombined.toHex()).toBe(combinedHex)
    })

    it('should create and validate script template', () => {
      // Create a template function for P2PKH + MEME marker scripts
      const createCombinedTemplate = (address: string) => {
        const p2pkhScript = p2pkh.lock(address)
        const memeMarker = Script.fromHex('6a044d454d45')
        return Script.fromHex(p2pkhScript.toHex() + memeMarker.toHex())
      }
      
      // Create scripts for different addresses using the template
      const script1 = createCombinedTemplate(pubKey.toAddress('testnet'))
      const script2 = createCombinedTemplate(recipientAddress)
      
      // Verify both scripts have the correct structure
      expect(script1.toHex()).toContain('6a044d454d45')
      expect(script2.toHex()).toContain('6a044d454d45')
      
      // Verify scripts are different (due to different addresses)
      expect(script1.toHex()).not.toBe(script2.toHex())
      
      // Verify both scripts follow the template pattern
      const validateTemplate = (script: Script) => {
        const hex = script.toHex()
        return hex.includes('76a914') && // P2PKH start
               hex.includes('88ac') &&   // P2PKH end
               hex.includes('6a044d454d45') // MEME marker
      }
      
      expect(validateTemplate(script1)).toBe(true)
      expect(validateTemplate(script2)).toBe(true)
    })

    it('should create inscription output script', () => {
      // Create test metadata
      const mockMetadata: InscriptionMetadata = {
        type: 'memepool',
        version: '1.0',
        content: {
          type: 'video/mp4',
          size: 1000000,
          duration: 120,
          width: 1920,
          height: 1080
        },
        metadata: {
          title: 'test.mp4',
          creator: recipientAddress,
          createdAt: Date.now(),
          attributes: {
            blockHash: '000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254',
            bitrate: 5000000,
            format: 'video/mp4',
            dimensions: '1920x1080'
          }
        }
      }

      // Create base P2PKH script
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      
      // Create CBOR metadata
      const cborData = cbor.encode(mockMetadata)
      const pushData = Buffer.concat([
        Buffer.from('6a', 'hex'), // OP_RETURN
        Buffer.from([cborData.length]), // Length
        cborData
      ])
      
      // Combine scripts
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + pushData.toString('hex'))
      
      // Verify script structure
      const scriptHex = combinedScript.toHex()
      expect(scriptHex).toContain(p2pkhScript.toHex()) // Contains P2PKH script
      expect(scriptHex).toContain('6a') // Contains OP_RETURN

      // Verify CBOR metadata
      const p2pkhEnd = scriptHex.indexOf('88ac') + 4
      const cborHex = scriptHex.slice(p2pkhEnd + 2) // Skip 6a
      const extractedData = Buffer.from(cborHex, 'hex')
      const decodedMetadata = cbor.decode(extractedData) as InscriptionMetadata
      expect(decodedMetadata).toEqual(mockMetadata)
    })

    it('should validate inscription output preservation', async () => {
      // Create test metadata
      const mockMetadata: InscriptionMetadata = {
        type: 'memepool',
        version: '1.0',
        content: {
          type: 'video/mp4',
          size: 1000000,
          duration: 120,
          width: 1920,
          height: 1080
        },
        metadata: {
          title: 'test.mp4',
          creator: recipientAddress,
          createdAt: Date.now(),
          attributes: {
            blockHash: '000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254',
            bitrate: 5000000,
            format: 'video/mp4',
            dimensions: '1920x1080'
          }
        }
      }

      // Create transaction with inscription output
      const tx = new Transaction()
      tx.addInput(mockInput)

      // Create combined P2PKH + CBOR metadata script
      const p2pkhScript = p2pkh.lock(recipientAddress)
      const cborData = cbor.encode(mockMetadata)
      const pushData = Buffer.concat([
        Buffer.from('6a', 'hex'), // OP_RETURN
        Buffer.from([cborData.length]), // Length
        cborData
      ])
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + pushData.toString('hex'))

      tx.addOutput({
        lockingScript: combinedScript,
        satoshis: 1 // Inscription outputs are always 1 satoshi
      })

      // Add change output
      tx.addOutput({
        lockingScript: p2pkh.lock(pubKey.toAddress('testnet')),
        satoshis: 900
      })

      const signedTx = await wallet.signTransaction(tx)
      const outputHex = signedTx.outputs[0].lockingScript.toHex()

      // Verify P2PKH part
      expect(outputHex).toContain(p2pkhScript.toHex())

      // Verify CBOR metadata
      const p2pkhEnd = outputHex.indexOf('88ac') + 4
      const cborHex = outputHex.slice(p2pkhEnd + 2) // Skip 6a
      const extractedData = Buffer.from(cborHex, 'hex')
      const decodedMetadata = cbor.decode(extractedData) as InscriptionMetadata
      expect(decodedMetadata).toEqual(mockMetadata)
    })

    it('should handle large metadata correctly', () => {
      // Create test metadata with large title
      const mockMetadata: InscriptionMetadata = {
        type: 'memepool',
        version: '1.0',
        content: {
          type: 'video/mp4',
          size: 1000000,
          duration: 120,
          width: 1920,
          height: 1080
        },
        metadata: {
          title: 'a'.repeat(1000), // Long filename
          creator: recipientAddress,
          createdAt: Date.now(),
          attributes: {
            blockHash: '000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254',
            bitrate: 5000000,
            format: 'video/mp4',
            dimensions: '1920x1080'
          }
        }
      }

      // Create base P2PKH script
      const p2pkhScript = p2pkh.lock(pubKey.toAddress('testnet'))
      
      // Create CBOR metadata
      const cborData = cbor.encode(mockMetadata)
      const pushData = Buffer.concat([
        Buffer.from('6a', 'hex'), // OP_RETURN
        Buffer.from([0x4e]), // PUSHDATA4
        Buffer.alloc(4).fill(cborData.length), // 4-byte length
        cborData
      ])
      
      // Combine scripts
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + pushData.toString('hex'))
      
      // Verify script structure
      const scriptHex = combinedScript.toHex()
      expect(scriptHex).toContain(p2pkhScript.toHex()) // Contains P2PKH script
      expect(scriptHex).toContain('6a4e') // Contains OP_RETURN + PUSHDATA4

      // Verify CBOR metadata
      const p2pkhEnd = scriptHex.indexOf('88ac') + 4
      const cborHex = scriptHex.slice(p2pkhEnd + 6) // Skip 6a4e and length
      const extractedData = Buffer.from(cborHex, 'hex')
      const decodedMetadata = cbor.decode(extractedData) as InscriptionMetadata
      expect(decodedMetadata).toEqual(mockMetadata)
    })
  })

  describe('Transaction Broadcasting', () => {
    let mockFetch: jest.SpyInstance
    let mockTransaction: Transaction

    beforeEach(async () => {
      mockFetch = jest.spyOn(global, 'fetch')
      
      // Create a valid transaction for testing
      const privKey = PrivateKey.fromWif(testPrivateKey)
      const pubKey = privKey.toPublicKey()
      const p2pkh = new P2PKH()
      
      // Create source transaction with proper output
      const sourceTx = new Transaction()
      const p2pkhLockingScript = p2pkh.lock(pubKey.toAddress('testnet'))
      sourceTx.addOutput({
        lockingScript: p2pkhLockingScript,
        satoshis: 1000
      })
      
      // Create transaction to broadcast
      mockTransaction = new Transaction()
      mockTransaction.addInput({
        sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceTransaction: sourceTx,
        sourceOutputIndex: 0,
        unlockingScriptTemplate: p2pkh.unlock(privKey)
      })
      mockTransaction.addOutput({
        lockingScript: p2pkh.lock(recipientAddress),
        satoshis: 900
      })
      
      // Add change output to handle fees
      mockTransaction.addOutput({
        lockingScript: p2pkh.lock(pubKey.toAddress('testnet')),
        satoshis: 50,
        change: true
      })
      
      // Compute fee and sign
      await mockTransaction.fee()
      await mockTransaction.sign()
    })

    afterEach(() => {
      mockFetch.mockRestore()
    })

    it('should broadcast transaction successfully', async () => {
      const txId = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve(txId),
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' })
      }))

      const result = await wallet.broadcastTransaction(mockTransaction)
      expect(result).toBe(txId)
    })

    it('should handle broadcast errors', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
      await expect(wallet.broadcastTransaction(mockTransaction)).rejects.toThrow(BSVError)
    })

    it('should retry on temporary failures', async () => {
      mockFetch
        .mockImplementationOnce(() => Promise.resolve({ 
          ok: false, 
          status: 500,
          text: () => Promise.resolve('Internal server error'),
          headers: new Headers({ 'content-type': 'text/plain' })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
          headers: new Headers({ 'content-type': 'text/plain' })
        }))

      const result = await wallet.broadcastTransaction(mockTransaction)
      expect(result).toMatch(/^[0-9a-f]{64}$/i)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
}) 