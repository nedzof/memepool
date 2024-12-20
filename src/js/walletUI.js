// Export all necessary functions from their respective modules
export { initializeWallet } from './wallet/walletInit.js';
export { showWalletSelection } from './wallet/modalManager.js';
export { generateNewWallet } from './wallet/walletGeneration.js';
export { showWalletError, showModal, hideModal, showMainWallet } from './wallet/modalManager.js';
export { updateProfileWithPersistence } from './wallet/cache.js';
export { authenticateWithX } from './wallet/auth/xAuth.js';
export { setupReceiveModal } from './wallet/qrCode.js';
export { updateBalanceDisplay } from './wallet/walletEvents.js';