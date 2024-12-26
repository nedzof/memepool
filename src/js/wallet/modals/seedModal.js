import { showModal, hideModal, showError } from '../../modal.js';
import { initializeWallet } from '../setup.js';
import { validateMnemonic, validateMnemonicRandomness, generateSecureMnemonic } from '../mnemonic.js';
import { initializeSuccessAnimationModal } from './successAnimationModal.js';

// Initialize create wallet flow
function initializeCreateFlow(modal) {
    console.log('Initializing create wallet flow...');
    
    // Remove any existing walletSetupComplete listeners
    window.removeEventListener('walletSetupComplete', handleWalletSetupComplete);

    // Initialize success modal when wallet setup completes
    window.addEventListener('walletSetupComplete', handleWalletSetupComplete);
    
    // Get elements
    const seedPhraseGrid = modal.querySelector('#seedPhraseGrid');
    const revealBtn = modal.querySelector('#revealSeedPhraseBtn');
    const copyBtn = modal.querySelector('#copySeedPhraseBtn');
    const createForm = modal.querySelector('#createSeedForm');
    
    if (!seedPhraseGrid || !revealBtn || !copyBtn || !createForm) {
        console.error('Required elements not found for create flow');
        return;
    }

    // Generate new seed phrase
    const mnemonic = generateSecureMnemonic();
    console.log('Generated new secure mnemonic');
    sessionStorage.setItem('temp_mnemonic', mnemonic);

    // Generate and fill grid
    seedPhraseGrid.innerHTML = Array.from({ length: 12 }, (_, i) => `
        <div class="seed-word group">
            <span class="seed-word-number">${i + 1}</span>
            <div class="seed-word-text">${mnemonic.split(' ')[i]}</div>
        </div>
    `).join('');

    // Add initial blur
    seedPhraseGrid.classList.add('filter', 'blur-lg');

    // Setup reveal button
    revealBtn.classList.remove('opacity-0', 'pointer-events-none');
    revealBtn.onclick = () => {
        console.log('Revealing seed phrase...');
        seedPhraseGrid.classList.remove('filter', 'blur-lg');
        revealBtn.classList.add('opacity-0', 'pointer-events-none');
    };

    // Setup copy button
    copyBtn.onclick = async () => {
        console.log('Copying seed phrase...');
        try {
            await navigator.clipboard.writeText(mnemonic);
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            showError('Failed to copy seed phrase');
        }
    };

    // Setup form submission
    createForm.onsubmit = async (e) => {
        e.preventDefault();
        console.log('Confirming seed phrase...');
        try {
            const password = sessionStorage.getItem('temp_password');
            if (!password) throw new Error('Password not found');

            // Initialize wallet
            const success = await startWalletSetup();
            
            if (!success) {
                throw new Error('Failed to setup wallet');
            }
            
            // Show success animation
            hideModal('seedModal');
            showModal('walletCreatedModal');

            // Initialize success modal when wallet setup completes
            window.addEventListener('walletSetupComplete', (event) => {
                try {
                    console.log('walletSetupComplete event received:', event.detail);
                    initializeSuccessAnimationModal();
                } catch (error) {
                    console.error('Error in walletSetupComplete listener:', error);
                }
            });
            
        } catch (error) {
            console.error('Error confirming seed phrase:', error);
            const errorDiv = createForm.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            } else {
                showError(error.message);
            }
        }
    };
}

