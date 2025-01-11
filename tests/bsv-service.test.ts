import { PrivateKey, P2PKH, Transaction, Script } from '@bsv/sdk'
import { BSVService } from '../src/services/bsv-service'
import { TransactionInput, TransactionOutput, WalletProvider } from '../src/types/bsv'

describe('BSVService', () => {
  let service: BSVService
  let mockWallet: WalletProvider

  beforeEach(() => {
    // Create mock wallet provider
    mockWallet = {
      privateKey: new PrivateKey(),
      fetchWithRetry: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ' })
      }),
      getUtxos: jest.fn().mockResolvedValue([]),
      broadcastTransaction: jest.fn().mockResolvedValue('mock_txid')
    }

    service = new BSVService(true)
    service.wallet = mockWallet
  })

  it('should connect to wallet', async () => {
    const address = await service.connectWallet()
    expect(address).toBe('n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ')
    expect(mockWallet.fetchWithRetry).toHaveBeenCalled()
  })

  it('should return UTXOs for address', async () => {
    const mockUtxos = [{
      tx_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      tx_pos: 0,
      value: 1000,
      script_hex: '76a91400112233445566778899aabbccddeeff0123456788ac'
    }]

    mockWallet.fetchWithRetry = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUtxos
    })

    const utxos = await service.getUTXOs('n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ')
    expect(utxos).toBeDefined()
    expect(Array.isArray(utxos)).toBe(true)
    expect(utxos.length).toBe(1)
    expect(utxos[0].satoshis).toBe(1000)
  })

  it('should create transaction with inputs and outputs', async () => {
    // Create P2PKH template and keys
    const p2pkh = new P2PKH()
    const privateKey = PrivateKey.fromWif('cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6')
    const recipientAddress = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ'

    // Create source transaction
    const sourceTx = new Transaction()
    const inputScript = Script.fromHex('76a91400112233445566778899aabbccddeeff0123456788ac')
    sourceTx.addOutput({
      lockingScript: inputScript,
      satoshis: 1000
    } as any)

    // Mock getTransaction to return our source transaction
    jest.spyOn(service, 'getTransaction').mockResolvedValue(sourceTx)

    // Create a valid script for the output using P2PKH template
    const outputScript = p2pkh.lock(recipientAddress)

    const mockInputs: TransactionInput[] = [{
      sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sourceOutputIndex: 0,
      sourceSatoshis: 1000,
      script: inputScript,
      unlockingScriptTemplate: p2pkh.unlock(privateKey),
      sourceTransaction: sourceTx
    }]

    const mockOutputs: TransactionOutput[] = [{
      satoshis: 900,
      lockingScript: outputScript
    }]

    const tx = await service.createTransaction(mockInputs, mockOutputs)
    expect(tx).toBeDefined()
    expect(tx.tx.inputs.length).toBe(1)
    expect(tx.tx.outputs.length).toBe(1)
    expect(tx.fee).toBeGreaterThan(0)
  })
}) 