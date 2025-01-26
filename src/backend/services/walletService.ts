import { Wallet } from '../../shared/types/wallet';
import { bsv } from './bsv.service';

export const getOwnerAddress = async (wallet: Wallet): Promise<string> => {
  try {
    if (wallet.type === 'BSV') {
      const address = await bsv.getAddress();
      return address;
    } else if (wallet.type === 'Imported') {
      return wallet.address;
    } else {
      throw new Error('Unsupported wallet type');
    }
  } catch (error) {
    console.error('Failed to retrieve owner address:', error);
    throw error;
  }
};

export const lockBSV = async (wallet: Wallet, amount: number): Promise<string> => {
  try {
    if (wallet.type === 'BSV') {
      const tx = await bsv.sendPayment({
        from: wallet.address,
        to: process.env.MEMEPOOL_ADDRESS || '',
        amount,
      });
      return tx.id;
    } else {
      throw new Error('Unsupported wallet type');
    }
  } catch (error) {
    console.error('Failed to lock BSV:', error);
    throw error;
  }
};

export const getBalance = async (wallet: Wallet): Promise<number> => {
  try {
    if (wallet.type === 'BSV') {
      const balance = await bsv.getBalance();
      return balance;
    } else if (wallet.type === 'Imported') {
      // TODO: Implement balance retrieval for imported wallets
      return 0;
    } else {
      throw new Error('Unsupported wallet type');
    }
  } catch (error) {
    console.error('Failed to retrieve balance:', error);
    throw error;
  }
}; 