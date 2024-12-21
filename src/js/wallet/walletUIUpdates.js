export async function updateWalletUI(balance = null) {
    const connectButton = document.getElementById('connectWalletBtn');
    if (!connectButton) {
        console.error('Connect button not found');
        return;
    }

    try {
        if (!balance && window.wallet) {
            balance = await window.wallet.getBalance();
        }

        // Create new button to remove old event listeners
        const newButton = connectButton.cloneNode(true);
        newButton.textContent = balance > 0 ? `${balance.toFixed(8)} BSV` : 'Connected';
        newButton.classList.add('connected');
        newButton.dataset.walletConnected = 'true';
        
        // Add new click handler
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Connect button clicked, showing main wallet modal...');
            showMainWallet();
        });
        
        // Replace old button
        connectButton.parentNode.replaceChild(newButton, connectButton);

    } catch (error) {
        console.error('Error updating wallet UI:', error);
    }
}

export function resetWalletUI() {
    const connectButton = document.getElementById('connectWalletBtn');
    if (connectButton) {
        // Create new button to remove old event listeners
        const newButton = connectButton.cloneNode(true);
        newButton.textContent = 'Connect Wallet';
        newButton.classList.remove('connected');
        newButton.dataset.walletConnected = 'false';
        
        // Add click handler for showing wallet selection
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showWalletSelection();
        });
        
        // Replace old button
        connectButton.parentNode.replaceChild(newButton, connectButton);
    }
} 