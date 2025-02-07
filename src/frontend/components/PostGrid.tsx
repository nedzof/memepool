import React, { useState, useEffect, useRef } from 'react';
import { FiLock, FiZap, FiClock, FiFilter } from 'react-icons/fi';
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

const TIME_PERIODS = [
  { id: 'all', label: 'All Time' },
  { id: '1d', label: 'Last 24h' },
  { id: '7d', label: 'Last 7d' },
  { id: '30d', label: 'Last 30d' }
] as const;

const TOP_FILTERS = [
  { id: 'all', label: 'All Posts' },
  { id: 'top1', label: 'Top Post' },
  { id: 'top3', label: 'Top 3' },
  { id: 'top10', label: 'Top 10' }
] as const;

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
  const [selectedPeriod, setSelectedPeriod] = useState<typeof TIME_PERIODS[number]['id']>('all');
  const [selectedTopFilter, setSelectedTopFilter] = useState<typeof TOP_FILTERS[number]['id']>('top1');

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

  const filterSubmissions = (posts: PostSubmission[]): PostSubmission[] => {
    // First apply time period filter
    const now = new Date();
    const filteredByTime = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      const hoursDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
      
      switch (selectedPeriod) {
        case '1d':
          return hoursDiff <= 24;
        case '7d':
          return hoursDiff <= 168;
        case '30d':
          return hoursDiff <= 720;
        default:
          return true;
      }
    });

    // Then apply top filter
    const sortedByLocks = [...filteredByTime].sort((a, b) => b.totalLocked - a.totalLocked);
    
    switch (selectedTopFilter) {
      case 'top1':
        return sortedByLocks.slice(0, 1);
      case 'top3':
        return sortedByLocks.slice(0, 3);
      case 'top10':
        return sortedByLocks.slice(0, 10);
      default:
        return sortedByLocks;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-4 md:p-8">
      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-[#2A2A40]/30 backdrop-blur-sm rounded-lg p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Time Period Filter */}
            <div className="flex flex-col w-full md:w-auto">
              <h3 className="text-sm font-semibold text-gray-400/80 mb-2 flex items-center">
                <FiClock className="w-4 h-4 mr-2" />
                Time Period
              </h3>
              <div className="flex flex-wrap gap-2">
                {TIME_PERIODS.map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${selectedPeriod === period.id
                        ? 'bg-[#00ffa3]/20 text-[#00ffa3]'
                        : 'bg-transparent text-gray-400/80 hover:text-[#00ffa3] hover:bg-[#00ffa3]/10'
                      }
                    `}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Posts Filter */}
            <div className="flex flex-col w-full md:w-auto">
              <h3 className="text-sm font-semibold text-gray-400/80 mb-2 flex items-center">
                <FiFilter className="w-4 h-4 mr-2" />
                Filter Posts
              </h3>
              <div className="flex flex-wrap gap-2">
                {TOP_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedTopFilter(filter.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${selectedTopFilter === filter.id
                        ? 'bg-[#00ffa3]/20 text-[#00ffa3]'
                        : 'bg-transparent text-gray-400/80 hover:text-[#00ffa3] hover:bg-[#00ffa3]/10'
                      }
                    `}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            {recentLocks.map((lock, index) => (
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
            ))}
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6">
              {filterSubmissions(submissions).map((submission) => (
                <div
                  key={submission.id}
                  className="bg-[#2A2A40] rounded-lg overflow-hidden relative group w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] max-w-md"
                >
                  <div className="relative h-[400px]">
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

                  <div className="p-4">
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
