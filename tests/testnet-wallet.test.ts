import { PrivateKey, P2PKH, Transaction, Script } from '@bsv/sdk'
import { TestnetWallet } from '../src/services/testnet-wallet'

describe('TestnetWallet', () => {
  let wallet: TestnetWallet
  const testnetKey = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy'

  beforeEach(() => {
    // Use primary testnet wallet key
    wallet = new TestnetWallet(testnetKey)
  })

  it('should get private key starting with c', () => {
    const wif = wallet.getPrivateKey()
    expect(wif).toBe(testnetKey)
  })

  it('should get address starting with n', () => {
    const address = wallet.getAddress()
    expect(address.startsWith('n')).toBe(true)
    expect(address).toBe('n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ')
  })

  test('should sign transaction', async () => {
    const p2pkh = new P2PKH()
    const recipientAddress = 'moRTGUhu38rtCFys4YBPaGc4WgvfwB1PSK' // Secondary wallet address as recipient
    const tx = new Transaction()
    
    // Create a mock source transaction
    const sourceTx = new Transaction()
    sourceTx.addOutput({
      lockingScript: p2pkh.lock(wallet.getAddress()),
      satoshis: 1000
    })
    
    // Add input with unlocking script template and source transaction
    const input = {
      sourceTXID: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sourceOutputIndex: 0,
      sourceTransaction: sourceTx,
      unlockingScriptTemplate: p2pkh.unlock(PrivateKey.fromWif(testnetKey))
    }
    tx.addInput(input)

    // Add output with locking script
    const output = {
      lockingScript: p2pkh.lock(recipientAddress),
      satoshis: 900
    }
    tx.addOutput(output)

    const signedTx = await wallet.signTransaction(tx)
    expect(signedTx).toBeDefined()
    expect(signedTx.inputs.length).toBe(1)
    expect(signedTx.outputs.length).toBe(1)
  })
}) 