import { showModal, hideModal, showWalletError, showMainWallet } from './modalManager.js';
import { generateMnemonic } from '../bsv.js';
import BSVWallet from '../BSVWallet.js';

// Generate new wallet
export async function generateNewWallet() {
    try {
        // Generate new mnemonic
        const mnemonic = await generateMnemonic();
        
        // Store mnemonic temporarily
        sessionStorage.setItem('temp_mnemonic', mnemonic);
        
        // Display seed phrase in grid
        displaySeedPhrase(mnemonic);
        
        // Setup event listeners
        setupSeedPhraseEvents();
        
        return true;
    } catch (error) {
        console.error('Error generating wallet:', error);
        showWalletError('Failed to generate wallet. Please try again.');
        return false;
    }
}

// Display seed phrase
function displaySeedPhrase(mnemonic) {
    const seedPhraseContainer = document.getElementById('seedPhrase');
    const words = mnemonic.split(' ');
    
    // Add opacity-0 class to hide the seed phrase initially
    seedPhraseContainer.classList.add('opacity-0');
    
    seedPhraseContainer.innerHTML = words.map((word, index) => `
        <div class="relative p-2 rounded-lg bg-gradient-to-r from-[#00ffa3]/10 to-[#00ffff]/10 hover:from-[#00ffa3]/20 hover:to-[#00ffff]/20 transition-all duration-300 group">
            <span class="absolute top-1 left-2 text-xs text-[#00ffa3]/50">${index + 1}</span>
            <span class="block text-center text-[#00ffa3] text-sm mt-1 seed-word">${word}</span>
        </div>
    `).join('');
}

