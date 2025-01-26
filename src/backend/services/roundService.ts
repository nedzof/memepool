import { AerospikeService } from './aerospikeService';
import { MemeService } from './meme.service';
import { WalletService } from './walletService';
import { calculateThreshold, calculateLockDifficulty, calculateRewards } from '../utils/roundUtils';

const aerospikeService = new AerospikeService();
const memeService = new MemeService();
const walletService = new WalletService();

export class RoundService {
  private readonly ROUND_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  async startNewRound() {
    const previousRounds = await aerospikeService.getLastNRounds(12);
    const totalLockedBSV = previousRounds.reduce((sum, round) => sum + round.totalLockedBSV, 0);
    const threshold = calculateThreshold(totalLockedBSV);
    const lockDifficulty = calculateLockDifficulty(threshold);

    const newRound = {
      startTime: Date.now(),
      endTime: Date.now() + this.ROUND_DURATION,
      threshold,
      lockDifficulty,
      submissions: [],
      locks: [],
    };

    await aerospikeService.createRound(newRound);
  }

  async submitMeme(memeId: string, creatorId: string) {
    const currentRound = await aerospikeService.getCurrentRound();
    const meme = await memeService.getMemeById(memeId);

    if (!meme || meme.creatorId !== creatorId) {
      throw new Error('Invalid meme submission');
    }

    const fee = currentRound.lockDifficulty;
    await walletService.lockBSV({ id: creatorId, type: 'BSV' }, fee);

    currentRound.submissions.push(memeId);
    await aerospikeService.updateRound(currentRound);
  }

  async lockMeme(memeId: string, userId: string) {
    const currentRound = await aerospikeService.getCurrentRound();
    const meme = await memeService.getMemeById(memeId);

    if (!meme || !currentRound.submissions.includes(memeId)) {
      throw new Error('Invalid meme lock');
    }

    const userLocks = currentRound.locks.filter((lock) => lock.userId === userId);
    if (userLocks.length >= 3) {
      throw new Error('Maximum locks per user reached');
    }

    const lock = {
      userId,
      memeId,
      amount: 1,
      timestamp: Date.now(),
    };

    currentRound.locks.push(lock);
    await aerospikeService.updateRound(currentRound);
  }

  async endRound() {
    const currentRound = await aerospikeService.getCurrentRound();
    const { submissions, locks, threshold } = currentRound;

    const totalLockedBSV = locks.reduce((sum, lock) => sum + lock.amount, 0);
    const successfulMemes = submissions.filter((memeId) => {
      const memeLocks = locks.filter((lock) => lock.memeId === memeId);
      const totalMemeLocks = memeLocks.reduce((sum, lock) => sum + lock.amount, 0);
      return totalMemeLocks >= threshold;
    });

    if (successfulMemes.length > 0) {
      const { creatorRewards, participantRewards, communityFund } = calculateRewards(totalLockedBSV, successfulMemes, locks);

      // Distribute rewards to creators
      for (const [creatorId, amount] of Object.entries(creatorRewards)) {
        await walletService.transferBSV(process.env.MEMEPOOL_ADDRESS, creatorId, amount);
      }

      // Distribute rewards to participants
      for (const [userId, amount] of Object.entries(participantRewards)) {
        await walletService.transferBSV(process.env.MEMEPOOL_ADDRESS, userId, amount);
      }

      // Transfer community fund to the next round
      const nextRound = await aerospikeService.getNextRound();
      nextRound.communityFund = communityFund;
      await aerospikeService.updateRound(nextRound);
    } else {
      // Recycle 90% of the locked BSV to the next round
      const recycledBSV = totalLockedBSV * 0.9;
      const nextRound = await aerospikeService.getNextRound();
      nextRound.communityFund += recycledBSV;
      await aerospikeService.updateRound(nextRound);

      // Transfer 10% to the community fund
      const communityFund = totalLockedBSV * 0.1;
      await walletService.transferBSV(process.env.MEMEPOOL_ADDRESS, process.env.COMMUNITY_FUND_ADDRESS, communityFund);
    }

    // End the current round
    currentRound.endTime = Date.now();
    await aerospikeService.updateRound(currentRound);
  }
} 