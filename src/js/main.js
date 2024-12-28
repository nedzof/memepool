import { showModal, hideModal, initializeModal, showError } from './modal.js';
import { showWalletSelection, setupWalletSelectionEvents, handleConnectWalletClick } from './wallet/walletSelection.js';
import { detectAvailableWallets, initializeWallet } from './wallet/config.js';
import { initializeSeedModal } from './wallet/modals/seedModal.js';
import { startWalletSetup } from './wallet/setup.js';
import { initializeBlocks, shiftBlocks } from './blocks.js';
import { initializeSubmissions } from './submissions.js';
import { initializeWalletUI } from './wallet/walletUIManager.js';
import { setupMainWalletEvents } from './wallet/walletEvents.js';
import { updateWalletUI } from './wallet/walletUIManager.js';
import { updateHeaderWalletButton, initializeHeader } from './header.js';

// Initialize main wallet modal when loaded
function initializeMainWalletModal() {
    console.log('Initializing main wallet modal...');
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (mainWalletModal) {
        console.log('Found main wallet modal, setting up events');
        setupMainWalletEvents();
    } else {
        console.log('Main wallet modal not found, will try again');
        setTimeout(initializeMainWalletModal, 100);
    }
}

// Expose wallet functions globally
window.showWalletSelection = function() {
    console.log('Showing wallet selection modal');
    const modal = document.getElementById('walletSelectionModal');
    if (!modal) {
        console.error('Wallet selection modal not found');
        return;
    }
    showModal('walletSelectionModal');
};

// Make wallet setup function available globally
window.startWalletSetup = startWalletSetup;

async function loadMainContent() {
    try {
        const response = await fetch('/src/components/main-content.html');
        if (!response.ok) {
            throw new Error(`Failed to load main content: ${response.status}`);
        }
        const html = await response.text();
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.innerHTML = html;
            // Add event listener to shift blocks button after content is loaded
            const shiftBlocksBtn = document.querySelector('.shift-blocks');
            if (shiftBlocksBtn) {
                shiftBlocksBtn.addEventListener('click', () => {
                    console.log('Shift blocks clicked');
                    shiftBlocks();
                });
            } else {
                console.error('Shift blocks button not found');
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading main content:', error);
        return false;
    }
}

async function loadIncludedContent(parentElement) {
    const includes = parentElement.querySelectorAll('[data-include]');
    console.log('Found includes:', includes.length);
    console.log('Element:', parentElement);
    console.log('Element HTML:', parentElement.innerHTML);
    
    const includePromises = Array.from(includes).map(async include => {
        const path = include.getAttribute('data-include');
        console.log('Loading included content from path:', path);
        
        try {
            // Remove leading slash if present
            const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
            console.log('Normalized path:', normalizedPath);
            
            const response = await fetch(normalizedPath, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                console.error(`Failed to load content from ${normalizedPath}:`, response.status, response.statusText);
                console.error('Response:', response);
                throw new Error(`Failed to load included content: ${response.status}`);
            }
            
            const html = await response.text();
            console.log(`Loaded HTML content from ${normalizedPath}, length:`, html.length);
            console.log('Content:', html);
            
            include.innerHTML = html;
            console.log(`Set innerHTML for element with path ${normalizedPath}`);
            console.log('Updated element:', include);
            
            // Recursively load any nested includes
            await loadIncludedContent(include);
            return true;
        } catch (error) {
            console.error(`Error loading included content from ${path}:`, error);
            console.error('Stack trace:', error.stack);
            return false;
        }
    });
    return Promise.all(includePromises);
}

async function loadWalletModals() {
    try {
        console.log('Loading wallet modals...');
        const response = await fetch('src/components/wallet-modals.html');
        if (!response.ok) {
            throw new Error(`Failed to load wallet modals: ${response.status}`);
        }
        const html = await response.text();
        console.log('Loaded wallet modals HTML length:', html.length);
        
        const modalsElement = document.getElementById('walletModals');
        if (modalsElement) {
            modalsElement.innerHTML = html;
            
            // Load included content
            console.log('Loading included content for wallet modals...');
            await loadIncludedContent(modalsElement);
            
            // Initialize modals after all content is loaded
            console.log('Initializing modals...');
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.id) {
                    console.log('Initializing modal:', modal.id);
                    initializeModal(modal.id);
                } else {
                    console.warn('Found modal without ID, skipping initialization');
                }
            });

            // Verify critical modals are loaded
            const criticalModals = ['walletSelectionModal', 'passwordSetupModal', 'seedModal'];
            for (const modalId of criticalModals) {
                const modal = document.getElementById(modalId);
                if (!modal) {
                    console.error(`Critical modal ${modalId} not found after loading`);
                    throw new Error(`Critical modal ${modalId} not found`);
                }
                console.log(`Critical modal ${modalId} loaded successfully`);
            }

            // Only set up wallet selection events if not already initialized
            const walletSelectionModal = document.getElementById('walletSelectionModal');
            if (walletSelectionModal && !walletSelectionModal.hasAttribute('data-events-initialized')) {
                console.log('Setting up initial wallet selection events...');
                const availableWallets = detectAvailableWallets();
                setupWalletSelectionEvents(availableWallets);
                walletSelectionModal.setAttribute('data-events-initialized', 'true');
                console.log('Initial wallet selection events setup complete');
            } else {
                console.log('Wallet selection events already initialized, skipping setup');
            }

            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading wallet modals:', error);
        return false;
    }
}

