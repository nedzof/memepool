import { showModal, hideModal, showMainWallet, showWalletSelection } from './modalManager.js';
import { setupReceiveModal } from './qrCode.js';
import { clearAllCache } from './cache.js';
import { validateWalletProperties } from './validation.js';
import { fetchBalanceFromWhatsOnChain } from './blockchain.js';
import { bsv } from '../bsv.js';
import * as bitcoin from 'bitcoinjs-lib';
import { validateSession } from './validation.js';
import { getSession } from './auth/session.js';
import { logAuditEvent } from '../errors.js';

// Convert public key to legacy address
export async function publicKeyToLegacyAddress(publicKey) {
    try {
        if (!publicKey) {
            console.error('Public key is null or undefined');
            return null;
        }

        // Remove '0x' prefix if present
        const cleanPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
        
        // Validate public key format
        const isHex = /^[0-9a-fA-F]+$/.test(cleanPubKey);
        const isValidLength = cleanPubKey.length === 66 || cleanPubKey.length === 130;
        if (!isHex || !isValidLength) {
            console.error('Invalid public key format:', publicKey);
            return null;
        }

        // Compress the public key if needed
        let compressedPubKey;
        if (cleanPubKey.length === 130) {
            // Uncompressed public key, compress it
            console.log('Compressing public key...');
            const pubKeyBuffer = Buffer.from(cleanPubKey, 'hex');
            const bsvPubKey = bsv.PublicKey.fromBuffer(pubKeyBuffer);
            compressedPubKey = bsvPubKey.compressed.toString('hex');
        } else {
            compressedPubKey = cleanPubKey;
        }

        // Create BSV public key and convert to legacy address
        const pubKeyBuffer = Buffer.from(compressedPubKey, 'hex');
        const bsvPubKey = bsv.PublicKey.fromBuffer(pubKeyBuffer);
        const legacyAddress = bsvPubKey.toAddress().toString();

        console.log('Converted public key to legacy address:', {
            publicKey,
            compressedPubKey,
            legacyAddress
        });

        return legacyAddress;
    } catch (error) {
        console.error('Error converting public key to legacy address:', error);
        return null;
    }
}

// Get wallet properties with proper conversions
export async function getWalletProperties() {
    try {
        const wallet = window.wallet;
        if (!wallet) throw new Error('No wallet instance found');

        // Check session first
        const session = localStorage.getItem('memepire_wallet_session');
        if (!session) {
            throw new Error('No session found');
        }

        const sessionData = JSON.parse(session);
        if (!sessionData.isConnected) {
            throw new Error('Session not connected');
        }

        // Get connection type from session or wallet
        let connectionType = sessionData.type;
        if (!connectionType) {
            connectionType = wallet.getConnectionType();
            if (!connectionType) {
                // Fallback to wallet.type if getConnectionType() returns nothing
                connectionType = wallet.type;
            }
            if (!connectionType) {
                throw new Error('Failed to get connection type');
            }
            // Store connection type in session
            sessionData.type = connectionType;
            localStorage.setItem('memepire_wallet_session', JSON.stringify(sessionData));
        }
        console.log('Using connection type:', connectionType);

        // Get public key from session
        const publicKey = sessionData.publicKey;
        if (!publicKey) {
            throw new Error('Public key not found in session');
        }
        console.log('Using public key from session:', publicKey);

        // Get legacy address from session or derive it
        let legacyAddress = sessionData.legacyAddress;
        if (!legacyAddress) {
            legacyAddress = await publicKeyToLegacyAddress(publicKey);
            if (!legacyAddress) {
                throw new Error(`Failed to derive legacy address from public key: ${publicKey}`);
            }
            // Store the derived legacy address in session
            sessionData.legacyAddress = legacyAddress;
            localStorage.setItem('memepire_wallet_session', JSON.stringify(sessionData));
            console.log('Stored legacy address in session:', legacyAddress);
        }
        console.log('Using legacy address:', legacyAddress);

        // Get balance with proper error handling
        let balance = 0;
        try {
            const rawBalance = await wallet.getBalance();
            balance = typeof rawBalance === 'number' && !isNaN(rawBalance) ? rawBalance : 0;
            console.log('Raw balance:', rawBalance, 'Processed balance:', balance);
        } catch (error) {
            console.warn('Error getting balance, defaulting to 0:', error);
        }

        // Ensure wallet type is set
        wallet.type = connectionType;

        const properties = {
            publicKey,
            legacyAddress,
            connectionType,
            balance
        };

        console.log('Got wallet properties:', properties);
        return properties;
    } catch (error) {
        console.error('Error getting wallet properties:', error);
        throw error;
    }
}

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events');
    
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            hideModal('mainWalletModal');
            showModal('sendModal');
        });
    }

    // Receive button
    const receiveBtn = document.getElementById('receiveBtn');
    if (receiveBtn) {
        receiveBtn.addEventListener('click', () => {
            hideModal('mainWalletModal');
            showModal('receiveModal');
            setupReceiveModal();
        });
    }

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            hideModal('mainWalletModal');
            showModal('profileSetupModal');
        });
    }

    // Disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', handleDisconnect);
    }

    // Close buttons for each modal
    const closeButtons = document.querySelectorAll('[id$="CloseBtn"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal-target') || 'mainWalletModal';
            hideModal(modalId);
            if (modalId !== 'mainWalletModal') {
                showModal('mainWalletModal');
            }
        });
    });

    // Update wallet display
    updateWalletDisplay();
}

