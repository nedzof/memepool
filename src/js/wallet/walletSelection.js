import { showModal, hideModal, showWalletError, showMainWallet } from './modalManager.js';
import { connectUnisatWallet, connectOKXWallet } from './walletInit.js';
import { generateNewWallet } from './walletGeneration.js';
import { authenticateWithX } from './auth/xAuth.js';
import { initializeImportWallet } from './walletImport.js';

// Show wallet selection modal with enhanced animations
export function showWalletSelection() {
    console.log('Showing wallet selection...');
    
    let initialSetupModal = document.getElementById('initialSetupModal');
    if (!initialSetupModal) {
        console.log('Creating initial setup modal');
        initialSetupModal = document.createElement('div');
        initialSetupModal.id = 'initialSetupModal';
        document.body.appendChild(initialSetupModal);
    }

    // Check installed wallets
    const hasUnisat = window.unisat !== undefined;
    const hasOKX = window.okxwallet !== undefined;
    console.log('Available wallets:', { hasUnisat, hasOKX });

    // Create modal content with Solana-style elements
    const modalContentHtml = `
        <div class="modal-content border border-[#00ffa3]/30 rounded-2xl p-8 max-w-md w-full relative backdrop-blur-xl neon-border"
             style="background: linear-gradient(180deg, rgba(18, 12, 52, 0.95) 0%, rgba(26, 17, 71, 0.95) 100%);">
            
            <h2 class="text-3xl font-bold mb-6 neon-text text-center">Connect Wallet</h2>
            
            <div class="space-y-4">
                ${hasUnisat ? `
                    <button id="unisatWalletBtn" class="w-full wallet-action-btn neon-button ripple py-4 px-6 rounded-xl relative overflow-hidden group">
                        <div class="relative z-10 flex items-center justify-between">
                            <span class="font-bold text-white">Unisat Wallet</span>
                            <img src="/assets/unisat-logo.png" alt="Unisat" class="w-8 h-8">
                        </div>
                    </button>
                ` : ''}
                
                ${hasOKX ? `
                    <button id="okxWalletBtn" class="w-full wallet-action-btn neon-button ripple py-4 px-6 rounded-xl relative overflow-hidden group">
                        <div class="relative z-10 flex items-center justify-between">
                            <span class="font-bold text-white">OKX Wallet</span>
                            <img src="/assets/okx-logo.png" alt="OKX" class="w-8 h-8">
                        </div>
                    </button>
                ` : ''}
                
                <button id="createWalletBtn" class="w-full wallet-action-btn neon-button ripple py-4 px-6 rounded-xl relative overflow-hidden group">
                    <div class="relative z-10 flex items-center justify-between">
                        <span class="font-bold text-white">Create New Wallet</span>
                        <svg class="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </div>
                </button>
                
                <button id="importWalletBtn" class="w-full wallet-action-btn neon-button ripple py-4 px-6 rounded-xl relative overflow-hidden group">
                    <div class="relative z-10 flex items-center justify-between">
                        <span class="font-bold text-white">Import Existing Wallet</span>
                        <svg class="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8"></path>
                        </svg>
                    </div>
                </button>
            </div>
            
            <div class="mt-8 p-4 rounded-xl bg-black/30 relative group transition-all duration-300">
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div class="relative z-10 flex items-start gap-3">
                    <svg class="w-5 h-5 text-[#00ffa3] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-sm text-white/80">
                        Connect with your preferred wallet or create a new one to start using the Memepire.
                    </p>
                </div>
            </div>
        </div>
    `;

    // Set modal content
    initialSetupModal.innerHTML = modalContentHtml;
    console.log('Modal content set');

    // Show the modal using the modal manager
    showModal('initialSetupModal');
    console.log('Modal displayed');

    // Add event listeners with animation feedback
    setupWalletSelectionEvents(hasUnisat, hasOKX);
    console.log('Event listeners set up');
}

