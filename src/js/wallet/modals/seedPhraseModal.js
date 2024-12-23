import { showModal, hideModal, showError } from '../../modal.js';
import { BitcoinWallet } from '../bitcoin.js';
import { createSession } from '../auth/session.js';
import { showMainWallet } from '../modalManager.js';

console.log('=== Seed phrase modal script loading... ===');

// Track initialization state
let isInitialized = false;

// Generate seed phrase grid
export function initializeSeedPhraseModal() {
    if (isInitialized) {
        console.log('=== Seed phrase modal already initialized, skipping... ===');
        return;
    }
    
    console.log('=== Initializing seed phrase modal ===');
    
    const seedPhraseGrid = document.getElementById('seedPhraseGrid');
    console.log('Seed phrase grid element:', seedPhraseGrid);
    
    if (!seedPhraseGrid) {
        console.error('Seed phrase grid not found');
        return;
    }

    // Only generate grid HTML if it's empty
    if (!seedPhraseGrid.children.length) {
        // Generate grid HTML
        seedPhraseGrid.innerHTML = Array.from({ length: 12 }, (_, i) => `
            <div class="seed-word group">
                <span class="seed-word-number">${i + 1}</span>
                <div class="seed-word-text"></div>
            </div>
        `).join('');
    }

    // Handle reveal button click
    const revealBtn = document.getElementById('revealSeedPhraseBtn');
    const seedGrid = document.getElementById('seedPhraseGrid');
    console.log('Reveal button:', revealBtn);
    
    if (revealBtn && seedGrid) {
        console.log('Adding click listener to reveal button');
        revealBtn.addEventListener('click', () => {
            console.log('Reveal button clicked');
            seedGrid.classList.remove('filter', 'blur-lg');
            revealBtn.classList.add('opacity-0', 'pointer-events-none');
        });
    }

    // Handle copy to clipboard
    const copyBtn = document.getElementById('copySeedPhraseBtn');
    console.log('Copy button:', copyBtn);
    
    if (copyBtn) {
        console.log('Adding click listener to copy button');
        copyBtn.addEventListener('click', async () => {
            console.log('Copy button clicked');
            const mnemonic = sessionStorage.getItem('temp_mnemonic');
            if (mnemonic) {
                try {
                    await navigator.clipboard.writeText(mnemonic);
                    console.log('Seed phrase copied to clipboard');
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    showError('Failed to copy seed phrase');
                }
            }
        });
    }

    // Handle continue button click
    const confirmBtn = document.getElementById('confirmSeedPhraseBtn');
    console.log('Confirm button:', confirmBtn);
    
    if (confirmBtn) {
        console.log('Adding click listener to confirm button');
        const clickHandler = async () => {
            console.log('Continue button clicked');
            try {
                // Debug: Check session storage
                const mnemonic = sessionStorage.getItem('temp_mnemonic');
                const password = sessionStorage.getItem('temp_password');
                console.log('Session storage check:', {
                    hasMnemonic: !!mnemonic,
                    hasPassword: !!password
                });

                if (!mnemonic || !password) {
                    throw new Error('Missing mnemonic or password in session storage');
                }

                // Create wallet instance
                const wallet = new BitcoinWallet();
                console.log('Created wallet instance:', wallet);

                // Generate wallet
                console.log('Calling generateNewWallet');
                const result = await wallet.generateNewWallet(password, mnemonic);
                console.log('Wallet generation result:', result);

                if (!result || !result.publicKey) {
                    throw new Error('Failed to generate wallet properly');
                }

                // Log all properties that will be validated
                console.log('Wallet properties for validation:', {
                    publicKey: wallet.publicKey,
                    legacyAddress: wallet.getLegacyAddress(),
                    connectionType: wallet.getConnectionType(),
                    balance: wallet.balance
                });

                // Create session
                const sessionData = {
                    loginType: 'manual',
                    publicKey: result.publicKey,
                    balance: result.balance,
                    address: result.address
                };
                console.log('Creating session with data:', sessionData);
                const sessionId = createSession(sessionData);
                console.log('Created session:', { sessionId });

                // Store wallet instance globally
                window.wallet = wallet;
                console.log('Stored wallet instance globally:', window.wallet);

                // Hide seed phrase modal and show success modal
                console.log('Hiding seed phrase modal and showing success modal');
                hideModal('seedPhraseModal');
                showModal('walletCreatedModal');

                // After success modal, show main wallet
                setTimeout(() => {
                    hideModal('walletCreatedModal');
                    showMainWallet();
                }, 3500); // Show success modal for 3.5 seconds before proceeding
            } catch (error) {
                console.error('Error in wallet setup:', error);
                showError(error.message);
            }
        };

        // Remove any existing click listeners and add new one
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        const newConfirmBtn = document.getElementById('confirmSeedPhraseBtn');
        newConfirmBtn.addEventListener('click', clickHandler);
        console.log('Added click listener to new confirm button');
    }

    isInitialized = true;
    console.log('=== Seed phrase modal initialization complete ===');
}

// Initialize when the modal is shown
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOMContentLoaded event fired in seed phrase modal ===');
    initializeSeedPhraseModal();
}); 