// Handle wallet disconnect
export async function handleDisconnect() {
    console.log('Handling wallet disconnect');
    
    try {
        // Clear wallet instance
        window.wallet = null;
        
        // Clear all session data
        localStorage.removeItem('memepire_wallet_session');
        sessionStorage.clear();
        
        // Close all modals properly
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.id) {
                hideModal(modal.id);
            } else {
                modal.classList.remove('show', 'modal-enter');
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });
        
        // Ensure main wallet modal is closed
        const mainWalletModal = document.getElementById('mainWalletModal');
        if (mainWalletModal) {
            hideModal('mainWalletModal');
            mainWalletModal.classList.remove('show', 'modal-enter');
            mainWalletModal.classList.add('hidden');
            mainWalletModal.style.display = 'none';
        }
        
        // Reset connect wallet button
        const connectButton = document.getElementById('connectWalletBtn');
        if (connectButton) {
            // Remove all existing event listeners
            const newButton = connectButton.cloneNode(false); // shallow clone to remove all listeners
            newButton.id = 'connectWalletBtn';
            newButton.textContent = 'Connect Wallet';
            newButton.className = connectButton.className.replace(/\bconnected\b/g, '').trim();
            newButton.removeAttribute('data-wallet-connected');
            
            // Add click handler for showing wallet selection
            newButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Connect button clicked after disconnect');
                showWalletSelection();
            };
            
            // Replace old button
            connectButton.parentNode.replaceChild(newButton, connectButton);
            console.log('Connect button reinitialized');
        }
        
        // Clear any cached data
        clearAllCache();
        
        // Force a small delay to ensure modals are closed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Disconnect complete - session cleared, modals closed, button reset');
    } catch (error) {
        console.error('Error during disconnect:', error);
    }
}

// Update wallet display
export async function updateWalletDisplay() {
    console.log('Updating wallet display');
    
    if (!window.wallet) {
        console.log('No wallet instance found');
        return;
    }

    try {
        // Get wallet properties
        const properties = await getWalletProperties();
        console.log('Wallet properties:', properties);

        // Update address display with legacy address
        const addressDisplay = document.getElementById('walletAddress');
        if (addressDisplay) {
            addressDisplay.textContent = properties.legacyAddress;
        }

        // Update balance
        await updateBalanceDisplay();

        // Update wallet type display
        const walletTypeDisplay = document.getElementById('walletType');
        if (walletTypeDisplay) {
            walletTypeDisplay.textContent = properties.connectionType.toUpperCase();
        }
    } catch (error) {
        console.error('Error updating wallet display:', error);
    }
}

