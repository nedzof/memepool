import { initializeBlocks, centerBlocks, shiftBlocks } from './blocks.js';
import { initializeSubmissions } from './submissions.js';
import BSVWallet from './BSVWallet.js';
import { initializeWallet } from './walletUI.js';
import bsv from './bsv.js';
import { Wallet } from './bsv.js';

async function loadComponents() {
    try {
        // Create container elements
        const mainContent = document.createElement('div');
        mainContent.id = 'mainContent';
        const submissionDetailsModalContainer = document.createElement('div');
        submissionDetailsModalContainer.id = 'submissionDetailsModalContainer';
        const videoModalContainer = document.createElement('div');
        videoModalContainer.id = 'videoModalContainer';
        const walletModalsContainer = document.createElement('div');
        walletModalsContainer.id = 'walletModalsContainer';
        const loadingState = document.createElement('div');
        loadingState.id = 'loadingState';
        loadingState.className = 'fixed inset-0 flex items-center justify-center bg-black z-50';
        loadingState.innerHTML = `
            <div class="text-center">
                <div class="loading-spinner mb-4"></div>
                <p class="text-lg">Loading Memepire...</p>
            </div>
        `;

        // Add containers to body
        document.body.appendChild(mainContent);
        document.body.appendChild(submissionDetailsModalContainer);
        document.body.appendChild(videoModalContainer);
        document.body.appendChild(walletModalsContainer);
        document.body.appendChild(loadingState);

        // Load component contents
        const [mainContentHtml, submissionModalHtml, videoModalHtml, walletModalsHtml] = await Promise.all([
            fetch('src/components/main-content.html').then(r => r.text()),
            fetch('src/components/submission-details-modal.html').then(r => r.text()),
            fetch('src/components/video-modal.html').then(r => r.text()),
            fetch('src/components/wallet-modals.html').then(r => r.text())
        ]);

        // Insert component contents
        mainContent.innerHTML = mainContentHtml;
        submissionDetailsModalContainer.innerHTML = submissionModalHtml;
        videoModalContainer.innerHTML = videoModalHtml;
        walletModalsContainer.innerHTML = walletModalsHtml;

        // Remove loading state
        loadingState.remove();

        // After components are loaded, initialize the app
        initializeApp();
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

function initializeApp() {
    console.log('Initializing app...');
    
    // Check if dependencies are loaded
    if (!window.QRCode) {
        console.error('QR Code library not loaded');
        return;
    }

    // Initialize blocks
    console.log('Initializing blocks...');
    initializeBlocks();
    centerBlocks();

    // Initialize submissions
    console.log('Initializing submissions...');
    initializeSubmissions();

    // Initialize wallet
    console.log('Creating wallet instance...');
    window.wallet = new Wallet();
    console.log('Initializing wallet UI...');
    initializeWallet();

    // Add event listeners
    console.log('Setting up event listeners...');
    setupEventListeners();
}

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

// Initialize everything
function initialize() {
    // Setup body
    document.body.className = 'bg-black text-white min-h-screen';
    
    // Load components
    loadComponents();
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
} 