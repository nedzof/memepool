import { showModal, hideModal } from '../../modal.js';

export function initializeSuccessAnimationModal() {
    console.log('Initializing success animation modal...');
    
    const modal = document.getElementById('walletCreatedModal');
    if (!modal) {
        console.error('Success animation modal not found');
        return;
    }

    // Track if transition has already occurred
    let hasTransitioned = false;

    // Add animation complete handler
    modal.addEventListener('animationend', () => {
        // Prevent multiple transitions
        if (hasTransitioned) {
            return;
        }
        
        console.log('Success animation complete');
        
        // Check wallet data
        const walletType = sessionStorage.getItem('wallet_type');
        const walletAddress = sessionStorage.getItem('wallet_address');
        const isInitialized = sessionStorage.getItem('wallet_initialized') === 'true';
        
        console.log('Checking wallet data:', {
            type: walletType,
            address: walletAddress,
            initialized: isInitialized
        });

        if (!walletType || !walletAddress || !isInitialized) {
            console.error('Missing wallet data');
            return;
        }

        // Set transition flag
        hasTransitioned = true;

        // Hide success animation
        hideModal('walletCreatedModal');
        
        // Show main wallet modal with correct ID
        showModal('mainWalletModal');
        
        // Clear initialization flags
        sessionStorage.removeItem('wallet_initialized');
        sessionStorage.removeItem('temp_password');
        sessionStorage.removeItem('temp_mnemonic');
        sessionStorage.removeItem('wallet_flow');
        
        console.log('Transitioned to main wallet view');
    });

    // Reset transition flag when modal is shown
    modal.addEventListener('show.bs.modal', () => {
        hasTransitioned = false;
    });
} 