// Update balance display
export async function updateBalanceDisplay() {
    console.log('Updating balance display');
    
    if (!window.wallet) {
        console.log('No wallet instance found');
        return;
    }

    try {
        // Check session first
        const session = localStorage.getItem('memepire_wallet_session');
        if (!session) {
            console.log('No session found, skipping balance update');
            return;
        }

        const sessionData = JSON.parse(session);
        if (!sessionData.isConnected) {
            console.log('Session not connected, skipping balance update');
            return;
        }

        // Get wallet properties
        const properties = await getWalletProperties();
        const formattedBalance = properties.balance.toFixed(8);
        console.log('Formatted balance:', formattedBalance);

        // Update balance displays
        const balanceDisplays = document.querySelectorAll('.balance-value');
        balanceDisplays.forEach(display => {
            display.textContent = formattedBalance;
        });

        // Only update connect button if we have a valid session
        const connectButton = document.getElementById('connectWalletBtn');
        if (connectButton && sessionData.isConnected) {
            connectButton.textContent = properties.balance > 0 ? `${formattedBalance} BSV` : 'Connected';
            connectButton.classList.add('connected');
        }
    } catch (error) {
        console.error('Error updating balance display:', error);
        // Reset button state if there's an error
        const connectButton = document.getElementById('connectWalletBtn');
        if (connectButton) {
            connectButton.textContent = 'Connect Wallet';
            connectButton.classList.remove('connected');
        }
    }
}

// Handle connect wallet button state and click behavior
export async function handleConnectWalletButton() {
    const connectButton = document.getElementById('connectWalletBtn');
    if (!connectButton) {
        console.error('Connect wallet button not found');
        return;
    }

    try {
        // Check session state
        const session = getSession();
        const isAuthenticated = session !== null;

        if (isAuthenticated) {
            // Run validation pipeline
            const isValid = await validateSession();
            
            if (!isValid) {
                // Validation failed, redirect to login
                window.location.href = '/login';
                return;
            }
            
            // Log audit event
            logAuditEvent('Wallet access granted', { session });

            // Log all wallet properties
            console.group('Wallet Properties');
            try {
                const properties = await getWalletProperties();
                console.log(properties);

                // Store derived legacy address in wallet instance
                window.wallet.legacyAddress = properties.legacyAddress;
            } catch (error) {
                console.error('Error getting wallet properties:', error);
            }
            console.groupEnd();

            // Validate wallet properties before proceeding
            if (!validateWalletProperties(window.wallet)) {
                throw new Error('Invalid wallet properties');
            }

            // Get fresh balance from WhatsOnChain using legacy address
            const balance = await fetchBalanceFromWhatsOnChain(window.wallet.legacyAddress);
            
            // Update wallet balance property
            window.wallet.balance = balance;
            
            // Update button display
            connectButton.textContent = balance > 0 ? `${balance.toFixed(8)} BSV` : 'Connected';
            connectButton.classList.add('connected');

            // Add click handler for showing main wallet
            connectButton.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Log current wallet properties again when clicking
                console.group('Current Wallet Properties');
                try {
                    const properties = await getWalletProperties();
                    console.log(properties);
                } catch (error) {
                    console.error('Error getting wallet properties:', error);
                }
                console.groupEnd();
                
                // Validate again before showing main wallet
                if (!validateWalletProperties(window.wallet)) {
                    console.error('Wallet validation failed');
                    return;
                }
                
                // Show main wallet modal without hiding it
                const mainWalletModal = document.getElementById('mainWalletModal');
                if (mainWalletModal) {
                    // Remove any existing click listeners to prevent auto-hiding
                    const oldListeners = mainWalletModal.cloneNode(true);
                    mainWalletModal.parentNode.replaceChild(oldListeners, mainWalletModal);
                }
                
                showMainWallet();
            };
        } else {
            // Reset button state
            connectButton.textContent = 'Connect Wallet';
            connectButton.classList.remove('connected');

            // Add click handler for showing wallet selection
            connectButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Log audit event
                logAuditEvent('Directed to wallet selection');
                
                showWalletSelection();
            };
        }
    } catch (error) {
        console.error('Error handling connect wallet button:', error);
        // Reset to default state on error
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
        connectButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showWalletSelection();
        };
    }
} 