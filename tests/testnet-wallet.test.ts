import { Script, Transaction, PrivateKey, PublicKey, P2PKH } from '@bsv/sdk'
import { TestnetWallet } from '../src/services/testnet-wallet'
import { BSVError } from '../src/types'
import type { TransactionInput } from '../src/types'

interface ExtendedTransactionInput extends TransactionInput {
  sourceSatoshis?: number
  satoshis?: number
  value?: number
}

interface ExtendedTransaction extends Transaction {
  inputs: ExtendedTransactionInput[]
}

// Mock BSV SDK
jest.mock('@bsv/sdk', () => {
  const mockPrivateKey = {
    toWif: jest.fn().mockReturnValue('testWIF'),
    toPublicKey: jest.fn().mockReturnValue({
      toAddress: jest.fn().mockReturnValue('testAddress'),
      toString: jest.fn().mockReturnValue('testPubKeyHex')
    }),
    sign: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('testSignature')
    })
  }

  return {
    PrivateKey: {
      fromWif: jest.fn().mockReturnValue(mockPrivateKey)
    },
    P2PKH: jest.fn().mockImplementation(() => ({
      lock: jest.fn().mockReturnValue({
        toASM: jest.fn().mockReturnValue('OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG')
      })
    })),
    Transaction: jest.fn().mockImplementation(() => ({
      inputs: [],
      addInput: jest.fn().mockReturnThis(),
      addOutput: jest.fn().mockReturnThis(),
      toHex: jest.fn().mockReturnValue('testTxHex')
    })),
    Script: {
      fromASM: jest.fn().mockReturnValue({
        toASM: jest.fn().mockReturnValue('testScript')
      })
    }
  }
})

// Mock fetch for API calls
global.fetch = jest.fn()

describe('TestnetWallet', () => {
  let wallet: TestnetWallet
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
    wallet = new TestnetWallet('testWIF')
  })

  describe('constructor and initialization', () => {
    it('should initialize with default WIF key', () => {
      const defaultWallet = new TestnetWallet()
      expect(defaultWallet.getAddress()).toBe('testAddress')
    })

    it('should initialize with custom WIF key', () => {
      expect(wallet.getAddress()).toBe('testAddress')
      expect(PrivateKey.fromWif).toHaveBeenCalledWith('testWIF')
    })

    it('should throw on initialization failure', () => {
      const mockError = new BSVError('Mock initialization error', 'WALLET_INIT_ERROR')
      ;(PrivateKey.fromWif as jest.Mock).mockImplementationOnce(() => {
        throw mockError
      })
      
      expect(() => new TestnetWallet('invalidWIF'))
        .toThrow(BSVError)
    })
  })

  describe('getAddress', () => {
    it('should return wallet address', () => {
      expect(wallet.getAddress()).toBe('testAddress')
    })

    it('should throw if wallet not initialized', () => {
      // @ts-ignore - Testing internal state
      wallet.address = null
      expect(() => wallet.getAddress()).toThrow(BSVError)
    })
  })

  describe('getPrivateKey', () => {
    it('should return WIF private key', () => {
      expect(wallet.getPrivateKey()).toBe('testWIF')
    })
  })

  describe('getUtxos', () => {
    const mockUtxos = [{
      tx_hash: 'testTxId1',
      tx_pos: 0,
      value: 1000
    }]

    beforeEach(() => {
      ;(global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUtxos),
          text: () => Promise.resolve('testTxHex')
        }))
    })

    it('should fetch and format UTXOs correctly', async () => {
      const utxos = await wallet.getUtxos()
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.whatsonchain.com/v1/bsv/test/address/testAddress/unspent',
        expect.any(Object)
      )
      
      expect(utxos).toHaveLength(1)
      expect(utxos[0]).toEqual({
        txId: 'testTxId1',
        outputIndex: 0,
        satoshis: 1000,
        script: expect.objectContaining({
          toASM: expect.any(Function)
        }),
        unlockingTemplate: expect.objectContaining({
          sign: expect.any(Function),
          estimateLength: expect.any(Function)
        })
      })
    })

    it('should handle API errors with retry', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUtxos),
          text: () => Promise.resolve('testTxHex')
        }))

      const utxos = await wallet.getUtxos()
      expect(utxos).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledTimes(3) // Initial call + retry + source tx fetch
    })

    it('should handle rate limiting', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: false,
          status: 429
        }))
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUtxos),
          text: () => Promise.resolve('testTxHex')
        }))

      const utxos = await wallet.getUtxos()
      expect(utxos).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledTimes(3) // Initial call + retry + source tx fetch
    })
  })

  describe('signTransaction', () => {
    let mockTx: ExtendedTransaction

    beforeEach(() => {
      mockTx = new Transaction() as ExtendedTransaction
      const input = {
        sourceTransactionHash: 'testTxId1',
        sourceOutputIndex: 0,
        sequence: 0xffffffff,
        script: Script.fromASM('testScript')
      } as TransactionInput
      
      mockTx.inputs = [{
        ...input,
        sourceSatoshis: 1000
      }]
    })

    it('should sign transaction inputs correctly', async () => {
      const signedTx = await wallet.signTransaction(mockTx)
      expect((signedTx as ExtendedTransaction).inputs[0].script).toBeDefined()
    })

    it('should handle missing sourceSatoshis', async () => {
      const input = {
        sourceTransactionHash: 'testTxId1',
        sourceOutputIndex: 0,
        sequence: 0xffffffff,
        script: Script.fromASM('testScript')
      } as TransactionInput
      
      mockTx.inputs = [{
        ...input,
        satoshis: 1000
      }]
      
      const signedTx = await wallet.signTransaction(mockTx)
      expect((signedTx as ExtendedTransaction).inputs[0].sourceSatoshis).toBe(1000)
    })

    it('should throw on missing satoshis value', async () => {
      const input = {
        sourceTransactionHash: 'testTxId1',
        sourceOutputIndex: 0,
        sequence: 0xffffffff,
        script: Script.fromASM('testScript')
      } as TransactionInput
      
      mockTx.inputs = [input]
      
      await expect(wallet.signTransaction(mockTx))
        .rejects
        .toThrow(BSVError)
    })
  })
}) 