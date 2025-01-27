import axios from 'axios';
import { EventEmitter } from 'events';

export class BlockStateService {
  private static instance: BlockStateService;
  private currentBlockHeight: number = 0;
  private eventEmitter: EventEmitter;
  private readonly WHATSONCHAIN_API = 'https://api.whatsonchain.com/v1/bsv/main';
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.initializeBlockHeight();
  }

  public static getInstance(): BlockStateService {
    if (!BlockStateService.instance) {
      BlockStateService.instance = new BlockStateService();
    }
    return BlockStateService.instance;
  }

  private async initializeBlockHeight() {
    await this.updateBlockHeight();
    // Update block height every minute
    this.updateInterval = setInterval(() => this.updateBlockHeight(), 60000);
  }

  private async updateBlockHeight() {
    try {
      const response = await axios.get(`${this.WHATSONCHAIN_API}/chain/info`);
      const newHeight = response.data.blocks;
      
      if (newHeight !== this.currentBlockHeight) {
        this.currentBlockHeight = newHeight;
        this.eventEmitter.emit('blockHeightChanged', newHeight);
      }
    } catch (error) {
      console.error('Failed to update block height:', error);
    }
  }

  public getCurrentBlockHeight(): number {
    return this.currentBlockHeight;
  }

  public async shiftToNextBlock(): Promise<void> {
    // Increment the block height
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
} 