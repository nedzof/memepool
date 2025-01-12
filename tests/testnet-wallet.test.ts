import { Transaction, Script, P2PKH, PublicKey, PrivateKey } from '@bsv/sdk'
import { bsv } from 'scrypt-ts'
import { BSVError } from '../src/types'
import { TestnetWallet } from '../src/services/testnet-wallet'

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