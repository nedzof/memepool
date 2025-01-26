/**
 * Calculates the reward for a given lock position
 * Formula: Rᵥ = (0.49Pool/10N) × (11 - 10LockPos/N)
 */
export function calculateReward(
  poolAmount: number,
  totalParticipants: number,
  lockPosition: number
): number {
  if (lockPosition > totalParticipants * 0.1) {
    return 0; // Only top 10% qualify
  }

  const baseReward = (0.49 * poolAmount) / (10 * totalParticipants);
  const multiplier = 11 - (10 * lockPosition) / totalParticipants;
  return baseReward * multiplier;
}

/**
 * Calculates the adaptive threshold
 * Formula: Tₙ = 0.7T_{prev} + 0.3(1/12∑S_{last12})
 */
export function calculateThreshold(
  previousThreshold: number,
  last12BlocksLocks: number[]
): number {
  const avgLocks = last12BlocksLocks.reduce((sum, locks) => sum + locks, 0) / 12;
  return 0.7 * previousThreshold + 0.3 * avgLocks;
}

/**
 * Calculates the lock difficulty
 * Formula: Dₙ = max($0.01, 0.000004Tₙ^1.2)
 */
export function calculateLockDifficulty(threshold: number): number {
  const calculated = 0.000004 * Math.pow(threshold, 1.2);
  return Math.max(0.01, calculated);
}

/**
 * Calculates the number of pages for pagination
 */
export function calculatePages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Validates if a number is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Formats a BSV amount to a human-readable string
 */
export function formatBSV(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  }).format(amount);
} 