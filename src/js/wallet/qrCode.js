import QRCode from 'qrcode';
import { copyToClipboard } from '../utils.js';

// Generate QR code for an address
export async function generateQRCode(address) {
    try {
        console.log('Starting QR code generation for address:', address);
        
        // Get the container and clear it
        const qrContainer = document.getElementById('qrCode');
        if (!qrContainer) {
            console.error('QR code container not found');
            return;
        }
        
        // Clear the container
        qrContainer.innerHTML = '';
        
        // Create a new canvas element
        const qrCanvas = document.createElement('canvas');
        qrCanvas.className = 'w-full h-full rounded-xl';
        qrContainer.appendChild(qrCanvas);
        
        // Set canvas dimensions with higher resolution for better quality
        const size = 512; // Higher resolution for better quality
        qrCanvas.width = size;
        qrCanvas.height = size;
        qrCanvas.style.width = '100%';
        qrCanvas.style.height = '100%';
        
        // Create background canvas for gradient and grid
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = size;
        bgCanvas.height = size;
        const bgCtx = bgCanvas.getContext('2d');
        
        // Create subtle radial gradient background
        const gradient = bgCtx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 1.5
        );
        gradient.addColorStop(0, '#001a11');    // Dark green center
        gradient.addColorStop(1, '#000000');    // Black edges
        
        // Apply gradient background
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, size, size);
        
        // Add very subtle grid pattern
        bgCtx.strokeStyle = '#00ffa3';
        bgCtx.lineWidth = 0.5;
        bgCtx.globalAlpha = 0.05;
        const gridSize = 20;
        
        // Draw vertical grid lines
        for (let x = 0; x <= size; x += gridSize) {
            bgCtx.beginPath();
            bgCtx.moveTo(x, 0);
            bgCtx.lineTo(x, size);
            bgCtx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= size; y += gridSize) {
            bgCtx.beginPath();
            bgCtx.moveTo(0, y);
            bgCtx.lineTo(size, y);
            bgCtx.stroke();
        }
        
        // Generate QR code on a temporary canvas
        const tempCanvas = document.createElement('canvas');
        await QRCode.toCanvas(tempCanvas, address, {
            width: size,
            margin: 2,
            color: {
                dark: '#00ffa3',  // Neon green QR code
                light: '#00000000'  // Transparent background
            }
        });
        
        // Get the main canvas context
        const ctx = qrCanvas.getContext('2d');
        
        // Draw background
        ctx.globalAlpha = 1;
        ctx.drawImage(bgCanvas, 0, 0);
        
        // Create subtle glow effect
        ctx.shadowColor = '#00ffa3';
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Draw sharp QR code on top
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.drawImage(tempCanvas, 0, 0);
        
        console.log('Successfully generated QR code for address:', address);
    } catch (error) {
        console.error('Error generating QR code:', error);
        // Show error state in the container
        const qrContainer = document.getElementById('qrCode');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="text-red-500 text-sm text-center">
                    Failed to generate QR code
                </div>
            `;
        }
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
    
    // Get and display the legacy address
    if (window.wallet) {
        console.log('Wallet found, getting legacy address...');
        try {
            // Try to get the legacy address immediately
            const legacyAddress = window.wallet.getLegacyAddress?.() || window.wallet.legacyAddress || window.wallet.address;
            
            if (legacyAddress) {
                console.log('Got legacy address:', legacyAddress);
                // Update the input field immediately if it exists
                if (walletAddressInput) {
                    console.log('Setting legacy address:', legacyAddress);
                    walletAddressInput.value = legacyAddress;
                    walletAddressInput.dispatchEvent(new Event('input'));
                    
                    // Generate QR code immediately
                    generateQRCode(legacyAddress).catch(error => {
                        console.error('Failed to generate initial QR code:', error);
                    });
                } else {
                    console.log('Waiting for input element...');
                    const checkInput = setInterval(() => {
                        const input = document.getElementById('walletAddress');
                        if (input) {
                            clearInterval(checkInput);
                            input.value = legacyAddress;
                            input.dispatchEvent(new Event('input'));
                            console.log('Set legacy address after waiting:', legacyAddress);
                            
                            // Generate QR code after setting address
                            generateQRCode(legacyAddress).catch(error => {
                                console.error('Failed to generate QR code after waiting:', error);
                            });
                        }
                    }, 100);
                }
            } else {
                console.error('No legacy address available');
            }
            
            // Also listen for address changes
            if (typeof window.wallet.on === 'function') {
                window.wallet.on('addressChanged', (newAddress) => {
                    if (newAddress) {
                        if (walletAddressInput) {
                            walletAddressInput.value = newAddress;
                            walletAddressInput.dispatchEvent(new Event('input'));
                        }
                        generateQRCode(newAddress).catch(error => {
                            console.error('Failed to generate QR code for new address:', error);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up legacy address:', error);
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