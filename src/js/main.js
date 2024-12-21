import { initializeBlocks, centerBlocks, shiftBlocks } from './blocks.js';
import { initializeSubmissions } from './submissions.js';
import BSVWallet from './BSVWallet.js';
import { initializeWallet, getLastWalletSession } from './wallet/walletInit.js';
import { showMainWallet, showWalletError } from './wallet/modalManager.js';
import { showWalletSelection } from './wallet/modalManager.js';
import { handleConnectWalletClick } from './wallet/walletSelection.js';
import bsv from './bsv.js';
import { Wallet } from './bsv.js';

async function loadComponents() {
    try {
        console.log('Starting component loading...');
        
        // Load all components in parallel
        const components = [
            { name: 'wallet-modals', path: '/src/components/wallet-modals.html' },
            { name: 'header', path: '/src/components/header.html' },
            { name: 'main-content', path: '/src/components/main-content.html' },
            { name: 'loading-states', path: '/src/components/loading-states.html' },
            { name: 'submission-details-modal', path: '/src/components/submission-details-modal.html' },
            { name: 'video-modal', path: '/src/components/video-modal.html' }
        ];

        const loadPromises = components.map(async (component) => {
            try {
                const response = await fetch(component.path);
                if (!response.ok) {
                    throw new Error(`Failed to load ${component.name}: ${response.status}`);
                }
                return {
                    name: component.name,
                    html: await response.text()
                };
            } catch (error) {
                console.error(`Error loading ${component.name}:`, error);
                return null;
            }
        });

        const results = await Promise.all(loadPromises);
        const mainElement = document.querySelector('main');
        
        // Insert components in the correct order
        results.forEach(result => {
            if (result) {
                if (result.name === 'wallet-modals') {
                    // Insert wallet modals at the end of body
                    document.body.insertAdjacentHTML('beforeend', result.html);
                } else if (result.name === 'header' || result.name === 'main-content') {
                    // Insert header and main content into main element
                    mainElement.insertAdjacentHTML('beforeend', result.html);
                } else {
                    // Insert other modals at the end of body
                    document.body.insertAdjacentHTML('beforeend', result.html);
                }
            }
        });

        // Wait for DOM update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load included modal components
        const includes = document.querySelectorAll('[data-include]');
        const includePromises = Array.from(includes).map(async element => {
            const filePath = element.getAttribute('data-include');
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to load included file ${filePath}: ${response.status}`);
                }
                element.innerHTML = await response.text();
            } catch (error) {
                console.error(`Error loading included file ${filePath}:`, error);
            }
        });

        await Promise.all(includePromises);

        return true;
    } catch (error) {
        console.error('Error loading components:', error);
        return false;
    }
}

async function initializeApp() {
    try {
        // Load components first
        const componentsLoaded = await loadComponents();
        if (!componentsLoaded) {
            throw new Error('Failed to load components');
        }

        // Debug check for wallet selection modal
        const walletSelectionModal = document.getElementById('walletSelectionModal');
        console.log('Wallet selection modal found:', walletSelectionModal);

        // Initialize wallet functionality
        await initializeWallet();
        
        // Remove any duplicate connect buttons
        const connectButtons = document.querySelectorAll('[id="connectWalletBtn"]');
        if (connectButtons.length > 1) {
            for (let i = 1; i < connectButtons.length; i++) {
                connectButtons[i].remove();
            }
        }

        // Initialize all modals
        console.log('=== INITIALIZING MODALS ===');
        const allModals = document.querySelectorAll('.modal');
        console.log('Found modals:', allModals.length);
        allModals.forEach(modal => {
            console.log('Initializing modal:', modal.id);
            console.log('Initial classes:', modal.className);
            
            // Ensure proper initial state
            modal.classList.remove('open');
            modal.style.opacity = '0';
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            
            console.log('After initialization:', {
                classes: modal.className,
                display: modal.style.display,
                opacity: modal.style.opacity,
                visibility: modal.style.visibility
            });
        });

        console.log('Initializing blocks...');
        initializeBlocks();
        centerBlocks();

        console.log('Initializing submissions...');
        initializeSubmissions();

        console.log('Creating wallet instance...');
        window.wallet = new BSVWallet();
        
        console.log('Initializing wallet UI...');
        await initializeWallet();

        // Set up connect wallet button click handler with enhanced feedback
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        if (connectWalletBtn) {
            // Remove any existing listeners
            const newConnectWalletBtn = connectWalletBtn.cloneNode(true);
            connectWalletBtn.parentNode.replaceChild(newConnectWalletBtn, connectWalletBtn);
            
            // Add the click handler
            newConnectWalletBtn.addEventListener('click', handleConnectWalletClick);
            
            // Add Solana-style classes
            newConnectWalletBtn.classList.add('neon-button', 'ripple');
        }

        console.log('Setting up event listeners...');
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Initialize the application
async function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        await initializeApp();
    }
}

initialize();

function setupEventListeners() {
    // Add shift blocks button listener
    const shiftButton = document.querySelector('.shift-blocks');
    if (shiftButton) {
        shiftButton.addEventListener('click', shiftBlocks);
    }

    // Initialize video modal functionality
    const videoModal = document.getElementById('videoModal');
    const beatButton = document.querySelector('.beat-button');
    const closeModal = document.getElementById('closeModal');
    const generateVideo = document.getElementById('generateVideo');
    const startOver = document.getElementById('startOver');
    const signBroadcast = document.getElementById('signBroadcast');

    if (beatButton) {
        beatButton.addEventListener('click', () => {
            videoModal.classList.remove('hidden');
            videoModal.classList.add('modal-open');
            document.getElementById('promptStep').style.display = 'block';
            document.getElementById('generatingStep').style.display = 'none';
            document.getElementById('previewStep').style.display = 'none';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            videoModal.classList.add('modal-close');
            setTimeout(() => {
                videoModal.classList.remove('modal-open', 'modal-close');
                videoModal.classList.add('hidden');
            }, 300);
        });
    }

    if (generateVideo) {
        generateVideo.addEventListener('click', () => {
            document.getElementById('promptStep').style.display = 'none';
            document.getElementById('generatingStep').style.display = 'block';
            
            // Simulate video generation
            setTimeout(() => {
                document.getElementById('generatingStep').style.display = 'none';
                document.getElementById('previewStep').style.display = 'block';
            }, 3000);
        });
    }

    if (startOver) {
        startOver.addEventListener('click', () => {
            document.getElementById('previewStep').style.display = 'none';
            document.getElementById('promptStep').style.display = 'block';
            document.getElementById('promptText').value = '';
        });
    }

    if (signBroadcast) {
        signBroadcast.addEventListener('click', () => {
            if (!window.wallet?.isInitialized) {
                videoModal.classList.add('hidden');
                showWalletSelection();
                return;
            }
            // Handle signing and broadcasting
            videoModal.classList.add('modal-close');
            setTimeout(() => {
                videoModal.classList.remove('modal-open', 'modal-close');
                videoModal.classList.add('hidden');
            }, 300);
        });
    }

    // Add resize listener
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            initializeBlocks();
            centerBlocks();
        }, 250);
    });

    // Add submission modal close handler
    const closeSubmissionModal = document.getElementById('closeSubmissionModal');
    if (closeSubmissionModal) {
        closeSubmissionModal.addEventListener('click', () => {
            const modal = document.getElementById('submissionDetailsModal');
            if (modal) {
                modal.classList.add('modal-close');
                setTimeout(() => {
                    modal.classList.remove('modal-open', 'modal-close');
                    modal.classList.add('hidden');
                }, 300);
            }
        });
    }
}

// Initialize submissions on page load and refresh every minute
function startSubmissionsRefresh() {
    initializeSubmissions();
    setInterval(initializeSubmissions, 60000);
}
 