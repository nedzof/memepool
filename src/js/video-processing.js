import { VideoProcessor } from '../services/video-processor.js';

export class VideoProcessingUI {
    constructor() {
        this.videoProcessor = new VideoProcessor();
        this.initializeElements();
        this.activeUrls = [];
    }

    initializeElements() {
        // Processing step elements
        this.processingStep = document.getElementById('processingStep');
        this.processingStatus = document.getElementById('processingStatus');
        
        // Metadata elements
        this.videoDuration = document.getElementById('videoDuration');
        this.videoFormat = document.getElementById('videoFormat');
        this.videoResolution = document.getElementById('videoResolution');
        this.videoBitrate = document.getElementById('videoBitrate');
        
        // Preview metadata elements
        this.previewDuration = document.getElementById('previewDuration');
        this.previewFormat = document.getElementById('previewFormat');
        this.previewResolution = document.getElementById('previewResolution');
        this.previewBitrate = document.getElementById('previewBitrate');
        this.previewSize = document.getElementById('previewSize');
        
        // Processing step indicators
        this.stepVerification = document.getElementById('stepVerification');
        this.stepMetadata = document.getElementById('stepMetadata');
        this.stepThumbnail = document.getElementById('stepThumbnail');
        this.stepOptimization = document.getElementById('stepOptimization');
    }

    showProcessingStep() {
        document.getElementById('uploadStep').classList.add('hidden');
        this.processingStep.classList.remove('hidden');
        document.getElementById('previewStep').classList.add('hidden');
    }

    updateStepStatus(stepElement, status) {
        const spinner = stepElement.querySelector('.spinner-icon');
        const checkmark = stepElement.querySelector('.check-icon');
        
        switch (status) {
            case 'pending':
                spinner.classList.remove('hidden');
                checkmark.classList.add('hidden');
                stepElement.classList.remove('text-green-500');
                break;
            case 'complete':
                spinner.classList.add('hidden');
                checkmark.classList.remove('hidden');
                stepElement.classList.add('text-green-500');
                break;
            case 'waiting':
                spinner.classList.add('hidden');
                checkmark.classList.add('hidden');
                stepElement.classList.remove('text-green-500');
                break;
        }
    }

    updateMetadata(metadata) {
        // Update processing step metadata
        this.videoDuration.textContent = this.formatDuration(metadata.duration);
        this.videoFormat.textContent = metadata.codec;
        this.videoResolution.textContent = `${metadata.dimensions.width}x${metadata.dimensions.height}`;
        this.videoBitrate.textContent = `${Math.round(metadata.bitrate / 1000)} Kbps`;

        // Update preview metadata
        this.previewDuration.textContent = this.formatDuration(metadata.duration);
        this.previewFormat.textContent = metadata.codec;
        this.previewResolution.textContent = `${metadata.dimensions.width}x${metadata.dimensions.height}`;
        this.previewBitrate.textContent = `${Math.round(metadata.bitrate / 1000)} Kbps`;
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }

    async processVideo(file) {
        try {
            this.showProcessingStep();
            
            // Initialize all steps to waiting
            this.updateStepStatus(this.stepVerification, 'waiting');
            this.updateStepStatus(this.stepMetadata, 'waiting');
            this.updateStepStatus(this.stepThumbnail, 'waiting');
            this.updateStepStatus(this.stepOptimization, 'waiting');

            // Step 1: Format verification
            this.updateStepStatus(this.stepVerification, 'pending');
            await this.videoProcessor.verifyFormat(file);
            this.updateStepStatus(this.stepVerification, 'complete');

            // Step 2: Metadata extraction
            this.updateStepStatus(this.stepMetadata, 'pending');
            const metadata = await this.videoProcessor.extractMetadata(file);
            this.updateMetadata(metadata);
            this.updateStepStatus(this.stepMetadata, 'complete');

            // Update file size
            this.previewSize.textContent = this.formatFileSize(file.size);

            // Validate duration
            if (metadata.duration > 5) {
                throw new Error('Video duration exceeds 5 seconds');
            }

            // Step 3: Thumbnail generation
            this.updateStepStatus(this.stepThumbnail, 'pending');
            const thumbnailUrl = await this.videoProcessor.generateThumbnail(file);
            this.activeUrls.push(thumbnailUrl);
            this.updateStepStatus(this.stepThumbnail, 'complete');

            // Step 4: Video optimization (in browser, we just use the original file)
            this.updateStepStatus(this.stepOptimization, 'pending');
            const result = await this.videoProcessor.processVideo(file);
            this.activeUrls.push(result.processedVideoUrl);
            this.updateStepStatus(this.stepOptimization, 'complete');

            // Show preview
            const previewVideo = document.getElementById('previewVideo');
            previewVideo.src = result.processedVideoUrl;
            this.processingStep.classList.add('hidden');
            document.getElementById('previewStep').classList.remove('hidden');

        } catch (error) {
            // Show error in the upload step
            const uploadError = document.getElementById('uploadError');
            uploadError.textContent = error.message;
            uploadError.classList.remove('hidden');
            
            // Reset to upload step
            this.processingStep.classList.add('hidden');
            document.getElementById('uploadStep').classList.remove('hidden');
            
            // Cleanup any created URLs
            this.cleanup();
        }
    }

    cleanup() {
        // Clean up any object URLs we created
        this.videoProcessor.cleanup(this.activeUrls);
        this.activeUrls = [];
    }
} 