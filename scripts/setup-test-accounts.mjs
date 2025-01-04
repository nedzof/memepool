import { BSVService } from '../src/services/bsv-service.js';
import { TestnetWallet } from '../src/services/testnet-wallet.js';

/**
 * Script to set up test accounts for ownership transfer testing
 */
async function setupTestAccounts() {
    try {
        // Initialize BSV service
        const bsvService = new BSVService();
        await bsvService.connect();

        // Create primary testnet wallet
        console.log('Setting up primary testnet wallet...');
        const primaryWallet = new TestnetWallet();
        const primaryAddress = primaryWallet.getAddress();
        console.log('Primary wallet address:', primaryAddress);
        console.log('Primary wallet private key:', primaryWallet.getPrivateKey());

        // Create secondary testnet wallet with different private key
        console.log('\nSetting up secondary testnet wallet...');
        // Different WIF key for secondary wallet (testnet)
        const secondaryWallet = new TestnetWallet('cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6');
        const secondaryAddress = secondaryWallet.getAddress();
        console.log('Secondary wallet address:', secondaryAddress);
        console.log('Secondary wallet private key:', secondaryWallet.getPrivateKey());

        // Get balances
        console.log('\nChecking balances...');
        bsvService.wallet = primaryWallet;
        const primaryBalance = await bsvService.getBalance();
        console.log('Primary wallet balance:', primaryBalance, 'BSV');

        bsvService.wallet = secondaryWallet;
        const secondaryBalance = await bsvService.getBalance();
        console.log('Secondary wallet balance:', secondaryBalance, 'BSV');

        console.log('\nTest accounts setup complete!');
        console.log('\nTo fund these accounts:');
        console.log('1. Visit https://faucet.bitcoincloud.net');
        console.log(`2. Enter primary address: ${primaryAddress}`);
        console.log(`3. Enter secondary address: ${secondaryAddress}`);
        console.log('4. Request test BSV for each address');
        
    } catch (error) {
        console.error('Failed to set up test accounts:', error);
        process.exit(1);
    }
}

// Run setup
setupTestAccounts(); 