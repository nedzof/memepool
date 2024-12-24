import { showModal, hideModal, showError } from '../../modal.js';
import { validateMnemonic, validateMnemonicRandomness } from '../mnemonic.js';
import { setupPasswordValidation } from '../passwordSetup.js';
import { BitcoinWallet } from '../bitcoin.js';
import { validateWalletProperties, validatePublicKey } from '../validation.js';

let isInitialized = false;

// Initialize import seed functionality
export function initializeImportSeed() {
    if (isInitialized) {
        console.log('Import seed already initialized, skipping...');
        return;
    }
    
    console.log('Initializing import seed...');
    
    // Initialize modal navigation
    initializeModalNavigation();
    
    // Create the seed phrase grid
    createSeedPhraseGrid();
    
    // Setup form submission
    setupFormSubmission();

    // Mark as initialized
    isInitialized = true;

    // Add cleanup when modal is closed
    const modal = document.getElementById('importSeedModal');
    if (modal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    // Check if modal is being hidden
                    if (modal.style.display === 'none') {
                        clearSeedInputs();
                        clearImportData();
                        isInitialized = false;
                        observer.disconnect();
                    }
                }
            });
        });
        
        observer.observe(modal, { attributes: true });
    }
}

// Initialize modal navigation
function initializeModalNavigation() {
    const backButton = document.querySelector('#importSeedModal .back-to-menu');
    if (backButton) {
        backButton.addEventListener('click', () => {
            clearSeedInputs();
            hideModal('importSeedModal');
            showModal('walletSelectionModal');
        });
    }
}

