interface Lock {
  userId: string;
  memeId: string;
  amount: number;
  timestamp: number;
}

interface Rewards {
  creatorRewards: { [creatorId: string]: number };
  participantRewards: { [userId: string]: number };
  communityFund: number;
}

export const calculateThreshold = (totalLockedBSV: number): number => {
  // Calculate threshold based on the formula from README:
  // Tₙ = 0.7T_{prev} + 0.3(1/12∑S_{last12})
  const averageLockedBSV = totalLockedBSV / 12;
  const threshold = 0.7 * totalLockedBSV + 0.3 * averageLockedBSV;
  return Math.max(0.01, threshold);
};

export const calculateLockDifficulty = (threshold: number): number => {
  // Calculate lock difficulty based on the formula from README:
  // Dₙ = max($0.01, 0.000004Tₙ^1.2)
  const difficulty = 0.000004 * Math.pow(threshold, 1.2);
  return Math.max(0.01, difficulty);
};

export const calculateRewards = (
  totalLockedBSV: number,
  successfulMemes: string[],
  locks: Lock[]
): Rewards => {
  // Calculate rewards based on the formulas from README
  const totalPool = totalLockedBSV;
  
  // 50% to top 3 memes
  const creatorPool = totalPool * 0.5;
  const creatorRewards: { [creatorId: string]: number } = {};
  successfulMemes.slice(0, 3).forEach((memeId, index) => {
    const share = [0.5, 0.3, 0.2][index] || 0;
    creatorRewards[memeId] = creatorPool * share;
  });

  // 49% to top 10% lockers with 10x decay
  const participantPool = totalPool * 0.49;
  const sortedLocks = locks.sort((a, b) => b.amount - a.amount);
  const topLockers = sortedLocks.slice(0, Math.ceil(sortedLocks.length * 0.1));
  const participantRewards: { [userId: string]: number } = {};
  
  topLockers.forEach((lock, index) => {
    const position = index + 1;
    const N = topLockers.length;
    const reward = (participantPool / (10 * N)) * (11 - (10 * position) / N);
    participantRewards[lock.userId] = reward;
  });

  // 1% to community fund
  const communityFund = totalPool * 0.01;

  return {
    creatorRewards,
    participantRewards,
    communityFund
  };
}; 