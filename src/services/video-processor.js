export class VideoProcessor {
    constructor() {
        // No need to create video element in constructor
    }

    createVideoElement() {
        const video = document.createElement('video');
        video.preload = 'metadata';
        return video;
    }

    async verifyFormat(file) {
        return new Promise((resolve, reject) => {
            const validTypes = ['video/mp4', 'video/webm'];
            if (!validTypes.includes(file.type)) {
                reject(new Error('Invalid video format'));
                return;
            }

            const video = this.createVideoElement();
            const url = URL.createObjectURL(file);
            video.src = url;

            const cleanup = () => {
                URL.revokeObjectURL(url);
                video.onloadedmetadata = null;
                video.onerror = null;
            };

            video.onloadedmetadata = () => {
                cleanup();
                resolve({
                    isValid: true,
                    format: file.type.split('/')[1]
                });
            };

            video.onerror = () => {
                cleanup();
                reject(new Error('Invalid video format'));
            };
        });
    }

    async extractMetadata(file) {
        return new Promise((resolve, reject) => {
            const video = this.createVideoElement();
            const url = URL.createObjectURL(file);
            video.src = url;

            const cleanup = () => {
                URL.revokeObjectURL(url);
                video.onloadedmetadata = null;
                video.onerror = null;
            };

            video.onloadedmetadata = () => {
                const metadata = {
                    duration: video.duration,
                    dimensions: {
                        width: video.videoWidth,
                        height: video.videoHeight
                    },
                    codec: file.type.split('/')[1].toUpperCase(),
                    bitrate: Math.round(file.size * 8 / video.duration) // Approximate bitrate
                };
                cleanup();
                resolve(metadata);
            };

            video.onerror = () => {
                cleanup();
                reject(new Error('Failed to extract metadata'));
            };
        });
    }

    async generateThumbnail(file) {
        return new Promise((resolve, reject) => {
            const video = this.createVideoElement();
            const url = URL.createObjectURL(file);
            video.src = url;

            const cleanup = () => {
                URL.revokeObjectURL(url);
                video.onloadeddata = null;
                video.onseeked = null;
                video.onerror = null;
            };

            video.onloadeddata = () => {
                // Seek to the middle of the video
                video.currentTime = video.duration / 2;
            };

            video.onseeked = () => {
                try {
                    // Create a canvas to capture the frame
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Draw the video frame on the canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to data URL
                    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                    cleanup();
                    resolve(thumbnailUrl);
                } catch (error) {
                    cleanup();
                    reject(new Error('Failed to generate thumbnail'));
                }
            };

            video.onerror = () => {
                cleanup();
                reject(new Error('Failed to generate thumbnail'));
            };
        });
    }

    cleanup(urls) {
        urls.forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
} 