// Create seed phrase input grid
function createSeedPhraseGrid() {
    const seedPhraseInputs = document.getElementById('seedPhraseInputs');
    if (seedPhraseInputs) {
        seedPhraseInputs.innerHTML = Array.from({ length: 12 }, (_, i) => `
            <div class="relative group">
                <span class="absolute top-2 left-2 text-xs text-[#14F195] font-medium z-20">${i + 1}</span>
                <input type="text" 
                       class="seed-word w-full bg-transparent rounded-xl p-3 pl-7 text-[#14F195] font-medium relative z-10 
                              border border-[#14F195]/20 outline-none
                              transition-all duration-300
                              placeholder-[#14F195]/20
                              shadow-[0_0_10px_rgba(20,241,149,0.05)]
                              hover:border-[#14F195]/40 hover:bg-[#14F195]/5
                              hover:shadow-[0_0_15px_rgba(20,241,149,0.15)]
                              focus:border-[#14F195] focus:bg-[#14F195]/10
                              focus:shadow-[0_0_20px_rgba(20,241,149,0.3)]"
                       placeholder="Enter word ${i + 1}"
                       autocomplete="off"
                       spellcheck="false"
                       tabindex="${i + 1}">
                <div class="absolute inset-0 rounded-xl bg-gradient-to-b from-[#14F195]/5 to-transparent opacity-0 
                           group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
                <div class="absolute inset-0 rounded-xl bg-[#14F195]/5 opacity-0 group-hover:opacity-100 
                           blur-xl transition-all duration-300 pointer-events-none"></div>
            </div>
        `).join('');

        // Add input event listeners
        const inputs = seedPhraseInputs.querySelectorAll('input');
        inputs.forEach((input, index) => {
            // Handle paste event
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                if (pastedText) {
                    // Clean up the text: remove numbers, newlines, and extra spaces
                    const cleanedText = pastedText
                        .replace(/\d+\.?\s*/g, '') // Remove numbers with or without dots
                        .replace(/[\n\r\t,]+/g, ' ') // Replace newlines and tabs with spaces
                        .toLowerCase()
                        .trim()
                        .split(/\s+/)
                        .filter(word => word.length > 0);

                    // Fill in the inputs starting from the current input
                    cleanedText.forEach((word, wordIndex) => {
                        const targetIndex = index + wordIndex;
                        if (targetIndex < inputs.length) {
                            inputs[targetIndex].value = word;
                            inputs[targetIndex].classList.add('animate-fill');
                            setTimeout(() => inputs[targetIndex].classList.remove('animate-fill'), 800);
                        }
                    });

                    // Focus the next empty input or the last one
                    const nextEmptyInput = Array.from(inputs).find((input, i) => i > index && !input.value) || inputs[11];
                    nextEmptyInput.focus();
                }
            });

            // Handle regular input
            input.addEventListener('input', (e) => {
                // Move to next input if space or comma is typed
                if (e.target.value.includes(' ') || e.target.value.includes(',')) {
                    const words = e.target.value
                        .toLowerCase()
                        .replace(/[,]+/g, ' ')
                        .trim()
                        .split(/\s+/)
                        .filter(word => word.length > 0);
                    
                    if (words.length > 0) {
                        e.target.value = words[0];
                        
                        // Fill subsequent inputs if there are more words
                        words.slice(1).forEach((word, wordIndex) => {
                            const targetIndex = index + wordIndex + 1;
                            if (targetIndex < inputs.length) {
                                inputs[targetIndex].value = word;
                                inputs[targetIndex].classList.add('animate-fill');
                                setTimeout(() => inputs[targetIndex].classList.remove('animate-fill'), 800);
                            }
                        });
                    }

                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                }
                
                // Add animation when word is entered
                if (e.target.value) {
                    e.target.classList.add('animate-fill');
                    setTimeout(() => e.target.classList.remove('animate-fill'), 800);
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                } else if (e.key === 'Enter' && e.target.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
        });

        // Setup clipboard paste button
        const pasteButton = document.getElementById('pasteFromClipboard');
        if (pasteButton) {
            pasteButton.onclick = async function() {
                try {
                    // Try to get clipboard text
                    let text = '';
                    try {
                        text = await navigator.clipboard.readText();
                    } catch (err) {
                        // Fallback to execCommand
                        const textarea = document.createElement('textarea');
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        document.execCommand('paste');
                        text = textarea.value;
                        document.body.removeChild(textarea);
                    }

                    if (text) {
                        // Split text into words, handling multiple formats
                        let words = text
                            .toLowerCase()
                            .replace(/[\n\r\t,]+/g, ' ')
                            .trim()
                            .split(/\s+/)
                            .filter(word => word.length > 0);

                        // Fill in the inputs
                        inputs.forEach((input, index) => {
                            if (words[index]) {
                                input.value = words[index];
                                input.classList.add('animate-fill');
                                setTimeout(() => input.classList.remove('animate-fill'), 800);
                            } else {
                                input.value = '';
                            }
                        });

                        // Focus the next empty input or the last one
                        const nextEmptyInput = Array.from(inputs).find(input => !input.value) || inputs[11];
                        nextEmptyInput.focus();
                    }
                } catch (error) {
                    console.error('Paste error:', error);
                    const errorDiv = document.getElementById('seedPhraseError');
                    if (errorDiv) {
                        errorDiv.textContent = 'Failed to paste. Please try typing manually.';
                        errorDiv.classList.remove('hidden');
                        setTimeout(() => errorDiv.classList.add('hidden'), 3000);
                    }
                }
            };
        }
    }
}

// Setup form submission
function setupFormSubmission() {
    const importSeedForm = document.getElementById('importSeedForm');
    if (importSeedForm) {
        importSeedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const seedInputs = document.querySelectorAll('.seed-word');
            const seedPhrase = Array.from(seedInputs)
                .map(input => input.value.trim().toLowerCase())
                .join(' ');

            try {
                // Initial seed phrase validation
                const isValid = await validateMnemonic(seedPhrase);
                if (!isValid) {
                    throw new Error('Invalid seed phrase');
                }

                // Additional security checks for randomness
                await validateMnemonicRandomness(seedPhrase);

                // Store seed phrase temporarily
                sessionStorage.setItem('temp_mnemonic', seedPhrase);

                // Create temporary wallet to get details
                const tempWallet = new BitcoinWallet();
                const password = sessionStorage.getItem('temp_password');
                if (!password) {
                    throw new Error('Password not set');
                }

                const walletDetails = await tempWallet.generateNewWallet(password, seedPhrase);

                // Validate wallet properties
                await validateWalletProperties({
                    publicKey: walletDetails.publicKey,
                    legacyAddress: walletDetails.address,
                    connectionType: 'imported',
                    balance: walletDetails.balance
                });

                // Validate public key
                await validatePublicKey(walletDetails.publicKey);

                // Store wallet details for later use
                sessionStorage.setItem('temp_wallet_details', JSON.stringify({
                    address: walletDetails.address,
                    publicKey: walletDetails.publicKey,
                    balance: walletDetails.balance
                }));

                // Hide import modal and show success animation
                hideModal('importSeedModal');
                showModal('walletCreatedModal');

                // Update success modal text
                const title = document.querySelector('#walletCreatedModal .modal-title');
                const message = document.querySelector('#walletCreatedModal .text-white\\/80');
                
                if (title) title.innerHTML = 'Validating Wallet...<br><br><br>';
                if (message) message.textContent = 'Please wait while we validate your wallet';
                
                // Add continue button after all validations are complete
                const modalBody = document.querySelector('#walletCreatedModal .modal-body');
                if (modalBody) {
                    const continueBtn = document.createElement('button');
                    continueBtn.id = 'continueToWalletBtn';
                    continueBtn.className = 'w-full py-3 px-4 rounded-xl bg-[#00ffa3] text-black font-bold ' +
                                          'hover:bg-[#00ffa3]/90 transition-all';
                    continueBtn.textContent = 'Continue to Wallet';
                    
                    continueBtn.addEventListener('click', () => {
                        hideModal('walletCreatedModal');
                        showMainWallet();
                    });
                    
                    modalBody.appendChild(continueBtn);

                    // Update success message
                    if (title) title.innerHTML = 'Wallet Ready!<br><br><br>';
                    if (message) message.textContent = 'Your wallet has been imported successfully';
                }

            } catch (error) {
                console.error('Error in import seed:', error);
                const errorDiv = document.getElementById('seedPhraseError');
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                }
            }
        });
    }
}

// Clear temporary data
function clearImportData() {
    sessionStorage.removeItem('temp_mnemonic');
    sessionStorage.removeItem('temp_password');
    sessionStorage.removeItem('temp_wallet_details');
}

// Clear seed inputs
function clearSeedInputs() {
    const seedInputs = document.querySelectorAll('.seed-word');
    seedInputs.forEach(input => input.value = '');
    const errorDiv = document.getElementById('seedPhraseError');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}