import { showModal, hideModal, showWalletError } from './modalManager.js';
import { validateMnemonic } from '../bsv.js';
import { setupPasswordValidation } from './walletGeneration.js';

// Initialize import wallet functionality
export function initializeImportWallet() {
    const importWalletModal = document.getElementById('importWalletModal');
    const passwordSetupModal = document.getElementById('passwordSetupModal');
    const seedPhraseInputs = document.getElementById('seedPhraseInputs');
    const importWalletForm = document.getElementById('importWalletForm');
    const passwordSetupForm = document.getElementById('passwordSetupForm');
    const confirmImportBtn = document.getElementById('confirmImport');

    let seedPhrase = ''; // Store the seed phrase temporarily

    // Create 12 seed input boxes with labels
    for (let i = 1; i <= 12; i++) {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'relative p-2';
        
        const label = document.createElement('div');
        label.className = 'absolute -top-2 left-2 text-xs text-gray-400 z-20 px-1 bg-[#120c34]';
        label.textContent = i;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'seed-word w-full bg-black/30 rounded-xl p-3 text-white text-sm backdrop-blur-sm relative z-10 border border-[#00ffa3]/20 focus:border-[#00ffa3] outline-none transition-colors';
        input.placeholder = `Word ${i}`;
        input.setAttribute('data-index', i);
        
        const bgGradient = document.createElement('div');
        bgGradient.className = 'absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-10';
        
        inputContainer.appendChild(bgGradient);
        inputContainer.appendChild(label);
        inputContainer.appendChild(input);
        seedPhraseInputs.appendChild(inputContainer);
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
                showWalletError('Invalid seed phrase. Please check your words and try again.');
            }
        });
    }

    // Enable/disable import button based on form completion
    function checkSeedPhraseCompletion() {
        const allWordsEntered = Array.from(seedInputs).every(input => input.value.trim());
        confirmImportBtn.disabled = !allWordsEntered;
    }
}

// Utility function to encrypt seed phrase
async function encryptSeedPhrase(seedPhrase, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(seedPhrase);
    
    // Generate a key from the password
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    
    // Generate a random salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // Derive the key
    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
    );
    
    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        key,
        data
    );
    
    // Return the encrypted data, salt, and IV
    return {
        data: Array.from(new Uint8Array(encryptedData)),
        salt: Array.from(salt),
        iv: Array.from(iv)
    };
} 