declare module 'bsv' {
  export class PrivateKey {
    constructor(key: string);
    toAddress(): Address;
    toPublicKey(): PublicKey;
    toString(): string;
  }
  
  export class PublicKey {
    constructor(source: string);
    toAddress(): Address;
    toBuffer(): Buffer;
    toString(): string;
  }
  
  export class Address {
    constructor(address: string);
    toString(): string;
    toHex(): string;
  }
  
  export class Script {
    constructor(script: object);
    static fromASM(asm: string): Script;
    toASM(): string;
    toHex(): string;
  }
  
  export class Transaction {
    constructor(rawTx?: Buffer);
    addInput(input: object): this;
    addOutput(output: object): this;
    change(address: Address): this;
    sign(privateKey: PrivateKey): this;
  }
  
  export namespace Transaction {
    class Output {
      constructor(params: object);
    }
  }
} 