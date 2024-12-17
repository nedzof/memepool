import { bsv, generateMnemonic } from './bsv.js';
import { BSVWallet } from './BSVWallet.js';

// Export all necessary functions
export {
    initializeWallet,
    registerUsernameOnChain,
    registerAvatarOnChain,
    checkUsernameAvailability,
    updateProfileWithX,
    showWalletError,
    updateProfileWithPersistence,
    detectWalletType,
    initXAuth,
    showWalletSelection
};

// Random name generation data
const adjectives = ['Energetic', 'Cosmic', 'Mystic', 'Digital', 'Quantum', 'Cyber', 'Neon', 'Solar', 'Lunar', 'Stellar'];
const names = ['Sandra', 'Alex', 'Morgan', 'Jordan', 'Casey', 'Riley', 'Taylor', 'Quinn', 'Sage', 'Phoenix'];

// Declare importFromX at file scope
let importFromXBtn = null;

// Cache management
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const memoryCache = new Map();

function getFromCache(key, type = 'profile') {
    // Try memory cache first
    const memKey = `${type}_${key}`;
    if (memoryCache.has(memKey)) {
        const cached = memoryCache.get(memKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        memoryCache.delete(memKey);
    }

    // Try localStorage cache
    const storageKey = `memepire_${type}_${key}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
            // Update memory cache
            memoryCache.set(memKey, parsedCache);
            return parsedCache.data;
        }
        localStorage.removeItem(storageKey);
    }

    return null;
}

function setInCache(key, data, type = 'profile') {
    const cacheObject = {
        timestamp: Date.now(),
        data: data
    };

    // Set in memory cache
    const memKey = `${type}_${key}`;
    memoryCache.set(memKey, cacheObject);

    // Set in localStorage
    const storageKey = `memepire_${type}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(cacheObject));
}

// Profile management functions
async function checkUsernameAvailability(username) {
    try {
        // Normalize username to lowercase and remove spaces
        const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
        
        // Create a BSV script to search for username registration
        const script = new bsv.Script()
            .add(bsv.Opcode.OP_RETURN)
            .add(Buffer.from('MEMEPIRE_USERNAME'))
            .add(Buffer.from(normalizedUsername));

        // Search for transactions with this script
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/script/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: script.toHex()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to check username availability');
        }

        const data = await response.json();
        
        // If we find any transactions, the username is taken
        return data.length === 0;
    } catch (error) {
        console.error('Error checking username availability:', error);
        // In case of error, we assume username is not available to prevent conflicts
        return false;
    }
}

function generateRandomUsername() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    return `${adj} ${name}`;
}

async function registerUsernameOnChain(username) {
    try {
        // Normalize username
        const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
        
        // Check if username is available
        const isAvailable = await checkUsernameAvailability(normalizedUsername);
        if (!isAvailable) {
            throw new Error('Username is already taken');
        }

        // Create BSV script for username registration
        const script = new bsv.Script()
            .add(bsv.Opcode.OP_RETURN)
            .add(Buffer.from('MEMEPIRE_USERNAME'))
            .add(Buffer.from(normalizedUsername))
            .add(Buffer.from(Date.now().toString())); // Timestamp for registration

        // Get current wallet address
        const address = wallet.getAddress();
        
        // Create and broadcast transaction
        const tx = new bsv.Transaction()
            .from(await wallet.getUtxos())
            .addOutput(new bsv.Transaction.Output({
                script: script,
                satoshis: 0
            }))
            .change(address)
            .sign(wallet.getPrivateKey());

        // Broadcast transaction
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/tx/raw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                txhex: tx.toString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to broadcast username registration');
        }

        // Store username locally
        localStorage.setItem('memepire_username', normalizedUsername);
        
        // Clear cache after successful registration
        clearProfileCache(normalizedUsername, wallet.getAddress());
        
        return true;
    } catch (error) {
        console.error('Error registering username:', error);
        return false;
    }
}

