// Function to show the continue button and update text after wallet creation
export function showContinueButton() {
    const continueBtn = document.getElementById('continueToWalletBtn');
    const title = document.querySelector('#walletCreatedModal .modal-title');
    const message = document.querySelector('#walletCreatedModal .text-white\\/80');
    const subMessage = document.querySelector('#walletCreatedModal .text-white\\/60');
    
    if (continueBtn) {
        continueBtn.classList.remove('hidden');
    }
    if (title) {
        title.textContent = 'Wallet Created!';
    }
    if (message) {
        message.textContent = 'Your wallet has been successfully created.';
    }
    if (subMessage) {
        subMessage.textContent = 'You can now start using your wallet.';
    }
} 