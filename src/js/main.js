import { initializeBlocks, shiftBlocks } from './blocks.js';
import { initializeSubmissions } from './submissions.js';
import BSVWallet from './BSVWallet.js';
import { initialize as initializeWallet } from './wallet/walletInit.js';
import { showMainWallet, showWalletError } from './wallet/modalManager.js';
import { showWalletSelection } from './wallet/modalManager.js';
import { handleConnectWalletClick } from './wallet/walletSelection.js';
import { showModal, initializeModal } from './modal.js';
import { initializeWalletUI } from './wallet.js';

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

async function loadIncludedContent(element) {
    const includes = element.querySelectorAll('[data-include]');
    const includePromises = Array.from(includes).map(async include => {
        const path = include.getAttribute('data-include');
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load included content: ${response.status}`);
            }
            const html = await response.text();
            include.innerHTML = html;
            // Recursively load any nested includes
            await loadIncludedContent(include);
            return true;
        } catch (error) {
            console.error(`Error loading included content from ${path}:`, error);
            return false;
        }
    });
    return Promise.all(includePromises);
}

async function loadWalletModals() {
    try {
        const response = await fetch('/src/components/wallet-modals.html');
        if (!response.ok) {
            throw new Error(`Failed to load wallet modals: ${response.status}`);
        }
        const html = await response.text();
        const modalsElement = document.getElementById('walletModals');
        if (modalsElement) {
            modalsElement.innerHTML = html;
            // Load included content
            await loadIncludedContent(modalsElement);
            // Initialize modals after all content is loaded
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.id) {
                    console.log('Initializing modal:', modal.id);
                    initializeModal(modal.id);
                } else {
                    console.warn('Found modal without ID, skipping initialization');
                }
            });
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
        
        // Load header and other included content first
        console.log('Loading included content...');
        const appElement = document.getElementById('app');
        const includedContentLoaded = await loadIncludedContent(appElement);
        if (!includedContentLoaded.every(Boolean)) {
            throw new Error('Failed to load included content');
        }
        
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

        // Initialize wallet
        console.log('Creating wallet instance...');
        window.wallet = new BSVWallet();
        
        console.log('Initializing wallet UI...');
        await initializeWallet();
        await initializeWalletUI();

        // Add global click handler for debugging
        document.addEventListener('click', (e) => {
            console.log('Click detected:', {
                target: e.target,
                x: e.clientX,
                y: e.clientY,
                path: e.composedPath().map(el => ({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id
                }))
            });
        }, true);

        console.log('App initialization complete');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Initialize submissions refresh
setInterval(initializeSubmissions, 60000);
 