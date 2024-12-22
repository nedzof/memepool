import { validateSession } from '../src/js/wallet/validation';
import { createSession, getSession, updateSession, terminateSession } from '../src/js/wallet/auth/session';
import { ValidationError, AuthenticationError } from '../src/js/errors';
import { validateMnemonicRandomness } from '../src/js/wallet/validation.js';
import { bsv } from '../src/js/bsv.js';

describe('Session validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  test('validates OKX session', async () => {
    const sessionData = {
      loginType: 'okx',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    };
    createSession(sessionData);
    
    const isValid = await validateSession();
    expect(isValid).toBe(true);
  });
  
  test('validates Unisat session', async () => {
    const sessionData = {
      loginType: 'unisat',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'  
    };
    createSession(sessionData);
    
    const isValid = await validateSession();
    expect(isValid).toBe(true);
  });
  
  test('validates Yours session', async () => {
    const sessionData = {
      loginType: 'yours',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    };  
    createSession(sessionData);
    
    const isValid = await validateSession();
    expect(isValid).toBe(true);
  });
  
  test('validates manual login session', async () => {
    const sessionData = {
      loginType: 'manual',
      privateKey: 'L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'
    };
    createSession(sessionData);
    
    const isValid = await validateSession();
    expect(isValid).toBe(true);
  });
  
  test('validates imported wallet session', async () => {
    const sessionData = {
      loginType: 'imported',
      privateKey: 'L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'
    };
    createSession(sessionData);
    
    const isValid = await validateSession();
    expect(isValid).toBe(true);
  });
  
  test('fails validation for invalid session', async () => {
    const sessionData = {
      loginType: 'invalid',
      publicKey: 'invalid'
    };
    createSession(sessionData);
    
    await expect(validateSession()).rejects.toThrow(ValidationError);
  });
  
  test('fails validation for missing session', async () => {
    await expect(validateSession()).rejects.toThrow('No session found');
  });
  
  test('redirects to login on validation failure', async () => {
    const sessionData = {
      loginType: 'invalid',
      publicKey: 'invalid' 
    };
    createSession(sessionData);
    
    const windowSpy = jest.spyOn(window, 'window', 'get');
    windowSpy.mockImplementation(() => ({
      location: {
        href: ''
      }
    }));
    
    await validateSession();
    
    expect(window.location.href).toBe('/login');
    
    windowSpy.mockRestore();
  });
});

describe('Session management', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  test('creates a new session', () => {
    const sessionData = {
      loginType: 'okx',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    };
    const sessionId = createSession(sessionData);
    
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
    
    const storedSession = JSON.parse(localStorage.getItem('memepire_wallet_session'));
    expect(storedSession).toMatchObject({
      ...sessionData,
      sessionId,
      expiresAt: expect.any(Number)
    });
  });
  
  test('gets the current session', () => {
    const sessionData = {
      loginType: 'okx',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    };
    createSession(sessionData);
    
    const session = getSession();
    expect(session).toMatchObject({
      ...sessionData,
      sessionId: expect.any(String),
      expiresAt: expect.any(Number)  
    });
  });
  
  test('returns null for missing session', () => {
    const session = getSession();
    expect(session).toBeNull();
  });
  
  test('returns null for expired session', () => {
    const sessionData = {
      loginType: 'okx',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      expiresAt: Date.now() - 1
    };
    localStorage.setItem('memepire_wallet_session', JSON.stringify(sessionData));
    
    const session = getSession();
    expect(session).toBeNull();
  });
  
  test('updates the current session', () => {
    const sessionData = {
      loginType: 'okx',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    };
    createSession(sessionData);
    
    const updates = {
      balance: 1.5
    };
    updateSession(updates);
    
    const updatedSession = getSession();
    expect(updatedSession).toMatchObject({
      ...sessionData,
      ...updates,
      sessionId: expect.any(String),
      expiresAt: expect.any(Number)
    });
  });
  
  test('throws error when updating missing session', () => {
    expect(() => {
      updateSession({ balance: 1.5 });
    }).toThrow('No active session');
  });
  
  test('terminates the current session', () => {
    const sessionData = {
      loginType: 'okx', 
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    };
    createSession(sessionData);
    
    terminateSession();
    
    const session = getSession();
    expect(session).toBeNull();
  });
  
  test('does nothing when terminating missing session', () => {
    terminateSession();
    // No error should be thrown
  });
}); 

describe('Mnemonic Validation Tests', () => {
    test('should reject sequential BIP39 words', () => {
        const sequentialMnemonic = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
        expect(() => validateMnemonicRandomness(sequentialMnemonic)).toThrow('Mnemonic appears to be sequential or non-random');
    });

    test('should reject alphabetically sorted BIP39 words', () => {
        const sortedMnemonic = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
        expect(() => validateMnemonicRandomness(sortedMnemonic)).toThrow('Mnemonic appears to be sequential or non-random');
    });

    test('should reject mnemonic with low entropy', () => {
        const lowEntropyMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        expect(() => validateMnemonicRandomness(lowEntropyMnemonic)).toThrow('Mnemonic has insufficient entropy');
    });

    test('should accept valid random mnemonic', () => {
        // Generate a truly random mnemonic using the Bitcoin library
        const entropy = bsv.crypto.Random.getRandomBuffer(16); // 128 bits of entropy
        const mnemonic = bsv.Mnemonic.fromEntropy(entropy).toString();
        expect(() => validateMnemonicRandomness(mnemonic)).not.toThrow();
    });

    test('should reject mnemonics with patterns', () => {
        const patternMnemonic = 'cat dog cat dog cat dog cat dog cat dog cat dog';
        expect(() => validateMnemonicRandomness(patternMnemonic)).toThrow('Mnemonic contains patterns');
    });

    test('should validate entropy distribution', () => {
        // Generate 100 random mnemonics and check their entropy distribution
        const mnemonics = Array.from({ length: 100 }, () => {
            const entropy = bsv.crypto.Random.getRandomBuffer(16);
            return bsv.Mnemonic.fromEntropy(entropy).toString();
        });

        // Check that words are well-distributed
        const wordCounts = new Map();
        mnemonics.forEach(mnemonic => {
            const words = mnemonic.split(' ');
            words.forEach(word => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
        });

        // Calculate standard deviation of word frequencies
        const frequencies = Array.from(wordCounts.values());
        const mean = frequencies.reduce((a, b) => a + b) / frequencies.length;
        const variance = frequencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / frequencies.length;
        const stdDev = Math.sqrt(variance);

        // Standard deviation should not be too high (indicating clustering)
        expect(stdDev / mean).toBeLessThan(0.5);
    });
}); 