import { showModal, hideModal, initializeModal, showError } from '../modal.js';
import { validateMnemonic } from './mnemonic.js';
import { setupPasswordValidation } from './passwordSetup.js';
import { initializeSeedPhraseModal } from './modals/seedPhraseModal.js';

// Initialize import wallet functionality
export function initializeImportWallet() {
    console.log('Initializing import wallet...');
    
    // Initialize import wallet modal
    initializeModal('importWalletModal', {
        backTo: 'walletSelectionModal',
        onBack: () => {
            // Clear any entered seed phrase
            const seedInputs = document.querySelectorAll('.seed-word');
            seedInputs.forEach(input => input.value = '');
        }
    });

    // Create the seed phrase grid
    const seedPhraseInputs = document.getElementById('seedPhraseInputs');
    if (seedPhraseInputs) {
        seedPhraseInputs.innerHTML = Array.from({ length: 12 }, (_, i) => `
            <div class="relative group">
                <span class="absolute top-1 left-2 text-xs text-[#14F195] z-20">${i + 1}</span>
                <input type="text" 
                       class="seed-word w-full bg-[#0F1825] rounded-lg p-4 pt-6 text-white text-center font-medium relative z-10 
                              border border-[#14F195]/30 focus:border-[#14F195] outline-none transition-all duration-300
                              group-hover:border-[#14F195]/50 group-hover:shadow-[0_0_15px_rgba(20,241,149,0.15)]
                              focus:shadow-[0_0_20px_rgba(20,241,149,0.3)] focus:bg-[#0F1825]/80"
                       placeholder="Enter word ${i + 1}">
                <div class="absolute inset-0 rounded-lg bg-gradient-to-r from-[#14F195]/5 to-[#14F195]/10 opacity-0 
                            group-hover:opacity-100 transition-all duration-300"></div>
                <div class="absolute inset-0 rounded-lg bg-[#14F195]/5 opacity-0 group-hover:opacity-100 
                            blur-xl transition-all duration-300"></div>
            </div>
        `).join('');
    }

    // Handle seed phrase input navigation
    const seedInputs = document.querySelectorAll('.seed-word');
    seedInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.includes(' ')) {
                // Handle pasting multiple words
                const words = e.target.value.trim().split(/\s+/);
                words.forEach((word, wordIndex) => {
                    if (seedInputs[index + wordIndex]) {
                        seedInputs[index + wordIndex].value = word;
                    }
                });
                // Focus next empty input or last input
                const nextEmpty = Array.from(seedInputs).find((input, i) => i > index && !input.value);
                if (nextEmpty) nextEmpty.focus();
                else seedInputs[seedInputs.length - 1].focus();
            } else if (e.target.value) {
                // Move to next input after typing a word
                if (index < seedInputs.length - 1) {
                    seedInputs[index + 1].focus();
                }
            }
            checkSeedPhraseCompletion();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                // Move to previous input when backspacing an empty input
                seedInputs[index - 1].focus();
            }
        });
    });

    // Handle form submission
    const importWalletForm = document.getElementById('importWalletForm');
    if (importWalletForm) {
        importWalletForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const seedPhrase = Array.from(seedInputs)
                .map(input => input.value.trim().toLowerCase())
                .join(' ');

            try {
                // Validate seed phrase
                const isValid = await validateMnemonic(seedPhrase);
                if (!isValid) {
                    throw new Error('Invalid seed phrase');
                }

                // Store seed phrase temporarily
                sessionStorage.setItem('temp_mnemonic', seedPhrase);

                // Hide import modal and show password setup modal
                hideModal('importWalletModal');
                showModal('passwordSetupModal');

                // Initialize password validation
                setupPasswordValidation(() => {
                    showModal('seedPhraseModal');
                    initializeSeedPhraseModal();
                });
            } catch (error) {
                console.error('Error initializing import wallet:', error);
                showError(error.message);
                showModal('walletSelectionModal');
            }
        });
    }
}

// Enable/disable import button based on form completion
function checkSeedPhraseCompletion() {
    const seedInputs = document.querySelectorAll('.seed-word');
    const confirmImportBtn = document.getElementById('confirmImport');
    const allWordsEntered = Array.from(seedInputs).every(input => input.value.trim());
    
    if (confirmImportBtn) {
        confirmImportBtn.disabled = !allWordsEntered;
    }
} 