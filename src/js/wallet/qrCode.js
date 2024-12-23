import QRCode from 'qrcode';
import { copyToClipboard } from '../utils.js';

// Generate QR code for an address
export async function generateQRCode(address) {
    try {
        const qrCanvas = document.getElementById('qrCode');
        if (!qrCanvas || !(qrCanvas instanceof HTMLCanvasElement)) {
            console.error('QR code canvas element not found or not a canvas');
            return;
        }
        
        // Remove loading indicator
        const loadingIndicator = qrCanvas.querySelector('.qr-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        // Set canvas dimensions
        qrCanvas.width = 256;
        qrCanvas.height = 256;
        
        // Create background canvas for gradient and grid
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = qrCanvas.width;
        bgCanvas.height = qrCanvas.height;
        const bgCtx = bgCanvas.getContext('2d');
        
        // Create radial gradient
        const gradient = bgCtx.createRadialGradient(
            qrCanvas.width / 2, qrCanvas.height / 2, 0,
            qrCanvas.width / 2, qrCanvas.height / 2, qrCanvas.width / 2
        );
        gradient.addColorStop(0, '#00ffa3');  // Neon green
        gradient.addColorStop(0.5, '#00ffff'); // Cyan
        gradient.addColorStop(1, '#120c34');   // Dark
        
        // Apply gradient
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        
        // Add grid pattern
        bgCtx.strokeStyle = '#00ffa3';
        bgCtx.lineWidth = 0.5;
        bgCtx.globalAlpha = 0.1;
        const gridSize = 10;
        
        for (let x = 0; x <= qrCanvas.width; x += gridSize) {
            bgCtx.beginPath();
            bgCtx.moveTo(x, 0);
            bgCtx.lineTo(x, qrCanvas.height);
            bgCtx.stroke();
        }
        
        for (let y = 0; y <= qrCanvas.height; y += gridSize) {
            bgCtx.beginPath();
            bgCtx.moveTo(0, y);
            bgCtx.lineTo(qrCanvas.width, y);
            bgCtx.stroke();
        }
        
        // Create glow canvas
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = qrCanvas.width;
        glowCanvas.height = qrCanvas.height;
        const glowCtx = glowCanvas.getContext('2d');
        
        // Generate QR code on a temporary canvas
        const tempCanvas = document.createElement('canvas');
        await QRCode.toCanvas(tempCanvas, address, {
            width: 256,
            margin: 1,
            color: {
                dark: '#00ffa3',  // Neon green
                light: '#00000000'  // Transparent background
            }
        });
        
        // Apply outer glow
        glowCtx.shadowColor = '#00ffa3';
        glowCtx.shadowBlur = 20;
        glowCtx.drawImage(tempCanvas, 0, 0);
        
        // Apply inner glow
        glowCtx.shadowColor = '#00ffff';
        glowCtx.shadowBlur = 10;
        glowCtx.globalCompositeOperation = 'source-atop';
        glowCtx.drawImage(tempCanvas, 0, 0);
        
        // Combine all layers on the main canvas
        const ctx = qrCanvas.getContext('2d');
        
        // Draw background with reduced opacity
        ctx.globalAlpha = 0.9;
        ctx.drawImage(bgCanvas, 0, 0);
        
        // Draw glow effect
        ctx.globalAlpha = 0.8;
        ctx.drawImage(glowCanvas, 0, 0);
        
        // Draw sharp QR code on top
        ctx.globalAlpha = 1;
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Add vignette effect for darker edges
        const vignette = ctx.createRadialGradient(
            qrCanvas.width / 2, qrCanvas.height / 2, qrCanvas.width / 4,
            qrCanvas.width / 2, qrCanvas.height / 2, qrCanvas.width / 1.5
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        
        console.log('Enhanced QR code generated for address:', address);
    } catch (error) {
        console.error('Error generating QR code:', error);
    }
}

// Setup receive modal
export function setupReceiveModal() {
    console.log('Setting up receive modal...');
    
    const receiveModal = document.getElementById('receiveModal');
    const walletAddressInput = document.getElementById('walletAddress');
    const copyAddressBtn = document.getElementById('copyAddressBtn');
    const backToMainBtn = receiveModal?.querySelector('.back-to-main');
    
    console.log('Found elements:', {
        receiveModal: !!receiveModal,
        walletAddressInput: !!walletAddressInput,
        copyAddressBtn: !!copyAddressBtn,
        backToMainBtn: !!backToMainBtn
    });
    
    // Function to update the display with the legacy address
    const updateAddressDisplay = async (address) => {
        console.log('Updating address display with:', address);
        
        if (!address) {
            console.error('No address provided to display');
            return;
        }

        // Update the input field
        if (walletAddressInput) {
            walletAddressInput.value = address;
            // Force the input to update
            walletAddressInput.dispatchEvent(new Event('input'));
            console.log('Set legacy address in input:', address);
        } else {
            console.error('walletAddressInput element not found');
        }
        
        // Generate QR code
        const qrCanvas = document.getElementById('qrCode');
        if (qrCanvas) {
            try {
                // Clear any existing content
                const ctx = qrCanvas.getContext('2d');
                ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
                
                // Remove loading indicator if it exists
                const loadingIndicator = qrCanvas.querySelector('.qr-loading');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
                await generateQRCode(address);
            } catch (error) {
                console.error('Failed to generate QR code:', error);
            }
        }
    };
    
    // Get and display the legacy address
    if (window.wallet) {
        console.log('Wallet found, getting legacy address...');
        try {
            // Try to get the legacy address
            console.log('Wallet object:', window.wallet);
            console.log('getLegacyAddress function:', window.wallet.getLegacyAddress);
            
            let legacyAddress;
            if (typeof window.wallet.getLegacyAddress === 'function') {
                legacyAddress = window.wallet.getLegacyAddress();
            } else if (window.wallet.legacyAddress) {
                legacyAddress = window.wallet.legacyAddress;
            } else if (window.wallet.address) {
                legacyAddress = window.wallet.address;
            }
            
            console.log('Retrieved legacy address:', legacyAddress);
            
            if (!legacyAddress) {
                console.error('No legacy address available');
                return;
            }
            
            // Update the display immediately
            updateAddressDisplay(legacyAddress);
            
            // Also listen for address changes
            if (typeof window.wallet.on === 'function') {
                window.wallet.on('addressChanged', (newAddress) => {
                    console.log('Address changed to:', newAddress);
                    updateAddressDisplay(newAddress);
                });
            }
        } catch (error) {
            console.error('Error setting up receive modal:', error);
            console.error('Error details:', {
                wallet: window.wallet,
                error: error.message,
                stack: error.stack
            });
        }
    } else {
        console.error('No wallet object found in window');
    }

    // Setup copy button
    if (copyAddressBtn && walletAddressInput) {
        copyAddressBtn.addEventListener('click', () => {
            const address = walletAddressInput.value;
            console.log('Attempting to copy address:', address);
            
            if (!address) {
                console.error('No address to copy');
                return;
            }
            
            copyToClipboard(address, copyAddressBtn, `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Copied!
            `, `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                Copy Address
            `);
        });
    }

    // Setup back button
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            console.log('Back button clicked');
            if (receiveModal) {
                // Add exit animation
                receiveModal.classList.add('modal-exit');
                
                // Hide receive modal after animation
                setTimeout(() => {
                    receiveModal.classList.remove('show');
                    receiveModal.classList.remove('modal-exit');
                    receiveModal.style.display = 'none';
                    
                    // Show main wallet modal
                    const mainModal = document.getElementById('mainWalletModal');
                    if (mainModal) {
                        mainModal.style.display = 'flex';
                        mainModal.classList.add('show');
                    }
                }, 300);
            }
        });
    }
} 