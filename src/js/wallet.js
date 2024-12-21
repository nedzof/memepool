import { showModal, hideModal, initializeModal } from './modal.js';

// Initialize wallet functionality
export async function initializeWalletUI() {
    console.log('Initializing wallet UI...');
    
    // Initialize modals
    const walletSelectionModal = document.getElementById('walletSelectionModal');
    const passwordModal = document.getElementById('passwordSetupModal');
    const seedPhraseModal = document.getElementById('seedPhraseModal');
    const importWalletModal = document.getElementById('importWalletModal');
    
    if (!walletSelectionModal || !passwordModal || !seedPhraseModal || !importWalletModal) {
        console.error('Required modals not found:', {
            walletSelection: !!walletSelectionModal,
            password: !!passwordModal,
            seedPhrase: !!seedPhraseModal,
            importWallet: !!importWalletModal
        });
        return;
    }

    // Initialize the modals
    initializeModal('walletSelectionModal');
    initializeModal('passwordSetupModal');
    initializeModal('seedPhraseModal');
    initializeModal('importWalletModal');

    // Handle wallet selection modal buttons
    walletSelectionModal.querySelectorAll('[data-wallet]').forEach(button => {
        button.addEventListener('click', (e) => {
            const walletType = e.currentTarget.dataset.wallet;
            connectWallet(walletType);
        });
    });

    // Handle create/import wallet buttons
    const createWalletBtn = document.getElementById('createWalletBtn');
    if (createWalletBtn) {
        createWalletBtn.addEventListener('click', () => {
            hideModal('walletSelectionModal');
            setTimeout(() => {
                showModal('passwordSetupModal');
            }, 300);
        });
    }

    const importWalletBtn = document.getElementById('importWalletBtn');
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', () => {
            hideModal('walletSelectionModal');
            setTimeout(() => {
                showModal('importWalletModal');
            }, 300);
        });
    }

    // Handle back buttons
    document.querySelectorAll('.back-to-menu').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                hideModal(modal.id);
                setTimeout(() => {
                    showModal('walletSelectionModal');
                }, 300);
            }
        });
    });

    // Handle password setup form submission
    const passwordForm = document.getElementById('passwordSetupForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('setupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            // Generate seed phrase
            const seedPhrase = await generateSeedPhrase();
            
            // Hide password modal and show seed phrase
            hideModal('passwordSetupModal');
            setTimeout(() => {
                showSeedPhraseModal(seedPhrase);
            }, 300);
        });
    }

    // Handle import wallet form
    const importForm = document.getElementById('importWalletForm');
    if (importForm) {
        importForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const seedPhrase = document.getElementById('seedPhraseInput').value;
            const password = document.getElementById('importPassword').value;
            const confirmPassword = document.getElementById('confirmImportPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            // TODO: Validate seed phrase and import wallet
            console.log('Importing wallet...');
        });
    }

    // Handle password visibility toggles
    function setupPasswordToggle(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (input && toggle) {
            toggle.addEventListener('click', () => togglePasswordVisibility(input, toggle));
        }
    }

    setupPasswordToggle('setupPassword', 'toggleSetupPasswordVisibility');
    setupPasswordToggle('confirmPassword', 'toggleConfirmPasswordVisibility');
    setupPasswordToggle('importPassword', 'toggleImportPasswordVisibility');
    setupPasswordToggle('confirmImportPassword', 'toggleConfirmImportPasswordVisibility');
    setupPasswordToggle('seedPhraseInput', 'toggleSeedVisibility');

    function togglePasswordVisibility(input, button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        button.innerHTML = type === 'password' ? 
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>' :
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>';
    }

    // Handle password strength meters
    function setupStrengthMeter(inputId, meterId) {
        const input = document.getElementById(inputId);
        const meter = document.querySelector(`#${meterId} div`);
        if (input && meter) {
            input.addEventListener('input', () => updatePasswordStrength(input.value, meter));
        }
    }

    setupStrengthMeter('setupPassword', 'passwordStrengthMeter');
    setupStrengthMeter('importPassword', 'importPasswordStrengthMeter');

    function updatePasswordStrength(password, meter) {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.match(/[a-z]/)) strength += 25;
        if (password.match(/[A-Z]/)) strength += 25;
        if (password.match(/[0-9]/)) strength += 25;
        
        meter.style.width = `${strength}%`;
        meter.style.backgroundColor = 
            strength <= 25 ? '#ef4444' :
            strength <= 50 ? '#f59e0b' :
            strength <= 75 ? '#10b981' :
            '#00ffa3';
    }

    // Handle seed phrase reveal
    const revealBtn = document.getElementById('revealSeedPhraseBtn');
    const seedGrid = document.getElementById('seedPhraseGrid');
    if (revealBtn && seedGrid) {
        revealBtn.addEventListener('click', () => {
            seedGrid.classList.remove('filter', 'blur-lg');
            revealBtn.classList.add('opacity-0', 'pointer-events-none');
        });
    }

    // Handle seed phrase modal
    function showSeedPhraseModal(seedPhrase) {
        const grid = document.querySelector('#seedPhraseGrid');
        if (!grid) return;

        // Clear existing content
        grid.innerHTML = '';
        
        // Split seed phrase into words
        const words = seedPhrase.split(' ');
        
        // Create elements for each word
        words.forEach((word, index) => {
            const container = document.createElement('div');
            container.className = 'neon-button p-3 rounded-xl flex items-center gap-2 bg-black/40';
            
            const number = document.createElement('span');
            number.className = 'text-[#00ffa3]/60 text-sm font-medium';
            number.textContent = `${index + 1}`;
            
            const text = document.createElement('span');
            text.className = 'text-white font-medium seed-word-text';
            text.textContent = word;
            
            container.appendChild(number);
            container.appendChild(text);
            grid.appendChild(container);
        });

        // Reset reveal state
        grid.classList.add('filter', 'blur-lg');
        const revealBtn = document.getElementById('revealSeedPhraseBtn');
        if (revealBtn) {
            revealBtn.classList.remove('opacity-0', 'pointer-events-none');
        }

        showModal('seedPhraseModal');
    }

    // Handle seed phrase buttons
    const copySeedPhraseBtn = document.getElementById('copySeedPhraseBtn');
    if (copySeedPhraseBtn) {
        copySeedPhraseBtn.addEventListener('click', () => {
            const grid = document.querySelector('#seedPhraseGrid');
            const words = Array.from(grid.querySelectorAll('.seed-word-text'))
                .map(span => span.textContent)
                .join(' ');
            
            navigator.clipboard.writeText(words).then(() => {
                // TODO: Show success message
                console.log('Seed phrase copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy seed phrase:', err);
            });
        });
    }

    const confirmSeedPhraseBtn = document.getElementById('confirmSeedPhraseBtn');
    if (confirmSeedPhraseBtn) {
        confirmSeedPhraseBtn.addEventListener('click', () => {
            hideModal('seedPhraseModal');
            // TODO: Proceed to next step (e.g., verification or wallet creation)
        });
    }

    console.log('Wallet UI initialization complete');
}

// Generate a random seed phrase (placeholder implementation)
async function generateSeedPhrase() {
    // This is a placeholder. In a real implementation, you would:
    // 1. Generate cryptographically secure random numbers
    // 2. Convert them to BIP39 words
    // 3. Create a proper seed phrase
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent',
        'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'
    ];
    return words.join(' ');
}

// Handle wallet connections
function connectWallet(walletType) {
    console.log(`Connecting to ${walletType} wallet...`);
    // TODO: Implement wallet connection logic
}

// Export for use in main.js
export { connectWallet }; 