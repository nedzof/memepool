import { showModal, hideModal, showWalletError } from './modalManager.js';
import { connectUnisatWallet, connectOKXWallet } from './walletInit.js';
import { generateNewWallet } from './walletGeneration.js';
import { authenticateWithX } from './auth/xAuth.js';
import { initializeImportWallet } from './walletImport.js';

// Show wallet selection modal
export function showWalletSelection() {
    console.log('Showing wallet selection...');
    
    const initialSetupModal = document.getElementById('initialSetupModal');
    if (!initialSetupModal) {
        console.error('Initial setup modal not found');
        return;
    }

    // Check installed wallets
    const hasUnisat = window.unisat !== undefined;
    const hasOKX = window.okxwallet !== undefined;

    // Create modal content
    const modalContent = createWalletSelectionContent(hasUnisat, hasOKX);

    // Set modal content
    initialSetupModal.innerHTML = modalContent;

    // Show modal with animation
    showModal('initialSetupModal');

    // Add event listeners
    setupWalletSelectionEvents(hasUnisat, hasOKX);
}

// Create wallet selection modal content
function createWalletSelectionContent(hasUnisat, hasOKX) {
    return `
        <div class="modal-content border border-[#ff00ff]/30 rounded-2xl p-8 max-w-md w-full relative backdrop-blur-xl"
             style="background: linear-gradient(180deg, rgba(18, 12, 52, 0.95) 0%, rgba(26, 17, 71, 0.95) 100%);
                    box-shadow: 0 0 40px rgba(255, 0, 255, 0.2);">
            <div class="space-y-8">
                <div>
                    <h2 class="text-3xl font-bold bg-gradient-to-r from-[#00ffa3] to-[#dc1fff] text-transparent bg-clip-text">Connect with BSV</h2>
                    <p class="text-gray-400 text-sm mt-1">Choose how you want to connect</p>
                </div>
                
                <div class="space-y-4">
                    <!-- Generate New Wallet -->
                    <button id="generateWalletBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#00ffa3]/30 bg-[#0F1825]/30 hover:border-[#00ffa3]">
                        <div class="relative z-10 flex items-center justify-center gap-2">
                            <svg class="w-5 h-5 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <span class="text-[#00ffa3]">Generate New Wallet</span>
                        </div>
                        <div class="absolute inset-0 bg-[#00ffa3]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    ${hasUnisat ? createUnisatButton() : ''}
                    ${hasOKX ? createOKXButton() : ''}

                    <!-- Import Existing Wallet -->
                    ${createImportButton()}

                    <!-- X Login -->
                    ${createXLoginButton()}

                    ${!hasUnisat || !hasOKX ? createWalletInstallPrompt(hasUnisat, hasOKX) : ''}
                </div>
            </div>
        </div>
    `;
}

// Create UniSat button HTML
function createUnisatButton() {
    return `
        <button id="unisatBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
            <div class="relative z-10 flex items-center justify-between px-4">
                <div class="flex items-center gap-2">
                    <img src="src/assets/images/unisat-logo.svg" alt="UniSat" class="w-6 h-6">
                    <span>UniSat Wallet</span>
                </div>
                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
            </div>
        </button>
    `;
}

// Create OKX button HTML
function createOKXButton() {
    return `
        <button id="okxBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
            <div class="relative z-10 flex items-center justify-between px-4">
                <div class="flex items-center gap-2">
                    <img src="src/assets/images/okx-logo.svg" alt="OKX" class="w-6 h-6">
                    <span>OKX Wallet</span>
                </div>
                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
            </div>
        </button>
    `;
}

// Create import button HTML
function createImportButton() {
    return `
        <button id="importWalletBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
            <div class="relative z-10 flex items-center justify-between px-4">
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <span>Import Wallet</span>
                </div>
                <span class="text-xs text-gray-400">Seed phrase or private key</span>
            </div>
        </button>
    `;
}

// Create X login button HTML
function createXLoginButton() {
    return `
        <button id="xLoginBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
            <div class="relative z-10 flex items-center justify-between px-4">
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Continue with X</span>
                </div>
                <span class="text-xs text-gray-400">Social login</span>
            </div>
        </button>
    `;
}

// Create wallet install prompt HTML
function createWalletInstallPrompt(hasUnisat, hasOKX) {
    return `
        <div class="mt-6 p-4 rounded-xl bg-[#ff00ff]/5 border border-[#ff00ff]/10">
            <div class="text-sm text-gray-400">
                <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-[#ff00ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                        <p class="mb-2">Get more features with a BSV wallet</p>
                        <div class="space-y-1">
                            ${!hasUnisat ? `
                                <a href="https://chromewebstore.google.com/detail/unisat-wallet/ppbibelpcjmhbdihakflkdcoccbgbkpo" target="_blank" 
                                   class="block text-[#00ffa3] hover:text-[#00ffa3]/80 transition-colors">
                                    • Install UniSat Wallet
                                </a>
                            ` : ''}
                            ${!hasOKX ? `
                                <a href="https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge" target="_blank"
                                   class="block text-[#00ffa3] hover:text-[#00ffa3]/80 transition-colors">
                                    • Install OKX Wallet
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Setup wallet selection events
function setupWalletSelectionEvents(hasUnisat, hasOKX) {
    const unisatBtn = document.getElementById('unisatBtn');
    const okxBtn = document.getElementById('okxBtn');
    const importWalletBtn = document.getElementById('importWalletBtn');
    const xLoginBtn = document.getElementById('xLoginBtn');
    const generateWalletBtn = document.getElementById('generateWalletBtn');

    if (unisatBtn) {
        unisatBtn.addEventListener('click', async () => {
            try {
                hideModal('initialSetupModal');
                await connectUnisatWallet();
            } catch (error) {
                console.error('Error connecting to UniSat wallet:', error);
                showWalletError(error.message);
            }
        });
    }

    if (okxBtn) {
        okxBtn.addEventListener('click', async () => {
            try {
                hideModal('initialSetupModal');
                await connectOKXWallet();
            } catch (error) {
                console.error('Error connecting to OKX wallet:', error);
                showWalletError(error.message);
            }
        });
    }
    
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', () => {
            hideModal('initialSetupModal');
            showModal('importWalletModal');
            initializeImportWallet();
        });
    }
    
    if (xLoginBtn) {
        xLoginBtn.addEventListener('click', () => {
            hideModal('initialSetupModal');
            authenticateWithX();
        });
    }
    
    if (generateWalletBtn) {
        generateWalletBtn.addEventListener('click', () => {
            hideModal('initialSetupModal');
            showModal('seedPhraseModal');
            generateNewWallet();
        });
    }

    // Add close button handler
    const closeButtons = document.querySelectorAll('[id$="CloseBtn"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => hideModal('initialSetupModal'));
    });

    // Add click outside to close
    const initialSetupModal = document.getElementById('initialSetupModal');
    if (initialSetupModal) {
        initialSetupModal.addEventListener('click', (e) => {
            if (e.target === initialSetupModal) {
                hideModal('initialSetupModal');
            }
        });
    }
} 