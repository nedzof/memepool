export class VideoProcessor {
    constructor() {
        this.videoElement = document.createElement('video');
    }

    async verifyFormat(file) {
        return new Promise((resolve, reject) => {
            const validTypes = ['video/mp4', 'video/webm'];
            if (!validTypes.includes(file.type)) {
                reject(new Error('Invalid video format'));
                return;
            }

            const url = URL.createObjectURL(file);
            this.videoElement.src = url;

            this.videoElement.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve({
                    isValid: true,
                    format: file.type.split('/')[1]
                });
            };

            this.videoElement.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Invalid video format'));
            };
        });
    }

    async extractMetadata(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            this.videoElement.src = url;

            this.videoElement.onloadedmetadata = () => {
                const metadata = {
                    duration: this.videoElement.duration,
                    dimensions: {
                        width: this.videoElement.videoWidth,
                        height: this.videoElement.videoHeight
                    },
                    codec: file.type.split('/')[1].toUpperCase(),
                    bitrate: Math.round(file.size * 8 / this.videoElement.duration) // Approximate bitrate
                };
                URL.revokeObjectURL(url);
                resolve(metadata);
            };

            this.videoElement.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to extract metadata'));
            };
        });
    }

    async generateThumbnail(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            this.videoElement.src = url;

            this.videoElement.onloadeddata = () => {
                // Seek to the middle of the video
                this.videoElement.currentTime = this.videoElement.duration / 2;
            };

            this.videoElement.onseeked = () => {
                try {
                    // Create a canvas to capture the frame
                    const canvas = document.createElement('canvas');
                    canvas.width = this.videoElement.videoWidth;
                    canvas.height = this.videoElement.videoHeight;
                    
                    // Draw the video frame on the canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to data URL
                    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                    URL.revokeObjectURL(url);
                    resolve(thumbnailUrl);
                } catch (error) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to generate thumbnail'));
                }
            };

            this.videoElement.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to generate thumbnail'));
            };
        });
    }

    async processVideo(file) {
        try {
            // Verify format first
            await this.verifyFormat(file);

            // Extract metadata
            const metadata = await this.extractMetadata(file);

            // Validate duration
            if (metadata.duration > 5) {
                throw new Error('Video duration exceeds 5 seconds');
            }

            // Generate thumbnail
            const thumbnailUrl = await this.generateThumbnail(file);

            // For browser processing, we'll use the original file
            // but create an object URL for it
            const processedVideoUrl = URL.createObjectURL(file);

            return {
                metadata,
                thumbnailUrl,
                processedVideoUrl
            };
        } catch (error) {
            throw new Error(`Video processing failed: ${error.message}`);
        }
    }

    cleanup(urls) {
        urls.forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
} 