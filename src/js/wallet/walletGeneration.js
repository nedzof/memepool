import { showModal, hideModal, showWalletError, showMainWallet } from './modalManager.js';
import { bsv, BSVWallet } from '../bsv.js';
import { createSession } from './auth/session.js';
import { setupMainWalletEvents } from './walletEvents.js';
import { validateMnemonicRandomness } from './validation.js';

// Generate new wallet
export async function generateNewWallet() {
    try {
        // Create new BSV wallet instance
        const wallet = new BSVWallet();
        
        // Generate new wallet with password
        const result = await wallet.generateNewWallet('temporary_password'); // We'll update this with user's password later
        
        if (!result.success) {
            throw new Error('Failed to generate wallet');
        }
        
        // Store wallet instance temporarily
        sessionStorage.setItem('temp_wallet', JSON.stringify({
            address: result.address,
            publicKey: result.publicKey,
            balance: result.balance
        }));
        
        // Show password setup modal
        showModal('passwordSetupModal');
        setupPasswordValidation();
        
        return true;
    } catch (error) {
        console.error('Error generating wallet:', error);
        showWalletError('Failed to generate wallet. Please try again.');
        return false;
    }
}

// Display seed phrase
function displaySeedPhrase(mnemonic) {
    const seedPhraseContainer = document.getElementById('seedPhraseGrid');
    if (!seedPhraseContainer) {
        console.error('Seed phrase container not found');
        return;
    }

    console.log('Displaying mnemonic:', mnemonic); // For debugging
    const words = mnemonic.split(' ');
    const wordElements = seedPhraseContainer.querySelectorAll('.seed-word-text');
    
    // Fill in the words
    wordElements.forEach((element, index) => {
        if (words[index]) {
            element.textContent = '•••••••'; // Start with bullets
            element.dataset.word = words[index]; // Store actual word
        }
    });

    // Show the modal and setup events
    showModal('seedPhraseModal');
    setupSeedPhraseEvents();
}

// Setup seed phrase events
function setupSeedPhraseEvents() {
    // Reveal seed phrase
    const revealBtn = document.getElementById('revealSeedPhraseBtn');
    const seedPhraseGrid = document.getElementById('seedPhraseGrid');
    
    if (revealBtn && seedPhraseGrid) {
        revealBtn.addEventListener('click', () => {
            // Get the stored mnemonic
            const mnemonic = sessionStorage.getItem('temp_mnemonic');
            if (!mnemonic) {
                console.error('No mnemonic found in session storage');
                return;
            }
            
            // Remove blur effect
            seedPhraseGrid.classList.remove('filter', 'blur-lg');
            revealBtn.classList.add('opacity-0', 'pointer-events-none');
            
            // Reveal the actual words
            const words = mnemonic.split(' ');
            seedPhraseGrid.querySelectorAll('.seed-word-text').forEach((element, index) => {
                if (words[index]) {
                    element.textContent = words[index];
                }
            });
        });
    }

    // Copy seed phrase
    const copyBtn = document.getElementById('copySeedPhraseBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const mnemonic = sessionStorage.getItem('temp_mnemonic');
            if (mnemonic) {
                try {
                    await navigator.clipboard.writeText(mnemonic);
                    // Show success feedback
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    showWalletError('Failed to copy seed phrase');
                }
            }
        });
    }

    // Continue to main wallet
    const confirmBtn = document.getElementById('confirmSeedPhraseBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            hideModal('seedPhraseModal');
            showMainWallet();
        });
    }
}

// Setup password validation
export function setupPasswordValidation() {
    const form = document.getElementById('passwordSetupForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showWalletError('Passwords do not match');
            return;
        }
        
        try {
            // Get stored mnemonic
            const mnemonic = sessionStorage.getItem('temp_mnemonic');
            if (!mnemonic) {
                throw new Error('No mnemonic found');
            }
            
            // Create wallet instance
            const wallet = new BSVWallet(mnemonic, password);
            
            // Create session
            await createSession(wallet);
            
            // Hide password modal and show seed phrase
            hideModal('passwordSetupModal');
            displaySeedPhrase(mnemonic);
            
            // Setup main wallet events
            setupMainWalletEvents();
            
        } catch (error) {
            console.error('Error in password setup:', error);
            showWalletError('Failed to setup wallet');
        }
    });
}

// Get seed phrase from input boxes
export function getSeedPhrase() {
    const inputs = document.querySelectorAll('.seed-input');
    return Array.from(inputs).map(input => input.value.trim()).join(' ');
}

// Validate seed phrase
export function validateSeedPhrase(seedPhrase) {
    const words = seedPhrase.trim().split(/\s+/);
    return words.length === 12 && words.every(word => word.length > 0);
} 