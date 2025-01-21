import { bsv, Utils, toByteString, hash160 } from 'scrypt-ts'
import { BSVError } from '../src/types'
import { TestnetWallet } from '../src/services/testnet-wallet'
import { UTXO } from '../src/types/bsv'

describe('TestnetWallet', () => {
  const testPrivateKey = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy'
  let wallet: TestnetWallet
  let recipientAddress: string
  let mockUtxo: UTXO
  let sourceTx: bsv.Transaction
  let lockingScript: bsv.Script

  beforeEach(() => {
    wallet = new TestnetWallet(testPrivateKey)
    const recipientPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    recipientAddress = recipientPrivKey.toPublicKey().toAddress(bsv.Networks.testnet).toString()

    // Create source transaction
    const pubKey = bsv.PrivateKey.fromWIF(testPrivateKey).publicKey
    const pubKeyHash = hash160(toByteString(pubKey.toBuffer().toString('hex')))
    lockingScript = new bsv.Script(Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(1000)))
    sourceTx = new bsv.Transaction()
    sourceTx.addOutput(new bsv.Transaction.Output({
      script: lockingScript,
      satoshis: 1000
    }))

    mockUtxo = {
      txId: 'mock-txid',
      outputIndex: 0,
      satoshis: 1000,
      script: lockingScript,
      tx: sourceTx
    }
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
      expect(() => new TestnetWallet('invalid-key')).toThrow()
    })
  })

  describe('Transaction Signing', () => {
    it('should sign transaction with valid inputs and outputs', async () => {
      const tx = new bsv.Transaction()
      tx.addInput(new bsv.Transaction.Input({
        prevTxId: Buffer.from(mockUtxo.txId, 'hex'),
        outputIndex: mockUtxo.outputIndex,
        script: mockUtxo.script,
        output: new bsv.Transaction.Output({
          script: mockUtxo.script,
          satoshis: mockUtxo.satoshis
        }),
        sequenceNumber: 0xffffffff
      }))
      tx.addOutput(new bsv.Transaction.Output({
        script: lockingScript,
        satoshis: 500
      }))

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.inputs[0].script).toBeDefined()
    })

    it('should handle insufficient funds', async () => {
      const tx = new bsv.Transaction()
      tx.addInput(new bsv.Transaction.Input({
        prevTxId: Buffer.from(mockUtxo.txId, 'hex'),
        outputIndex: mockUtxo.outputIndex,
        script: mockUtxo.script,
        output: new bsv.Transaction.Output({
          script: mockUtxo.script,
          satoshis: mockUtxo.satoshis
        }),
        sequenceNumber: 0xffffffff
      }))
      tx.addOutput(new bsv.Transaction.Output({
        script: lockingScript,
        satoshis: 1100 // More than available
      }))

      await expect(wallet.signTransaction(tx)).rejects.toThrow(BSVError)
    })
  })
}) 