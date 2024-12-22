import { showModal, hideModal, initializeModal, showError } from '../modal.js';
import { BitcoinWallet } from './bitcoin.js';
import { updateWalletUI } from './walletUIManager.js';
import { createSession } from './auth/session.js';
import { initializeSeedPhraseModal } from './modals/seedPhraseModal.js';
import { setupPasswordValidation } from './passwordSetup.js';

// Generate new wallet
export async function generateNewWallet() {
    console.log('Generating new wallet...');
    
    try {
        // Show password setup modal first
        showModal('passwordSetupModal');
        setupPasswordValidation(displaySeedPhrase);
        return true;
    } catch (error) {
        console.error('Error in wallet generation:', error);
        showError(error.message);
        return false;
    }
}

// Display seed phrase
function displaySeedPhrase(mnemonic) {
    console.log('Displaying seed phrase...');
    
    const seedPhraseGrid = document.getElementById('seedPhraseGrid');
    if (!seedPhraseGrid) {
        console.error('Seed phrase container not found');
        return;
    }

    // Fill in the words (they'll be blurred initially)
    const words = mnemonic.split(' ');
    seedPhraseGrid.querySelectorAll('.seed-word-text').forEach((element, index) => {
        if (words[index]) {
            element.textContent = words[index];
            console.log(`Word ${index + 1} set`);
        }
    });

    // Make sure grid is blurred and reveal button is visible
    seedPhraseGrid.classList.add('filter', 'blur-lg');
    const revealBtn = document.getElementById('revealSeedPhraseBtn');
    if (revealBtn) {
        revealBtn.classList.remove('opacity-0', 'pointer-events-none');
    }

    // Show the modal and initialize it
    showModal('seedPhraseModal');
    initializeSeedPhraseModal();
}

// Show main wallet after setup
export async function showMainWallet() {
    try {
        console.log('Showing main wallet...');
        
        if (!window.wallet) {
            throw new Error('No wallet instance found');
        }

        // Update UI with wallet info
        await updateWalletUI(window.wallet.balance);
                        
        // Show main wallet modal
        showModal('mainWalletModal');
        
        // Clean up temporary storage
        sessionStorage.removeItem('temp_mnemonic');
        sessionStorage.removeItem('temp_password');
        
    } catch (error) {
        console.error('Error showing main wallet:', error);
        showError(error.message);
    }
} 