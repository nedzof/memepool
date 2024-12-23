import { showModal, hideModal, showError } from '../../modal.js';
import { validateMnemonic } from '../mnemonic.js';
import { setupPasswordValidation } from '../passwordSetup.js';
import { BitcoinWallet } from '../bitcoin.js';

// Initialize import seed functionality
export function initializeImportSeed() {
    console.log('Initializing import seed...');
    
    // Initialize modal navigation
    initializeModalNavigation();
    
    // Create the seed phrase grid
    createSeedPhraseGrid();
    
    // Setup form submission
    setupFormSubmission();
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
                       class="seed-word w-full bg-black/20 backdrop-blur-sm rounded-xl p-3 pl-7 text-white font-medium relative z-10 
                              border border-[#14F195]/20 outline-none
                              transition-all duration-300
                              placeholder-[#14F195]/20
                              shadow-[0_0_10px_rgba(20,241,149,0.05)]
                              hover:border-[#14F195]/40 hover:bg-[#14F195]/5
                              hover:shadow-[0_0_15px_rgba(20,241,149,0.15)]
                              focus:border-[#14F195]/60 focus:bg-[#14F195]/10
                              focus:shadow-[0_0_20px_rgba(20,241,149,0.2)]"
                       placeholder="word ${i + 1}"
                       tabindex="${i + 1}">
                <div class="absolute inset-0 rounded-xl bg-gradient-to-b from-[#14F195]/5 to-transparent opacity-0 
                           group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
            </div>
        `).join('');

        // Add input event listeners
        const inputs = seedPhraseInputs.querySelectorAll('input');
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.includes(' ')) {
                    e.target.value = e.target.value.replace(/\s+/g, '');
                }
                if (e.target.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
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
                            .replace(/[\n\r\t,]+/g, ' ') // Replace newlines, tabs, commas with spaces
                            .trim()
                            .split(/\s+/)
                            .filter(word => word.length > 0);

                        // If we got exactly one word, try to split it into 12 parts
                        if (words.length === 1 && words[0].length >= 24) {
                            words = words[0].match(/.{1,8}/g) || [];
                        }

                        // Take first 12 words
                        words = words.slice(0, 12);

                        // Fill in the inputs
                        inputs.forEach((input, index) => {
                            if (words[index]) {
                                input.value = words[index];
                                input.classList.add('animate-fill');
                                setTimeout(() => input.classList.remove('animate-fill'), 800);
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
                // Validate seed phrase
                const isValid = await validateMnemonic(seedPhrase);
                if (!isValid) {
                    throw new Error('Invalid seed phrase');
                }

                // Store seed phrase temporarily
                sessionStorage.setItem('temp_mnemonic', seedPhrase);

                // Create temporary wallet to get details
                const tempWallet = new BitcoinWallet();
                const password = sessionStorage.getItem('temp_password');
                if (!password) {
                    throw new Error('Password not set');
                }

                const walletDetails = await tempWallet.generateNewWallet(password, seedPhrase);

                // Store wallet details for confirmation
                sessionStorage.setItem('temp_wallet_details', JSON.stringify({
                    address: walletDetails.address,
                    publicKey: walletDetails.publicKey,
                    balance: walletDetails.balance
                }));

                // Show confirmation modal
                hideModal('importSeedModal');
                showImportConfirmation();
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

// Show import confirmation
function showImportConfirmation() {
    try {
        const walletDetails = JSON.parse(sessionStorage.getItem('temp_wallet_details'));
        if (!walletDetails) {
            throw new Error('Wallet details not found');
        }

        // Update confirmation modal with wallet details
        document.getElementById('walletAddress').textContent = walletDetails.address;
        document.getElementById('publicKey').textContent = walletDetails.publicKey;
        document.getElementById('walletBalance').textContent = `${walletDetails.balance} BTC`;

        // Setup confirmation buttons
        setupConfirmationButtons();

        // Show confirmation modal
        showModal('importSeedConfirmationModal');
    } catch (error) {
        console.error('Error showing confirmation:', error);
        showError(error.message);
    }
}

// Setup confirmation buttons
function setupConfirmationButtons() {
    const cancelButton = document.getElementById('cancelImport');
    const confirmButton = document.getElementById('confirmImport');

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            clearImportData();
            hideModal('importSeedConfirmationModal');
            showModal('walletSelectionModal');
        });
    }

    if (confirmButton) {
        confirmButton.addEventListener('click', async () => {
            try {
                const mnemonic = sessionStorage.getItem('temp_mnemonic');
                const password = sessionStorage.getItem('temp_password');

                if (!mnemonic || !password) {
                    throw new Error('Missing required data for import');
                }

                // Create final wallet instance
                const wallet = new BitcoinWallet();
                const result = await wallet.generateNewWallet(password, mnemonic);

                if (!result || !result.publicKey) {
                    throw new Error('Failed to import wallet');
                }

                // Clear temporary data
                clearImportData();

                // Show success modal and redirect to main wallet
                hideModal('importSeedConfirmationModal');
                showModal('successAnimationModal');
                setTimeout(() => {
                    hideModal('successAnimationModal');
                    showModal('mainWalletModal');
                }, 2000);
            } catch (error) {
                console.error('Error confirming import:', error);
                showError(error.message);
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