async function initializeApp() {
    try {
        console.log('Initializing app...');
        
        // Get the app element
        const appElement = document.getElementById('app');
        console.log('App element:', appElement);
        
        // Load included content first
        console.log('Loading included content...');
        const includedContentLoaded = await loadIncludedContent(appElement);
        if (!includedContentLoaded.every(Boolean)) {
            console.error('Some included content failed to load');
            throw new Error('Failed to load included content');
        }
        console.log('All included content loaded successfully');

        // Initialize header first since it's critical
        console.log('Initializing header...');
        initializeHeader();
        
        // Load main content
        console.log('Loading main content...');
        const mainContentLoaded = await loadMainContent();
        if (!mainContentLoaded) {
            throw new Error('Failed to load main content');
        }

        // Load wallet modals
        console.log('Loading wallet modals...');
        const walletModalsLoaded = await loadWalletModals();
        if (!walletModalsLoaded) {
            throw new Error('Failed to load wallet modals');
        }

        // Initialize blocks and submissions
        console.log('Initializing blocks...');
        initializeBlocks();

        console.log('Initializing submissions...');
        initializeSubmissions();

        // Initialize wallet UI
        console.log('Initializing wallet UI...');
        await initializeWalletUI();

        // Initialize seed modal
        const seedModal = document.getElementById('seedModal');
        if (!seedModal) {
            console.error('Seed modal not found after loading');
            throw new Error('Critical modal seedModal not found');
        }
        console.log('Found seed modal, initializing...');
        
        // Initialize seed modal
        initializeSeedModal();
        console.log('Seed modal initialized');

        // Attempt to restore session from localStorage
        console.log('Attempting to restore session...');
        const sessionRestored = await restoreSession();
        console.log('Session restore result:', sessionRestored);
        
        console.log('App initialization complete');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize app');
    }
}

async function restoreSession() {
    try {
        console.log('Attempting to restore wallet session...');
        
        // Check if we have a wallet initialized
        const isWalletInitialized = sessionStorage.getItem('wallet_initialized') === 'true';
        const walletType = sessionStorage.getItem('wallet_type');
        const walletAddress = sessionStorage.getItem('wallet_address');
        
        if (!isWalletInitialized || !walletType || !walletAddress) {
            console.log('No wallet session to restore');
            updateHeaderWalletButton(false);
            return;
        }
        
        console.log('Found existing wallet session:', { walletType, walletAddress });
        
        // Check if the wallet is available
        const availableWallets = detectAvailableWallets();
        if (!availableWallets[walletType]) {
            console.log('Wallet not available, cannot restore session');
            updateHeaderWalletButton(false);
            return;
        }
        
        // Try to initialize the wallet
        try {
            console.log('Attempting to initialize wallet...');
            const wallet = await initializeWallet(walletType);
            
            if (wallet) {
                console.log('Wallet reconnected successfully');
                
                // Initialize main wallet modal and its events
                const mainWalletModal = document.getElementById('mainWalletModal');
                if (mainWalletModal && !mainWalletModal.hasAttribute('data-initialized')) {
                    console.log('Initializing main wallet modal...');
                    setupMainWalletEvents();
                    mainWalletModal.setAttribute('data-initialized', 'true');
                }
                
                // Retrieve wallet balance
                let balance = 0;
                if (wallet.getBalance) {
                    try {
                        console.log('Retrieving wallet balance...');
                        balance = await wallet.getBalance();
                        console.log('Wallet balance:', balance);
                    } catch (error) {
                        console.error('Error retrieving wallet balance:', error);
                    }
                }
                
                // Update wallet UI with connected state and balance
                await updateWalletUI(balance);
                
                // Update header wallet button state
                updateHeaderWalletButton(true, balance);
                
                return true;
            }
        } catch (error) {
            console.error('Failed to restore wallet session:', error);
            // Clear session data on failure
            sessionStorage.removeItem('wallet_type');
            sessionStorage.removeItem('wallet_address');
            sessionStorage.removeItem('wallet_public_key');
            sessionStorage.removeItem('wallet_initialized');
            updateHeaderWalletButton(false);
        }
    } catch (error) {
        console.error('Error in restoreSession:', error);
        updateHeaderWalletButton(false);
    }
    return false;
}

function saveSessionState() {
    const session = getSession();

    if (session) {
        localStorage.setItem('memepire_wallet_session_state', JSON.stringify(session));
    }
}

function restoreSessionState() {
    const sessionState = localStorage.getItem('memepire_wallet_session_state');

    if (sessionState) {
        const session = JSON.parse(sessionState);
        updateSession(session);
        localStorage.removeItem('memepire_wallet_session_state');
    }
}

// Save session state before page unload
window.addEventListener('beforeunload', saveSessionState);

// Restore session state on page load
document.addEventListener('DOMContentLoaded', () => {
    restoreSessionState();
    initializeApp();
});

// Initialize submissions refresh
setInterval(() => {
    try {
        initializeSubmissions();
    } catch (error) {
        console.error('Error refreshing submissions:', error);
    }
}, 60000);
 