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
      delete invalidInput.unlockingScriptTemplate // Remove the unlocking script template
      tx.addInput(invalidInput)
      tx.addOutput({
        satoshis: 900,
        lockingScript: p2pkh.lock(recipientAddress)
      })

      await expect(wallet.signTransaction(tx)).rejects.toThrow(BSVError)
    })
  })
}) 