async function registerAvatarOnChain(imageData) {
    try {
        // Convert image data to Buffer if it's base64
        let imageBuffer;
        if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
            const base64Data = imageData.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
            imageBuffer = Buffer.from(imageData);
        }

        // Compress image if needed (max 100KB)
        if (imageBuffer.length > 100000) {
            throw new Error('Avatar image too large. Please use an image under 100KB.');
        }

        // Create BSV script for avatar registration
        const script = new bsv.Script()
            .add(bsv.Opcode.OP_RETURN)
            .add(Buffer.from('MEMEPIRE_AVATAR'))
            .add(imageBuffer)
            .add(Buffer.from(Date.now().toString())); // Timestamp for registration

        // Get current wallet address
        const address = wallet.getAddress();
        
        // Create and broadcast transaction
        const tx = new bsv.Transaction()
            .from(await wallet.getUtxos())
            .addOutput(new bsv.Transaction.Output({
                script: script,
                satoshis: 0
            }))
            .change(address)
            .sign(wallet.getPrivateKey());

        // Broadcast transaction
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/tx/raw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                txhex: tx.toString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to broadcast avatar registration');
        }

        // Store avatar hash locally
        const avatarHash = await crypto.subtle.digest('SHA-256', imageBuffer);
        localStorage.setItem('memepire_avatar_hash', Buffer.from(avatarHash).toString('hex'));
        
        // Store avatar data in localStorage (as base64)
        localStorage.setItem('memepire_avatar', typeof imageData === 'string' ? imageData : Buffer.from(imageData).toString('base64'));
        
        // Clear cache after successful registration
        clearProfileCache(localStorage.getItem('memepire_username'), wallet.getAddress());
        
        return true;
    } catch (error) {
        console.error('Error registering avatar:', error);
        return false;
    }
}

async function retrieveUsernameDataFromChain(username) {
    try {
        const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
        
        // Check cache first
        const cachedData = getFromCache(normalizedUsername, 'username');
        if (cachedData) {
            console.log('Username data retrieved from cache');
            return cachedData;
        }

        // Create a BSV script to search for username registration
        const script = new bsv.Script()
            .add(bsv.Opcode.OP_RETURN)
            .add(Buffer.from('MEMEPIRE_USERNAME'))
            .add(Buffer.from(normalizedUsername));

        // Search for transactions with this script
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/script/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: script.toHex()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to retrieve username data');
        }

        const data = await response.json();
        if (data.length === 0) {
            return null;
        }

        // Get the most recent registration
        const userData = {
            username: normalizedUsername,
            registrationTx: data[data.length - 1].tx_hash,
            timestamp: parseInt(data[data.length - 1].timestamp),
            address: data[data.length - 1].address
        };

        // Cache the result
        setInCache(normalizedUsername, userData, 'username');
        
        return userData;
    } catch (error) {
        console.error('Error retrieving username data:', error);
        return null;
    }
}

