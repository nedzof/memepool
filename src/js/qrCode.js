import QRCode from 'qrcode';

export async function generateQRCode(address) {
    try {
        const qrCodeContainer = document.getElementById('qrCode');
        if (!qrCodeContainer) return;

        // Clear previous QR code
        qrCodeContainer.innerHTML = '';

        // Generate QR code with purple-cyan-blue colors
        const qrCodeUrl = await QRCode.toDataURL(address, {
            width: 200,
            margin: 1,
            color: {
                dark: '#00ffff', // Cyan color for QR code
                light: '#000000' // Black background for better contrast
            },
            errorCorrectionLevel: 'H'
        });

        // Create and add the QR code image
        const qrImage = document.createElement('img');
        qrImage.src = qrCodeUrl;
        qrImage.alt = 'Wallet Address QR Code';
        qrImage.className = 'w-full h-full rounded-lg';
        qrImage.style.filter = 'hue-rotate(45deg) drop-shadow(0 0 10px rgba(255, 0, 255, 0.5))'; // Add purple tint and glow
        
        qrCodeContainer.appendChild(qrImage);

        // Add glow effect
        qrCodeContainer.style.boxShadow = '0 0 20px rgba(0, 255, 163, 0.2)';
    } catch (error) {
        console.error('Failed to generate QR code:', error);
        qrCodeContainer.innerHTML = `
            <div class="flex items-center justify-center h-[200px] text-red-500">
                <span>Failed to generate QR code</span>
            </div>
        `;
    }
}

export function setupReceiveModal() {
    const receiveBtn = document.getElementById('receiveBtn');
    const closeReceiveModal = document.getElementById('closeReceiveModal');
    const copyAddressBtn = document.getElementById('copyAddress');
    const addressInput = document.getElementById('walletAddress');
    const receiveModal = document.getElementById('receiveModal');

    if (receiveBtn) {
        receiveBtn.addEventListener('click', async () => {
            if (!window.wallet) return;

            const address = window.wallet.getAddress();
            if (!address) return;

            // Show modal
            if (receiveModal) {
                receiveModal.classList.remove('hidden');
                receiveModal.style.display = 'flex';

                // Set address to legacy address
                if (addressInput) {
                    addressInput.value = window.wallet.getLegacyAddress();
                }

                // Generate QR code with the legacy address
                await generateQRCode(window.wallet.getLegacyAddress());

                // Add animation classes
                receiveModal.classList.add('modal-enter');
                requestAnimationFrame(() => {
                    receiveModal.classList.add('show');
                    const content = receiveModal.querySelector('.modal-content');
                    if (content) {
                        content.classList.add('show');
                    }
                });
            }
        });
    }

    // Setup close button
    if (closeReceiveModal) {
        closeReceiveModal.addEventListener('click', () => {
            if (receiveModal) {
                receiveModal.classList.remove('show');
                receiveModal.classList.add('modal-exit');
                setTimeout(() => {
                    receiveModal.classList.add('hidden');
                    receiveModal.style.display = 'none';
                    
                    // Show main wallet modal
                    const mainModal = document.getElementById('mainWalletModal');
                    if (mainModal) {
                        mainModal.classList.remove('hidden');
                        mainModal.style.display = 'flex';
                        mainModal.classList.add('show');
                    }
                }, 300);
            }
        });
    }

    // Setup back button
    const backBtn = receiveModal?.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            console.log('Back button clicked in receive modal');
            if (receiveModal) {
                // Hide receive modal
                receiveModal.classList.remove('show');
                receiveModal.classList.add('hidden');
                receiveModal.style.display = 'none';
                
                // Show main wallet modal
                const mainModal = document.getElementById('mainWalletModal');
                if (mainModal) {
                    console.log('Showing main wallet modal');
                    mainModal.classList.remove('hidden');
                    mainModal.style.display = 'flex';
                    mainModal.classList.add('show');
                }
            }
        });
    }

    if (copyAddressBtn && addressInput) {
        copyAddressBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(addressInput.value);
                
                // Update button text temporarily
                const originalContent = copyAddressBtn.innerHTML;
                copyAddressBtn.innerHTML = `
                    <div class="relative z-10 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Copied!</span>
                    </div>
                `;
                
                setTimeout(() => {
                    copyAddressBtn.innerHTML = originalContent;
                }, 2000);
            } catch (error) {
                console.error('Failed to copy address:', error);
            }
        });
    }
} 