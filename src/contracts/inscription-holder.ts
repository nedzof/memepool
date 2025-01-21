import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    toByteString,
    Utils,
    SigHash,
    Ripemd160,
    pubKey2Addr
} from 'scrypt-ts'

export class InscriptionHolder extends SmartContract {
    @prop()
    static readonly TYPE = 'inscription'

    @prop()
    readonly contentId: ByteString

    @prop()
    readonly creator: PubKey

    @prop(true)
    owner: PubKey

    @prop(true)
    metadata: ByteString

    constructor(contentId: ByteString, creator: PubKey, owner: PubKey, metadata: ByteString) {
        super(...arguments)
        this.contentId = contentId
        this.creator = creator
        this.owner = owner
        this.metadata = metadata
    }

    @method()
    public validateMetadata(metadata: ByteString): boolean {
        try {
            // Parse metadata JSON
            const metadataObj = JSON.parse(metadata.toString())
            
            // Validate required fields
            assert(
                typeof metadataObj.version === 'string' &&
                typeof metadataObj.prefix === 'string' &&
                (metadataObj.operation === 'inscribe' || metadataObj.operation === 'transfer') &&
                typeof metadataObj.contentId === 'string' &&
                typeof metadataObj.timestamp === 'number',
                'invalid metadata format'
            )

            // Validate prefix
            assert(metadataObj.prefix === 'meme', 'invalid prefix')

            return true
        } catch (e) {
            return false
        }
    }

    @method()
    public transfer(newOwner: PubKey, sig: Sig) {
        // Verify current owner's signature
        assert(this.checkSig(sig, this.owner), 'signature check failed')

        // Update owner
        this.owner = newOwner

        // Update metadata for transfer
        const metadataObj = JSON.parse(this.metadata.toString())
        metadataObj.operation = 'transfer'
        metadataObj.previousOwner = pubKey2Addr(this.owner)
        metadataObj.timestamp = Date.now()
        this.metadata = toByteString(JSON.stringify(metadataObj))

        // Build new state output
        const output = this.buildStateOutput(this.ctx.utxo.value)
        
        // Verify outputs
        assert(this.ctx.hashOutputs == hash256(output + this.buildChangeOutput()), 'hashOutputs mismatch')
    }

    @method()
    public unlock(sig: Sig, amount: bigint) {
        // Verify owner's signature
        assert(this.checkSig(sig, this.owner), 'signature check failed')

        // Build P2PKH output
        const output = Utils.buildPublicKeyHashOutput(pubKey2Addr(this.owner), amount)
        
        // Verify outputs
        assert(this.ctx.hashOutputs == hash256(output + this.buildChangeOutput()), 'hashOutputs mismatch')
    }

    static fromTx<T extends SmartContract>(tx: any, atOutputIndex = 0, prevouts?: ByteString[]): T {
        const instance = super.fromTx(tx, atOutputIndex, prevouts) as T
        if (!(instance instanceof InscriptionHolder)) {
            throw new Error('Invalid instance type')
        }
        return instance
    }

    static createDeployTx(
        contentId: ByteString,
        creator: PubKey,
        owner: PubKey,
        metadata: ByteString,
        amount: bigint
    ): ByteString {
        const instance = new InscriptionHolder(contentId, creator, owner, metadata)
        
        // Build outputs
        let outputs = ''

        // Add state output with 1 satoshi
        outputs += instance.buildStateOutput(1n)

        // Add inscription data output
        outputs += Utils.buildPublicKeyHashOutput(pubKey2Addr(owner), amount - 1n)

        return outputs
    }
} 