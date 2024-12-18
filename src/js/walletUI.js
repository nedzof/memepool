import { bsv, generateMnemonic } from './bsv.js';
import BSVWallet from './BSVWallet.js';
import { initUnisatWallet, initOKXWallet } from './wallet/walletInterfaces.js';
import { showModal, hideModal, showMainWallet, showWalletError } from './modals/modalManager.js';
import { setupMainWalletEvents, updateBalanceDisplay } from './wallet/walletEvents.js';
import { authenticateWithX } from './auth/xAuth.js';
import { getFromCache, setInCache, clearProfileCache } from './utils/cache.js';
import { checkUsernameAvailability, retrieveUsernameDataFromChain, retrieveAvatarDataFromChain } from './utils/blockchain.js';

// Export all necessary functions
export {
    initializeWallet,
    registerUsernameOnChain,
    registerAvatarOnChain,
    checkUsernameAvailability,
    updateProfileWithX,
    showWalletError,
    updateProfileWithPersistence,
    detectWalletType,
    showWalletSelection
};

// Random name generation data
const adjectives = ['Energetic', 'Cosmic', 'Mystic', 'Digital', 'Quantum', 'Cyber', 'Neon', 'Solar', 'Lunar', 'Stellar'];
const names = ['Sandra', 'Alex', 'Morgan', 'Jordan', 'Casey', 'Riley', 'Taylor', 'Quinn', 'Sage', 'Phoenix'];

// Profile management functions
function generateRandomUsername() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    return `${adj} ${name}`;
}

// Profile persistence management
const WALLET_SESSION_KEY = 'memepire_wallet_session';

