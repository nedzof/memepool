import { showError } from './modal.js';

export class VideoUploader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.uploadError = document.getElementById('uploadError');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.previewVideo = document.getElementById('previewVideo');
        
        this.maxSize = 100 * 1024 * 1024; // 100MB
        this.maxDuration = 5; // 5 seconds
        this.allowedTypes = ['video/mp4', 'video/webm'];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File input change handler
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.validateAndProcessVideo(file);
            }
        });

        // Drag and drop handlers
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('border-white/50');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('border-white/50');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('border-white/50');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.validateAndProcessVideo(file);
            }
        });
    }

    showError(message) {
        this.uploadError.textContent = message;
        this.uploadError.classList.remove('hidden');
        setTimeout(() => {
            this.uploadError.classList.add('hidden');
        }, 5000);
    }

    updateProgress(percent) {
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}%`;
    }

    async validateAndProcessVideo(file) {
        // Reset state
        this.uploadError.classList.add('hidden');
        this.uploadProgress.classList.remove('hidden');
        this.updateProgress(0);

        // Validate file type
        if (!this.allowedTypes.includes(file.type)) {
            this.showError('Invalid file type. Please upload MP4 or WebM videos only.');
            this.uploadProgress.classList.add('hidden');
            return;
        }

        // Validate file size
        if (file.size > this.maxSize) {
            this.showError('File too large. Maximum size is 100MB.');
            this.uploadProgress.classList.add('hidden');
            return;
        }

        // Create video element for duration check
        const video = document.createElement('video');
        video.preload = 'metadata';

        try {
            // Create object URL for the file
            const objectUrl = URL.createObjectURL(file);
            video.src = objectUrl;

            // Wait for metadata to load
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = resolve;
                video.onerror = reject;
            });

            // Validate duration
            if (video.duration > this.maxDuration) {
                this.showError('Video too long. Maximum duration is 5 seconds.');
                this.uploadProgress.classList.add('hidden');
                URL.revokeObjectURL(objectUrl);
                return;
            }

            // Update progress
            this.updateProgress(50);

            // Show preview
            this.previewVideo.src = objectUrl;
            await new Promise((resolve) => {
                this.previewVideo.onloadeddata = resolve;
            });

            // Update progress and show preview step
            this.updateProgress(100);
            document.getElementById('uploadStep').classList.add('hidden');
            document.getElementById('previewStep').classList.remove('hidden');

            // Clean up
            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('Error processing video:', error);
            this.showError('Error processing video. Please try again.');
            this.uploadProgress.classList.add('hidden');
        }
    }

    reset() {
        // Reset form
        this.fileInput.value = '';
        this.uploadError.classList.add('hidden');
        this.uploadProgress.classList.add('hidden');
        this.updateProgress(0);
        
        // Reset preview
        this.previewVideo.src = '';
        
        // Show upload step
        document.getElementById('uploadStep').classList.remove('hidden');
        document.getElementById('previewStep').classList.add('hidden');
    }
}

// Initialize video uploader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const uploader = new VideoUploader();
    
    // Handle "Start Over" button
    document.getElementById('startOver').addEventListener('click', () => {
        uploader.reset();
    });
}); 