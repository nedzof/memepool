import { VideoProcessingUI } from './video-processing.js';

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
        this.allowedTypes = ['video/mp4', 'video/webm'];
        
        this.processingUI = new VideoProcessingUI();
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

        // Handle "Start Over" button
        document.getElementById('startOver').addEventListener('click', () => {
            this.reset();
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

        try {
            // Update upload progress
            this.updateProgress(50);

            // Process the video
            await this.processingUI.processVideo(file);

            // Update progress and hide progress bar
            this.updateProgress(100);
            setTimeout(() => {
                this.uploadProgress.classList.add('hidden');
            }, 500);

        } catch (error) {
            console.error('Error processing video:', error);
            this.showError(error.message || 'Error processing video. Please try again.');
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
        document.getElementById('processingStep').classList.add('hidden');
        document.getElementById('previewStep').classList.add('hidden');
    }
}

// Initialize video uploader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoUploader();
}); 