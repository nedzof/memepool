declare module '@bsv/sdk' {
  export class PrivateKey {
    static fromWif(wif: string): PrivateKey
    toWif(prefix?: number[]): string
    toPublicKey(): PublicKey
    sign(preimage: Buffer): Signature
  }

  export class PublicKey {
    toAddress(network: string): string
    toBuffer(): Buffer
  }

  export class Script {
    static fromHex(hex: string): Script
    toHex(): string
    add(data: Buffer): void
  }

  export class Transaction {
    static fromHex(hex: string): Transaction
    inputs: TransactionInput[]
    outputs: TransactionOutput[]
    addInput(input: TransactionInput): void
    addOutput(output: TransactionOutput): void
    sign(): Promise<void>
    toHex(): string
    fee(): Promise<number>
    getSignaturePreimage(inputIndex: number, lockingScript: Script, satoshis: number, sigtype: number): Buffer
  }

  export class P2PKH {
    lock(address: string | PublicKey): Script
    unlock(privateKey: PrivateKey): UnlockingTemplate
  }

  export interface TransactionInput {
    sourceTXID: string
    sourceOutputIndex: number
    sourceSatoshis?: number
    sourceTransaction?: Transaction
    unlockingScriptTemplate?: UnlockingTemplate
    satoshis?: number
  }

  export interface TransactionOutput {
    lockingScript: Script
    satoshis: number
    change?: boolean
  }

  export interface UnlockingTemplate {
    script: Script
    satoshis: number
    sign(tx: Transaction, inputIndex: number): Promise<Script>
    estimateLength(): number
  }

  export class Signature {
    toBuffer(): Buffer
  }
} 