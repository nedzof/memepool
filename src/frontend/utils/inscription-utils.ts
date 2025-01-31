import { sha256 } from 'bsv-wasm';
import * as bsv from 'bsv';
import { getFundingUtxo } from './wallet-utils';

export const buildInscriptionTx = async (content: Buffer, contentType: string, creatorPubKey: string) => {
  const script = bsv.Script.fromASM(
    `OP_FALSE OP_RETURN 0x6d02${Buffer.from('memepool').toString('hex')} ${Buffer.from(contentType).toString('hex')} ${Buffer.from(content).toString('hex')}`
  );
  
  const tx = new bsv.Transaction()
    .addInput(await getFundingUtxo()) 
    .addOutput(new bsv.Transaction.Output({
      script: script,
      satoshis: 0
    }))
    .addOutput(holderUtxoOutput(creatorPubKey))
    .change(creatorAddress(creatorPubKey))
    .sign(privateKey);

  return tx;
};

export function generateContentId(content: Buffer, creatorPubKey: string): string {
  const contentHash = sha256(content);
  const creatorHash = sha256(bsv.PubKey(creatorPubKey).toBuffer());
  const combined = new Uint8Array([...contentHash, ...creatorHash]);
  return sha256(combined).toString('hex');
}

const holderUtxoOutput = (creatorPubKey: string) => {
  const script = bsv.Script.fromASM(
    `OP_DUP OP_HASH160 ${bsv.Address.fromPubKey(creatorPubKey).toHex()} OP_EQUALVERIFY OP_CHECKSIG`
  );
  return new bsv.Transaction.Output({
    script: script,
    satoshis: 1
  });
};

const creatorAddress = (creatorPubKey: string) => {
  return bsv.Address.fromPubKey(creatorPubKey).toString();
};

const privateKey = ''; // TODO: Get private key from Phantom wallet

// ... existing code ... 