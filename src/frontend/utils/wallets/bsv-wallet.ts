// Add type declaration for tiny-secp256k1
declare module 'tiny-secp256k1' {
  export function isPoint(p: Uint8Array): boolean;
  export function isPrivate(d: Uint8Array): boolean;
  export function pointFromScalar(d: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function pointAddScalar(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function privateAdd(d: Uint8Array, tweak: Uint8Array): Uint8Array | null;
  export function sign(h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array;
  export function verify(h: Uint8Array, Q: Uint8Array, signature: Uint8Array, strict?: boolean): boolean;
}

import { Wallet, WalletType } from '../../../shared/types/wallet';
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import bs58 from 'bs58';

export class BSVWallet implements Wallet {
  type: WalletType = WalletType.BSV;
  name: string = 'BSV Wallet';
  icon: string = '/icons/bsv.svg';
  address: string = '';
  balance: number = 0;

  private publicKey: string | null = null;
  private initialized: boolean = false;

  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch {
      return false;
    }
  }

  async initiateLogin(publicKey?: string): Promise<void> {
    try {
      console.log('BSV Wallet: Initiating login...');
      
      if (!publicKey) {
        console.error('BSV Wallet: No public key provided');
        throw new Error('Public key is required for BSV wallet initialization');
      }

      console.log('BSV Wallet: Using provided public key:', publicKey);
      this.publicKey = publicKey;
      
      try {
        // Convert hex public key to buffer
        console.log('BSV Wallet: Converting hex public key to buffer');
        const pubKeyBuffer = Buffer.from(publicKey, 'hex');
        console.log('BSV Wallet: Public key buffer length:', pubKeyBuffer.length);
        
        const { address } = bitcoin.payments.p2pkh({
          pubkey: pubKeyBuffer,
          network: bitcoin.networks.bitcoin // Use bitcoin network for BSV
        });

        if (!address) {
          console.error('BSV Wallet: Failed to generate address from public key');
          throw new Error('Failed to generate address from public key');
        }

        this.address = address;
        console.log('BSV Wallet: Generated address from public key:', this.address);
      } catch (error: any) {
        console.error('BSV Wallet: Error processing public key:', error);
        throw new Error(`Failed to process public key: ${error.message}`);
      }

      this.balance = 100; // Mock balance
      this.initialized = true;
      console.log('BSV Wallet: Login complete');
    } catch (error: any) {
      console.error('BSV Wallet: Failed to connect:', error);
      throw error; // Preserve the original error
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('BSV Wallet: Disconnecting...');
      this.address = '';
      this.balance = 0;
      this.publicKey = null;
      this.initialized = false;
      console.log('BSV Wallet: Disconnected');
    } catch (error) {
      console.error('BSV Wallet: Failed to disconnect:', error);
      throw new Error('Failed to disconnect BSV wallet');
    }
  }

  async getBalance(): Promise<number> {
    try {
      if (!this.initialized) {
        throw new Error('Wallet not initialized');
      }
      return this.balance;
    } catch (error) {
      throw new Error('Failed to get balance');
    }
  }

  async getAddress(): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('Wallet not initialized');
      }
      return this.address;
    } catch (error) {
      throw new Error('Failed to get address');
    }
  }

  async sendPayment(to: string, amount: number): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('Wallet not initialized');
      }

      if (amount > this.balance) {
        throw new Error('Insufficient funds');
      }
      
      // Mock transaction
      this.balance -= amount;
      return crypto.randomUUID(); // Return mock transaction ID
    } catch (error) {
      throw new Error('Failed to send payment');
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      if (!this.initialized || !this.publicKey) {
        throw new Error('Wallet not initialized');
      }

      // Mock implementation
      const encoder = new TextEncoder();
      const data = encoder.encode(message + this.address);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      throw new Error('Failed to sign message');
    }
  }

  async verifyMessage(message: string, signature: string, address: string): Promise<boolean> {
    try {
      // Mock implementation
      return true;
    } catch (error) {
      throw new Error('Failed to verify message');
    }
  }
} 