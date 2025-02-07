import React, { useState, useEffect, useRef } from 'react';
import { FiLock, FiZap, FiClock, FiFilter, FiUser, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import { PostMetadata } from '../../shared/types/metadata';
import { storageService } from '../services/storage.service';
import { walletManager } from '../utils/wallet';
import { useWallet } from '../providers/WalletProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
  { id: '1d', label: 'Last 24h' },
  { id: '7d', label: 'Last 7d' },
  { id: '30d', label: 'Last 30d' }
] as const;

const TOP_FILTERS = [
  { id: 'top1', label: 'Top Post' },
  { id: 'top3', label: 'Top 3' },
  { id: 'top10', label: 'Top 10' },
  { id: 'following', label: 'Following' }
] as const;

type TopFilterId = typeof TOP_FILTERS[number]['id'];

const PostGrid: React.FC<PostGridProps> = ({ onStatsUpdate }) => {
  const { connected, btcAddress } = useWallet();
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
  const [selectedPeriod, setSelectedPeriod] = useState<typeof TIME_PERIODS[number]['id'] | null>(null);
  const [selectedTopFilter, setSelectedTopFilter] = useState<TopFilterId | null>('top3');
  const [followedCreators, setFollowedCreators] = useState<Set<string>>(new Set());
  const [showCreatorInput, setShowCreatorInput] = useState(false);
  const [creatorAddress, setCreatorAddress] = useState('');

  // Add filter visibility settings
  const [filterVisibility] = useLocalStorage('filter-visibility', {
    filter_time: true,
    filter_top: true,
    filter_following: true
  });

  useEffect(() => {
    const fetchSubmissions = async () => {
      console.log('Starting to fetch submissions...');
      setIsLoading(true);
      try {
        console.log('Calling getPosts...');
        const newSubmissions = await storageService.getPosts(1, 100);
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
        
        // Sort by totalLocked in descending order
        const sortedSubmissions = submissionsWithStats.sort((a, b) => 
          b.totalLocked - a.totalLocked
        );
        
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

  const handleFollowCreator = () => {
    if (creatorAddress) {
      setFollowedCreators(prev => new Set([...prev, creatorAddress]));
      setCreatorAddress('');
      setShowCreatorInput(false);
    }
  };

  const handleUnfollowCreator = (creator: string) => {
    setFollowedCreators(prev => {
      const next = new Set(prev);
      next.delete(creator);
      return next;
    });
  };

  const filterSubmissions = (posts: PostSubmission[]): PostSubmission[] => {
    // First apply time period filter
    const now = new Date();
    let filteredPosts = posts;
    
    if (selectedPeriod) {
      filteredPosts = posts.filter(post => {
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
    }

    // Apply following filter if selected
    if (selectedTopFilter === 'following' && connected) {
      filteredPosts = filteredPosts.filter(post => 
        followedCreators.has(post.creator)
      );
      return filteredPosts;
    }

    // Then apply top filter if selected
    if (selectedTopFilter) {
      const sortedByLocks = [...filteredPosts].sort((a, b) => b.totalLocked - a.totalLocked);
      
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
    }

    // If no top filter selected, return all posts sorted by locks
    return [...filteredPosts].sort((a, b) => b.totalLocked - a.totalLocked);
  };

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-4">
      {/* Minimal Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          {/* Time Period Filters - Left */}
          {filterVisibility.filter_time && (
            <div className="flex items-center gap-2">
              {TIME_PERIODS.map(period => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(selectedPeriod === period.id ? null : period.id)}
                  className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-all ${
                    selectedPeriod === period.id
                      ? 'bg-[#00ffa3] text-black'
                      : 'text-gray-400 hover:text-[#00ffa3]'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          )}

          {/* Top Posts and Following - Right */}
          <div className="flex items-center gap-2">
            {filterVisibility.filter_top && TOP_FILTERS.slice(0, -1).map(filter => (
              <button
                key={filter.id}
                onClick={() => setSelectedTopFilter(selectedTopFilter === filter.id ? null : filter.id)}
                className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-all ${
                  selectedTopFilter === filter.id
                    ? 'bg-[#00ffa3] text-black'
                    : 'text-gray-400 hover:text-[#00ffa3]'
                }`}
              >
                {filter.label}
              </button>
            ))}
            
            {filterVisibility.filter_following && connected && (
              <button
                onClick={() => setSelectedTopFilter(selectedTopFilter === 'following' ? null : 'following')}
                className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-all ${
                  selectedTopFilter === 'following'
                    ? 'bg-[#00ffa3] text-black'
                    : 'text-gray-400 hover:text-[#00ffa3]'
                }`}
              >
                Following
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-[#00ffa3]">Loading...</div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-400">No posts yet</div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterSubmissions(submissions).map((submission) => (
              <div
                key={submission.id}
                className="bg-[#2A2A40] rounded-lg overflow-hidden"
              >
                <img
                  ref={(el) => el && (imageRefs.current[submission.id] = el)}
                  src={submission.fileUrl}
                  alt={submission.description}
                  className="w-full aspect-square object-cover"
                />
                
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiLock className="text-[#00ffa3] w-4 h-4" />
                      <span className="text-[#00ffa3] font-medium">{formatBSV(submission.totalLocked)}</span>
                    </div>
                    {connected && (
                      <button
                        onClick={() => followedCreators.has(submission.creator) 
                          ? handleUnfollowCreator(submission.creator)
                          : handleFollowCreator()
                        }
                        className="text-gray-400 hover:text-[#00ffa3]"
                      >
                        {followedCreators.has(submission.creator) 
                          ? <FiUserCheck className="w-4 h-4" />
                          : <FiUserPlus className="w-4 h-4" />
                        }
                      </button>
                    )}
                  </div>

                  {showLockInput === submission.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        value={lockAmount}
                        onChange={(e) => setLockAmount(e.target.value)}
                        className="flex-1 bg-[#1A1B23] rounded px-2 py-1 text-sm"
                        placeholder="BSV amount"
                      />
                      <button
                        onClick={() => handleLockCoins(submission.id, parseFloat(lockAmount))}
                        disabled={lockingSubmissionId === submission.id || !lockAmount}
                        className="bg-[#00ffa3] text-black px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                      >
                        {lockingSubmissionId === submission.id ? 'Locking...' : 'Lock'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLockInput(submission.id)}
                      className="w-full mt-2 bg-[#1A1B23] text-[#00ffa3] px-3 py-1 rounded text-sm font-medium hover:bg-opacity-75"
                    >
                      Lock BSV
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Locks Toast */}
      <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
        {recentLocks.map((lock) => (
          <div
            key={`${lock.submissionId}-${lock.timestamp}`}
            className="bg-[#2A2A40] bg-opacity-90 backdrop-blur rounded px-3 py-2 flex items-center gap-2 animate-fade-out"
          >
            <FiLock className="text-[#00ffa3] w-4 h-4" />
            <span className="text-[#00ffa3] font-medium text-sm">{formatBSV(lock.amount)}</span>
            <span className="text-gray-400 text-sm">locked</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostGrid; 
