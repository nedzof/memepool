import { bsv } from '@bsv/sdk';

export class BSVService {
  private readonly MEMEPOOL_ADDRESS = process.env.MEMEPOOL_ADDRESS as string;

  async getCurrentThreshold(): Promise<number> {
    try {
      // Get total BSV locked in previous 12 blocks
      const last12Blocks = await this.getLast12BlocksLocks();
      const prevThreshold = await this.getPreviousThreshold();

      // Calculate new threshold using formula:
      // Tₙ = 0.7T_{prev} + 0.3(1/12∑S_{last12})
      const avgLocks = last12Blocks.reduce((sum, locks) => sum + locks, 0) / 12;
      const newThreshold = 0.7 * prevThreshold + 0.3 * avgLocks;

      return newThreshold;
    } catch (error) {
      throw new Error('Failed to get current threshold');
    }
  }

  calculateLockDifficulty(threshold: number): number {
    // Dₙ = max($0.01, 0.000004Tₙ^1.2)
    const calculated = 0.000004 * Math.pow(threshold, 1.2);
    return Math.max(0.01, calculated);
  }

  async lockBSV(from: string, amount: number) {
    try {
      const tx = await bsv.sendPayment({
        from,
        to: this.MEMEPOOL_ADDRESS,
        amount
      });

      return tx;
    } catch (error) {
      throw new Error('Failed to lock BSV');
    }
  }

  private async getLast12BlocksLocks(): Promise<number[]> {
    try {
      // Fetch and return total locks for each of the last 12 blocks
      const blocks = await bsv.getBlocks({ limit: 12 });
      return blocks.map(block => this.calculateBlockLocks(block));
    } catch (error) {
      throw new Error('Failed to get last 12 blocks locks');
    }
  }

  private async getPreviousThreshold(): Promise<number> {
    try {
      // Get the threshold used in the previous block
      const lastBlock = await bsv.getLatestBlock();
      return this.extractThresholdFromBlock(lastBlock);
    } catch (error) {
      throw new Error('Failed to get previous threshold');
    }
  }

  private calculateBlockLocks(block: any): number {
    // Calculate total BSV locked in a block
    return block.transactions.reduce((sum: number, tx: any) => {
      if (tx.outputs.some((out: any) => out.address === this.MEMEPOOL_ADDRESS)) {
        return sum + tx.outputs.reduce((outSum: number, out: any) => {
          return out.address === this.MEMEPOOL_ADDRESS ? outSum + out.value : outSum;
        }, 0);
      }
      return sum;
    }, 0);
  }

  private extractThresholdFromBlock(block: any): number {
    // Extract threshold value from block metadata
    // This is a placeholder - actual implementation would depend on where/how we store the threshold
    return block.metadata?.threshold || 1000; // Default to 1000 if not found
  }
} 