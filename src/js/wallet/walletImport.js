import { showModal, hideModal, showWalletError } from './modalManager.js';
import { validateMnemonic, encryptMnemonic } from './mnemonic.js';
import { setupPasswordValidation } from './walletGeneration.js';

// Initialize import wallet functionality
export function initializeImportWallet() {
    const importWalletModal = document.getElementById('importWalletModal');
    const passwordSetupModal = document.getElementById('passwordSetupModal');
    const seedPhraseInputs = document.getElementById('seedPhraseInputs');
    const importWalletForm = document.getElementById('importWalletForm');
    const confirmImportBtn = document.getElementById('confirmImport');

    let seedPhrase = ''; // Store the seed phrase temporarily

    // Setup navigation buttons
    const backButtons = document.querySelectorAll('.back-to-menu');
    const closeButtons = document.querySelectorAll('.close-modal');

    backButtons.forEach(btn => {
        btn.className = 'back-to-menu flex items-center gap-2 text-[#14F195]/70 hover:text-[#14F195] transition-colors duration-300 group';
        btn.innerHTML = `
            <svg class="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span class="text-sm font-medium">Back</span>
        `;
        btn.addEventListener('click', () => {
            hideModal('importWalletModal');
            hideModal('seedPhraseModal');
            hideModal('passwordSetupModal');
            showModal('initialSetupModal');
        });
    });

    closeButtons.forEach(btn => {
        btn.className = 'close-modal p-2 rounded-lg text-[#14F195]/70 hover:text-[#14F195] hover:bg-[#14F195]/10 transition-all duration-300';
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `;
        btn.addEventListener('click', () => {
            hideModal('importWalletModal');
            hideModal('seedPhraseModal');
            hideModal('passwordSetupModal');
            showModal('initialSetupModal');
        });
    });

    // Create the seed phrase grid
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

    // Handle form submissions
    if (importWalletForm) {
        importWalletForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            seedPhrase = Array.from(seedInputs)
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
                setupPasswordValidation();
            } catch (error) {
                console.error('Error initializing import wallet:', error);
                showWalletError(error.message);
                showWalletSelection();  // Use the new wallet selection modal
            }
        });
    }

    // Enable/disable import button based on form completion
    function checkSeedPhraseCompletion() {
        const allWordsEntered = Array.from(seedInputs).every(input => input.value.trim());
        if (confirmImportBtn) {
            confirmImportBtn.disabled = !allWordsEntered;
        }
    }
} 