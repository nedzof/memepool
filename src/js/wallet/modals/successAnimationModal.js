import { showModal, hideModal } from '../../modal.js';

export function initializeSuccessAnimationModal() {
    console.log('initializeSuccessAnimationModal called');
    console.log('Initializing success animation modal...');
    
    const modal = document.getElementById('walletCreatedModal');
    if (!modal) {
        console.error('Success animation modal not found');
        return;
    }

    // Track if transition has already occurred
    let hasTransitioned = false;
    let transitionTimeout = null;

    // Cleanup function to remove event listeners
    const cleanup = () => {
        if (transitionTimeout) {
            clearTimeout(transitionTimeout);
        }
        modal.removeEventListener('animationend', handleAnimationEnd);
    };

    // Animation end handler
    const handleAnimationEnd = async () => {
        console.log('handleAnimationEnd called');

        console.log('Initial hasTransitioned value:', hasTransitioned);

        console.log('Success animation complete');
        
        // Check wallet data with detailed logging
        const walletType = sessionStorage.getItem('wallet_type');
        const walletAddress = sessionStorage.getItem('wallet_address');
        const walletInitialized = sessionStorage.getItem('wallet_initialized');
        
        console.log('Checking wallet data:', {
            type: walletType,
            address: walletAddress,
            initialized: walletInitialized
        });

        // Validate all required data is present
        const requiredData = ['wallet_type', 'wallet_address', 'wallet_initialized'];
        for (const key of requiredData) {
            if (!sessionStorage.getItem(key)) {
                console.error(`Missing required session data: ${key}`);
                try {
                    // Try to retrieve the missing data
                    await retrieveWalletData();
                } catch (err) {
                    console.error('Failed to retrieve wallet data:', err);
                    showError('Wallet data is incomplete. Please try again.');
                    cleanup();
                    return;
                }
            }
        }

        // Prevent multiple transitions
        if (hasTransitioned) {
            console.log('Returning early due to hasTransitioned being true');
            cleanup();
            return;
        }

        // More lenient validation - only check if wallet is initialized
        if (!walletInitialized) {
            console.error('Wallet not properly initialized');
            showError('Wallet initialization failed. Please try again.');
            cleanup();
            return;
        }

        // Set transition flag
        hasTransitioned = true;
        console.log('Set hasTransitioned to true');
        
        // Hide success animation
        hideModal('walletCreatedModal');
        
        // Show main wallet modal with correct ID
        showModal('mainWalletModal');
        
        // Clean up event listeners
        cleanup();
    };

    // Add animation complete handler
    modal.addEventListener('animationend', handleAnimationEnd);
    
    // Add a safety timeout to force transition if animation somehow gets stuck
    transitionTimeout = setTimeout(() => {
        if (!hasTransitioned) {
            console.log('Safety timeout forcing transition');
            handleAnimationEnd();
        }
    }, 5000); // 5 second safety timeout
} 

// Initialize success modal when wallet setup completes
window.addEventListener('walletSetupComplete', (event) => {
    console.log('walletSetupComplete event received:', event.detail);
    initializeSuccessAnimationModal();
}); 

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