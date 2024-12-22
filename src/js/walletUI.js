// Core UI functions
export { showModal, hideModal, showError, initializeModal } from './modal.js';

// Wallet UI Management
export { initializeWalletUI, updateWalletUI, resetWalletUI, setWalletLoading } from './wallet/walletUIManager.js';
export { showWalletSelection } from './wallet/walletSelection.js';
export { showMainWallet } from './wallet/modalManager.js';
export { generateNewWallet } from './wallet/walletGeneration.js';

// Additional wallet features
export { updateProfileWithPersistence } from './wallet/cache.js';
export { authenticateWithX } from './wallet/auth/xAuth.js';
export { setupReceiveModal } from './wallet/qrCode.js';