async function retrieveAvatarDataFromChain(address) {
    try {
        // Check cache first
        const cachedData = getFromCache(address, 'avatar');
        if (cachedData) {
            console.log('Avatar data retrieved from cache');
            return cachedData;
        }

        // Create a BSV script to search for avatar registration
        const script = new bsv.Script()
            .add(bsv.Opcode.OP_RETURN)
            .add(Buffer.from('MEMEPIRE_AVATAR'));

        // Search for transactions with this script from the specific address
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/script/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: script.toHex(),
                address: address
            })
        });

        if (!response.ok) {
            throw new Error('Failed to retrieve avatar data');
        }

        const data = await response.json();
        if (data.length === 0) {
            return null;
        }

        // Get the most recent avatar transaction
        const latestTx = data[data.length - 1];
        
        // Fetch the transaction details to get the avatar data
        const txResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${latestTx.tx_hash}/hex`);
        if (!txResponse.ok) {
            throw new Error('Failed to fetch avatar transaction data');
        }

        const txHex = await txResponse.text();
        const tx = new bsv.Transaction(txHex);
        
        // Extract avatar data from OP_RETURN output
        const avatarOutput = tx.outputs.find(output => {
            const script = output.script;
            return script.chunks.length > 1 && 
                   script.chunks[1].buf && 
                   script.chunks[1].buf.toString() === 'MEMEPIRE_AVATAR';
        });

        if (!avatarOutput) {
            return null;
        }

        // The avatar data is in the third chunk (after OP_RETURN and identifier)
        const avatarData = avatarOutput.script.chunks[2].buf;
        const avatarInfo = {
            avatarData: `data:image/png;base64,${avatarData.toString('base64')}`,
            registrationTx: latestTx.tx_hash,
            timestamp: parseInt(latestTx.timestamp)
        };

        // Cache the result
        setInCache(address, avatarInfo, 'avatar');
        
        return avatarInfo;
    } catch (error) {
        console.error('Error retrieving avatar data:', error);
        return null;
    }
}

// Add cache clearing function for when profile data is updated
function clearProfileCache(username, address) {
    // Clear from memory cache
    memoryCache.delete(`username_${username}`);
    memoryCache.delete(`avatar_${address}`);

    // Clear from localStorage
    localStorage.removeItem(`memepire_username_${username}`);
    localStorage.removeItem(`memepire_avatar_${address}`);
}

// Wallet type detection and management
async function detectWalletType() {
    if (window.unisat) {
        return 'unisat';
    } else if (window.yours) {
        return 'yours';
    } else if (window.okxwallet) {
        return 'okx';
    }
    return null;
}

// X Authentication
async function authenticateWithX() {
    try {
        // Initialize X Auth
        const auth = await initXAuth();
        if (!auth) {
            throw new Error('X authentication failed to initialize');
        }

        // Show loading state
        const xLoginBtn = document.getElementById('xLoginBtn');
        const originalText = xLoginBtn.textContent;
        xLoginBtn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Connecting...</span>
            </div>
        `;

        // Authenticate with X
        const xProfile = await auth.signIn();
        
        if (!xProfile) {
            throw new Error('Failed to get X profile');
        }

        // Store X profile data
        localStorage.setItem('memepire_x_profile', JSON.stringify({
            username: xProfile.username,
            displayName: xProfile.displayName,
            profileImage: xProfile.profileImage,
            timestamp: Date.now()
        }));

        // Update UI with X profile
        updateProfileWithX(xProfile);

        return true;
    } catch (error) {
        console.error('X authentication error:', error);
        return false;
    }
}

function updateProfileWithX(xProfile) {
    const profileUsername = document.getElementById('profileUsername');
    const profileAvatar = document.getElementById('profileAvatar');

    if (xProfile.username) {
        profileUsername.textContent = xProfile.displayName || xProfile.username;
    }

    if (xProfile.profileImage) {
        updateProfileAvatar(xProfile.profileImage);
    }
}

// Profile persistence management
const PROFILE_STORAGE_KEY = 'memepire_profile_data';
const WALLET_SESSION_KEY = 'memepire_wallet_session';

function saveProfileData(walletAddress, data) {
    try {
        const allProfiles = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
        allProfiles[walletAddress] = {
            ...data,
            lastUpdated: Date.now()
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(allProfiles));
    } catch (error) {
        console.error('Error saving profile data:', error);
    }
}

function getProfileData(walletAddress) {
    try {
        const allProfiles = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
        return allProfiles[walletAddress];
    } catch (error) {
        console.error('Error retrieving profile data:', error);
        return null;
    }
}