// Setup seed phrase events
function setupSeedPhraseEvents() {
    // Reveal seed phrase
    const revealBtn = document.getElementById('revealSeedPhrase');
    const blurOverlay = document.getElementById('seedPhraseBlur');
    const seedPhraseContainer = document.getElementById('seedPhrase');
    const continueBtn = document.getElementById('continueToPassword');
    const seedConfirmCheckbox = document.getElementById('seedConfirm');
    
    if (revealBtn && blurOverlay && seedPhraseContainer) {
        revealBtn.addEventListener('click', () => {
            blurOverlay.style.opacity = '0';
            // Show the seed phrase with transition
            seedPhraseContainer.classList.remove('opacity-0');
            setTimeout(() => {
                blurOverlay.style.display = 'none';
            }, 300);
        });
    }

    // Enable/disable continue button based on checkbox
    if (seedConfirmCheckbox && continueBtn) {
        seedConfirmCheckbox.addEventListener('change', () => {
            continueBtn.disabled = !seedConfirmCheckbox.checked;
        });
    }

    // Continue to password setup
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            if (!continueBtn.disabled) {
                hideModal('seedPhraseModal');
                showModal('passwordSetupModal');
                setupPasswordValidation();
            }
        });
    }

    // Copy seed phrase
    const copyBtn = document.getElementById('copySeedPhrase');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const mnemonic = sessionStorage.getItem('temp_mnemonic');
            if (mnemonic) {
                try {
                    await navigator.clipboard.writeText(mnemonic);
                    copyBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Copied!
                    `;
                    setTimeout(() => {
                        copyBtn.innerHTML = `
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            Copy Seed Phrase
                        `;
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy seed phrase:', error);
                }
            }
        });
    }

    // Setup seed phrase input boxes
    const seedPhraseInputs = document.getElementById('seedPhraseInputs');
    if (seedPhraseInputs) {
        // Create 12 input boxes
        seedPhraseInputs.innerHTML = Array.from({ length: 12 }, (_, i) => `
            <div class="relative">
                <span class="absolute top-1 left-2 text-xs text-[#00ffa3]/50">${i + 1}</span>
                <input type="password" 
                       class="w-full bg-black/30 rounded-lg p-4 pt-6 text-white text-center font-medium relative z-10 seed-input"
                       data-index="${i}"
                       placeholder="●●●●">
                <div class="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00ffa3]/10 to-[#00ffff]/10 opacity-10"></div>
            </div>
        `).join('');

        // Add event listeners to handle input navigation
        const inputs = seedPhraseInputs.querySelectorAll('input');
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.includes(' ')) {
                    // If pasting multiple words
                    const words = e.target.value.trim().split(/\s+/);
                    words.forEach((word, wordIndex) => {
                        if (inputs[index + wordIndex]) {
                            inputs[index + wordIndex].value = word;
                        }
                    });
                    // Focus next empty input or last input
                    const nextEmpty = Array.from(inputs).find((input, i) => i > index && !input.value);
                    if (nextEmpty) nextEmpty.focus();
                    else inputs[inputs.length - 1].focus();
                } else if (e.target.value) {
                    // Move to next input after typing a word
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    // Move to previous input when backspacing an empty input
                    inputs[index - 1].focus();
                }
            });
        });
    }
}

// Get seed phrase from input boxes
export function getSeedPhrase() {
    const inputs = document.querySelectorAll('.seed-input');
    return Array.from(inputs).map(input => input.value.trim()).join(' ');
}

// Validate seed phrase
export function validateSeedPhrase(seedPhrase) {
    const words = seedPhrase.trim().split(/\s+/);
    return words.length === 12 && words.every(word => word.length > 0);
}

// Setup password validation
export function setupPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthLabel = document.getElementById('strengthLabel');
    const continueBtn = document.getElementById('continueToProfile');
    
    // Password requirement checks
    const lengthCheck = document.getElementById('lengthCheck');
    const upperCheck = document.getElementById('upperCheck');
    const numberCheck = document.getElementById('numberCheck');
    const specialCheck = document.getElementById('specialCheck');
    
    const updateStrength = (password) => {
        let strength = 0;
        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
        
        // Update check marks
        lengthCheck.innerHTML = checks.length ? '✓' : '';
        upperCheck.innerHTML = checks.upper ? '✓' : '';
        numberCheck.innerHTML = checks.number ? '✓' : '';
        specialCheck.innerHTML = checks.special ? '✓' : '';
        
        // Calculate strength
        strength += checks.length ? 25 : 0;
        strength += checks.upper ? 25 : 0;
        strength += checks.number ? 25 : 0;
        strength += checks.special ? 25 : 0;
        
        // Update UI
        strengthBar.style.width = `${strength}%`;
        strengthBar.style.background = 
            strength <= 25 ? '#ff0000' :
            strength <= 50 ? '#ff9900' :
            strength <= 75 ? '#ffff00' :
            '#00ff00';
            
        strengthLabel.textContent = 
            strength <= 25 ? 'Too weak' :
            strength <= 50 ? 'Weak' :
            strength <= 75 ? 'Good' :
            'Strong';
            
        return strength === 100;
    };
    
    const updatePasswordMatch = () => {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        const matchDiv = document.getElementById('passwordMatch');
        
        if (confirm) {
            if (password === confirm) {
                matchDiv.textContent = 'Passwords match';
                matchDiv.className = 'text-sm mt-2 text-[#00ffa3]';
                return true;
            } else {
                matchDiv.textContent = 'Passwords do not match';
                matchDiv.className = 'text-sm mt-2 text-red-500';
                return false;
            }
        }
        return false;
    };
    
    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            
            btn.innerHTML = type === 'password' ? `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ` : `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            `;
        });
    });
    
    // Input event listeners
    passwordInput.addEventListener('input', () => {
        const isStrong = updateStrength(passwordInput.value);
        const matches = updatePasswordMatch();
        continueBtn.disabled = !(isStrong && matches);
        if (isStrong && matches) {
            continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    
    confirmInput.addEventListener('input', () => {
        const isStrong = updateStrength(passwordInput.value);
        const matches = updatePasswordMatch();
        continueBtn.disabled = !(isStrong && matches);
        if (isStrong && matches) {
            continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    
    // Form submission
    const form = document.getElementById('passwordSetupForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = passwordInput.value;
            const mnemonic = sessionStorage.getItem('temp_mnemonic');
            
            if (mnemonic && password) {
                try {
                    // Create wallet
                    const wallet = new BSVWallet();
                    const result = await wallet.generateNewWallet(password, mnemonic);
                    
                    if (result.success) {
                        // Clear sensitive data
                        sessionStorage.removeItem('temp_mnemonic');
                        passwordInput.value = '';
                        confirmInput.value = '';
                        
                        // Store wallet instance
                        window.wallet = wallet;

                        // Hide password modal and show success animation
                        showSuccessAnimation();
                    }
                } catch (error) {
                    console.error('Failed to create wallet:', error);
                    showWalletError('Failed to create wallet. Please try again.');
                }
            }
        });
    }

    // Add click handler for continue button
    const continueToProfile = document.getElementById('continueToProfile');
    if (continueToProfile) {
        continueToProfile.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!continueToProfile.disabled) {
                // Trigger form submission
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
}

// Show success animation
async function showSuccessAnimation() {
    const passwordModal = document.getElementById('passwordSetupModal');
    if (passwordModal) {
        passwordModal.classList.add('modal-exit');
        passwordModal.classList.remove('show');
        
        setTimeout(async () => {
            passwordModal.classList.add('hidden');
            passwordModal.style.display = 'none';
            
            // Show success animation
            const successModal = document.getElementById('walletCreatedModal');
            if (successModal) {
                successModal.classList.remove('hidden');
                successModal.style.display = 'flex';
                
                requestAnimationFrame(() => {
                    successModal.querySelector('.success-checkmark').classList.add('animate');
                });

                // Validate wallet data before proceeding
                try {
                    // Check if wallet instance exists
                    if (!window.wallet) {
                        throw new Error('Wallet instance not found');
                    }

                    // Check if public key is available
                    const publicKey = window.wallet.getPublicKey();
                    if (!publicKey) {
                        throw new Error('Public key not available');
                    }

                    // Check if legacy address is available
                    const legacyAddress = await window.wallet.getLegacyAddress();
                    if (!legacyAddress) {
                        throw new Error('Legacy address not available');
                    }

                    // Fetch and validate balance
                    const balance = await window.wallet.getBalance();
                    if (balance === undefined || balance === null) {
                        throw new Error('Could not fetch wallet balance');
                    }

                    // Update UI elements with balance
                    const balanceElement = document.getElementById('walletBalance');
                    const balanceUSDElement = document.getElementById('balanceUSD');
                    if (balanceElement) {
                        balanceElement.textContent = balance.toFixed(8);
                    }
                    if (balanceUSDElement) {
                        // Fetch current BSV price and calculate USD value
                        try {
                            const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate');
                            const data = await response.json();
                            const usdValue = (balance * data.rate).toFixed(2);
                            balanceUSDElement.textContent = `≈ $${usdValue}`;
                        } catch (error) {
                            console.error('Error fetching BSV price:', error);
                            balanceUSDElement.textContent = '≈ $0.00';
                        }
                    }

                    // Check connection type
                    const connectionType = window.wallet.getConnectionType();
                    if (!connectionType) {
                        throw new Error('Connection type not determined');
                    }

                    // Wait for animation then show main wallet
                    setTimeout(() => {
                        successModal.classList.remove('show');
                        successModal.classList.add('modal-exit');
                        
                        setTimeout(() => {
                            successModal.classList.add('hidden');
                            successModal.style.display = 'none';
                            showMainWallet();
                        }, 300);
                    }, 1500);
                } catch (error) {
                    console.error('Wallet validation failed:', error);
                    
                    // Hide success animation
                    successModal.classList.add('hidden');
                    successModal.style.display = 'none';
                    
                    // Show error dialog
                    showWalletError(`Failed to initialize wallet: ${error.message}. Please try again.`);
                    
                    // Reset wallet state
                    window.wallet = null;
                    
                    // Show wallet selection modal again
                    showModal('walletSelectionModal');
                }
            } else {
                // If success modal not found, perform validation before showing main wallet
                try {
                    if (!window.wallet) {
                        throw new Error('Wallet instance not found');
                    }
                    
                    const publicKey = window.wallet.getPublicKey();
                    const legacyAddress = await window.wallet.getLegacyAddress();
                    const balance = await window.wallet.getBalance();
                    const connectionType = window.wallet.getConnectionType();
                    
                    if (!publicKey || !legacyAddress || balance === undefined || !connectionType) {
                        throw new Error('Required wallet data not available');
                    }
                    
                    // Update UI elements with balance
                    const balanceElement = document.getElementById('walletBalance');
                    const balanceUSDElement = document.getElementById('balanceUSD');
                    if (balanceElement) {
                        balanceElement.textContent = balance.toFixed(8);
                    }
                    if (balanceUSDElement) {
                        try {
                            const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate');
                            const data = await response.json();
                            const usdValue = (balance * data.rate).toFixed(2);
                            balanceUSDElement.textContent = `≈ $${usdValue}`;
                        } catch (error) {
                            console.error('Error fetching BSV price:', error);
                            balanceUSDElement.textContent = '≈ $0.00';
                        }
                    }
                    
                    showMainWallet();
                } catch (error) {
                    console.error('Wallet validation failed:', error);
                    showWalletError(`Failed to initialize wallet: ${error.message}. Please try again.`);
                    window.wallet = null;
                    showModal('walletSelectionModal');
                }
            }
        }, 300);
    }
} 