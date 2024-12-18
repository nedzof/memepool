import QRCode from 'qrcode';

// Generate QR code for an address
export async function generateQRCode(address) {
    try {
        const qrCanvas = document.getElementById('qrCode');
        if (!qrCanvas || !(qrCanvas instanceof HTMLCanvasElement)) {
            console.error('QR code canvas element not found or not a canvas');
            return;
        }
        
        // Set canvas dimensions
        qrCanvas.width = 256;
        qrCanvas.height = 256;
        
        // Clear previous QR code
        const ctx = qrCanvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        
        // Generate new QR code with cyan color
        await QRCode.toCanvas(qrCanvas, address, {
            width: 256,
            margin: 1,
            color: {
                dark: '#00ffa3',  // Cyan color for QR code
                light: '#000000'  // Black background
            }
        });
        
        // Add glow effect
        ctx.shadowColor = '#00ffa3';
        ctx.shadowBlur = 15;
        ctx.drawImage(qrCanvas, 0, 0);
        
        console.log('QR code generated for address:', address);
    } catch (error) {
        console.error('Error generating QR code:', error);
    }
}

// Setup receive modal
export function setupReceiveModal() {
    const walletAddressInput = document.getElementById('walletAddress');
    const copyAddressBtn = document.getElementById('copyAddressBtn');
    
    if (window.wallet) {
        try {
            const legacyAddress = window.wallet.getLegacyAddress();
            if (!legacyAddress) {
                console.error('No legacy address available');
                return;
            }
            
            if (walletAddressInput) {
                walletAddressInput.value = legacyAddress;
                console.log('Set legacy address:', legacyAddress);
            }
            
            // Generate QR code with legacy address
            const qrCanvas = document.getElementById('qrCode');
            if (qrCanvas) {
                // Clear previous QR code
                const ctx = qrCanvas.getContext('2d');
                ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
                
                // Generate new QR code
                generateQRCode(legacyAddress).catch(error => {
                    console.error('Failed to generate QR code in receive modal:', error);
                });
            }
        } catch (error) {
            console.error('Error setting up receive modal:', error);
        }
    }

    if (copyAddressBtn && walletAddressInput) {
        copyAddressBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(walletAddressInput.value);
                copyAddressBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Copied!
                `;
                setTimeout(() => {
                    copyAddressBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                        </svg>
                        Copy Address
                    `;
                }, 2000);
            } catch (error) {
                console.error('Failed to copy address:', error);
            }
        });
    }
} 