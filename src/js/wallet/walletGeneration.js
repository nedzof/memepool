import { showModal, hideModal, showWalletError, showMainWallet } from './modalManager.js';
import { generateMnemonic } from '../bsv.js';
import BSVWallet from '../BSVWallet.js';
import { createSession } from './auth/session.js';
import { handleConnectWalletButton } from './walletEvents.js';
import { setupMainWalletEvents } from './walletEvents.js';

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
        <div class="seed-word-container neon-card glow">
            <div class="seed-word-background"></div>
            <div class="seed-word-hover-effect"></div>
            <span class="seed-word-number neon-text">${index + 1}</span>
            <span class="seed-word-text neon-text">${word}</span>
            <div class="seed-word-border"></div>
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
            blurOverlay.classList.add('fade-out');
            seedPhraseContainer.classList.remove('opacity-0');
            setTimeout(() => {
                blurOverlay.classList.add('hidden');
            }, 300);
        });
    }

    // Enable/disable continue button based on checkbox
    if (seedConfirmCheckbox && continueBtn) {
        seedConfirmCheckbox.addEventListener('change', () => {
            if (seedConfirmCheckbox.checked) {
                continueBtn.classList.remove('disabled');
                continueBtn.disabled = false;
            } else {
                continueBtn.classList.add('disabled');
                continueBtn.disabled = true;
            }
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
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            }
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
    
    const updateStrength = (password) => {
        const lengthCheck = document.getElementById('lengthCheck');
        const upperCheck = document.getElementById('upperCheck');
        const numberCheck = document.getElementById('numberCheck');
        const specialCheck = document.getElementById('specialCheck');
        const strengthBar = document.getElementById('strengthBar');
        const strengthLabel = document.getElementById('strengthLabel');
        
        // Reset all checks
        [lengthCheck, upperCheck, numberCheck, specialCheck].forEach(check => {
            check.innerHTML = '';
            check.classList.remove('valid');
        });
        
        let strength = 0;
        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
        
        // Update check marks
        if (checks.length) {
            lengthCheck.innerHTML = '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            lengthCheck.classList.add('valid');
            strength++;
        }
        if (checks.upper) {
            upperCheck.innerHTML = '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            upperCheck.classList.add('valid');
            strength++;
        }
        if (checks.number) {
            numberCheck.innerHTML = '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            numberCheck.classList.add('valid');
            strength++;
        }
        if (checks.special) {
            specialCheck.innerHTML = '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            specialCheck.classList.add('valid');
            strength++;
        }
        
        // Update strength bar and label
        strengthBar.style.width = `${(strength / 4) * 100}%`;
        
        strengthLabel.classList.remove('weak', 'fair', 'good', 'strong');
        if (strength === 4) {
            strengthLabel.textContent = 'Strong';
            strengthLabel.classList.add('strong');
        } else if (strength === 3) {
            strengthLabel.textContent = 'Good';
            strengthLabel.classList.add('good');
        } else if (strength === 2) {
            strengthLabel.textContent = 'Fair';
            strengthLabel.classList.add('fair');
        } else {
            strengthLabel.textContent = 'Too weak';
            strengthLabel.classList.add('weak');
        }
        
        return strength === 4;
    };
    
    const updatePasswordMatch = () => {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        const matchDiv = document.getElementById('passwordMatch');
        
        if (confirm) {
            matchDiv.classList.remove('valid', 'invalid');
            if (password === confirm) {
                matchDiv.textContent = 'Passwords match';
                matchDiv.classList.add('valid');
                return true;
            } else {
                matchDiv.textContent = 'Passwords do not match';
                matchDiv.classList.add('invalid');
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
            
            // Update icon based on password visibility
            btn.innerHTML = type === 'password' ? 
                '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' :
                '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>';
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

                        // Get wallet data
                        const publicKey = await wallet.getPublicKey();
                        const legacyAddress = await wallet.getLegacyAddress();
                        const balance = await wallet.getBalance();

                        // Create session with complete wallet data
                        const sessionData = {
                            loginType: 'manual',
                            publicKey,
                            legacyAddress,
                            isConnected: true,
                            type: 'manual',
                            balance,
                            connectionType: 'manual'
                        };
                        
                        createSession(sessionData);

                        // Set wallet properties to match session
                        wallet.type = 'manual';
                        wallet.connectionType = 'manual';
                        wallet.publicKey = publicKey;
                        wallet.legacyAddress = legacyAddress;
                        wallet.balance = balance;

                        // Hide password modal and show success animation
                        showSuccessAnimation();
                    }
                } catch (error) {
                    console.error('Error during wallet setup:', error);
                    showWalletError('Failed to setup wallet. Please try again.');
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
        
        setTimeout(async () => {
            passwordModal.classList.add('hidden');
            
            // Show success animation
            const successModal = document.getElementById('walletCreatedModal');
            if (successModal) {
                successModal.classList.remove('hidden');
                successModal.classList.add('modal', 'open');
                
                const animationContainer = successModal.querySelector('.success-checkmark') || document.createElement('div');
                animationContainer.className = 'success-checkmark';
                
                animationContainer.innerHTML = `
                    <svg class="success-circle" viewBox="0 0 52 52">
                        <circle class="success-circle" cx="26" cy="26" r="25" />
                        <path class="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                `;
                
                if (!successModal.querySelector('.success-checkmark')) {
                    successModal.appendChild(animationContainer);
                }

                // Wait for a short delay to ensure animation starts
                await new Promise(resolve => setTimeout(resolve, 100));

                // Continue with validation after animation
                setTimeout(async () => {
                    try {
                        // ... existing validation code ...

                        // After successful validation, transition to main wallet
                        console.log('Validation successful, transitioning to main wallet...');
                        
                        // Hide success modal
                        successModal.classList.add('hidden');
                        successModal.style.display = 'none';
                        
                        // Show main wallet modal
                        console.log('Showing main wallet modal...');
                        const mainWalletModal = document.getElementById('mainWalletModal');
                        if (mainWalletModal) {
                            mainWalletModal.classList.remove('hidden');
                            mainWalletModal.style.display = 'flex';
                            mainWalletModal.classList.add('show');
                            
                            // Initialize main wallet event listeners
                            console.log('Setting up main wallet event listeners...');
                            setupMainWalletEvents();
                            
                            // Setup close and back buttons
                            console.log('Setting up close and back buttons...');
                            const closeButtons = mainWalletModal.querySelectorAll('.modal-close, .close-btn, [id$="CloseBtn"]');
                            closeButtons.forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Close button clicked');
                                    
                                    // Hide all modals while maintaining login state
                                    const allModals = document.querySelectorAll('.modal');
                                    allModals.forEach(modal => {
                                        modal.classList.remove('show');
                                        modal.classList.add('hidden');
                                        modal.style.display = 'none';
                                    });
                                });
                            });

                            // Handle back buttons
                            const backButtons = mainWalletModal.querySelectorAll('.back-btn, [id$="BackBtn"]');
                            backButtons.forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Back button clicked');
                                    
                                    // Get current modal
                                    const currentModal = btn.closest('.modal');
                                    if (currentModal) {
                                        // Hide current modal
                                        currentModal.classList.remove('show');
                                        currentModal.classList.add('hidden');
                                        currentModal.style.display = 'none';
                                        
                                        // Always show main wallet modal when clicking back
                                        const mainModal = document.getElementById('mainWalletModal');
                                        if (mainModal) {
                                            console.log('Showing main wallet modal...');
                                            mainModal.classList.remove('hidden');
                                            mainModal.style.display = 'flex';
                                            mainModal.classList.add('show');
                                            
                                            // Re-initialize main wallet event listeners
                                            setupMainWalletEvents();
                                        }
                                    }
                                });
                            });
                        }
                        
                        // Update connect button
                        const connectButton = document.getElementById('connectWalletBtn');
                        if (connectButton) {
                            console.log('Setting up connect button...');
                            const balance = await window.wallet.getBalance();
                            
                            // Create new button to remove old event listeners
                            const newButton = connectButton.cloneNode(true);
                            newButton.textContent = balance > 0 ? `${balance.toFixed(8)} BSV` : 'Connected';
                            newButton.classList.add('connected');
                            newButton.dataset.walletConnected = 'true';
                            
                            // Add new click handler
                            newButton.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Connect button clicked, showing main wallet modal...');
                                const mainModal = document.getElementById('mainWalletModal');
                                if (mainModal) {
                                    mainModal.classList.remove('hidden');
                                    mainModal.style.display = 'flex';
                                    mainModal.classList.add('show');
                                }
                            });
                            
                            // Replace old button
                            connectButton.parentNode.replaceChild(newButton, connectButton);
                            console.log('Connect button setup complete');
                        }
                    } catch (error) {
                        console.error('Error during transition:', error);
                        showWalletError('Failed to complete wallet setup. Please try again.');
                    }
                }, 1500);
            }
        }, 300);
    }
} 