function saveWalletSession(walletType, address) {
    try {
        localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({
            type: walletType,
            address: address,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving wallet session:', error);
    }
}

function getLastWalletSession() {
    try {
        const session = localStorage.getItem(WALLET_SESSION_KEY);
        return session ? JSON.parse(session) : null;
    } catch (error) {
        console.error('Error retrieving wallet session:', error);
        return null;
    }
}

// Update profile management functions to use persistence
async function updateProfileWithPersistence(address) {
    try {
        // Try to get cached profile data first
        const cachedProfile = getFromCache(address, 'profile');
        
        if (cachedProfile) {
            // Update UI with cached data immediately
            updateUIWithProfileData(cachedProfile);
        }

        // For now, just use the address as the username
        const profileData = {
            username: address.slice(0, 8) + '...' + address.slice(-4),
            displayName: null,
            avatar: null,
            registrationTx: null,
            lastFetched: Date.now()
        };

        setInCache(address, profileData, 'profile');
        updateUIWithProfileData(profileData);

        return profileData;
    } catch (error) {
        console.error('Error updating profile with persistence:', error);
        return null;
    }
}

function updateUIWithProfileData(profileData) {
    const profileUsername = document.getElementById('profileUsername');
    const profileAvatar = document.getElementById('profileAvatar');

    if (profileData.username) {
        profileUsername.textContent = profileData.displayName || profileData.username;
    }

    if (profileData.avatar) {
        updateProfileAvatar(profileData.avatar);
    }
}

// Update wallet connection functions to use persistence
async function connectUnisatWallet() {
    try {
        const wallet = await initUnisatWallet();
        if (!wallet) {
            throw new Error('Failed to initialize UniSat wallet');
        }
        
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('unisat', wallet.getAddress());
        
        // Hide the wallet selection modal
        hideModal('initialSetupModal');
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        // Show the main wallet menu
        showMainWallet();
        
        // Update balance display immediately
        await updateBalanceDisplay();
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
    } catch (error) {
        console.error('Failed to connect UniSat wallet:', error);
        showWalletError(error.message);
    }
}

// Add OKX wallet connection function
async function connectOKXWallet() {
    try {
        const wallet = await initOKXWallet();
        if (!wallet) {
            throw new Error('Failed to initialize OKX wallet');
        }
        
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('okx', wallet.getAddress());
        
        // Hide the wallet selection modal
        hideModal('initialSetupModal');
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        // Show the main wallet menu
        showMainWallet();
    } catch (error) {
        console.error('Failed to connect OKX wallet:', error);
        showWalletError(error.message);
    }
}

// Wallet type detection
async function detectWalletType() {
    if (window.unisat) {
        return 'unisat';
    } else if (window.okxwallet) {
        return 'okx';
    }
    return null;
}

// Update initializeWallet to include OKX
async function initializeWallet() {
    console.log('Starting wallet initialization...');
    
    // Check for existing session
    const lastSession = getLastWalletSession();
    if (lastSession) {
        console.log('Found existing wallet session:', lastSession);
        
        // Verify wallet is still available
        const currentWalletType = await detectWalletType();
        if (currentWalletType === lastSession.type) {
            try {
                // Reconnect to the wallet
                const wallet = currentWalletType === 'unisat' ? 
                    await initUnisatWallet() : 
                    currentWalletType === 'okx' ?
                    await initOKXWallet() :
                    null;
                    
                if (!wallet) {
                    throw new Error('Failed to initialize wallet');
                }
                
                window.wallet = wallet;
                
                // Update balance display immediately
                await updateBalanceDisplay();
                
                // Set up periodic balance updates
                setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
                
                // Verify address matches
                if (wallet.getAddress() === lastSession.address) {
                    console.log('Successfully reconnected to previous wallet session');
                    await updateProfileWithPersistence(wallet.getAddress());
                    showMainWallet();
                    return;
                }
            } catch (error) {
                console.error('Failed to reconnect to previous session:', error);
            }
        }
    }

    // If no session or reconnection failed, proceed with normal initialization
    const walletType = await detectWalletType();
    
    // Update UI elements
    const connectBtn = document.getElementById('connectWalletBtn');
    if (!connectBtn) {
        console.error('Connect wallet button not found');
        return;
    }

    // Remove any duplicate connect buttons
    const connectButtons = document.querySelectorAll('[id="connectWalletBtn"]');
    if (connectButtons.length > 1) {
        for (let i = 1; i < connectButtons.length; i++) {
            connectButtons[i].remove();
        }
    }

    // Initialize modal states
    console.log('Initializing modal states...');
    const walletModals = document.querySelectorAll('[id$="Modal"]');
    walletModals.forEach(modal => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    // Connect wallet button
    console.log('Setting up connect wallet button...');
    connectBtn.addEventListener('click', () => {
        console.log('Connect wallet button clicked');
        showWalletSelection();
    });
}

// Update showWalletSelection function
function showWalletSelection() {
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
    const modalContent = `
        <div class="modal-content border border-[#ff00ff]/30 rounded-2xl p-8 max-w-md w-full relative backdrop-blur-xl"
             style="background: linear-gradient(180deg, rgba(18, 12, 52, 0.95) 0%, rgba(26, 17, 71, 0.95) 100%);
                    box-shadow: 0 0 40px rgba(255, 0, 255, 0.2);">
            <div class="space-y-8">
                <div>
                    <h2 class="text-3xl font-bold bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-transparent bg-clip-text">Connect Wallet</h2>
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

                    ${hasUnisat ? `
                        <!-- UniSat Wallet (if installed) -->
                        <button id="unisatBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                            <div class="relative z-10 flex items-center justify-between px-4">
                                <div class="flex items-center gap-2">
                                    <img src="/assets/unisat-logo.svg" alt="UniSat" class="w-6 h-6">
                                    <span>UniSat Wallet</span>
                                </div>
                                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
                            </div>
                        </button>
                    ` : ''}

                    ${hasOKX ? `
                        <!-- OKX Wallet (if installed) -->
                        <button id="okxBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                            <div class="relative z-10 flex items-center justify-between px-4">
                                <div class="flex items-center gap-2">
                                    <img src="/assets/okx-logo.svg" alt="OKX" class="w-6 h-6">
                                    <span>OKX Wallet</span>
                                </div>
                                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
                            </div>
                        </button>
                    ` : ''}

                    <!-- Import Existing Wallet -->
                    <button id="importWalletBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                        <div class="relative z-10 flex items-center justify-between px-4">
                            <div class="flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                                <span>Import Wallet</span>
                            </div>
                            <span class="text-xs text-gray-400">Seed phrase or private key</span>
                        </div>
                    </button>

                    <!-- X Login -->
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

                    ${!hasUnisat || !hasOKX ? `
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
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Set modal content
    initialSetupModal.innerHTML = modalContent;

    // Show modal with animation
    showModal('initialSetupModal');

    // Add event listeners
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
    const closeButtons = initialSetupModal.querySelectorAll('[id$="CloseBtn"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => hideModal('initialSetupModal'));
    });

    // Add click outside to close
    initialSetupModal.addEventListener('click', (e) => {
        if (e.target === initialSetupModal) {
            hideModal('initialSetupModal');
        }
    });
}