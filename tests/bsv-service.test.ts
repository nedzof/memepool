import { BSVService } from '../src/services/bsv-service'
import { BSVError } from '../src/types'
import { bsv } from 'scrypt-ts'
import { Script, Transaction, P2PKH, PrivateKey } from '@bsv/sdk'
import cbor from 'cbor'
import { InscriptionMetadata } from '../src/types/inscription'

describe('BSVService', () => {
  let bsvService: BSVService
  let mockPrivateKey: PrivateKey
  let mockAddress: string

  beforeEach(() => {
    // Create a new private key for testing using scrypt-ts bsv and convert to @bsv/sdk format
    const scryptPrivKey = bsv.PrivateKey.fromRandom()
    mockPrivateKey = PrivateKey.fromWif(scryptPrivKey.toWIF())
    mockAddress = mockPrivateKey.toPublicKey().toAddress('testnet').toString()
    
    // Initialize service in test mode
    bsvService = new BSVService(true)
    
    // Mock the wallet provider
    const mockWallet = {
      privateKey: mockPrivateKey,
      getUtxos: jest.fn().mockResolvedValue([{
        txId: 'mockTxId',
        outputIndex: 0,
        satoshis: 100000,
        script: 'mockScript'
      }]),
      fetchWithRetry: jest.fn().mockResolvedValue({
        text: () => Promise.resolve('0200000001abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789000000006a47304402207899531a52d59a6de200179928ca900254a36b8dff8bb75f5f5d71b1cdc26125022008b422690b8461cb52c3cc30330b23d574351872b7c361e9aae3649071c1a7160121035d9b3e9a1c8343d7e8185e198e3ecdd6791c3876fbc5c0cf944cc9c8f5e7bff1ffffffff0110270000000000001976a914a5f4d12ce3685781b227c1f39548ddef429e978388ac00000000')
      }),
      broadcastTransaction: jest.fn().mockResolvedValue('mockTxId')
    };

    // Update bsvService.wallet assignment
    bsvService.wallet = mockWallet;

    // Mock getWalletAddress to return the mock address
    jest.spyOn(bsvService, 'getWalletAddress').mockResolvedValue(mockAddress);
  })

  describe('Wallet Connection', () => {
    it('should connect to wallet successfully', async () => {
      const address = await bsvService.connectWallet()
      expect(address).toBe(mockAddress)
    })

    // ... other wallet connection tests remain unchanged
  })

  describe('Transaction Creation', () => {
    it('should create valid transaction with inputs and outputs', async () => {
      const mockInput = {
        sourceTXID: 'mockTxId',
        sourceOutputIndex: 0,
        sourceSatoshis: 100000,
        script: new P2PKH().lock(mockAddress),
        unlockingScriptTemplate: {
          script: new P2PKH().lock(mockAddress),
          satoshis: 100000,
          sign: new P2PKH().unlock(mockPrivateKey).sign,
          estimateLength: () => 108
        }
      }

      const mockOutput = {
        lockingScript: new P2PKH().lock(mockAddress),
        satoshis: 99000,
        change: false
      }

      const result = await bsvService.createTransaction([mockInput], [mockOutput])
      expect(result.tx).toBeInstanceOf(Transaction)
      expect(result.fee).toBeDefined()
      expect(result.inputs.length).toBe(1)
      expect(result.outputs.length).toBe(1)
    })

    // ... other transaction creation tests remain unchanged
  })

  describe('Inscription Transactions', () => {
    it('should create inscription transaction with CBOR metadata', async () => {
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
          creator: mockAddress,
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
      const p2pkhScript = new P2PKH().lock(mockAddress)
      
      // Create CBOR metadata with proper PUSHDATA prefix
      const cborData = cbor.encode(mockMetadata)
      let pushDataPrefix: Buffer
      if (cborData.length <= 0x4b) {
        pushDataPrefix = Buffer.from([cborData.length])
      } else if (cborData.length <= 0xff) {
        pushDataPrefix = Buffer.concat([Buffer.from([0x4c]), Buffer.from([cborData.length])])
      } else if (cborData.length <= 0xffff) {
        const lenBuffer = Buffer.alloc(2)
        lenBuffer.writeUInt16LE(cborData.length)
        pushDataPrefix = Buffer.concat([Buffer.from([0x4d]), lenBuffer])
      } else {
        const lenBuffer = Buffer.alloc(4)
        lenBuffer.writeUInt32LE(cborData.length)
        pushDataPrefix = Buffer.concat([Buffer.from([0x4e]), lenBuffer])
      }
      
      const pushData = Buffer.concat([
        Buffer.from('6a', 'hex'), // OP_RETURN
        pushDataPrefix,
        cborData
      ])
      
      // Combine scripts
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + pushData.toString('hex'))
      
      // Create transaction with inscription output
      const mockInput = {
        sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceOutputIndex: 0,
        sourceSatoshis: 1000,
        script: p2pkhScript,
        unlockingScriptTemplate: {
          script: p2pkhScript,
          satoshis: 1000,
          sign: new P2PKH().unlock(mockPrivateKey).sign,
          estimateLength: () => 108
        }
      }

      const mockOutput = {
        lockingScript: combinedScript,
        satoshis: 1,
        change: false
      }

      const result = await bsvService.createTransaction([mockInput], [mockOutput])
      expect(result.tx).toBeInstanceOf(Transaction)
      expect(result.outputs[0].lockingScript.toHex()).toContain(p2pkhScript.toHex())
      expect(result.outputs[0].lockingScript.toHex()).toContain('6a')
    })

    it('should handle large inscription metadata correctly', async () => {
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
          creator: mockAddress,
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
      const p2pkhScript = new P2PKH().lock(mockAddress)
      
      // Create CBOR metadata with PUSHDATA4 for large data
      const cborData = cbor.encode(mockMetadata)
      const lenBuffer = Buffer.alloc(4)
      lenBuffer.writeUInt32LE(cborData.length)
      
      const pushData = Buffer.concat([
        Buffer.from('6a', 'hex'), // OP_RETURN
        Buffer.from([0x4e]), // PUSHDATA4
        lenBuffer,
        cborData
      ])
      
      // Combine scripts
      const combinedScript = Script.fromHex(p2pkhScript.toHex() + pushData.toString('hex'))
      
      // Create transaction with inscription output
      const mockInput = {
        sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceOutputIndex: 0,
        sourceSatoshis: 1000,
        script: p2pkhScript,
        unlockingScriptTemplate: {
          script: p2pkhScript,
          satoshis: 1000,
          sign: new P2PKH().unlock(mockPrivateKey).sign,
          estimateLength: () => 108
        }
      }

      const mockOutput = {
        lockingScript: combinedScript,
        satoshis: 1,
        change: false
      }

      const result = await bsvService.createTransaction([mockInput], [mockOutput])
      expect(result.tx).toBeInstanceOf(Transaction)
      expect(result.outputs[0].lockingScript.toHex()).toContain(p2pkhScript.toHex())
      expect(result.outputs[0].lockingScript.toHex()).toContain('6a4e')
    })
  })
}) 