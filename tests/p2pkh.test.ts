import { P2PKH, Script } from '@bsv/sdk';

describe('P2PKH Test', () => {
  it('should create a valid P2PKH script', () => {
    const testAddress = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn';
    const p2pkh = new P2PKH();
    const script = p2pkh.lock(testAddress);
    console.log('Created P2PKH script:', script.toHex());
    expect(script.toHex()).toMatch(/^76a914[0-9a-f]{40}88ac$/);
  });
}); 