function saveWalletSession(walletType, address) {
    try {
        localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({
            type: walletType,
            address: address,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving wallet session:', error);
    }
}

function getLastWalletSession() {
    try {
        const session = localStorage.getItem(WALLET_SESSION_KEY);
        return session ? JSON.parse(session) : null;
    } catch (error) {
        console.error('Error retrieving wallet session:', error);
        return null;
    }
}

// Update profile management functions to use persistence
async function updateProfileWithPersistence(address) {
    try {
        // Try to get cached profile data first
        const cachedProfile = getProfileData(address);
        
        if (cachedProfile) {
            // Update UI with cached data immediately
            updateUIWithProfileData(cachedProfile);
        }

        // Fetch fresh data from blockchain
        const [usernameData, avatarData] = await Promise.all([
            retrieveUsernameDataFromChain(address),
            retrieveAvatarDataFromChain(address)
        ]);

        // Combine and save new profile data
        const profileData = {
            username: usernameData?.username || generateRandomUsername(),
            displayName: usernameData?.displayName,
            avatar: avatarData?.avatarData,
            registrationTx: usernameData?.registrationTx,
            lastFetched: Date.now()
        };

        saveProfileData(address, profileData);
        updateUIWithProfileData(profileData);

        return profileData;
    } catch (error) {
        console.error('Error updating profile with persistence:', error);
        return null;
    }
}

function updateUIWithProfileData(profileData) {
    const profileUsername = document.getElementById('profileUsername');
    const profileAvatar = document.getElementById('profileAvatar');

    if (profileData.username) {
        profileUsername.textContent = profileData.displayName || profileData.username;
    }

    if (profileData.avatar) {
        updateProfileAvatar(profileData.avatar);
    }
}

// Update wallet connection functions to use persistence
async function connectUnisatWallet() {
    try {
        const wallet = await initUnisatWallet();
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('unisat', wallet.getAddress());
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        showMainWallet();
    } catch (error) {
        console.error('Failed to connect UniSat wallet:', error);
        showWalletError(error.message);
    }
}

async function connectYoursWallet() {
    try {
        const wallet = await initYoursWallet();
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('yours', wallet.getAddress());
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        showMainWallet();
    } catch (error) {
        console.error('Failed to connect Yours wallet:', error);
        showWalletError(error.message);
    }
}

// Add OKX wallet connection function
async function connectOKXWallet() {
    try {
        const wallet = await initOKXWallet();
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('okx', wallet.getAddress());
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        showMainWallet();
    } catch (error) {
        console.error('Failed to connect OKX wallet:', error);
        showWalletError(error.message);
    }
}

// Initialize OKX wallet
async function initOKXWallet() {
    try {
        if (!window.okxwallet) {
            throw new Error('OKX Wallet not found. Please install OKX Wallet extension.');
        }

        // Request account access
        await window.okxwallet.bitcoin.connect();
        const accounts = await window.okxwallet.bitcoin.getAccounts();
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in OKX Wallet');
        }

        // Create a wallet interface
        const wallet = {
            getAddress: () => accounts[0],
            getBalance: async () => {
                const balance = await window.okxwallet.bitcoin.getBalance();
                return balance ? parseFloat(balance) : 0;
            },
            getPrivateKey: () => {
                throw new Error('Private key access not available through OKX Wallet');
            },
            getUtxos: async () => {
                return await window.okxwallet.bitcoin.getUtxos();
            },
            send: async (toAddress, amount) => {
                try {
                    const txHash = await window.okxwallet.bitcoin.send({
                        to: toAddress,
                        value: amount,
                    });
                    return { txid: txHash };
                } catch (error) {
                    throw new Error('Failed to send transaction: ' + error.message);
                }
            }
        };

        return wallet;
    } catch (error) {
        throw new Error('Failed to initialize OKX Wallet: ' + error.message);
    }
}

// Update initializeWallet to include OKX
async function initializeWallet() {
    console.log('Starting wallet initialization...');
    
    // Check for existing session
    const lastSession = getLastWalletSession();
    if (lastSession) {
        console.log('Found existing wallet session:', lastSession);
        
        // Verify wallet is still available
        const currentWalletType = await detectWalletType();
        if (currentWalletType === lastSession.type) {
            try {
                // Reconnect to the wallet
                const wallet = currentWalletType === 'unisat' ? 
                    await initUnisatWallet() : 
                    currentWalletType === 'yours' ?
                    await initYoursWallet() :
                    currentWalletType === 'okx' ?
                    await initOKXWallet() :
                    null;
                    
                if (!wallet) {
                    throw new Error('Failed to initialize wallet');
                }
                
                window.wallet = wallet;
                
                // Verify address matches
                if (wallet.getAddress() === lastSession.address) {
                    console.log('Successfully reconnected to previous wallet session');
                    await updateProfileWithPersistence(wallet.getAddress());
                    showMainWallet();
                    return;
                }
            } catch (error) {
                console.error('Failed to reconnect to previous session:', error);
            }
        }
    }

    // If no session or reconnection failed, proceed with normal initialization
    const walletType = await detectWalletType();
    
    // Update UI elements
    const connectBtn = document.getElementById('connectWalletBtn');
    if (!connectBtn) {
        console.error('Connect wallet button not found');
        return;
    }

    // Remove any duplicate connect buttons
    const connectButtons = document.querySelectorAll('[id="connectWalletBtn"]');
    if (connectButtons.length > 1) {
        for (let i = 1; i < connectButtons.length; i++) {
            connectButtons[i].remove();
        }
    }

    // Initialize modal states
    console.log('Initializing modal states...');
    const walletModals = document.querySelectorAll('[id$="Modal"]');
    walletModals.forEach(modal => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    // Connect wallet button
    console.log('Setting up connect wallet button...');
    connectBtn.addEventListener('click', () => {
        console.log('Connect wallet button clicked');
        showWalletSelection();
    });

    // ... rest of the initialization code ...
}

// X Auth initialization
async function initXAuth() {
    try {
        // Initialize X OAuth
        const xAuth = {
            clientId: 'AAAAAAAAAAAAAAAAAAAAAJBkxgEAAAAAy%2FCih1ywViiV%2FAI9bUvrMUBPkzo%3Dx5EwVeMuKAfrGczqGnQResd9DgTQPg4rkrlsIW0Ct9p2dPbjNF',
            redirectUri: `${window.location.origin}/auth/callback`,
            scope: 'read:user',
            authEndpoint: 'https://api.twitter.com/2/oauth2/authorize'
        };

        return {
            signIn: async () => {
                // Generate PKCE challenge
                const codeVerifier = generateRandomString(128);
                const codeChallenge = await generateCodeChallenge(codeVerifier);
                
                // Store code verifier for later use
                sessionStorage.setItem('code_verifier', codeVerifier);
                
                // Build auth URL
                const params = new URLSearchParams({
                    response_type: 'code',
                    client_id: xAuth.clientId,
                    redirect_uri: xAuth.redirectUri,
                    scope: xAuth.scope,
                    code_challenge: codeChallenge,
                    code_challenge_method: 'S256',
                    state: generateRandomString(32)
                });

                // Redirect to X auth page
                window.location.href = `${xAuth.authEndpoint}?${params.toString()}`;
                
                // This promise will resolve after redirect back
                return new Promise((resolve) => {
                    window.addEventListener('message', async (event) => {
                        if (event.data.type === 'X_AUTH_CALLBACK') {
                            const { code } = event.data;
                            const profile = await exchangeCodeForProfile(code, codeVerifier);
                            resolve(profile);
                        }
                    });
                });
            }
        };
    } catch (error) {
        console.error('Failed to initialize X Auth:', error);
        return null;
    }
}

// Helper functions for X Auth
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function exchangeCodeForProfile(code, verifier) {
    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${window.location.origin}/auth/callback`,
                code_verifier: verifier,
                client_id: process.env.X_CLIENT_ID
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const { access_token } = await tokenResponse.json();

        // Get user profile
        const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const { data } = await profileResponse.json();
        return {
            username: data.username,
            displayName: data.name,
            profileImage: data.profile_image_url
        };
    } catch (error) {
        console.error('Error exchanging code for profile:', error);
        return null;
    }
}

function showWalletError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Add modal handling functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Add overlay and backdrop
    modal.classList.remove('hidden');
    modal.classList.add('modal-overlay');
    modal.style.display = 'flex';

    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        content.classList.add('modal-enter');
        
        // Add backdrop blur
        modal.classList.add('modal-backdrop');
        
        // Trigger animations
        requestAnimationFrame(() => {
            modal.classList.add('show');
            content.classList.add('show');
            modal.classList.add('show');
        });
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        content.classList.remove('show');
        content.classList.add('modal-exit');
        modal.classList.remove('show');

        // Wait for animation to complete
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            content.classList.remove('modal-exit');
            modal.classList.remove('modal-backdrop');
        }, 300);
    } else {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Update showWalletSelection to use new animation functions
function showWalletSelection() {
    console.log('Showing wallet selection...');
    
    const initialSetupModal = document.getElementById('initialSetupModal');
    if (!initialSetupModal) {
        console.error('Initial setup modal not found');
        return;
    }

    // Check installed wallets
    const hasUnisat = window.unisat !== undefined;
    const hasYours = window.yours !== undefined;
    const hasOKX = window.okxwallet !== undefined;

    const modalContent = `
        <div class="modal-content border border-[#ff00ff]/30 rounded-2xl p-8 max-w-md w-full relative backdrop-blur-xl"
             style="background: linear-gradient(180deg, rgba(18, 12, 52, 0.95) 0%, rgba(26, 17, 71, 0.95) 100%);
                    box-shadow: 0 0 40px rgba(255, 0, 255, 0.2);">
            <div class="space-y-8">
                <div>
                    <h2 class="text-3xl font-bold bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-transparent bg-clip-text">Connect Wallet</h2>
                    <p class="text-gray-400 text-sm mt-1">Choose how you want to connect</p>
                </div>
                
                <div class="space-y-4">
                    <!-- Generate New Wallet -->
                    <button id="generateWalletBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#00ffa3]/30 bg-[#0F1825]/30 hover:border-[#00ffa3]">
                        <div class="relative z-10 flex items-center justify-center gap-2">
                            <svg class="w-5 h-5 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <span class="text-[#00ffa3]">Generate New Wallet</span>
                        </div>
                        <div class="absolute inset-0 bg-[#00ffa3]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    ${hasUnisat ? `
                        <!-- UniSat Wallet (if installed) -->
                        <button id="unisatBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                            <div class="relative z-10 flex items-center justify-between px-4">
                                <div class="flex items-center gap-2">
                                    <img src="/assets/unisat-logo.svg" alt="UniSat" class="w-6 h-6">
                                    <span>UniSat Wallet</span>
                                </div>
                                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
                            </div>
                        </button>
                    ` : ''}

                    ${hasYours ? `
                        <!-- Yours Wallet (if installed) -->
                        <button id="yoursBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                            <div class="relative z-10 flex items-center justify-between px-4">
                                <div class="flex items-center gap-2">
                                    <img src="/assets/yours-logo.svg" alt="Yours" class="w-6 h-6">
                                    <span>Yours Wallet</span>
                                </div>
                                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
                            </div>
                        </button>
                    ` : ''}

                    ${hasOKX ? `
                        <!-- OKX Wallet (if installed) -->
                        <button id="okxBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                            <div class="relative z-10 flex items-center justify-between px-4">
                                <div class="flex items-center gap-2">
                                    <img src="/assets/okx-logo.svg" alt="OKX" class="w-6 h-6">
                                    <span>OKX Wallet</span>
                                </div>
                                <span class="text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-1 rounded-full">Detected</span>
                            </div>
                        </button>
                    ` : ''}

                    <!-- Import Existing Wallet -->
                    <button id="importWalletBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                        <div class="relative z-10 flex items-center justify-between px-4">
                            <div class="flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                                <span>Import Wallet</span>
                            </div>
                            <span class="text-xs text-gray-400">Seed phrase or private key</span>
                        </div>
                    </button>

                    <!-- X Login -->
                    <button id="xLoginBtn" class="wallet-option-btn w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group border border-[#ff00ff]/30 bg-[#0F1825]/30">
                        <div class="relative z-10 flex items-center justify-between px-4">
                            <div class="flex items-center gap-2">
                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>Continue with X</span>
                            </div>
                            <span class="text-xs text-gray-400">Social login</span>
                        </div>
                    </button>

                    ${!hasUnisat || !hasYours || !hasOKX ? `
                        <div class="mt-6 p-4 rounded-xl bg-[#ff00ff]/5 border border-[#ff00ff]/10">
                            <div class="text-sm text-gray-400">
                                <div class="flex items-start gap-3">
                                    <svg class="w-5 h-5 text-[#ff00ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <div>
                                        <p class="mb-2">Get more features with a BSV wallet</p>
                                        <div class="space-y-1">
                                            ${!hasUnisat ? `
                                                <a href="https://chromewebstore.google.com/detail/unisat-wallet/ppbibelpcjmhbdihakflkdcoccbgbkpo" target="_blank" 
                                                   class="block text-[#00ffa3] hover:text-[#00ffa3]/80 transition-colors">
                                                    • Install UniSat Wallet
                                                </a>
                                            ` : ''}
                                            ${!hasYours ? `
                                                <a href="https://chromewebstore.google.com/detail/yours-wallet/mlbnicldlpdimbjdcncnklfempedeipj" target="_blank"
                                                   class="block text-[#00ffa3] hover:text-[#00ffa3]/80 transition-colors">
                                                    • Install Yours Wallet
                                                </a>
                                            ` : ''}
                                            ${!hasOKX ? `
                                                <a href="https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge" target="_blank"
                                                   class="block text-[#00ffa3] hover:text-[#00ffa3]/80 transition-colors">
                                                    • Install OKX Wallet
                                                </a>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Set modal content
    initialSetupModal.innerHTML = modalContent;

    // Show modal with animation
    showModal('initialSetupModal');

    // Add event listeners
    const unisatBtn = document.getElementById('unisatBtn');
    const yoursBtn = document.getElementById('yoursBtn');
    const okxBtn = document.getElementById('okxBtn');
    const importWalletBtn = document.getElementById('importWalletBtn');
    const xLoginBtn = document.getElementById('xLoginBtn');
    const generateWalletBtn = document.getElementById('generateWalletBtn');

    if (unisatBtn) unisatBtn.addEventListener('click', () => {
        hideModal('initialSetupModal');
        connectUnisatWallet();
    });
    
    if (yoursBtn) yoursBtn.addEventListener('click', () => {
        hideModal('initialSetupModal');
        connectYoursWallet();
    });

    if (okxBtn) okxBtn.addEventListener('click', () => {
        hideModal('initialSetupModal');
        connectOKXWallet();
    });
    
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', () => {
            hideModal('initialSetupModal');
            showModal('importWalletModal');
        });
    }
    
    if (xLoginBtn) xLoginBtn.addEventListener('click', () => {
        hideModal('initialSetupModal');
        authenticateWithX();
    });
    
    if (generateWalletBtn) {
        generateWalletBtn.addEventListener('click', () => {
            hideModal('initialSetupModal');
            showModal('seedPhraseModal');
            generateNewWallet();
        });
    }

    // Add close button handler
    const closeButtons = initialSetupModal.querySelectorAll('[id$="CloseBtn"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => hideModal('initialSetupModal'));
    });

    // Add click outside to close
    initialSetupModal.addEventListener('click', (e) => {
        if (e.target === initialSetupModal) {
            hideModal('initialSetupModal');
        }
    });
}

// Update other modal functions to use animations
function showMainWallet() {
    hideModal('initialSetupModal');
    showModal('mainWalletModal');
}

function showImportWallet() {
    hideModal('initialSetupModal');
    showModal('importWalletModal');
}

// Add new wallet generation functions
async function generateNewWallet() {
    try {
        // Generate new mnemonic
        const mnemonic = generateMnemonic();
        
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

function displaySeedPhrase(mnemonic) {
    const seedPhraseContainer = document.getElementById('seedPhrase');
    const words = mnemonic.split(' ');
    
    seedPhraseContainer.innerHTML = words.map((word, index) => `
        <div class="relative p-3 rounded-lg bg-black/30 border border-[#ff00ff]/20 group hover:border-[#ff00ff]/40 transition-all duration-300">
            <span class="absolute top-2 left-2 text-xs text-[#ff00ff]/50">${index + 1}</span>
            <span class="block text-center text-white mt-2">${word}</span>
        </div>
    `).join('');
}

function setupSeedPhraseEvents() {
    // Reveal seed phrase
    const revealBtn = document.getElementById('revealSeedPhrase');
    const blurOverlay = document.getElementById('seedPhraseBlur');
    
    if (revealBtn && blurOverlay) {
        revealBtn.addEventListener('click', () => {
            blurOverlay.style.opacity = '0';
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
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
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
        });
        
        continueBtn.addEventListener('click', () => {
            hideModal('seedPhraseModal');
            showModal('passwordSetupModal');
        });
    }
}

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
    });
    
    confirmInput.addEventListener('input', () => {
        const isStrong = updateStrength(passwordInput.value);
        const matches = updatePasswordMatch();
        continueBtn.disabled = !(isStrong && matches);
    });
    
    // Form submission
    const form = document.getElementById('passwordSetupForm');
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
                    
                    // Show success animation
                    hideModal('passwordSetupModal');
                    showSuccessAnimation();
                }
            } catch (error) {
                console.error('Failed to create wallet:', error);
                showWalletError('Failed to create wallet. Please try again.');
            }
        }
    });
}

function showSuccessAnimation() {
    const modal = document.getElementById('walletCreatedModal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    // Add success animation class
    const checkmark = modal.querySelector('.success-checkmark');
    checkmark.classList.add('animate');
    
    // Setup get started button
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            hideModal('walletCreatedModal');
            showMainWallet();
        });
    }
}