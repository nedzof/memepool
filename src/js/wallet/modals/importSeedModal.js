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
                const word = e.target.value.toLowerCase().trim();
                
                // Validate against BIP39 wordlist if word is complete
                if (word && !word.endsWith(' ') && !bip39.wordlists.english.includes(word)) {
                    input.classList.add('invalid');
                    const errorDiv = document.getElementById('seedPhraseError');
                    if (errorDiv) {
                        errorDiv.textContent = `"${word}" is not a valid BIP39 word`;
                        errorDiv.classList.remove('hidden');
                    }
                } else {
                    input.classList.remove('invalid');
                    const errorDiv = document.getElementById('seedPhraseError');
                    if (errorDiv) {
                        errorDiv.classList.add('hidden');
                    }
                }

                // Move to next input if space or comma is typed
                if (e.target.value.includes(' ') || e.target.value.includes(',')) {
                    const words = e.target.value
                        .toLowerCase()
                        .replace(/[,]+/g, ' ')
                        .trim()
                        .split(/\s+/)
                        .filter(word => word.length > 0);
                    
                    if (words.length > 0) {
                        // Validate first word against BIP39 wordlist
                        const firstWord = words[0];
                        if (!bip39.wordlists.english.includes(firstWord)) {
                            input.classList.add('invalid');
                            const errorDiv = document.getElementById('seedPhraseError');
                            if (errorDiv) {
                                errorDiv.textContent = `"${firstWord}" is not a valid BIP39 word`;
                                errorDiv.classList.remove('hidden');
                            }
                            return;
                        }
                        
                        e.target.value = firstWord;
                        input.classList.remove('invalid');
                        
                        // Fill subsequent inputs if there are more words
                        words.slice(1).forEach((word, wordIndex) => {
                            const targetIndex = index + wordIndex + 1;
                            if (targetIndex < inputs.length) {
                                // Validate each word against BIP39 wordlist
                                if (!bip39.wordlists.english.includes(word)) {
                                    const errorDiv = document.getElementById('seedPhraseError');
                                    if (errorDiv) {
                                        errorDiv.textContent = `"${word}" is not a valid BIP39 word`;
                                        errorDiv.classList.remove('hidden');
                                    }
                                    return;
                                }
                                
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
                    let text = '';
                    
                    // Try multiple clipboard access methods
                    const methods = [
                        // Method 1: Modern Clipboard API
                        async () => {
                            if (!navigator.clipboard) {
                                throw new Error('Clipboard API not available');
                            }
                            return await navigator.clipboard.readText();
                        },
                        
                        // Method 2: execCommand paste
                        async () => {
                            const textarea = document.createElement('textarea');
                            textarea.style.cssText = 'position:fixed;pointer-events:none;opacity:0;';
                            document.body.appendChild(textarea);
                            textarea.focus();
                            
                            const successful = document.execCommand('paste');
                            const text = textarea.value;
                            document.body.removeChild(textarea);
                            
                            if (!successful || !text) {
                                throw new Error('execCommand paste failed');
                            }
                            return text;
                        },
                        
                        // Method 3: Input paste event
                        async () => {
                            return new Promise((resolve, reject) => {
                                const input = document.createElement('input');
                                input.style.cssText = 'position:fixed;pointer-events:none;opacity:0;';
                                document.body.appendChild(input);
                                
                                const cleanup = () => {
                                    input.removeEventListener('paste', handler);
                                    document.body.removeChild(input);
                                };
                                
                                const handler = (e) => {
                                    const text = e.clipboardData.getData('text');
                                    cleanup();
                                    if (!text) {
                                        reject(new Error('No text in clipboard'));
                                    } else {
                                        resolve(text);
                                    }
                                };
                                
                                input.addEventListener('paste', handler);
                                input.focus();
                                document.execCommand('paste');
                                
                                // Cleanup if paste event doesn't fire
                                setTimeout(() => {
                                    cleanup();
                                    reject(new Error('Paste timeout'));
                                }, 1000);
                            });
                        }
                    ];
                    
                    // Try each method in sequence until one works
                    let lastError;
                    for (const method of methods) {
                        try {
                            text = await method();
                            if (text) break;
                        } catch (e) {
                            console.warn('Clipboard method failed:', e);
                            lastError = e;
                        }
                    }
                    
                    if (!text) {
                        throw new Error('Could not access clipboard. Please try copying your seed phrase again, or type it manually.');
                    }

                    // Clean and validate the text
                    const words = text
                        .toLowerCase()
                        .replace(/\d+\.?\s*/g, '') // Remove numbers with dots
                        .replace(/[\n\r\t,]+/g, ' ') // Replace newlines and tabs
                        .trim()
                        .split(/\s+/)
                        .filter(word => word.length > 0);

                    if (words.length === 0) {
                        throw new Error('No valid words found in clipboard');
                    }

                    // Validate all words against BIP39 wordlist before filling
                    const invalidWords = words.filter(word => !bip39.wordlists.english.includes(word));
                    if (invalidWords.length > 0) {
                        throw new Error(`Invalid BIP39 words: ${invalidWords.join(', ')}`);
                    }

                    // Fill in the inputs with animation
                    const inputs = document.querySelectorAll('.seed-word');
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
                    const nextEmptyInput = Array.from(inputs).find(input => !input.value) || inputs[inputs.length - 1];
                    nextEmptyInput.focus();

                    // Show success feedback
                    pasteButton.classList.add('success');
                    setTimeout(() => pasteButton.classList.remove('success'), 2000);

                } catch (error) {
                    console.error('Paste error:', error);
                    const errorDiv = document.getElementById('seedPhraseError');
                    if (errorDiv) {
                        errorDiv.textContent = error.message || 'Failed to paste. Please try typing manually.';
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
                console.log('Validating seed phrase:', seedPhrase);
                const isValid = await validateMnemonic(seedPhrase);
                console.log('Validation result:', isValid);
                if (!isValid) {
                    // Check if all words are in BIP39 wordlist
                    const words = seedPhrase.split(' ');
                    const invalidWords = words.filter(word => !bip39.wordlists.english.includes(word));
                    if (invalidWords.length > 0) {
                        throw new Error(`Invalid words in seed phrase: ${invalidWords.join(', ')}`);
                    }
                    throw new Error('Invalid seed phrase');
                }

                // Additional security checks for randomness
                await validateMnemonicRandomness(seedPhrase);

                // Store seed phrase and mark flow type
                console.log('Storing seed phrase and setting flow type...');
                sessionStorage.setItem('temp_mnemonic', seedPhrase);
                sessionStorage.setItem('wallet_flow', 'import');

                // Verify session storage
                const storedMnemonic = sessionStorage.getItem('temp_mnemonic');
                const storedPassword = sessionStorage.getItem('temp_password');
                const storedFlow = sessionStorage.getItem('wallet_flow');
                console.log('Session storage check:', {
                    hasMnemonic: !!storedMnemonic,
                    hasPassword: !!storedPassword,
                    flowType: storedFlow
                });

                if (!storedMnemonic || !storedPassword) {
                    throw new Error('Missing required data in session storage');
                }

                // Hide import modal and show success animation
                console.log('Showing success animation modal...');
                hideModal('importSeedModal');
                showModal('walletCreatedModal');
                
                // Start wallet setup process
                console.log('Starting wallet setup process...');
                if (typeof window.startWalletSetup === 'function') {
                    window.startWalletSetup().catch(error => {
                        console.error('Error in wallet setup:', error);
                        showError('Failed to setup wallet');
                    });
                } else {
                    console.error('Wallet setup function not found');
                    showError('Failed to initialize wallet setup');
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