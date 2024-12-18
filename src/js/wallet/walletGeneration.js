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
            <span class="block text-center text-[#00ffa3] text-sm mt-1">${word}</span>
        </div>
    `).join('');
}

// Setup seed phrase events
function setupSeedPhraseEvents() {
    // Reveal seed phrase
    const revealBtn = document.getElementById('revealSeedPhrase');
    const blurOverlay = document.getElementById('seedPhraseBlur');
    const seedPhraseContainer = document.getElementById('seedPhrase');
    
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
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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

    // Handle checkbox and continue button
    const checkbox = document.getElementById('seedConfirm');
    const continueBtn = document.getElementById('continueToPassword');
    
    if (checkbox && continueBtn) {
        checkbox.addEventListener('change', () => {
            continueBtn.disabled = !checkbox.checked;
            if (checkbox.checked) {
                continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        
        continueBtn.addEventListener('click', () => {
            if (!continueBtn.disabled) {
                hideModal('seedPhraseModal');
                showModal('passwordSetupModal');
                // Initialize password validation after showing the modal
                setupPasswordValidation();
            }
        });
    }
}

// Setup password validation
function setupPasswordValidation() {
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
function showSuccessAnimation() {
    const passwordModal = document.getElementById('passwordSetupModal');
    if (passwordModal) {
        passwordModal.classList.add('modal-exit');
        passwordModal.classList.remove('show');
        
        setTimeout(() => {
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
            } else {
                // If success modal not found, go directly to main wallet
                showMainWallet();
            }
        }, 300);
    }
} 