import { showModal, hideModal, initializeModal, showError } from '../modal.js';
import { generateSecureMnemonic, encryptMnemonic } from './mnemonic.js';
import { BitcoinWallet } from './bitcoin.js';
import { updateWalletUI } from './walletUIManager.js';

// Generate new wallet
export async function generateNewWallet() {
    console.log('Generating new wallet...');
    
    try {
        // Generate secure mnemonic
        const mnemonic = await generateSecureMnemonic();
        console.log('Generated secure mnemonic');
        
        // Store mnemonic temporarily
        sessionStorage.setItem('temp_mnemonic', mnemonic);
        
        // Display seed phrase
        displaySeedPhrase(mnemonic);
        
        return true;
    } catch (error) {
        console.error('Error generating wallet:', error);
        showError(error.message);
        return false;
    }
}

// Display seed phrase
function displaySeedPhrase(mnemonic) {
    console.log('Displaying seed phrase...');
    console.log('Generated mnemonic:', mnemonic);
    console.log('Words:', mnemonic.split(' '));
    
    const seedPhraseGrid = document.getElementById('seedPhraseGrid');
    if (!seedPhraseGrid) {
        console.error('Seed phrase container not found');
        return;
    }

    // Generate grid HTML
    seedPhraseGrid.innerHTML = Array.from({ length: 12 }, (_, i) => `
        <div class="seed-word group">
            <span class="seed-word-number">${i + 1}</span>
            <div class="seed-word-text"></div>
        </div>
    `).join('');

    // Fill in the words (they'll be blurred initially)
    const words = mnemonic.split(' ');
    seedPhraseGrid.querySelectorAll('.seed-word-text').forEach((element, index) => {
        if (words[index]) {
            element.textContent = words[index];
            element.dataset.word = words[index];
            console.log(`Word ${index + 1}:`, words[index]);
        }
    });

    // Show the modal and setup events
    showModal('seedPhraseModal');
    setupSeedPhraseEvents();
}

// Setup seed phrase events
function setupSeedPhraseEvents() {
    console.log('Setting up seed phrase events...');
    
    initializeModal('seedPhraseModal', {
        listeners: {
            '#revealSeedPhraseBtn': () => {
                console.log('Reveal button clicked');
                const seedPhraseGrid = document.getElementById('seedPhraseGrid');
                const revealBtn = document.getElementById('revealSeedPhraseBtn');
                
                if (!seedPhraseGrid || !revealBtn) {
                    console.error('Required elements not found');
                    return;
                }
                
                // Remove blur effect
                seedPhraseGrid.classList.remove('filter', 'blur-lg');
                revealBtn.classList.add('opacity-0', 'pointer-events-none');
                console.log('Seed phrase revealed');
            },
            '#copySeedPhraseBtn': async () => {
                const mnemonic = sessionStorage.getItem('temp_mnemonic');
                if (mnemonic) {
                    try {
                        await navigator.clipboard.writeText(mnemonic);
                        console.log('Seed phrase copied to clipboard');
                        // Show success feedback
                        const copyBtn = document.getElementById('copySeedPhraseBtn');
                        copyBtn.classList.add('copied');
                        setTimeout(() => copyBtn.classList.remove('copied'), 2000);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                        showError('Failed to copy seed phrase');
                    }
                }
            },
            '#confirmSeedPhraseBtn': () => {
                console.log('Seed phrase confirmed, proceeding to main wallet');
                hideModal('seedPhraseModal');
                showMainWallet();
            }
        }
    });
}

// Setup password validation
export function setupPasswordValidation() {
    console.log('Setting up password validation');
    
    initializeModal('passwordSetupModal', {
        listeners: {
            '#setupPassword': (e) => updatePasswordStrength(e.target.value),
            '#confirmPassword': (e) => validatePasswords(),
            '#passwordSetupForm': async (e) => {
                e.preventDefault();
                console.log('Password setup form submitted');
                
                const password = document.getElementById('setupPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (password !== confirmPassword) {
                    showError('Passwords do not match');
                    return;
                }
                
                try {
                    // Generate secure mnemonic
                    const mnemonic = await generateSecureMnemonic();
                    console.log('Generated secure mnemonic');
                    
                    // Store mnemonic and password temporarily
                    sessionStorage.setItem('temp_mnemonic', mnemonic);
                    sessionStorage.setItem('temp_password', password);
                    
                    // Hide password modal and show seed phrase
                    hideModal('passwordSetupModal');
                    displaySeedPhrase(mnemonic);
                    showModal('seedPhraseModal');
                } catch (error) {
                    console.error('Error in password setup:', error);
                    showError(error.message);
                }
            }
        }
    });
}

// Update password strength meter
function updatePasswordStrength(password) {
    const meter = document.querySelector('#passwordStrengthMeter div');
    if (!meter) return;
        
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

// Validate password match
function validatePasswords() {
    const password = document.getElementById('setupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.getElementById('confirmPasswordBtn');
    
    if (submitBtn) {
        submitBtn.disabled = password !== confirmPassword;
    }
}

// Show main wallet after setup
async function showMainWallet() {
    try {
        const mnemonic = sessionStorage.getItem('temp_mnemonic');
        const password = document.getElementById('setupPassword').value;
        
        if (!mnemonic || !password) {
            throw new Error('Missing mnemonic or password');
        }
        
        // Create new wallet instance
        const wallet = new BitcoinWallet();
        const result = await wallet.generateNewWallet(password, mnemonic);
        
        if (!result.success) {
            throw new Error('Failed to generate wallet');
        }
        
        // Store wallet instance globally
                        window.wallet = wallet;

        // Update UI with wallet info
        await updateWalletUI(result.balance);
                        
                        // Show main wallet modal
        showModal('mainWalletModal');
        
        // Clean up temporary storage
        sessionStorage.removeItem('temp_mnemonic');
        
                    } catch (error) {
        console.error('Error showing main wallet:', error);
        showError(error.message);
    }
} 