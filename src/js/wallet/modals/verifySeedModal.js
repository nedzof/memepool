import { showModal, hideModal, showError } from '../../modal.js';
import { validateMnemonic, validateMnemonicRandomness } from '../mnemonic.js';

// Initialize verify seed modal
export function initializeVerifySeedModal() {
    console.log('Initializing verify seed modal...');
    
    const verifyForm = document.getElementById('verifySeedForm');
    if (!verifyForm) {
        console.error('Verify seed form not found');
        return;
    }

    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Verify seed form submitted');

        try {
            const inputs = verifyForm.querySelectorAll('.verify-word');
            const verifiedPhrase = Array.from(inputs)
                .map(input => input.value.trim().toLowerCase())
                .join(' ');

            const originalPhrase = sessionStorage.getItem('temp_mnemonic');
            
            if (verifiedPhrase !== originalPhrase) {
                throw new Error('Seed phrase verification failed. Please try again.');
            }

            console.log('Seed phrase verified successfully');
            
            // Hide verify modal and show success animation
            hideModal('verifySeedModal');
            showModal('walletCreatedModal');

        } catch (error) {
            console.error('Error in verify seed:', error);
            const errorDiv = document.getElementById('verifySeedError');
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            }
        }
    });
}

// Initialize when the modal is shown
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOMContentLoaded event fired in verify seed modal ===');
    const modal = document.getElementById('verifySeedModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', () => {
            console.log('Verify seed modal shown, initializing...');
            initializeVerifySeedModal();
        });
    }
}); 