import bsv from './bsv.js';

export function initializeWallet() {
    console.log('Starting wallet initialization...');
    
    const wallet = window.wallet;
    if (!wallet) {
        console.error('Wallet instance not found in window object');
        return;
    }

    const connectBtn = document.getElementById('connectWalletBtn');
    if (!connectBtn) {
        console.error('Connect wallet button not found');
        return;
    }

    const initialSetupModal = document.getElementById('initialSetupModal');
    const mainWalletModal = document.getElementById('mainWalletModal');
    const seedPhraseModal = document.getElementById('seedPhraseModal');
    const passwordSetupModal = document.getElementById('passwordSetupModal');
    const sendModal = document.getElementById('sendModal');
    const receiveModal = document.getElementById('receiveModal');

    // Check if all required modals are found
    if (!initialSetupModal || !mainWalletModal || !seedPhraseModal || 
        !passwordSetupModal || !sendModal || !receiveModal) {
        console.error('One or more required modals not found');
        return;
    }

    let tempMnemonic = ''; // Store mnemonic temporarily during setup

    // Initialize modal states
    console.log('Initializing modal states...');
    [initialSetupModal, mainWalletModal, seedPhraseModal, passwordSetupModal, sendModal, receiveModal].forEach(modal => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    // Connect wallet button
    console.log('Setting up connect wallet button...');
    connectBtn.addEventListener('click', () => {
        console.log('Connect wallet button clicked');
        initialSetupModal.classList.remove('hidden');
        initialSetupModal.style.display = 'flex';
    });

    // Close buttons
    document.querySelectorAll('[id$="Modal"]').forEach(modal => {
        const closeBtn = modal.querySelector('button[id^="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            });
        }
    });

    // Create new wallet flow
    document.getElementById('createNewWalletBtn').addEventListener('click', async () => {
        initialSetupModal.classList.add('hidden');
        initialSetupModal.style.display = 'none';
        seedPhraseModal.classList.remove('hidden');
        seedPhraseModal.style.display = 'flex';

        try {
            // Generate mnemonic but don't initialize wallet yet
            const entropy = new Uint8Array(16);
            window.crypto.getRandomValues(entropy);
            const mnemonic = bsv.Mnemonic.fromEntropy(entropy).toString();
            tempMnemonic = mnemonic; // Store mnemonic
            console.log('Generated mnemonic:', tempMnemonic);
            
            // Update seed phrase display with highlighted words
            const seedPhraseContainer = document.getElementById('seedPhrase');
            const words = tempMnemonic.split(' ');
            seedPhraseContainer.innerHTML = words.map((word, index) => `
                <div class="relative group/word">
                    <div class="absolute inset-0 bg-gradient-to-br from-[#00ffa3]/5 via-transparent to-[#00ffff]/5 rounded-lg opacity-0 group-hover/word:opacity-100 transition-all duration-300"></div>
                    <div class="relative">
                        <div class="text-xs text-[#00ffa3] mb-1 opacity-70">${index + 1}</div>
                        <div class="text-lg text-white/90 font-mono group-hover/word:text-[#00ffa3] transition-colors duration-300">${word}</div>
                    </div>
                </div>
            `).join('');

            // Add copy functionality
            const copySeedPhraseBtn = document.getElementById('copySeedPhrase');
            if (copySeedPhraseBtn) {
                copySeedPhraseBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(tempMnemonic);
                        const originalContent = copySeedPhraseBtn.innerHTML;
                        copySeedPhraseBtn.innerHTML = `
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Copied!
                        `;
                        copySeedPhraseBtn.classList.remove('text-[#00ffa3]');
                        copySeedPhraseBtn.classList.add('text-[#00ffff]');
                        
                        setTimeout(() => {
                            copySeedPhraseBtn.innerHTML = originalContent;
                            copySeedPhraseBtn.classList.remove('text-[#00ffff]');
                            copySeedPhraseBtn.classList.add('text-[#00ffa3]');
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy seed phrase:', err);
                    }
                };
            }
        } catch (error) {
            console.error('Error generating mnemonic:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-red-500 text-sm mt-2';
            errorDiv.textContent = `Error: ${error.message}`;
            document.getElementById('createNewWalletBtn').parentNode.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        }
    });

    // Seed phrase confirmation
    document.getElementById('seedConfirm').addEventListener('change', (e) => {
        document.getElementById('continueToPassword').disabled = !e.target.checked;
    });

    // Continue to password setup
    document.getElementById('continueToPassword').addEventListener('click', () => {
        if (!tempMnemonic) {
            console.error('No mnemonic available for password setup');
            return;
        }
        seedPhraseModal.classList.add('hidden');
        seedPhraseModal.style.display = 'none';
        passwordSetupModal.classList.remove('hidden');
        passwordSetupModal.style.display = 'flex';
    });

    // Password validation and wallet creation
    const passwordForm = document.getElementById('passwordSetupForm');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const createWalletBtn = document.getElementById('createWallet');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordMatch = document.getElementById('passwordMatch');

    // Reset form when it becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target === passwordSetupModal && 
                mutation.type === 'attributes' && 
                mutation.attributeName === 'style') {
                if (passwordSetupModal.style.display === 'flex') {
                    passwordForm.reset();
                    createWalletBtn.disabled = true;
                    passwordStrength.textContent = '';
                    passwordMatch.textContent = '';
                }
            }
        });
    });

    observer.observe(passwordSetupModal, { attributes: true });

    function validatePasswords() {
        const isStrong = password.value.length >= 8;
        const doMatch = password.value === confirmPassword.value;

        passwordStrength.textContent = isStrong ? 'Strong password' : 'Password must be at least 8 characters';
        passwordStrength.style.color = isStrong ? '#00ffa3' : '#ff3333';

        passwordMatch.textContent = doMatch ? 'Passwords match' : 'Passwords do not match';
        passwordMatch.style.color = doMatch ? '#00ffa3' : '#ff3333';

        createWalletBtn.disabled = !(isStrong && doMatch);
    }

    password.addEventListener('input', validatePasswords);
    confirmPassword.addEventListener('input', validatePasswords);

    // Handle form submission
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (createWalletBtn.disabled) return;
        
        console.log('Password form submitted');
        try {
            if (!tempMnemonic) {
                console.error('No mnemonic available');
                throw new Error('No mnemonic available');
            }
            
            console.log('Using mnemonic:', tempMnemonic);
            createWalletBtn.disabled = true;
            createWalletBtn.textContent = 'Creating...';
            
            const result = await wallet.generateNewWallet(password.value, tempMnemonic);
            console.log('Wallet created successfully:', result);
            
            // Only clear mnemonic after successful wallet creation
            const savedMnemonic = tempMnemonic;
            tempMnemonic = '';
            passwordForm.reset();
            
            // Hide all modals
            [initialSetupModal, seedPhraseModal, passwordSetupModal].forEach(modal => {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            });
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed inset-0 flex items-center justify-center z-50 wallet-success-modal';
            successMessage.innerHTML = `
                <div class="relative bg-black/95 p-8 rounded-xl border border-[#00ffa3] text-center max-w-md w-full mx-4">
                    <div class="text-[#00ffa3] text-4xl mb-4">✓</div>
                    <div class="text-white text-xl">Wallet created successfully!</div>
                </div>
            `;
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                document.body.removeChild(successMessage);
                showMainWallet();
            }, 1500);
            
        } catch (error) {
            console.error('Error creating wallet:', error);
            createWalletBtn.disabled = false;
            createWalletBtn.textContent = 'Create Wallet';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-red-500 text-sm mt-2';
            errorDiv.textContent = `Error: ${error.message}`;
            createWalletBtn.parentNode.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
            
            // If wallet creation failed, restore the mnemonic
            if (savedMnemonic) {
                tempMnemonic = savedMnemonic;
            }
        }
    });

    // Main wallet modal functionality
    document.getElementById('sendBtn').addEventListener('click', () => {
        mainWalletModal.classList.add('hidden');
        sendModal.classList.remove('hidden');
        sendModal.style.display = 'flex';
        // Update available balance
        availableBalance.textContent = `${wallet.getBalance().toFixed(8)} BSV`;
    });

    document.getElementById('receiveBtn').addEventListener('click', () => {
        mainWalletModal.classList.add('hidden');
        receiveModal.classList.remove('hidden');
        receiveModal.style.display = 'flex';
        
        const qrCode = document.getElementById('qrCode');
        qrCode.innerHTML = '';
        new QRCode(qrCode, {
            text: wallet.getAddress(),
            width: 128,
            height: 128,
            colorDark: '#ffffff',
            colorLight: '#000000',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        document.getElementById('walletAddress').value = wallet.getAddress();
    });

    // Send functionality
    const sendAmount = document.getElementById('sendAmount');
    const recipientAddress = document.getElementById('recipientAddress');
    const confirmSendBtn = document.getElementById('confirmSend');
    const availableBalance = document.getElementById('availableBalance');

    function validateSend() {
        const amount = parseFloat(sendAmount.value);
        const address = recipientAddress.value.trim();
        const isValid = amount > 0 && amount <= wallet.getBalance() && address.length > 0;
        confirmSendBtn.disabled = !isValid;
    }

    sendAmount.addEventListener('input', validateSend);
    recipientAddress.addEventListener('input', validateSend);

    document.getElementById('maxAmount').addEventListener('click', () => {
        sendAmount.value = wallet.getBalance();
        validateSend();
    });

    // Add paste functionality
    document.getElementById('pasteAddress').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            recipientAddress.value = text;
            validateSend();
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    });

    confirmSendBtn.addEventListener('click', async () => {
        try {
            confirmSendBtn.disabled = true;
            confirmSendBtn.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Sending...</span>
                </div>
            `;
            
            await wallet.send(recipientAddress.value, parseFloat(sendAmount.value));
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed inset-0 flex items-center justify-center z-50 wallet-success-modal';
            successMessage.innerHTML = `
                <div class="relative bg-black/95 p-8 rounded-xl border border-[#00ffa3] text-center max-w-md w-full mx-4">
                    <div class="text-[#00ffa3] text-4xl mb-4">✓</div>
                    <div class="text-white text-xl">Transaction sent successfully!</div>
                </div>
            `;
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                document.body.removeChild(successMessage);
                sendModal.classList.add('hidden');
                showMainWallet();
            }, 1500);
            
        } catch (error) {
            console.error('Error sending transaction:', error);
            confirmSendBtn.disabled = false;
            confirmSendBtn.innerHTML = '<div class="relative z-10">Send BSV</div>';
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-red-500 text-sm mt-2 text-center';
            errorDiv.textContent = `Error: ${error.message}`;
            confirmSendBtn.parentNode.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        }
    });

    // Copy address functionality
    document.getElementById('copyAddress').addEventListener('click', () => {
        const address = document.getElementById('walletAddress');
        address.select();
        document.execCommand('copy');
        
        const copyBtn = document.getElementById('copyAddress');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });

    // Disconnect wallet
    document.getElementById('disconnectBtn').addEventListener('click', () => {
        wallet.disconnect();
        mainWalletModal.classList.add('hidden');
        connectBtn.textContent = 'Connect Wallet';
    });

    // Update connect button with balance when wallet is connected
    function updateConnectButton() {
        if (wallet.isInitialized) {
            const balance = wallet.getBalance().toFixed(8);
            connectBtn.innerHTML = `
                <div class="flex items-center gap-2">
                    <span>${balance}</span>
                    <span class="text-[#00ffa3]">BSV</span>
                </div>
            `;
            connectBtn.classList.add('connected');
        } else {
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.classList.remove('connected');
        }
    }

    // Call updateConnectButton whenever the wallet state changes
    function showMainWallet() {
        console.log('Showing main wallet UI');
        if (!wallet.isInitialized) {
            console.error('Wallet is not initialized');
            return;
        }
        
        try {
            console.log('Wallet state:', {
                initialized: wallet.isInitialized,
                balance: wallet.getBalance(),
                address: wallet.getAddress()
            });
            
            // Make sure all other modals are hidden
            [initialSetupModal, seedPhraseModal, passwordSetupModal, sendModal, receiveModal].forEach(modal => {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            });
            
            // Update UI elements
            updateWalletUI();
            updateConnectButton();
            
            // Show main wallet modal
            mainWalletModal.classList.remove('hidden');
            mainWalletModal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing main wallet:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
            errorDiv.textContent = `Error: ${error.message}`;
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        }
    }

    function updateWalletUI() {
        // Update balance
        document.getElementById('walletBalance').textContent = wallet.getBalance().toFixed(8);

        // Update transaction list
        const transactionList = document.getElementById('transactionList');
        transactionList.innerHTML = '';
        
        const transactions = wallet.getTransactions();
        
        if (transactions.length === 0) {
            transactionList.innerHTML = `
                <div class="text-center py-6">
                    <div class="text-[#00ffa3] mb-2">
                        <svg class="w-8 h-8 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                    </div>
                    <div class="text-gray-400">No transactions yet</div>
                </div>
            `;
            return;
        }
        
        transactions.forEach((tx, index) => {
            const txElement = document.createElement('div');
            txElement.className = 'transaction-item p-4 rounded-xl bg-[#0F1825]/20 border border-[#00ffa3]/10 backdrop-blur-sm';
            
            const timeAgo = getTimeAgo(new Date(tx.timestamp));
            
            txElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'send' ? 'bg-red-500/20' : 'bg-green-500/20'}">
                            <svg class="w-4 h-4 ${tx.type === 'send' ? 'text-red-400' : 'text-green-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="${tx.type === 'send' 
                                        ? 'M5 10l7-7m0 0l7 7m-7-7v18' 
                                        : 'M19 14l-7 7m0 0l-7-7m7 7V3'}">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <div class="font-medium text-white">
                                    ${tx.type === 'send' ? 'Sent BSV' : 'Received BSV'}
                                </div>
                                <a href="https://whatsonchain.com/tx/${tx.txid}" 
                                   target="_blank" 
                                   class="text-[#00ffa3] hover:text-[#00ffa3]/80 transition-colors">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                </a>
                            </div>
                            <div class="text-sm text-gray-400">
                                ${tx.type === 'send' ? 'To: ' : 'From: '}
                                <span class="text-[#00ffa3]">${tx[tx.type === 'send' ? 'to' : 'from']}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-medium ${tx.type === 'send' ? 'text-red-400' : 'text-green-400'}">
                            ${tx.type === 'send' ? '-' : '+'}${tx.amount.toFixed(8)} BSV
                        </div>
                        <div class="text-sm text-gray-400">
                            ${timeAgo}
                        </div>
                    </div>
                </div>
            `;
            
            transactionList.appendChild(txElement);
        });
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        if (interval === 1) return 'a year ago';
        
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + ' months ago';
        if (interval === 1) return 'a month ago';
        
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + ' days ago';
        if (interval === 1) return 'a day ago';
        
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + ' hours ago';
        if (interval === 1) return 'an hour ago';
        
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + ' minutes ago';
        if (interval === 1) return 'a minute ago';
        
        if (seconds < 10) return 'just now';
        
        return Math.floor(seconds) + ' seconds ago';
    }

    // Import wallet functionality
    const importWalletModal = document.getElementById('importWalletModal');
    const importKey = document.getElementById('importKey');
    const importPassword = document.getElementById('importPassword');
    const confirmImportBtn = document.getElementById('confirmImport');
    const importKeyValidation = document.getElementById('importKeyValidation');

    document.getElementById('importWalletBtn').addEventListener('click', () => {
        initialSetupModal.classList.add('hidden');
        initialSetupModal.style.display = 'none';
        importWalletModal.classList.remove('hidden');
        importWalletModal.style.display = 'flex';
    });

    // Paste functionality for import key
    document.getElementById('pasteImportKey').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            importKey.value = text;
            validateImportKey();
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    });

    function validateImportKey() {
        const key = importKey.value.trim();
        
        // Check if it's a valid seed phrase (12 words)
        const words = key.split(/\s+/);
        if (words.length === 12) {
            try {
                // Validate mnemonic
                bsv.Mnemonic.fromString(key);
                importKeyValidation.textContent = 'Valid seed phrase detected';
                importKeyValidation.style.color = '#00ffa3';
                confirmImportBtn.disabled = false;
                return;
            } catch (e) {
                console.error('Invalid mnemonic:', e);
            }
        }

        // Check if it's a valid private key (hex format)
        const privateKeyRegex = /^[0-9a-fA-F]{64}$/;
        if (privateKeyRegex.test(key)) {
            importKeyValidation.textContent = 'Valid private key detected';
            importKeyValidation.style.color = '#00ffa3';
            confirmImportBtn.disabled = false;
            return;
        }

        importKeyValidation.textContent = 'Invalid seed phrase or private key';
        importKeyValidation.style.color = '#ff3333';
        confirmImportBtn.disabled = true;
    }

    importKey.addEventListener('input', validateImportKey);

    // Handle import form submission
    document.getElementById('importWalletForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (confirmImportBtn.disabled) return;

        try {
            confirmImportBtn.disabled = true;
            confirmImportBtn.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Importing...</span>
                </div>
            `;

            const key = importKey.value.trim();
            const password = importPassword.value;

            // Determine if it's a seed phrase or private key
            const words = key.split(/\s+/);
            let result;

            if (words.length === 12) {
                // It's a seed phrase
                result = await wallet.importFromMnemonic(key, password);
            } else {
                // It's a private key
                result = await wallet.importFromPrivateKey(key, password);
            }

            console.log('Wallet imported successfully:', result);

            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed inset-0 flex items-center justify-center z-50 wallet-success-modal';
            successMessage.innerHTML = `
                <div class="relative bg-black/95 p-8 rounded-xl border border-[#00ffa3] text-center max-w-md w-full mx-4">
                    <div class="text-[#00ffa3] text-4xl mb-4">✓</div>
                    <div class="text-white text-xl">Wallet imported successfully!</div>
                </div>
            `;
            document.body.appendChild(successMessage);

            // Clear form
            importKey.value = '';
            importPassword.value = '';
            importKeyValidation.textContent = '';
            confirmImportBtn.disabled = true;

            // Hide import modal and show main wallet
            setTimeout(() => {
                document.body.removeChild(successMessage);
                importWalletModal.classList.add('hidden');
                importWalletModal.style.display = 'none';
                showMainWallet();
            }, 1500);

        } catch (error) {
            console.error('Error importing wallet:', error);
            confirmImportBtn.disabled = false;
            confirmImportBtn.innerHTML = '<div class="relative z-10">Import Wallet</div>';

            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-red-500 text-sm mt-2 text-center';
            errorDiv.textContent = `Error: ${error.message}`;
            confirmImportBtn.parentNode.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        }
    });
} 