import { showModal, hideModal, showError } from '../../modal.js';
import { showMainWallet } from '../modalManager.js';

let isInitialized = false;
let isTransitioning = false;
let hasTransitioned = false;
let setupInProgress = false;
let mainWalletOpenAttempts = 0;
const MAX_REOPEN_ATTEMPTS = 3;

export function initializeSuccessAnimationModal() {
    if (isInitialized || setupInProgress) {
        console.log('Success animation modal already initialized or setup in progress, skipping');
        return;
    }
    setupInProgress = true;
    console.log('initializeSuccessAnimationModal called');
    console.log('Initializing success animation modal...');
    
    const modal = document.getElementById('walletCreatedModal');
    if (!modal) {
        console.error('Success animation modal not found');
        setupInProgress = false;
        return;
    }

    isInitialized = true;
    let transitionTimeout = null;
    let mainWalletCheckInterval = null;

    // Cleanup function to remove event listeners and timeouts
    const cleanup = () => {
        if (transitionTimeout) {
            clearTimeout(transitionTimeout);
            transitionTimeout = null;
        }
        if (mainWalletCheckInterval) {
            clearInterval(mainWalletCheckInterval);
            mainWalletCheckInterval = null;
        }
        modal.removeEventListener('animationend', handleAnimationEnd);
        isTransitioning = false;
        isInitialized = false;
        setupInProgress = false;
        mainWalletOpenAttempts = 0;
    };

    const ensureMainWalletOpen = () => {
        const mainWalletModal = document.getElementById('mainWalletModal');
        if (!mainWalletModal?.classList.contains('open') && mainWalletOpenAttempts < MAX_REOPEN_ATTEMPTS) {
            console.log(`Main wallet modal was closed, reopening... (attempt ${mainWalletOpenAttempts + 1}/${MAX_REOPEN_ATTEMPTS})`);
            mainWalletOpenAttempts++;
            showMainWallet();
        } else if (mainWalletOpenAttempts >= MAX_REOPEN_ATTEMPTS) {
            console.log('Max reopen attempts reached, stopping checks');
            clearInterval(mainWalletCheckInterval);
        }
    };

    // Animation end handler
    const handleAnimationEnd = async (event) => {
        // Only handle events from the modal itself, not children
        if (event.target !== modal) {
            return;
        }

        // If we're already transitioning or have transitioned, skip
        if (isTransitioning || hasTransitioned) {
            console.log('Already transitioning or has transitioned, skipping animation end handler');
            return;
        }
        isTransitioning = true;

        console.log('handleAnimationEnd called');
        console.log('Initial hasTransitioned value:', hasTransitioned);
        
        console.log('Success animation complete');

        try {
            // Get wallet data
            const walletType = sessionStorage.getItem('wallet_type');
            const walletAddress = sessionStorage.getItem('wallet_address');
            const walletInitialized = sessionStorage.getItem('wallet_initialized');

            console.log('Checking wallet data:', {
                type: walletType,
                address: walletAddress,
                initialized: walletInitialized
            });

            // Check if wallet is initialized
            if (!walletInitialized) {
                console.error('Wallet not properly initialized');
                showError('Wallet initialization failed. Please try again.');
                return;
            }

            // Set transition flag
            hasTransitioned = true;
            console.log('Set hasTransitioned to true');
            
            // Clear safety timeout since we're transitioning normally
            if (transitionTimeout) {
                clearTimeout(transitionTimeout);
                transitionTimeout = null;
            }
            
            // Hide success animation
            hideModal('walletCreatedModal');
            
            // Wait for hide animation
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Show main wallet modal and set up monitoring
            showMainWallet();
            
            // Set up interval to check if main wallet modal stays open
            mainWalletCheckInterval = setInterval(ensureMainWalletOpen, 500);
            
            // Clear the interval after 5 seconds
            setTimeout(() => {
                if (mainWalletCheckInterval) {
                    clearInterval(mainWalletCheckInterval);
                    mainWalletCheckInterval = null;
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error in animation end handler:', error);
        } finally {
            // Clean up event listeners and state
            cleanup();
        }
    };

    // Add animation complete handler
    modal.addEventListener('animationend', handleAnimationEnd);
    
    // Add a safety timeout to force transition if animation somehow gets stuck
    transitionTimeout = setTimeout(() => {
        if (!hasTransitioned && !isTransitioning) {
            console.log('Safety timeout forcing transition');
            handleAnimationEnd({ target: modal });
        } else {
            console.log('Safety timeout fired but transition already occurred');
        }
    }, 5000); // 5 second safety timeout
}

// Store the event handler reference so we can remove it later
const walletSetupHandler = (event) => {
    console.log('walletSetupComplete event received:', event.detail);
    if (setupInProgress) {
        console.log('Setup already in progress, skipping...');
        return;
    }
    hasTransitioned = false;
    isTransitioning = false;
    isInitialized = false;
    mainWalletOpenAttempts = 0;
    initializeSuccessAnimationModal();
};

// Remove any existing listeners and add the new one
window._walletSetupListener = walletSetupHandler;
window.removeEventListener('walletSetupComplete', walletSetupHandler);
window.addEventListener('walletSetupComplete', walletSetupHandler);

export function showSuccessAnimation(isExternalWallet = false) {
    if (isExternalWallet) {
        // Skip seed phrase and password setup for external wallets
        setTimeout(() => {
            hideModal('successAnimationModal');
            showModal('mainWalletModal');
        }, 3000);
    } else {
        // ... existing code ...
    }
} 