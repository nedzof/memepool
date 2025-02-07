import React, { useState, useEffect, useRef } from 'react';
import { FiLock, FiZap } from 'react-icons/fi';
import { PostMetadata } from '../../shared/types/metadata';
import { storageService } from '../services/storage.service';
import { walletManager } from '../utils/wallet';

interface SubmissionStats {
  totalLocked: number;
  position: number;
  threshold: number;
  isTop10Percent: boolean;
  isTop3: boolean;
}

interface PostSubmission extends PostMetadata, SubmissionStats {}

interface PostGridProps {
  onStatsUpdate: (stats: {
    totalLocked: number;
    participantCount: number;
    roundNumber: number;
  }) => void;
}

const PostGrid: React.FC<PostGridProps> = ({ onStatsUpdate }) => {
  const [submissions, setSubmissions] = useState<PostSubmission[]>([]);
  const [currentThreshold, setCurrentThreshold] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activePost, setActivePost] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalLocked, setTotalLocked] = useState(0);
  const [lockingSubmissionId, setLockingSubmissionId] = useState<string | null>(null);
  const [lockAmount, setLockAmount] = useState<string>('');
  const [showLockInput, setShowLockInput] = useState<string | null>(null);
  const [recentLocks, setRecentLocks] = useState<Array<{ submissionId: string; amount: number; timestamp: number }>>([]);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);
  const imageRefs = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    const fetchSubmissions = async () => {
      console.log('Starting to fetch submissions...');
      setIsLoading(true);
      try {
        console.log('Calling getPosts...');
        const newSubmissions = await storageService.getPosts(1, 9);
        console.log('Received submissions:', newSubmissions);
        
        const submissionsWithStats = newSubmissions.map((submission) => {
          // Calculate total locked amount (initial amount + all locklikes)
          const initialAmount = submission.locks / 100000000; // Convert satoshis to BSV
          const locklikesAmount = submission.locklikes.reduce((sum, locklike) => 
            sum + (locklike.amount / 100000000), 0);
          const totalLocked = initialAmount + locklikesAmount;

          return {
            ...submission,
            totalLocked,
            threshold: currentThreshold || 1000,
            isTop10Percent: false,
            isTop3: false,
            createdAt: submission.createdAt,
            updatedAt: submission.updatedAt
          };
        }) as unknown as PostSubmission[];
        
        console.log('Processed submissions with stats:', submissionsWithStats);
        
        // Sort by createdAt in descending order (newest first)
        const sortedSubmissions = submissionsWithStats.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 9); // Ensure we never have more than 9 elements
        
        console.log('Final sorted submissions:', sortedSubmissions);
        setSubmissions(sortedSubmissions);
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [currentThreshold]);

  useEffect(() => {
    const fetchRoundStats = async () => {
      try {
        setParticipantCount(submissions.length);
        const total = submissions.reduce((sum, sub) => sum + (sub.totalLocked || 0), 0);
        setTotalLocked(total);
        
        onStatsUpdate({
          totalLocked: total,
          participantCount: submissions.length,
          roundNumber
        });
      } catch (error) {
        console.error('Failed to fetch round stats:', error);
      }
    };

    fetchRoundStats();
  }, [submissions, roundNumber, onStatsUpdate]);

  const formatBSV = (amount: number | undefined): string => {
    if (typeof amount !== 'number') return '0.00 BSV';
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    })} BSV`;
  };

  const getProgressColor = (locked: number | undefined, threshold: number | undefined): string => {
    if (typeof locked !== 'number' || typeof threshold !== 'number' || threshold === 0) {
      return 'bg-red-400';
    }
    const percentage = (locked / threshold) * 100;
    if (percentage >= 100) return 'bg-[#00ffa3]';
    if (percentage >= 70) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const handleLockCoins = async (submissionId: string, amount: number) => {
    try {
      setLockingSubmissionId(submissionId);
      const wallet = walletManager.getWallet();
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      await wallet.lockCoins(submissionId, amount);

      setRecentLocks(prev => [
        { submissionId, amount, timestamp: Date.now() },
        ...prev.slice(0, 4)
      ]);

      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId) {
          const newTotal = (sub.totalLocked || 0) + amount;
          const threshold = sub.threshold || 1000;
          
          if (newTotal >= threshold && (sub.totalLocked || 0) < threshold) {
            setShowConfetti(submissionId);
            setTimeout(() => setShowConfetti(null), 3000);
          }
          
          return {
            ...sub,
            totalLocked: newTotal,
            isTop3: true
          };
        }
        return sub;
      }));

      setLockAmount('');
      setShowLockInput(null);
    } catch (error) {
      console.error('Failed to lock coins:', error);
    } finally {
      setLockingSubmissionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-4 md:p-8">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-[#00ffa3]">Loading...</div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="text-[#00ffa3] text-xl">No posts yet</div>
          <div className="text-gray-400">Be the first to create a post!</div>
        </div>
      ) : (
        <>
          <div className="fixed top-24 right-4 z-50 space-y-2 pointer-events-none">
            {recentLocks.map((lock, index) => {
              const submission = submissions.find(s => s.id === lock.submissionId);
              if (!submission) return null;
              return (
                <div
                  key={`${lock.submissionId}-${lock.timestamp}`}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-fade-out"
                >
                  <div className="flex items-center space-x-2">
                    <FiLock className="text-[#00ffa3]" />
                    <span className="text-[#00ffa3] font-bold">{formatBSV(lock.amount)}</span>
                    <span className="text-gray-400">locked</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-[#2A2A40] rounded-lg overflow-hidden relative group aspect-square"
                >
                  <div className="relative h-3/4">
                    <img
                      ref={(el) => el && (imageRefs.current[submission.id] = el)}
                      src={submission.fileUrl}
                      alt={submission.description}
                      className="w-full h-full object-cover"
                    />
                    {showConfetti === submission.id && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Add your confetti animation here */}
                      </div>
                    )}
                  </div>

                  <div className="p-3 h-1/4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FiLock className="text-[#00ffa3] w-4 h-4" />
                        <span className="text-[#00ffa3] font-bold text-sm">{formatBSV(submission.totalLocked)}</span>
                      </div>
                    </div>

                    <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div
                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(
                          submission.totalLocked,
                          submission.threshold
                        )}`}
                        style={{
                          width: `${Math.min(
                            ((submission.totalLocked || 0) / (submission.threshold || 1000)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    {showLockInput === submission.id ? (
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={lockAmount}
                          onChange={(e) => setLockAmount(e.target.value)}
                          className="flex-1 bg-[#1A1B23] border border-gray-700 rounded px-2 py-1 text-white text-sm"
                          placeholder="Amount in BSV"
                        />
                        <button
                          onClick={() => handleLockCoins(submission.id, parseFloat(lockAmount))}
                          disabled={lockingSubmissionId === submission.id || !lockAmount}
                          className="bg-[#00ffa3] text-black px-3 py-1 rounded font-bold hover:bg-[#00ff9d] transition-colors disabled:opacity-50 text-sm"
                        >
                          {lockingSubmissionId === submission.id ? (
                            <FiZap className="animate-spin w-4 h-4" />
                          ) : (
                            'Lock'
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowLockInput(submission.id)}
                        className="w-full bg-[#1A1B23] text-[#00ffa3] px-3 py-1 rounded font-bold hover:bg-[#2A2A40] transition-colors text-sm"
                      >
                        Lock BSV
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PostGrid; 
