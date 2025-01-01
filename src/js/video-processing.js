import { VideoProcessor } from '../services/video-processor.js';
import { InscriptionService } from '../services/inscription-service.js';
import { BSVService } from '../services/bsv-service.js';

export class VideoProcessingUI {
    constructor() {
        this.videoProcessor = new VideoProcessor();
        this.inscriptionService = new InscriptionService();
        this.bsvService = new BSVService();
        this.initializeElements();
        this.activeUrls = [];
        this.setupEventListeners();
        this.initializeWalletAddress();
        this.balanceUpdateTimer = null;
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

        // Inscription elements
        this.inscriptionId = document.getElementById('inscriptionId');
        this.inscriptionCreator = document.getElementById('inscriptionCreator');
        this.inscriptionTimestamp = document.getElementById('inscriptionTimestamp');
        this.walletBalance = document.getElementById('walletBalance');
        
        // Processing step indicators
        this.stepVerification = document.getElementById('stepVerification');
        this.stepMetadata = document.getElementById('stepMetadata');
        this.stepThumbnail = document.getElementById('stepThumbnail');

        // Add BSV elements
        this.signBroadcastBtn = document.getElementById('signBroadcast');
        this.walletStatus = document.getElementById('walletStatus');
    }

    setupEventListeners() {
        this.signBroadcastBtn?.addEventListener('click', () => this.handleSignAndBroadcast());
    }

    async handleSignAndBroadcast() {
        try {
            // Connect wallet if not connected
            if (!this.bsvService.wallet) {
                const address = await this.bsvService.connectWallet();
                this.inscriptionCreator.textContent = address;
            }

            // Get current file and metadata
            const file = this.currentFile;
            const metadata = this.currentMetadata;

            if (!file || !metadata) {
                throw new Error('No video selected');
            }

            // Get wallet address
            const address = await this.bsvService.getWalletAddress();
            
            // Create inscription data with wallet address
            const inscriptionData = this.inscriptionService.createInscriptionData(file, metadata, address);
            this.currentInscriptionData = inscriptionData;
            
            // Update UI with inscription data
            this.updateInscriptionData(inscriptionData);

            // Create and broadcast transaction
            const txid = await this.bsvService.createInscriptionTransaction(inscriptionData, file);

            // Update UI with transaction status
            this.updateTransactionStatus(txid);

        } catch (error) {
            console.error('Transaction failed:', error);
            // Show error in modal
            const uploadError = document.getElementById('uploadError');
            uploadError.textContent = error.message;
            uploadError.classList.remove('hidden');
        }
    }

    async updateTransactionStatus(txid) {
        try {
            const status = await this.bsvService.getTransactionStatus(txid);
            
            // Update UI with transaction status
            if (status.confirmed) {
                this.signBroadcastBtn.textContent = 'Inscription Confirmed';
                this.signBroadcastBtn.disabled = true;
            } else {
                this.signBroadcastBtn.textContent = `Confirming (${status.confirmations})...`;
            }
        } catch (error) {
            console.error('Failed to update transaction status:', error);
        }
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

    updateInscriptionData(inscriptionData) {
        this.inscriptionId.textContent = inscriptionData.content.id;
        this.inscriptionCreator.textContent = inscriptionData.content.creator;
        this.inscriptionTimestamp.textContent = new Date(inscriptionData.content.timestamp)
            .toLocaleString();
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
            this.currentFile = file;
            this.showProcessingStep();
            
            // Initialize all steps to waiting
            this.updateStepStatus(this.stepVerification, 'waiting');
            this.updateStepStatus(this.stepMetadata, 'waiting');
            this.updateStepStatus(this.stepThumbnail, 'waiting');

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
            
            // Get wallet address (or connect if needed)
            let address;
            try {
                address = await this.bsvService.getWalletAddress();
            } catch (error) {
                address = await this.bsvService.connectWallet();
                // Start balance updates when wallet is connected
                this.startBalanceUpdates();
            }
            
            // Create inscription data
            const inscriptionData = this.inscriptionService.createInscriptionData(file, metadata, address);
            this.currentInscriptionData = inscriptionData;
            this.updateInscriptionData(inscriptionData);
            
            // Calculate estimated fees
            const totalSize = file.size + JSON.stringify(inscriptionData).length;
            const feeInfo = await this.bsvService.calculateFee(totalSize);
            this.updateFeeEstimate(feeInfo);

            // Create URL for video preview
            const videoUrl = URL.createObjectURL(file);
            this.activeUrls.push(videoUrl);

            // Show preview
            const previewVideo = document.getElementById('previewVideo');
            previewVideo.src = videoUrl;
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

    updateFeeEstimate(feeInfo) {
        const estimatedFee = document.getElementById('estimatedFee');
        const feeDetails = document.getElementById('feeDetails');
        
        if (estimatedFee) {
            estimatedFee.textContent = `${feeInfo.bsv} BSV`;
        }
        
        if (feeDetails) {
            feeDetails.innerHTML = `
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <span class="text-white/50 text-xs">Size</span>
                        <p class="text-white text-sm">${feeInfo.sizeKb.toFixed(2)} KB</p>
                    </div>
                    <div>
                        <span class="text-white/50 text-xs">Rounded Size</span>
                        <p class="text-white text-sm">${feeInfo.roundedKb} KB</p>
                    </div>
                </div>
                <div class="mt-2">
                    <span class="text-white/50 text-xs">Network Fee</span>
                    <p class="text-white text-sm">${feeInfo.fee} satoshis (${feeInfo.rate} sat/KB)</p>
                </div>
            `;
        }
    }

    cleanup() {
        // Clean up any object URLs we created
        this.videoProcessor.cleanup(this.activeUrls);
        this.activeUrls = [];
        this.currentFile = null;
        this.currentInscriptionData = null;
        
        // Stop balance updates
        if (this.balanceUpdateTimer) {
            this.bsvService.stopBalanceUpdates(this.balanceUpdateTimer);
            this.balanceUpdateTimer = null;
        }
    }

    async initializeWalletAddress() {
        try {
            // Try to get wallet address if already connected
            const address = await this.bsvService.getWalletAddress();
            if (address) {
                this.inscriptionCreator.textContent = address;
                // Start balance updates
                this.startBalanceUpdates();
            }
        } catch (error) {
            console.log('Wallet not yet connected');
        }
    }

    startBalanceUpdates() {
        // Stop any existing updates
        if (this.balanceUpdateTimer) {
            this.bsvService.stopBalanceUpdates(this.balanceUpdateTimer);
        }
        
        // Start new balance updates
        this.balanceUpdateTimer = this.bsvService.startBalanceUpdates((balance) => {
            if (this.walletBalance) {
                this.walletBalance.textContent = `${balance.toFixed(8)} BSV`;
            }
        });
    }
} 