// Initialize import wallet flow
function initializeImportFlow(modal) {
    console.log('Initializing import wallet flow...');
    
    // Remove any existing walletSetupComplete listeners
    window.removeEventListener('walletSetupComplete', handleWalletSetupComplete);

    // Initialize success modal when wallet setup completes
    window.addEventListener('walletSetupComplete', handleWalletSetupComplete);
    
    // Get elements
    const seedPhraseInputs = modal.querySelector('#seedPhraseInputs');
    const importForm = modal.querySelector('#importSeedForm');
    const errorDiv = importForm.querySelector('.error-message');
    
    if (!seedPhraseInputs || !importForm) {
        console.error('Required elements not found for import flow');
        return;
    }

    // Generate input grid
    seedPhraseInputs.innerHTML = Array.from({ length: 12 }, (_, i) => `
        <div class="relative group">
            <span class="absolute top-1 left-2 text-xs text-[#14F195] z-20">${i + 1}</span>
            <input type="text" 
                class="seed-word w-full bg-[#0F1825] rounded-lg p-4 pt-6 text-white text-center font-medium relative z-10 
                       border border-[#14F195]/30 focus:border-[#14F195] outline-none transition-all duration-300
                       group-hover:border-[#14F195]/50 group-hover:shadow-[0_0_15px_rgba(20,241,149,0.15)]
                       focus:shadow-[0_0_20px_rgba(20,241,149,0.3)] focus:bg-[#0F1825]/80"
                placeholder="Enter word ${i + 1}">
        </div>
    `).join('');

    // Setup input navigation
    const inputs = seedPhraseInputs.querySelectorAll('input[type="text"]');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Clear error message on input
            if (errorDiv) errorDiv.classList.add('hidden');
            
            if (e.target.value.includes(' ')) {
                // Handle pasting multiple words
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
            } else if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Setup form submission
    importForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Importing seed phrase...');
        
        try {
            // Get seed phrase from inputs
            const seedPhrase = Array.from(inputs)
                .map(input => input.value.trim().toLowerCase())
                .join(' ');

            // Check for empty words
            if (seedPhrase.split(' ').some(word => !word)) {
                throw new Error('Please fill in all seed phrase words');
            }

            // Validate seed phrase
            const isValid = await validateMnemonic(seedPhrase);
            if (!isValid) {
                throw new Error('Invalid seed phrase. Please check each word and try again.');
            }

            // Additional security check
            await validateMnemonicRandomness(seedPhrase);

            // Store the validated seed phrase
            sessionStorage.setItem('temp_mnemonic', seedPhrase);

            // Initialize wallet
            const success = await startWalletSetup();
            
            if (!success) {
                throw new Error('Failed to setup wallet');
            }
            
            // Show success animation
            hideModal('seedModal');
            showModal('walletCreatedModal');
            
        } catch (error) {
            console.error('Error importing seed phrase:', error);
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            } else {
                showError(error.message);
            }
        }
    });
}

// Handler for walletSetupComplete event
function handleWalletSetupComplete(event) {
    try {
        console.log('walletSetupComplete event received:', event.detail);
        initializeSuccessAnimationModal();
    } catch (error) {
        console.error('Error in walletSetupComplete listener:', error);
    }
}

// Initialize seed modal
export function initializeSeedModal() {
    console.log('=== Initializing seed modal ===');
    
    const modal = document.getElementById('seedModal');
    if (!modal) {
        console.error('Seed modal not found');
        return;
    }

    // Add seed-modal class for styling
    modal.classList.add('seed-modal');

    // Setup back button
    const backBtn = modal.querySelector('.modal-back');
    if (backBtn) {
        backBtn.onclick = () => {
            hideModal('seedModal');
            showModal('walletSelectionModal');
        };
    }

    // Get flow type
    const flowType = sessionStorage.getItem('wallet_flow');
    console.log('Current flow type:', flowType);

    // Get views
    const createView = modal.querySelector('.create-view');
    const importView = modal.querySelector('.import-view');

    if (flowType === 'create') {
        // Show create view only
        createView.classList.remove('hidden');
        importView.classList.add('hidden');
        initializeCreateFlow(modal);
    } else if (flowType === 'import') {
        // Show import view only
        createView.classList.add('hidden');
        importView.classList.remove('hidden');
        initializeImportFlow(modal);
    }

    console.log('=== Seed modal initialization complete ===');
}

// Initialize when the modal is shown
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOMContentLoaded event fired in seed modal ===');
    const modal = document.getElementById('seedModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', () => {
            console.log('Seed modal shown, initializing...');
            initializeSeedModal();
        });
    }
}); 