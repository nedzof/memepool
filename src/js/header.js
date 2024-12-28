// Import statements first
import { getSession, terminateSession } from './wallet/auth/session.js';
import { showModal, hideModal } from './modal.js';
import { handleConnectWalletClick } from './wallet/walletSelection.js';

// Header scroll behavior
let lastScrollTop = 0;
let header = null;
const scrollThreshold = 50; // Amount of pixels to scroll before showing/hiding header

// Connection status elements
let connectionStatus = null;
let connectionIcon = null; 
let connectionText = null;

// Store the current click handler for cleanup
let currentClickHandler = null;

// Throttle scroll event
let ticking = false;

// Map of connection states to their UI config
const connectionStates = {
  connected: {
    text: 'Connected',
    icon: `<svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
             <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
           </svg>`,
    bgColor: '#00ffa3'
  },
  reconnecting: {
    text: 'Reconnecting...',
    icon: `<svg class="w-3 h-3 text-yellow-300 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
             <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
           </svg>`,
    bgColor: '#ffd000'
  },
  disconnected: {
    text: 'Disconnected',
    icon: `<svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
             <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clip-rule="evenodd" />
           </svg>`,
    bgColor: '#ff4747'
  }
};

// Click handlers
function onConnectedClick() {
    console.log('Connected button clicked, showing main wallet modal');
    showModal('mainWalletModal');
}

function onDisconnectedClick() {
    console.log('Disconnected button clicked, showing wallet selection');
    showModal('walletSelectionModal');
}

function handleScroll() {
    if (!header) return;
    
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add shadow and background when scrolled
    if (currentScroll > 0) {
        header.classList.add('shadow-xl');
        header.classList.add('bg-[#0c0620]/95');
    } else {
        header.classList.remove('shadow-xl');
        header.classList.remove('bg-[#0c0620]/95');
    }
    
    // Show/hide header based on scroll direction
    if (Math.abs(lastScrollTop - currentScroll) <= scrollThreshold) return;
    
    if (currentScroll > lastScrollTop && currentScroll > 100) {
        // Scrolling down & past threshold
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up or at top
        header.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = currentScroll;
}

function initializeHeader() {
    console.log('Initializing header behavior...');
    header = document.querySelector('header');
    
    if (!header) {
        console.error('Header element not found');
        return;
    }
    
    console.log('Header element found:', header);
    
    // Initialize header state
    handleScroll();
    
    // Add scroll event listener
    document.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initialize connection status
    initializeConnectionStatus();

    // Get disconnect button from wallet main menu
    const disconnectButton = document.getElementById('disconnectButton');
    if (disconnectButton) {
        disconnectButton.addEventListener('click', onDisconnectButtonClick);
    }
}

function initializeConnectionStatus() {
    console.log('Initializing connection status...');
    
    // Get connect wallet button
    const connectButton = document.getElementById('connectWalletBtn');

    if (!connectButton) {
        console.error('Connect wallet button not found');
        return;
    }

    console.log('Found connect button element');

    // Check if we have a wallet initialized
    const isWalletInitialized = sessionStorage.getItem('wallet_initialized') === 'true';
    const walletType = sessionStorage.getItem('wallet_type');
    const walletAddress = sessionStorage.getItem('wallet_address');
    
    console.log('Current wallet state:', {
        isWalletInitialized,
        walletType,
        walletAddress,
        sessionData: {
            wallet_initialized: sessionStorage.getItem('wallet_initialized'),
            wallet_type: sessionStorage.getItem('wallet_type'),
            wallet_address: sessionStorage.getItem('wallet_address')
        }
    });
    
    if (isWalletInitialized && walletType && walletAddress) {
        console.log('Found existing wallet session, updating UI to connected state');
        updateHeaderWalletButton(true);
    } else {
        console.log('No wallet session found, setting UI to disconnected state');
        updateHeaderWalletButton(false);
    }
}

async function checkConnection() {
    try {
        const session = getSession();

        if (!session) {
            console.log('No active session found');
            updateHeaderWalletButton(false);
            return false;
        }

        // Make heartbeat request to WOC API
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/woc');
        
        if (!response.ok) {
            throw new Error(`Heartbeat request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`Heartbeat response returned error: ${data.error}`);
        }

        console.log('Connection check successful');
        return true;

    } catch (err) {
        console.error('Connection check failed:', err);
        return false;
    }
}

function updateHeaderWalletButton(isConnected, balance = null) {
    const connectButton = document.getElementById('connectWalletBtn');

    if (!connectButton) {
        console.error('Connect button not found');
        return;
    }

    console.log('Updating header button:', { isConnected, balance });

    // Remove existing click handler if any
    if (currentClickHandler) {
        connectButton.removeEventListener('click', currentClickHandler);
        currentClickHandler = null;
    }

    if (isConnected) {
        // Update text and classes
        connectButton.textContent = balance ? `${balance.toFixed(8)} BSV` : 'Connected';
        connectButton.classList.add('connected');
        
        // Set new click handler
        currentClickHandler = onConnectedClick;
    } else {
        // Update text and classes
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
        
        // Set new click handler
        currentClickHandler = onDisconnectedClick;
    }

    // Add the new click handler
    connectButton.addEventListener('click', currentClickHandler);
    console.log('Updated header button with new handler:', currentClickHandler.name);
}

function onDisconnectButtonClick() {
    console.log('Disconnecting wallet...');
    
    // Terminate the current session
    terminateSession();

    // Update UI to disconnected state
    updateHeaderWalletButton(false);

    // Close all modals
    hideModal('mainWalletModal');
    hideModal('walletSelectionModal');
    hideModal('errorModal');
}

// Export functions
export { initializeHeader, updateHeaderWalletButton }; 