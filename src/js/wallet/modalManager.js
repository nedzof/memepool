import { setupMainWalletEvents, updateBalanceDisplay } from './walletEvents.js';

// Show modal with animation
export function showModal(modalId) {
    console.log('Showing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    // Add overlay and backdrop with enhanced animations
    modal.classList.remove('hidden');
    modal.classList.add('modal-overlay', 'neon-border');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '50';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.backdropFilter = 'blur(8px)';
    console.log('Modal base styles applied');

    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        // Prevent event propagation on modal content
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        content.classList.add('modal-enter');
        console.log('Modal content found and enter animation added');
        
        // Add Solana-style effects
        content.querySelectorAll('.wallet-action-btn').forEach(btn => {
            btn.classList.add('neon-button', 'ripple');
        });
        
        content.querySelectorAll('input').forEach(input => {
            input.classList.add('neon-input');
        });
        
        content.querySelectorAll('.balance-value').forEach(balance => {
            balance.classList.add('neon-text');
        });
        
        // Add glowing effects to cards
        content.querySelectorAll('[class*="rounded-xl"]').forEach(card => {
            if (!card.classList.contains('neon-button')) {
                card.classList.add('balance-card');
            }
        });
        
        // Add backdrop blur with animation
        modal.classList.add('modal-backdrop');
        console.log('Solana effects applied');
        
        // Trigger animations
        requestAnimationFrame(() => {
            modal.classList.add('show');
            content.classList.add('show');
            console.log('Show animations triggered');
        });
    } else {
        console.error('No modal content found');
    }

    // Add click outside to close
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal(modalId);
        }
    };
    
    // Remove any existing click listeners
    modal.removeEventListener('click', handleOutsideClick);
    // Add the click listener
    modal.addEventListener('click', handleOutsideClick);
}

// Hide modal with enhanced animation
export function hideModal(modalId) {
    console.log('Hiding modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        content.classList.remove('show');
        content.classList.add('modal-exit');
        modal.classList.remove('show');

        // Remove Solana-style effects
        content.querySelectorAll('.neon-button, .neon-text, .neon-input, .balance-card').forEach(el => {
            el.classList.remove('neon-button', 'neon-text', 'neon-input', 'balance-card');
        });

        // Wait for animation to complete
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            content.classList.remove('modal-exit');
            modal.classList.remove('modal-backdrop', 'neon-border');
            console.log('Modal hidden:', modalId);
        }, 300);
    } else {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log('Modal hidden (no content):', modalId);
    }

    // Remove click event listener
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal(modalId);
        }
    };
    modal.removeEventListener('click', handleOutsideClick);
}

// Show main wallet modal with enhanced animations
export function showMainWallet() {
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (mainWalletModal) {
        mainWalletModal.classList.remove('hidden');
        mainWalletModal.style.display = 'flex';
        mainWalletModal.classList.add('modal-enter', 'neon-border');
        
        // Setup main wallet events
        setupMainWalletEvents();
        
        // Setup modal navigation
        setupModalNavigation();
        
        // Update balance
        updateBalanceDisplay();
        
        // Add Solana-style effects
        const content = mainWalletModal.querySelector('.modal-content') || mainWalletModal.firstElementChild;
        if (content) {
            // Add neon effects to buttons and text
            content.querySelectorAll('.wallet-action-btn').forEach(btn => {
                btn.classList.add('neon-button', 'ripple');
            });
            
            content.querySelectorAll('.balance-value').forEach(balance => {
                balance.classList.add('neon-text');
            });
            
            // Add glowing effects to cards
            content.querySelectorAll('[class*="rounded-xl"]').forEach(card => {
                if (!card.classList.contains('neon-button')) {
                    card.classList.add('balance-card');
                }
            });
            
            content.classList.add('show');
        }
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000);
        
        // Trigger animation
        requestAnimationFrame(() => {
            mainWalletModal.classList.add('show');
        });
    }
}

// Setup modal navigation
export function setupModalNavigation() {
    // Setup back buttons
    document.querySelectorAll('.back-to-menu').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('[id$="Modal"]');
            if (modal) {
                hideModal(modal.id);
                showModal('mainWalletModal');
            }
        });
    });

    // Setup close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('[id$="Modal"]');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
}

// Show error message
export function showWalletError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
} 