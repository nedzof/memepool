import { BitcoinWallet } from './wallet/bitcoin.js';
import { initializeBlocks, shiftBlocks } from './blocks.js';
import { initializeSubmissions } from './submissions.js';
import { 
    showModal, 
    hideModal, 
    showError,
    initializeModal,
    initializeWalletUI,
    showWalletSelection,
    showMainWallet 
} from './walletUI.js';
import { handleConnectWalletClick } from './wallet/walletSelection.js';
import { initializeWallet } from './wallet/config.js';

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
    console.log('Found includes:', includes.length);
    console.log('Element:', element);
    console.log('Element HTML:', element.innerHTML);
    
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
        
        // Ensure the header include div exists
        if (!appElement.querySelector('[data-include="src/components/header.html"]')) {
            console.log('Adding header include div');
            const headerDiv = document.createElement('div');
            headerDiv.setAttribute('data-include', 'src/components/header.html');
            appElement.insertBefore(headerDiv, appElement.firstChild);
        }
        
        // Load header and other included content first
        console.log('Loading included content...');
        const includedContentLoaded = await loadIncludedContent(appElement);
        if (!includedContentLoaded.every(Boolean)) {
            console.error('Some included content failed to load');
            throw new Error('Failed to load included content');
        }
        console.log('All included content loaded successfully');
        
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

        // Initialize wallet button click handler
        console.log('Setting up wallet button handler...');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', handleConnectWalletClick);
        } else {
            console.warn('Connect wallet button not found');
        }

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
 