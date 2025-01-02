/**
 * Service for managing recovery progress, checkpoints, and state
 */
export class RecoveryProgressService {
    constructor() {
        this.CHECKPOINT_INTERVAL = 1000; // Save checkpoint every 1000 blocks
        this.recoveryState = {
            isRunning: false,
            currentBlock: 0,
            processedBlocks: 0,
            totalBlocks: 0,
            errors: [],
            lastProcessedHeight: 0,
            partialData: new Map(),
            checkpoints: new Map(),
            lastCheckpoint: null
        };
    }

    /**
     * Save checkpoint at current height
     * @param {number} height - Current block height
     * @param {Object} state - Current state to save
     * @returns {Promise<boolean>} True if checkpoint saved successfully
     */
    async saveCheckpoint(height, state) {
        try {
            const checkpoint = {
                height,
                timestamp: Date.now(),
                state: { ...state },
                partialData: Array.from(this.recoveryState.partialData.entries())
            };

            this.recoveryState.checkpoints.set(height, checkpoint);
            this.recoveryState.lastCheckpoint = height;

            // Cleanup old checkpoints (keep only last 5)
            const checkpoints = Array.from(this.recoveryState.checkpoints.keys()).sort((a, b) => b - a);
            while (checkpoints.length > 5) {
                const oldHeight = checkpoints.pop();
                this.recoveryState.checkpoints.delete(oldHeight);
            }

            return true;
        } catch (error) {
            console.error('Error saving checkpoint:', error);
            return false;
        }
    }

    /**
     * Restore state from checkpoint
     * @param {number} height - Checkpoint height to restore from
     * @returns {Promise<boolean>} True if restored successfully
     */
    async restoreFromCheckpoint(height) {
        try {
            const checkpoint = this.recoveryState.checkpoints.get(height);
            if (!checkpoint) {
                throw new Error(`No checkpoint found at height ${height}`);
            }

            // Restore state
            Object.assign(this.recoveryState, checkpoint.state);
            this.recoveryState.partialData = new Map(checkpoint.partialData);
            this.recoveryState.lastProcessedHeight = height;
            this.recoveryState.currentBlock = height + 1;

            return true;
        } catch (error) {
            console.error('Error restoring from checkpoint:', error);
            return false;
        }
    }

    /**
     * Get current recovery status
     * @returns {Object} Current recovery status
     */
    getRecoveryStatus() {
        const progress = this.recoveryState.totalBlocks > 0
            ? (this.recoveryState.processedBlocks / this.recoveryState.totalBlocks) * 100
            : 0;

        return {
            isRunning: this.recoveryState.isRunning,
            currentBlock: this.recoveryState.currentBlock,
            processedBlocks: this.recoveryState.processedBlocks,
            totalBlocks: this.recoveryState.totalBlocks,
            progress: progress.toFixed(2),
            errors: [...this.recoveryState.errors],
            lastProcessedHeight: this.recoveryState.lastProcessedHeight,
            partialDataCount: this.recoveryState.partialData.size,
            lastCheckpoint: this.recoveryState.lastCheckpoint
        };
    }

    /**
     * Add partial data for retry
     * @param {string} key - Data key
     * @param {Object} data - Partial data
     */
    addPartialData(key, data) {
        this.recoveryState.partialData.set(key, data);
    }

    /**
     * Get partial data for retry
     * @returns {Array} Array of partial data entries
     */
    getPartialData() {
        return Array.from(this.recoveryState.partialData.entries());
    }

    /**
     * Clear partial data
     * @param {string} key - Data key to clear
     */
    clearPartialData(key) {
        this.recoveryState.partialData.delete(key);
    }

    /**
     * Update recovery state
     * @param {Object} updates - State updates
     */
    updateState(updates) {
        Object.assign(this.recoveryState, updates);
    }

    /**
     * Add error to recovery state
     * @param {string} error - Error message
     */
    addError(error) {
        this.recoveryState.errors.push({
            timestamp: Date.now(),
            message: error
        });
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        this.recoveryState.errors = [];
    }
} 