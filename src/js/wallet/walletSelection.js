import { showModal, hideModal, showError } from '../modal.js';
import { generateNewWallet } from './walletGeneration.js';
import { setWalletLoading } from './walletUIManager.js';
import { SUPPORTED_WALLETS, detectAvailableWallets, initializeWallet } from './config.js';
import { initializeImportSeed } from './modals/importSeedModal.js';
import { setupPasswordValidation } from './passwordSetup.js';
import { generateSecureMnemonic } from './mnemonic.js';
import { initializeSeedPhraseModal } from './modals/seedPhraseModal.js';

// Helper function to display seed phrase
function displaySeedPhrase(mnemonic) {
    console.log('Displaying seed phrase...');
    
    // Show the modal and initialize it first
    showModal('seedPhraseModal');
    initializeSeedPhraseModal();
    
    const seedPhraseGrid = document.getElementById('seedPhraseGrid');
    if (!seedPhraseGrid) {
        console.error('Seed phrase container not found');
        return;
    }

    // Fill in the words (they'll be blurred initially)
    const words = mnemonic.split(' ');
    const wordElements = seedPhraseGrid.querySelectorAll('.seed-word-text');
    
    wordElements.forEach((element, index) => {
        if (words[index]) {
            element.textContent = words[index];
            console.log(`Word ${index + 1} set:`, words[index]);
        }
    });

    // Make sure grid is blurred and reveal button is visible
    seedPhraseGrid.classList.add('filter', 'blur-lg');
    const revealBtn = document.getElementById('revealSeedPhraseBtn');
    if (revealBtn) {
        revealBtn.classList.remove('opacity-0', 'pointer-events-none');
    }
}

// Helper function to handle button setup with loading state and error handling
async function setupWalletButton(buttonId, handler, options = {}) {
    console.log('Setting up button:', buttonId);
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`Button with id ${buttonId} not found`);
        return;
    }
    console.log('Found button:', button);

    const clickHandler = async (e) => {
        console.log(`Button ${buttonId} clicked`);
        try {
            setWalletLoading(true);
            console.log('Set wallet loading state');
            
            await options.preAction?.();
            console.log('Executing handler for', buttonId);
            await handler();
            console.log('Handler execution complete');

            if (options.hideModal) {
                console.log('Hiding modal:', 'walletSelectionModal');
                hideModal('walletSelectionModal');
            }
            if (options.showModal) {
                console.log('Showing modal:', options.showModal);
                showModal(options.showModal);
            }
        } catch (error) {
            console.error(`Error in ${buttonId}:`, error);
            showError(error.message || options.errorMessage || 'An error occurred');
            options.onError?.(error);
        } finally {
            setWalletLoading(false);
            console.log('Wallet loading state cleared');
        }
    };

    // Remove any existing click listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    console.log('Removed existing click listeners');

    // Add the click handler to the new button
    newButton.addEventListener('click', clickHandler);
    console.log(`Click handler added to ${buttonId}`);
}

// Handle connect wallet click - tries to connect to first available wallet or shows selection
export async function handleConnectWalletClick() {
    try {
        console.log('Handling connect wallet click');
        setWalletLoading(true);
        
        // Always show wallet selection for now
        showWalletSelection();
        return;

        // This code is temporarily disabled to ensure wallet selection always shows
        /*
        const availableWallets = detectAvailableWallets();
        const hasAvailableWallet = Object.values(availableWallets).some(available => available);
        
        if (!hasAvailableWallet) {
            showWalletSelection();
            return;
        }
        
        const firstAvailableWallet = Object.entries(availableWallets)
            .find(([_, available]) => available)?.[0];
            
        if (firstAvailableWallet) {
            await initializeWallet(firstAvailableWallet);
            showModal('mainWalletModal');
        } else {
            showWalletSelection();
        }
        */
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showError(error.message || 'Failed to connect wallet');
        showWalletSelection();
    } finally {
        setWalletLoading(false);
    }
}

// Modal navigation functions
export function showCreateWalletModal() {
    hideModal('walletSelectionModal');
    showModal('passwordSetupModal');
    
    // Setup password validation for create flow
    setupPasswordValidation(async () => {
        // Generate new mnemonic after password is set
        const mnemonic = await generateSecureMnemonic();
        console.log('Generated secure mnemonic');
        sessionStorage.setItem('temp_mnemonic', mnemonic);
        sessionStorage.setItem('wallet_flow', 'create'); // Mark this as create flow
        
        // Display the seed phrase
        displaySeedPhrase(mnemonic);
    });
}

export function showWalletSelection() {
    console.log('Showing wallet selection modal...');
    const availableWallets = detectAvailableWallets();
    console.log('Available wallets:', availableWallets);
    
    showModal('walletSelectionModal');
    console.log('Setting up wallet selection events...');
    setupWalletSelectionEvents(availableWallets);
    console.log('Wallet selection events setup complete');
}

// Handle import wallet click
window.handleImportWalletClick = function() {
    console.log('Import wallet button clicked');
    hideModal('walletSelectionModal');
    showModal('passwordSetupModal');
    
    // Setup password validation for import flow
    setupPasswordValidation(() => {
        console.log('Password setup complete, showing import seed modal...');
        sessionStorage.setItem('wallet_flow', 'import'); // Mark this as import flow
        showModal('importSeedModal');
        initializeImportSeed();
    });
};

// Setup wallet selection events
export function setupWalletSelectionEvents(availableWallets) {
    console.log('Setting up wallet selection events...');
    const modal = document.getElementById('walletSelectionModal');
    if (!modal) {
        console.error('Wallet selection modal not found');
        return;
    }
    console.log('Found wallet selection modal');

    // Setup wallet buttons
    Object.entries(SUPPORTED_WALLETS).forEach(([key, wallet]) => {
        console.log('Setting up wallet button:', key);
        const button = document.getElementById(wallet.id);
        if (!button) {
            console.error(`Button for wallet ${key} not found`);
            return;
        }
        console.log('Found button for wallet:', key);

        if (availableWallets[key]) {
            setupWalletButton(wallet.id, async () => {
                if (wallet.checkReady?.() === false) {
                    window.open(wallet.installUrl, '_blank');
                    throw new Error(`${wallet.name} wallet not ready`);
                }
                await initializeWallet(key);
            }, {
                hideModal: true,
                showModal: 'mainWalletModal',
                errorMessage: wallet.errorMessage
            });
        } else {
            button.addEventListener('click', () => {
                window.open(wallet.installUrl, '_blank');
            });
        }
    });

    // Setup create wallet button
    setupWalletButton('createWalletBtn', async () => {
        console.log('Create wallet button clicked');
        showCreateWalletModal();
    }, {
        errorMessage: 'Failed to create new wallet'
    });
    
    console.log('All wallet selection events setup complete');
} 