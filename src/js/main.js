import { initializeBlocks, centerBlocks, shiftBlocks } from './blocks.js';
import { initializeSubmissions } from './submissions.js';
import BSVWallet from './BSVWallet.js';
import { initializeWallet } from './walletUI.js';
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
        
        // Verify critical components
        const criticalElements = [
            'initialSetupModal',
            'mainWalletModal',
            'seedPhraseModal',
            'passwordSetupModal',
            'sendModal',
            'receiveModal'
        ];

        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            throw new Error(`Missing critical elements: ${missingElements.join(', ')}`);
        }

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

        // Remove any duplicate connect buttons
        const connectButtons = document.querySelectorAll('[id="connectWalletBtn"]');
        if (connectButtons.length > 1) {
            for (let i = 1; i < connectButtons.length; i++) {
                connectButtons[i].remove();
            }
        }

        // Initialize all modals as hidden
        const allModals = document.querySelectorAll('[id$="Modal"]');
        allModals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
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

        console.log('Setting up event listeners...');
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
        errorDiv.textContent = error.message;
        document.body.appendChild(errorDiv);
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
                document.getElementById('initialSetupModal').classList.remove('hidden');
                document.getElementById('initialSetupModal').style.display = 'flex';
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
 