import React from 'react';
import { FiTrendingUp, FiLock, FiClock, FiZap } from 'react-icons/fi';

interface RoundStatsProps {
  totalLocked: number;
  threshold: number;
  timeLeft: number;
  participantCount: number;
  roundNumber: number;
}

const RoundStats: React.FC<RoundStatsProps> = ({
  totalLocked,
  threshold,
  timeLeft,
  participantCount,
  roundNumber
}) => {
  const formatBSV = (amount: number): string => {
    return `${amount.toFixed(2)} BSV`;
  };

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = (totalLocked / threshold) * 100;

  return (
    <div className="bg-gradient-to-r from-[#2A2A40] to-[#1A1B23] rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Round #{roundNumber}</h2>
          <div className="text-sm text-[#9945FF]/90 mt-1">Submissions for Block #{roundNumber}</div>
        </div>
        <div className="flex items-center text-[#FF00FF]">
          <FiClock className="w-5 h-5 mr-2" />
          <span className="font-mono text-lg">{formatTimeLeft(timeLeft)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-[#3D3D60] rounded-full mb-4 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#9945FF] to-[#FF00FF] transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#2A2A40]/50 rounded-xl p-4">
          <div className="flex items-center text-[#9945FF] mb-2">
            <FiLock className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Total Locked</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatBSV(totalLocked)}</div>
          <div className="text-sm text-white/60">Target: {formatBSV(threshold)}</div>
        </div>

        <div className="bg-[#2A2A40]/50 rounded-xl p-4">
          <div className="flex items-center text-[#FF00FF] mb-2">
            <FiZap className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Participants</span>
          </div>
          <div className="text-2xl font-bold text-white">{participantCount}</div>
          <div className="text-sm text-white/60">Active Memers</div>
        </div>
      </div>

      {/* Progress Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <FiTrendingUp className="w-4 h-4 mr-2 text-[#9945FF]" />
          <span className="text-white/90">
            {progress >= 100 ? 'Round Complete!' : `${Math.floor(progress)}% to Goal`}
          </span>
        </div>
        {progress >= 70 && progress < 100 && (
          <div className="text-[#FF00FF]">Almost there! 🚀</div>
        )}
        {progress >= 100 && (
          <div className="text-[#9945FF]">Viral achieved! 🔥</div>
        )}
      </div>
    </div>
  );
};

export default RoundStats; 