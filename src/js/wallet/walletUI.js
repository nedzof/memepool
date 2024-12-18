// Add BSV to USD conversion rate
let bsvToUsdRate = 0;

// Fetch BSV price
async function fetchBSVPrice() {
    try {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate');
        const data = await response.json();
        bsvToUsdRate = data.rate;
        updateAllUSDValues();
    } catch (error) {
        console.error('Error fetching BSV price:', error);
    }
}

// Update all USD values
function updateAllUSDValues() {
    // Update main wallet balance
    const mainBalance = document.getElementById('walletBalance');
    const mainBalanceUSD = document.getElementById('balanceUSD');
    if (mainBalance && mainBalanceUSD) {
        const bsvAmount = parseFloat(mainBalance.textContent);
        const usdAmount = (bsvAmount * bsvToUsdRate).toFixed(2);
        mainBalanceUSD.textContent = `≈ $${usdAmount}`;
    }

    // Update send modal balance
    const sendBalance = document.getElementById('availableBalance');
    const sendBalanceUSD = document.getElementById('amountUSD');
    if (sendBalance && sendBalanceUSD) {
        const bsvAmount = parseFloat(sendBalance.textContent);
        const usdAmount = (bsvAmount * bsvToUsdRate).toFixed(2);
        sendBalanceUSD.textContent = `≈ $${usdAmount}`;
    }

    // Update connect button balance if exists
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn && connectBtn.dataset.balance) {
        const bsvAmount = parseFloat(connectBtn.dataset.balance);
        const usdAmount = (bsvAmount * bsvToUsdRate).toFixed(2);
        connectBtn.innerHTML = `${bsvAmount.toFixed(8)} BSV<br><span class="text-sm text-gray-400">≈ $${usdAmount}</span>`;
    }
}

// Setup amount slider
function setupAmountSlider() {
    const slider = document.getElementById('amountSlider');
    const amountInput = document.getElementById('sendAmount');
    const maxBSV = document.getElementById('maxBSV');
    const amountUSD = document.getElementById('amountUSD');
    const availableBalance = document.getElementById('availableBalance');

    if (slider && amountInput && maxBSV && amountUSD && availableBalance) {
        const maxAmount = parseFloat(availableBalance.textContent);
        slider.max = maxAmount;
        maxBSV.textContent = `${maxAmount.toFixed(8)} BSV`;

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            amountInput.value = value.toFixed(8);
            const usdAmount = (value * bsvToUsdRate).toFixed(2);
            amountUSD.textContent = `≈ $${usdAmount}`;
        });

        amountInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value)) {
                slider.value = value;
                const usdAmount = (value * bsvToUsdRate).toFixed(2);
                amountUSD.textContent = `≈ $${usdAmount}`;
            }
        });
    }
}

// Initialize wallet UI
export function initWalletUI() {
    // Fetch BSV price and update values
    fetchBSVPrice();
    setInterval(fetchBSVPrice, 60000); // Update price every minute

    // Setup amount slider when send modal is shown
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            setTimeout(setupAmountSlider, 100); // Setup after modal is shown
        });
    }

    // Handle connect button click to show main wallet if already connected
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
            if (connectBtn.dataset.balance) {
                e.preventDefault();
                showMainWallet();
            }
        });
    }
}

// Export functions
export {
    fetchBSVPrice,
    updateAllUSDValues,
    setupAmountSlider
}; 