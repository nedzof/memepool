import { Script, Transaction, PrivateKey, PublicKey, P2PKH } from '@bsv/sdk'
import { BSVService } from '../src/services/bsv-service'
import { BSVError } from '../src/types'
import type { 
  UTXO, 
  TransactionInput, 
  TransactionOutput, 
  SignedTransaction,
  NetworkConfig
} from '../src/types'

// Mock BSV SDK
jest.mock('@bsv/sdk', () => {
  const mockPrivateKey = {
    toWif: jest.fn().mockReturnValue('testWIF'),
    toPublicKey: jest.fn().mockReturnValue({
      toAddress: jest.fn().mockReturnValue('testAddress')
    })
  }

  const mockP2PKH = {
    lock: jest.fn().mockReturnValue({
      toASM: jest.fn().mockReturnValue('OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG')
    })
  }

  const mockTransaction = {
    addInput: jest.fn().mockReturnThis(),
    addOutput: jest.fn().mockReturnThis(),
    sign: jest.fn().mockImplementation(function(this: any) {
      return Promise.resolve(this)
    }),
    toHex: jest.fn().mockReturnValue('testTxHex'),
    fee: jest.fn().mockResolvedValue(1000)
  }

  return {
    PrivateKey: {
      fromWif: jest.fn().mockReturnValue(mockPrivateKey),
      fromRandom: jest.fn().mockReturnValue(mockPrivateKey)
    },
    P2PKH: jest.fn().mockImplementation(() => mockP2PKH),
    Transaction: jest.fn().mockImplementation(() => mockTransaction),
    Script: {
      fromASM: jest.fn().mockReturnValue('testScript'),
      fromHex: jest.fn().mockReturnValue('testScript')
    }
  }
})

// Mock fetch for API calls
global.fetch = jest.fn()

describe('BSVService', () => {
  let bsvService: BSVService
  
  beforeEach(() => {
    bsvService = new BSVService(true) // Test mode
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize in test mode', () => {
      const service = new BSVService(true)
      expect(service['network']).toBe('testnet')
      expect(service['connected']).toBe(false)
      expect(service['wallet']).toBeNull()
    })

    it('should auto-connect testnet wallet in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      const service = new BSVService(false)
      expect(service['connected']).toBe(true)
      expect(service['wallet']).not.toBeNull()
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      const connected = await bsvService.connect()
      expect(connected).toBe(true)
      expect(bsvService['connected']).toBe(true)
    })
  })

  describe('getUTXOs', () => {
    const mockUTXOs = [
      {
        tx_hash: 'testTxId1',
        tx_pos: 0,
        script_hex: 'testScript1',
        value: 1000,
        height: 100,
        confirmations: 10
      }
    ]

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUTXOs
      })
    })

    it('should fetch and format UTXOs correctly', async () => {
      const utxos = await bsvService.getUTXOs('testAddress')
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.whatsonchain.com/v1/bsv/test/address/testAddress/unspent'
      )
      
      expect(utxos).toEqual([{
        txid: 'testTxId1',
        vout: 0,
        script: 'testScript1',
        satoshis: 1000,
        height: 100,
        confirmations: 10
      }])
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: async () => 'API Error'
      })

      await expect(bsvService.getUTXOs('testAddress'))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('createTransaction', () => {
    const mockInputs: TransactionInput[] = [{
      sourceTransactionHash: 'testTxId1',
      sourceOutputIndex: 0,
      script: 'testScript' as unknown as Script,
      sequence: 0xffffffff
    }]

    const mockOutputs: TransactionOutput[] = [{
      lockingScript: 'testScript' as unknown as Script,
      satoshis: 1000,
      change: false
    }]

    it('should throw if wallet not connected', async () => {
      await expect(bsvService.createTransaction(mockInputs, mockOutputs))
        .rejects
        .toThrow('Wallet not connected')
    })

    it('should create and sign transaction when wallet connected', async () => {
      await bsvService.connectWallet()
      const tx = await bsvService.createTransaction(mockInputs, mockOutputs)

      expect(tx).toBeDefined()
      expect(tx.inputs).toBeDefined()
      expect(tx.outputs).toBeDefined()
      expect(tx.fee).toBeDefined()
    })
  })

  describe('broadcastTransaction', () => {
    const mockSignedTx: SignedTransaction = {
      tx: {
        toHex: () => 'testTxHex'
      } as unknown as Transaction,
      inputs: [],
      outputs: [],
      fee: 1000
    }

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ txid: 'testTxId' })
      })
    })

    it('should broadcast transaction successfully', async () => {
      const txid = await bsvService.broadcastTransaction(mockSignedTx)
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.whatsonchain.com/v1/bsv/test/tx/raw',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ txhex: 'testTxHex' })
        })
      )
      
      expect(txid).toBe('testTxId')
    })

    it('should handle broadcast errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: async () => 'Broadcast Error'
      })

      await expect(bsvService.broadcastTransaction(mockSignedTx))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('getTransactionDetails', () => {
    const mockTxDetails = {
      confirmations: 10,
      time: 1234567890
    }

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTxDetails
      })
    })

    it('should fetch transaction details correctly', async () => {
      const details = await bsvService.getTransactionDetails('testTxId')
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.whatsonchain.com/v1/bsv/test/tx/testTxId'
      )
      
      expect(details).toEqual({
        confirmed: true,
        confirmations: 10,
        timestamp: 1234567890
      })
    })

    it('should handle missing confirmations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      const details = await bsvService.getTransactionDetails('testTxId')
      expect(details.confirmations).toBe(0)
      expect(details.confirmed).toBe(false)
    })
  })

  describe('estimateFee', () => {
    it('should calculate correct fee for simple transaction', () => {
      const fee = bsvService.estimateFee(1, 2)
      // 4 + 1 + (148 * 1) + 1 + (34 * 2) + 4 = 226 bytes
      // Rounded up to 1KB with 10% buffer
      expect(fee).toBe(2)
    })

    it('should calculate correct fee for complex transaction', () => {
      const fee = bsvService.estimateFee(5, 3)
      // 4 + 1 + (148 * 5) + 1 + (34 * 3) + 4 = 849 bytes
      // Rounded up to 1KB with 10% buffer
      expect(fee).toBe(2)
    })
  })

  describe('getNetworkConfig', () => {
    it('should return correct network configuration', () => {
      const config = bsvService.getNetworkConfig()
      expect(config).toEqual({
        network: 'testnet',
        apiEndpoint: 'https://api.whatsonchain.com/v1/bsv/test',
        feePerKb: 1
      })
    })
  })
}) 