import {
    assert,
    ByteString,
    method,
    prop,
    Sha256,
    sha256,
    SmartContract,
} from 'scrypt-ts'
import { OrdinalNFT } from 'scrypt-ord'

export class HashLockNFT extends OrdinalNFT {
    @prop()
    hash: Sha256

    constructor(hash: Sha256) {
        super()
        this.hash = hash
    }

    @method()
    public unlock(message: ByteString) {
        assert(this.hash == sha256(message), 'hashes are not equal')
    }
} 