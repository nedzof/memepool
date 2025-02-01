import axios from 'axios';
import { EventEmitter } from 'events';

export class BlockStateService {
  private static instance: BlockStateService;
  private currentBlockHeight: number = 0;
  private eventEmitter: EventEmitter;
  private readonly WHATSONCHAIN_API = 'https://api.whatsonchain.com/v1/bsv/main';
  private updateInterval: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  private initialized: boolean = false;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): BlockStateService {
    if (!BlockStateService.instance) {
      BlockStateService.instance = new BlockStateService();
    }
    return BlockStateService.instance;
  }

  public async start() {
    if (this.initialized) {
      console.log('BlockStateService already initialized');
      return;
    }

    try {
      console.log('Starting BlockStateService initialization...');
      await this.initializeBlockHeight();
      this.initialized = true;
      console.log('BlockStateService initialization completed successfully');
    } catch (error) {
      console.error('BlockStateService initialization failed:', error);
      this.initialized = false;
      throw error; // Let the caller handle the error
    }
  }

  private async initializeBlockHeight() {
    try {
      console.log('Initializing block height...');
      await this.updateBlockHeight();
      console.log(`Initial block height: ${this.currentBlockHeight}`);
      
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }

      this.updateInterval = setInterval(() => {
        console.log('Performing scheduled block height update...');
        this.updateBlockHeight().catch(error => {
          console.error('Scheduled block height update failed:', error);
        });
      }, 60000);
    } catch (error) {
      console.error('Block height initialization failed:', error);
      throw error; // Propagate the error up
    }
  }

  private async updateBlockHeight() {
    try {
      console.log('Fetching block height from WhatsonChain API...');
      const response = await axios.get(`${this.WHATSONCHAIN_API}/chain/info`);
      console.log('WhatsonChain API response:', response.data);
      
      const newHeight = response.data.blocks;
      if (typeof newHeight !== 'number') {
        throw new Error(`Invalid block height received: ${newHeight}`);
      }
      
      if (newHeight !== this.currentBlockHeight) {
        console.log(`Block height updated: ${this.currentBlockHeight} → ${newHeight}`);
        this.currentBlockHeight = newHeight;
        this.eventEmitter.emit('blockHeightChanged', newHeight);
      }
      
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.error('Failed to update block height:', error);
      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      
      // Add retry logic
      if (this.retryCount < 3) {
        this.retryCount++;
        console.log(`Retrying block height update (attempt ${this.retryCount})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.updateBlockHeight();
      }
      
      console.error('Block height update failed after 3 attempts');
      throw error; // Propagate the error up
    }
  }

  public getCurrentBlockHeight(): number {
    return this.currentBlockHeight;
  }

  public async shiftToNextBlock(): Promise<void> {
    this.currentBlockHeight += 1;
    this.eventEmitter.emit('blockHeightChanged', this.currentBlockHeight);
  }

  public onBlockHeightChanged(callback: (height: number) => void) {
    this.eventEmitter.on('blockHeightChanged', callback);
  }

  public removeBlockHeightListener(callback: (height: number) => void) {
    this.eventEmitter.off('blockHeightChanged', callback);
  }

  public cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.eventEmitter.removeAllListeners();
  }

  public isInitialized() {
    return this.initialized && this.currentBlockHeight > 0;
  }
} 