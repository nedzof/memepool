import { showModal, hideModal, showError } from '../modal.js';
import { generateNewWallet } from './walletGeneration.js';
import { setWalletLoading } from './walletUIManager.js';
import { SUPPORTED_WALLETS, detectAvailableWallets, initializeWallet } from './config.js';
import { setupPasswordValidation } from './passwordSetup.js';
import { initializeSeedModal } from './modals/seedModal.js';

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
async function setupWalletButton(button, handler, options = {}) {
    console.log('Setting up button:', button);
    if (!button) {
        console.error('Button not found');
        return;
    }

    const clickHandler = async (e) => {
        console.log(`Button clicked:`, button);
        try {
            setWalletLoading(true);
            console.log('Set wallet loading state');
            
            await options.preAction?.();
            console.log('Executing handler for button');
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
            console.error('Error in button handler:', error);
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
    console.log('Click handler added to button');
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
    console.log('Starting create wallet flow...');
    sessionStorage.setItem('wallet_flow', 'create'); // Set flow type first
    hideModal('walletSelectionModal');
    showModal('passwordSetupModal');
    
    // Setup password validation for create flow
    setupPasswordValidation(() => {
        console.log('Password setup complete, showing seed modal...');
        showModal('seedModal');
        initializeSeedModal();
    });
}

export function showWalletSelection() {
    console.log('Showing wallet selection modal...');
    const availableWallets = detectAvailableWallets();
    console.log('Available wallets:', availableWallets);
    
    showModal('walletSelectionModal');

    setTimeout(() => {
        console.log('Setting up wallet selection events...');
        setupWalletSelectionEvents(availableWallets);
        console.log('Wallet selection events setup complete');
    }, 0);
}

// Handle import wallet click
window.handleImportWalletClick = function() {
    console.log('Starting import wallet flow...');
    sessionStorage.setItem('wallet_flow', 'import'); // Set flow type first
    hideModal('walletSelectionModal');
    showModal('passwordSetupModal');
    
    // Setup password validation for import flow
    setupPasswordValidation(() => {
        console.log('Password setup complete, showing seed modal...');
        showModal('seedModal');
        initializeSeedModal();
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

    const detectedContainer = modal.querySelector('.detected-wallets');
    const undetectedContainer = modal.querySelector('.undetected-wallets');

    if (!detectedContainer || !undetectedContainer) {
        console.error('Wallet containers not found');
        return;
    }

    // Clear existing wallet buttons
    detectedContainer.innerHTML = '';
    undetectedContainer.innerHTML = '';

    // Setup wallet buttons
    Object.entries(SUPPORTED_WALLETS).forEach(([key, wallet]) => {
        console.log('Setting up wallet button:', key);
        
        // Create wallet button
        const button = document.createElement('button');
        button.className = 'neon-button flex items-center justify-between w-full py-3 px-4 rounded-xl mb-2';
        button.setAttribute('data-wallet', key);
        
        // Check if wallet is available
        const isAvailable = wallet.checkAvailability();
        console.log(`Wallet ${key} availability:`, isAvailable);
        
        button.setAttribute('data-wallet-detected', isAvailable);
        button.setAttribute('data-tooltip', `Click to install ${wallet.name}`);
        
        // Create button content
        button.innerHTML = `
            <div class="flex items-center">
                <img src="src/assets/wallet-logos/${key.toLowerCase()}-logo.${key === 'unisat' ? 'png' : 'svg'}" 
                     alt="${wallet.name}" 
                     class="w-6 h-6 mr-3"
                     onerror="this.onerror=null; this.src='src/assets/wallet-logos/${key.toLowerCase()}-logo.png';">
                <span class="text-white font-medium text-sm">${wallet.name}</span>
            </div>
            <div class="status-container">
                ${isAvailable ? `
                    <span class="wallet-status" data-wallet-detected="true">Detected</span>
                ` : `
                    <span class="status-text undetected-text" data-wallet-detected="false">Not Detected</span>
                    <span class="status-text install-text">Install →</span>
                `}
            </div>
        `;

        // Add to appropriate container
        if (isAvailable) {
            detectedContainer.appendChild(button);
        } else {
            undetectedContainer.appendChild(button);
        }

        setupWalletButton(button, async () => {
            if (!isAvailable) {
                console.log(`${key} wallet not available, redirecting to install`);
                window.open(wallet.installUrl, '_blank');
                throw new Error(`Please install ${wallet.name} wallet`);
            }
            
            try {
                console.log(`Initializing ${key} wallet...`);
                const walletInstance = await wallet.initialize();
                
                if (!walletInstance) {
                    throw new Error(`Failed to initialize ${wallet.name} wallet`);
                }

                // Verify we have the required data
                if (!walletInstance.address || !walletInstance.publicKey) {
                    throw new Error(`${wallet.name} wallet initialization missing required data`);
                }

                // Store wallet data in session
                sessionStorage.setItem('wallet_type', key);
                sessionStorage.setItem('wallet_address', walletInstance.address);
                sessionStorage.setItem('wallet_public_key', walletInstance.publicKey);
                sessionStorage.setItem('wallet_initialized', 'true');
                
                console.log('Wallet data stored:', {
                    type: key,
                    address: walletInstance.address,
                    hasPublicKey: !!walletInstance.publicKey
                });
                
                // Hide selection modal and show main wallet modal
                hideModal('walletSelectionModal');
                showModal('mainWalletModal');
                
                return walletInstance;
            } catch (error) {
                console.error(`Error initializing ${key} wallet:`, error);
                // Clean up any partial data on failure
                sessionStorage.removeItem('wallet_type');
                sessionStorage.removeItem('wallet_address');
                sessionStorage.removeItem('wallet_public_key');
                sessionStorage.removeItem('wallet_initialized');
                throw error;
            }
        }, {
            errorMessage: wallet.errorMessage
        });
    });

    // Setup create wallet button
    setupWalletButton(document.getElementById('createWalletBtn'), async () => {
        console.log('Create wallet button clicked');
        showCreateWalletModal();
    }, {
        errorMessage: 'Failed to create new wallet'
    });
    
    console.log('All wallet selection events setup complete');
}

async function connectExternalWallet(walletKey) {
    try {
        let publicKey;

        switch (walletKey) {
            case 'okx':
                publicKey = await connectOKXWallet();
                break;
            case 'unisat':
                publicKey = await connectUnisatWallet();
                break;
            // Add more cases for other wallets
            default:
                throw new Error('Unsupported wallet');
        }

        // Calculate legacy address from public key
        const legacyAddress = bsv.Address.fromPublicKey(publicKey).toString();

        // Store public key and legacy address in wallet instance
        window.wallet = {
            publicKey,
            legacyAddress
        };

        // Show success animation modal
        showSuccessAnimation();
    } catch (error) {
        console.error('Error connecting external wallet:', error);
        showWalletError('Failed to connect wallet. Please try again.');
    }
}

async function connectOKXWallet() {
    // Implement OKX wallet connection logic
    // Return the public key
}

async function connectUnisatWallet() {
    // Implement Unisat wallet connection logic
    // Return the public key
} 