import { PrivateKey, P2PKH, Transaction, Script } from '@bsv/sdk'
import { BSVService } from '../src/services/bsv-service'
import { TransactionInput, TransactionOutput, WalletProvider, UnlockingTemplate } from '../src/types/bsv'
import { BSVError } from '../src/types'
import { SignedTransaction } from '../src/types/services'

describe('BSVService', () => {
  let service: BSVService
  let mockWallet: WalletProvider
  const testPrivateKey = 'cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6'
  const testAddress = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ'

  beforeEach(() => {
    // Create mock wallet provider
    mockWallet = {
      privateKey: new PrivateKey(),
      fetchWithRetry: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: testAddress })
      }),
      getUtxos: jest.fn().mockResolvedValue([]),
      broadcastTransaction: jest.fn().mockResolvedValue('mock_txid')
    }

    service = new BSVService(true)
    service.wallet = mockWallet
  })

  describe('Wallet Connection', () => {
    it('should connect to wallet successfully', async () => {
      const address = await service.connectWallet()
      expect(address).toBe(testAddress)
      expect(mockWallet.fetchWithRetry).toHaveBeenCalled()
    })

    it('should handle wallet connection failure', async () => {
      mockWallet.fetchWithRetry = jest.fn().mockRejectedValue(new Error('Connection failed'))
      await expect(service.connectWallet()).rejects.toThrow(BSVError)
    })

    it('should handle invalid wallet response', async () => {
      mockWallet.fetchWithRetry = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })
      await expect(service.connectWallet()).rejects.toThrow(BSVError)
    })
  })

  describe('UTXO Management', () => {
    const mockUtxos = [{
      tx_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      tx_pos: 0,
      value: 1000,
      script_hex: '76a91400112233445566778899aabbccddeeff0123456788ac'
    }]

    it('should return UTXOs for valid address', async () => {
      mockWallet.fetchWithRetry = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUtxos
      })

      const utxos = await service.getUTXOs(testAddress)
      expect(utxos).toBeDefined()
      expect(Array.isArray(utxos)).toBe(true)
      expect(utxos.length).toBe(1)
      expect(utxos[0].satoshis).toBe(1000)
    })

    it('should handle empty UTXO set', async () => {
      mockWallet.fetchWithRetry = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      })

      const utxos = await service.getUTXOs(testAddress)
      expect(utxos).toEqual([])
    })

    it('should handle UTXO fetch failure', async () => {
      mockWallet.fetchWithRetry = jest.fn().mockRejectedValue(new Error('Network error'))
      await expect(service.getUTXOs(testAddress)).rejects.toThrow(BSVError)
    })

    it('should validate UTXO format', async () => {
      const invalidUtxos = [{
        tx_hash: 'invalid_hash',
        tx_pos: -1,
        value: 'not_a_number',
        script_hex: 'invalid_script'
      }]

      mockWallet.fetchWithRetry = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => invalidUtxos
      })

      await expect(service.getUTXOs(testAddress)).rejects.toThrow(BSVError)
    })
  })

  describe('Transaction Creation', () => {
    const p2pkh = new P2PKH()
    const privateKey = PrivateKey.fromWif(testPrivateKey)
    const recipientAddress = testAddress

    let sourceTx: Transaction
    let mockInputs: TransactionInput[]
    let mockOutputs: TransactionOutput[]

    beforeEach(() => {
      // Create source transaction
      sourceTx = new Transaction()
      const inputScript = Script.fromHex('76a91400112233445566778899aabbccddeeff0123456788ac')
      sourceTx.addOutput({
        lockingScript: inputScript,
        satoshis: 1000
      } as any)

      // Mock getTransaction
      jest.spyOn(service, 'getTransaction').mockResolvedValue(sourceTx)

      // Setup mock inputs and outputs
      const outputScript = p2pkh.lock(recipientAddress)
      const unlockTemplate = p2pkh.unlock(privateKey)
      
      const mockUnlockingTemplate: UnlockingTemplate = {
        script: inputScript,
        satoshis: 1000,
        sign: unlockTemplate.sign,
        estimateLength: () => 108
      }

      mockInputs = [{
        sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceOutputIndex: 0,
        sourceSatoshis: 1000,
        script: inputScript,
        unlockingScriptTemplate: mockUnlockingTemplate,
        sourceTransaction: sourceTx
      }]

      mockOutputs = [{
        satoshis: 900,
        lockingScript: outputScript
      }]
    })

    it('should create valid transaction with inputs and outputs', async () => {
      const tx = await service.createTransaction(mockInputs, mockOutputs)
      expect(tx).toBeDefined()
      expect(tx.tx.inputs.length).toBe(1)
      expect(tx.tx.outputs.length).toBe(1)
      expect(tx.fee).toBeGreaterThan(0)
    })

    it('should handle insufficient funds', async () => {
      // Mock the fee calculation to ensure output amount exceeds input
      jest.spyOn(service as any, 'estimateFee').mockReturnValue(200)
      mockOutputs[0].satoshis = 900
      
      await expect(service.createTransaction(mockInputs, mockOutputs))
        .rejects
        .toThrow(new BSVError('TX_CREATE_ERROR', 'Failed to create transaction'))
    })

    it('should validate input script templates', async () => {
      mockInputs[0].unlockingScriptTemplate = undefined as any
      await expect(service.createTransaction(mockInputs, mockOutputs))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Script must be defined for inputs'))
    })

    it('should validate output scripts', async () => {
      mockOutputs[0].lockingScript = undefined as any
      await expect(service.createTransaction(mockInputs, mockOutputs))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Locking script must be defined for outputs'))
    })

    it('should handle transaction size limits', async () => {
      // Mock the fee calculation to throw an error for large transactions
      jest.spyOn(service as any, 'estimateFee').mockImplementation(() => {
        throw new BSVError('TX_CREATE_ERROR', 'Transaction size exceeds maximum limit')
      })

      const manyInputs = Array(1000).fill(mockInputs[0])
      const manyOutputs = Array(1000).fill(mockOutputs[0])
      
      await expect(service.createTransaction(manyInputs, manyOutputs))
        .rejects
        .toThrow(new BSVError('TX_CREATE_ERROR', 'Failed to create transaction'))
    })
  })

  describe('Transaction Broadcasting', () => {
    let mockSignedTx: SignedTransaction

    beforeEach(() => {
      const tx = new Transaction()
      mockSignedTx = {
        tx,
        fee: 100,
        inputs: [],
        outputs: []
      }
    })

    it('should broadcast valid transaction', async () => {
      const txid = await service.broadcastTransaction(mockSignedTx)
      expect(txid).toBe('mock_txid')
      expect(mockWallet.broadcastTransaction).toHaveBeenCalledWith(mockSignedTx.tx)
    })

    it('should handle broadcast failure', async () => {
      mockWallet.broadcastTransaction = jest.fn().mockRejectedValue(
        new BSVError('BROADCAST_ERROR', 'Failed to broadcast transaction')
      )
      await expect(service.broadcastTransaction(mockSignedTx))
        .rejects
        .toThrow(BSVError)
    })

    it('should validate transaction before broadcast', async () => {
      await expect(service.broadcastTransaction(null as any))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Invalid transaction'))
    })

    it('should handle network timeouts', async () => {
      mockWallet.broadcastTransaction = jest.fn().mockRejectedValue(
        new BSVError('BROADCAST_ERROR', 'Network timeout')
      )
      await expect(service.broadcastTransaction(mockSignedTx))
        .rejects
        .toThrow(BSVError)
    })
  })
}) 