// Setup wallet selection events with enhanced feedback
function setupWalletSelectionEvents(hasUnisat, hasOKX) {
    console.log('Setting up wallet selection events...');
    const modal = document.getElementById('initialSetupModal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }

    // Add close functionality with proper event handling
    const closeModal = (e) => {
        // Only close if clicking the backdrop (modal itself)
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal('initialSetupModal');
        }
    };
    
    // Remove any existing click listeners
    modal.removeEventListener('click', closeModal);
    // Add the click listener
    modal.addEventListener('click', closeModal);

    // Unisat wallet connection
    if (hasUnisat) {
        const unisatBtn = document.getElementById('unisatWalletBtn');
        if (unisatBtn) {
            console.log('Setting up Unisat button');
            unisatBtn.addEventListener('click', async () => {
                try {
                    unisatBtn.classList.add('loading');
                    await connectUnisatWallet();
                    hideModal('initialSetupModal');
                    showMainWallet();
                } catch (error) {
                    console.error('Unisat connection error:', error);
                    showWalletError(error.message);
                } finally {
                    unisatBtn.classList.remove('loading');
                }
            });
        }
    }

    // OKX wallet connection
    if (hasOKX) {
        const okxBtn = document.getElementById('okxWalletBtn');
        if (okxBtn) {
            console.log('Setting up OKX button');
            okxBtn.addEventListener('click', async () => {
                try {
                    okxBtn.classList.add('loading');
                    await connectOKXWallet();
                    hideModal('initialSetupModal');
                    showMainWallet();
                } catch (error) {
                    console.error('OKX connection error:', error);
                    showWalletError(error.message);
                } finally {
                    okxBtn.classList.remove('loading');
                }
            });
        }
    }

    // Create new wallet
    const createWalletBtn = document.getElementById('createWalletBtn');
    if (createWalletBtn) {
        console.log('Setting up create wallet button');
        createWalletBtn.addEventListener('click', async () => {
            try {
                console.log('Create wallet button clicked');
                createWalletBtn.classList.add('loading');
                hideModal('initialSetupModal');
                showModal('seedPhraseModal');
                await generateNewWallet();
            } catch (error) {
                console.error('Error creating new wallet:', error);
                showWalletError(error.message);
                showModal('initialSetupModal');
            } finally {
                createWalletBtn.classList.remove('loading');
            }
        });
    }

    // Import existing wallet
    const importWalletBtn = document.getElementById('importWalletBtn');
    if (importWalletBtn) {
        console.log('Setting up import wallet button');
        importWalletBtn.addEventListener('click', () => {
            try {
                console.log('Import wallet button clicked');
                importWalletBtn.classList.add('loading');
                hideModal('initialSetupModal');
                showModal('importWalletModal');
                initializeImportWallet();
            } catch (error) {
                console.error('Error initializing import wallet:', error);
                showWalletError(error.message);
                showModal('initialSetupModal');
            } finally {
                importWalletBtn.classList.remove('loading');
            }
        });
    }

    console.log('All wallet selection events set up');
}

// Check if wallet is already initialized
async function isWalletInitialized() {
    console.log('Checking wallet initialization...');
    
    // First check session
    const session = localStorage.getItem('memepire_wallet_session');
    if (session) {
        const sessionData = JSON.parse(session);
        console.log('Found wallet session:', sessionData);
        if (sessionData.isConnected) {
            return true;
        }
    }

    // Then check window.wallet
    if (!window.wallet) {
        console.log('No wallet instance found');
        return false;
    }

    try {
        // Check all required properties
        const publicKey = window.wallet.getPublicKey();
        const legacyAddress = await window.wallet.getLegacyAddress();
        const balance = await window.wallet.getBalance();
        const connectionType = window.wallet.getConnectionType();

        const isInitialized = !!(publicKey && legacyAddress && balance !== undefined && connectionType);
        console.log('Wallet initialization check:', { isInitialized, publicKey, legacyAddress, balance, connectionType });
        return isInitialized;
    } catch (error) {
        console.error('Error checking wallet initialization:', error);
        return false;
    }
}

// Handle connect wallet button click
export async function handleConnectWalletClick() {
    try {
        console.log('Connect wallet button clicked');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        if (connectWalletBtn) {
            connectWalletBtn.classList.add('loading');
            connectWalletBtn.disabled = true;
        }

        // Check if wallet is already initialized
        const isInitialized = await isWalletInitialized();
        console.log('Wallet initialized:', isInitialized);
        
        if (isInitialized) {
            console.log('Wallet is already initialized, showing main wallet');
            // Hide any open modals first
            const modals = document.querySelectorAll('[id$="Modal"]');
            modals.forEach(modal => {
                if (modal.id !== 'mainWalletModal') {
                    hideModal(modal.id);
                }
            });
            // Show main wallet modal
            showMainWallet();
            return;
        }

        console.log('Showing wallet selection...');
        showWalletSelection();
    } catch (error) {
        console.error('Error handling connect wallet click:', error);
        showWalletError('Failed to connect wallet. Please try again.');
    } finally {
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        if (connectWalletBtn) {
            connectWalletBtn.classList.remove('loading');
            connectWalletBtn.disabled = false;
        }
    }
} 