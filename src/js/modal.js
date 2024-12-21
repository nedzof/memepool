// Base modal functionality
export class Modal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        if (this.modal) {
            this.setupBaseClasses();
        }
        this.setupEventListeners();
    }

    setupBaseClasses() {
        // Add base modal classes only if they don't exist
        if (!this.modal.classList.contains('fixed')) {
            this.modal.classList.add('fixed', 'inset-0', 'flex', 'items-center', 'justify-center', 'z-50');
        }

        // Setup backdrop if it doesn't exist
        let backdrop = this.modal.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-49';
            this.modal.insertBefore(backdrop, this.modal.firstChild);
        }

        // Setup modal content if it doesn't exist
        let content = this.modal.querySelector('.modal-content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'modal-content relative max-w-md w-full mx-auto z-51';
            
            // Move all other elements into content
            while (this.modal.children.length > 1) {
                content.appendChild(this.modal.children[1]);
            }
            this.modal.appendChild(content);
        }

        // Setup header if it exists and doesn't have required classes
        const header = content.querySelector('.modal-header');
        if (header && !header.classList.contains('flex')) {
            header.classList.add(
                'absolute', 'top-0', 'left-0', 'right-0',
                'flex', 'items-center', 'justify-between',
                'px-4', 'py-3'
            );
        }

        // Setup close button if it exists and doesn't have required classes
        const closeButton = content.querySelector('.modal-close');
        if (closeButton && !closeButton.classList.contains('p-2')) {
            closeButton.classList.add(
                'p-2', 'rounded-lg',
                'transition-all', 'duration-300'
            );
        }

        // Setup body if it exists and doesn't have required classes
        const body = content.querySelector('.modal-body');
        if (body && !body.classList.contains('p-6')) {
            body.classList.add('p-6', 'pt-16');
        }
    }

    setupEventListeners() {
        if (!this.modal) return;

        // Setup close button
        const closeButton = this.modal.querySelector('.modal-close');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            });
        }

        // Setup backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            }
        });

        // Setup escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });
    }

    show() {
        if (!this.modal) return;

        console.log(`=== SHOW MODAL ${this.modalId} START ===`);
        
        // Set initial display state
        this.modal.style.display = 'flex';
        this.modal.style.visibility = 'visible';
        this.modal.style.opacity = '0';
        
        // Force a reflow
        this.modal.offsetHeight;
        
        // Add open class and animate
        requestAnimationFrame(() => {
            this.modal.classList.add('open');
            this.modal.style.opacity = '1';

            // Animate content
            const content = this.modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'scale(0.95)';
                content.style.opacity = '0';
                
                requestAnimationFrame(() => {
                    content.style.transform = 'scale(1)';
                    content.style.opacity = '1';
                });
            }
        });

        console.log(`=== SHOW MODAL ${this.modalId} END ===`);
    }

    hide() {
        if (!this.modal) return;

        console.log(`=== HIDE MODAL ${this.modalId} START ===`);
        
        // Start animation
        this.modal.classList.remove('open');
        this.modal.style.opacity = '0';

        // Animate content
        const content = this.modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(0.95)';
            content.style.opacity = '0';
        }

        // Wait for animation to complete before hiding
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.modal.style.visibility = 'hidden';
            
            // Reset content transform
            if (content) {
                content.style.transform = 'scale(1)';
            }
        }, 300);

        console.log(`=== HIDE MODAL ${this.modalId} END ===`);
    }

    isVisible() {
        return this.modal && 
               this.modal.style.display !== 'none' && 
               this.modal.style.visibility !== 'hidden';
    }
}

// Modal registry to keep track of all modals
const modalRegistry = new Map();

// Helper functions
export function showModal(modalId) {
    if (!modalRegistry.has(modalId)) {
        modalRegistry.set(modalId, new Modal(modalId));
    }
    modalRegistry.get(modalId).show();
}

export function hideModal(modalId) {
    if (modalRegistry.has(modalId)) {
        modalRegistry.get(modalId).hide();
    }
}

export function initializeModal(modalId, options = {}) {
    if (!modalRegistry.has(modalId)) {
        modalRegistry.set(modalId, new Modal(modalId));
    }
    return modalRegistry.get(modalId);
}

// Error message display
export function showError(message, duration = 3000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), duration);
}

// Legacy support for video modal
export function initializeVideoModal() {
    const modal = document.getElementById('videoModal');
    const closeBtn = document.getElementById('closeModal');
    const generateBtn = document.getElementById('generateBtn');
    const startOverBtn = document.getElementById('startOverBtn');
    const signBroadcastBtn = document.getElementById('signBroadcastBtn');
    const promptStep = document.getElementById('promptStep');
    const generatingStep = document.getElementById('generatingStep');
    const previewStep = document.getElementById('previewStep');
    const beatButton = document.querySelector('.beat-button');

    function showStep(step) {
        promptStep?.classList.add('hidden');
        generatingStep?.classList.add('hidden');
        previewStep?.classList.add('hidden');

        switch(step) {
            case 'prompt':
                promptStep?.classList.remove('hidden');
                break;
            case 'generating':
                generatingStep?.classList.remove('hidden');
                break;
            case 'preview':
                previewStep?.classList.remove('hidden');
                break;
        }
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            showStep('generating');
            setTimeout(() => {
                showStep('preview');
            }, 2000);
        });
    }

    if (startOverBtn) {
        startOverBtn.addEventListener('click', () => {
            showStep('prompt');
            const promptText = document.getElementById('promptText');
            if (promptText) {
                promptText.value = '';
            }
        });
    }

    if (signBroadcastBtn) {
        signBroadcastBtn.addEventListener('click', () => {
            hideModal('videoModal');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideModal('videoModal');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal('videoModal');
            }
        });
    }

    if (beatButton) {
        beatButton.addEventListener('click', () => {
            const currentImage = document.querySelector('.current-meme img');
            if (currentImage) {
                showVideoModal(currentImage.src);
            }
        });
    }
}

export function showVideoModal(imageUrl) {
    const modalImage = document.getElementById('modalImage');
    if (imageUrl && modalImage) {
        modalImage.src = imageUrl;
    }
    showModal('videoModal');
    const promptStep = document.getElementById('promptStep');
    if (promptStep) {
        promptStep.classList.remove('hidden');
    }
} 