export function initializeModal() {
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
        promptStep.classList.add('hidden');
        generatingStep.classList.add('hidden');
        previewStep.classList.add('hidden');

        switch(step) {
            case 'prompt':
                promptStep.classList.remove('hidden');
                break;
            case 'generating':
                generatingStep.classList.remove('hidden');
                break;
            case 'preview':
                previewStep.classList.remove('hidden');
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
            closeModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeModal();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    if (beatButton) {
        beatButton.addEventListener('click', () => {
            const currentImage = document.querySelector('.current-meme img');
            if (currentImage) {
                openModal(currentImage.src);
            }
        });
    }

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

export function openModal(imageUrl) {
    const modal = document.getElementById('videoModal');
    const modalImage = document.getElementById('modalImage');
    if (imageUrl && modalImage) {
        modalImage.src = imageUrl;
    }
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('modal-open');
        showStep('prompt');
    }
}

export function closeModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.add('modal-close');
        setTimeout(() => {
            modal.classList.remove('modal-open', 'modal-close');
            modal.classList.add('hidden');
            showStep('prompt');
        }, 300);
    }
} 