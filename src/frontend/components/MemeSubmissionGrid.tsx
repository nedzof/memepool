import React, { useState, useEffect, useRef } from 'react';
import { FiTrendingUp, FiLock, FiAward, FiClock, FiPlus, FiZap, FiArrowUp } from 'react-icons/fi';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import CreateMemeModal from './CreateMemeModal';
import { storageService } from '../services/storage.service';
import RoundStats from './RoundStats';
import { walletManager } from '../utils/wallet';

interface SubmissionStats {
  totalLocked: number;
  position: number;
  threshold: number;
  isTop10Percent: boolean;
  isTop3: boolean;
  timeLeft: number;
}

interface MemeSubmission extends MemeVideoMetadata, SubmissionStats {}

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  memeUrl?: string;
  blockHeight?: number;
}

interface MemeSubmissionGridProps {
  onStatsUpdate: (stats: {
    totalLocked: number;
    participantCount: number;
    roundNumber: number;
  }) => void;
}

const MemeSubmissionGrid: React.FC<MemeSubmissionGridProps> = ({ onStatsUpdate }) => {
  const [submissions, setSubmissions] = useState<MemeSubmission[]>([]);
  const [currentThreshold, setCurrentThreshold] = useState(0);
  const [isCreateMemeModalOpen, setIsCreateMemeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalLocked, setTotalLocked] = useState(0);
  const [lockingSubmissionId, setLockingSubmissionId] = useState<string | null>(null);
  const [lockAmount, setLockAmount] = useState<string>('');
  const [showLockInput, setShowLockInput] = useState<string | null>(null);
  const [recentLocks, setRecentLocks] = useState<Array<{ submissionId: string; amount: number; timestamp: number }>>([]);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const newSubmissions = await storageService.getMemeVideos(currentPage, 10);
        // Add default values for SubmissionStats and ensure all required MemeSubmission properties are present
        const submissionsWithStats = newSubmissions.map((submission, index) => ({
          ...submission,
          totalLocked: 0,
          position: index + 1,
          threshold: currentThreshold || 1000, // Default threshold
          isTop10Percent: false,
          isTop3: false,
          timeLeft: 600, // Default 10 minutes
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt
        })) as unknown as MemeSubmission[];
        
        setSubmissions((prevSubmissions: MemeSubmission[]) => {
          // Filter out duplicates based on id
          const uniqueSubmissions = submissionsWithStats.filter(
            (submission) => !prevSubmissions.some((prev) => prev.id === submission.id)
          );
          return [...prevSubmissions, ...uniqueSubmissions];
        });
        setHasMore(newSubmissions.length === 10);
      } catch (error) {
        console.error('Failed to fetch meme submissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [currentPage, currentThreshold]);

  useEffect(() => {
    const fetchRoundStats = async () => {
      try {
        // In production, this would be fetched from your API
        setParticipantCount(submissions.length);
        const total = submissions.reduce((sum, sub) => sum + (sub.totalLocked || 0), 0);
        setTotalLocked(total);
        
        // Update parent component with new stats
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

  const handleCreateMemeClick = () => {
    setCurrentBlock({
      id: '',
      imageUrl: '',
      blockNumber: 0,
      memeUrl: undefined,
      blockHeight: undefined
    });
    setIsCreateMemeModalOpen(true);
  };

  const handleMemeCreated = (metadata: MemeVideoMetadata) => {
    const newSubmission: MemeSubmission = {
      ...metadata,
      totalLocked: 0,
      position: submissions.length + 1,
      threshold: currentThreshold || 1000, // Default threshold if not set
      isTop10Percent: false,
      isTop3: false,
      timeLeft: 600 // 10 minutes
    };
    setSubmissions(prev => [newSubmission, ...prev]);
    setCurrentBlock(null); // Reset currentBlock after meme is created
  };

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handleVideoClick = (videoId: string) => {
    if (activeVideo === videoId) {
      setActiveVideo(null);
      if (videoRefs.current[videoId]) {
        videoRefs.current[videoId].pause();
        videoRefs.current[videoId].currentTime = 0;
      }
    } else {
      setActiveVideo(videoId);
      if (videoRefs.current[videoId]) {
        videoRefs.current[videoId].play().catch(console.error);
      }
      // Pause other videos
      Object.entries(videoRefs.current).forEach(([id, video]) => {
        if (id !== videoId) {
          video.pause();
          video.currentTime = 0;
        }
      });
    }
  };

  const handleVideoMouseEnter = (videoElement: HTMLVideoElement, submissionId: string) => {
    if (activeVideo !== submissionId) {
      videoElement.play().catch(console.error);
    }
  };

  const handleVideoMouseLeave = (videoElement: HTMLVideoElement, submissionId: string) => {
    if (activeVideo !== submissionId) {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  };

  const formatBSV = (amount: number | undefined): string => {
    if (typeof amount !== 'number') return '0.00 BSV';
    return `${amount.toFixed(2)} BSV`;
  };

  const formatTimeLeft = (seconds: number | undefined): string => {
    if (typeof seconds !== 'number') return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

      // Add to recent locks
      setRecentLocks(prev => [
        { submissionId, amount, timestamp: Date.now() },
        ...prev.slice(0, 4)
      ]);

      // Update submission stats
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId) {
          const newTotal = (sub.totalLocked || 0) + amount;
          const threshold = sub.threshold || 1000;
          
          // Show confetti if threshold is reached
          if (newTotal >= threshold && (sub.totalLocked || 0) < threshold) {
            setShowConfetti(submissionId);
            setTimeout(() => setShowConfetti(null), 3000);
          }
          
          return {
            ...sub,
            totalLocked: newTotal,
            isTop3: true // Update based on actual ranking
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
    <div className="min-h-screen bg-[#1A1B23] text-white p-8">
      {/* Recent Locks Feed */}
      <div className="fixed top-24 right-4 z-50 space-y-2 pointer-events-none">
        {recentLocks.map((lock, index) => {
          const submission = submissions.find(s => s.id === lock.submissionId);
          if (!submission) return null;
          return (
            <div
              key={lock.timestamp}
              className="bg-[#2A2A40]/90 backdrop-blur-sm rounded-lg p-3 transform transition-all duration-500 animate-slideInRight"
              style={{
                animationDelay: `${index * 100}ms`,
                opacity: Math.max(0, 1 - (Date.now() - lock.timestamp) / 5000)
              }}
            >
              <div className="flex items-center space-x-2">
                <FiZap className="w-4 h-4 text-[#00ffa3]" />
                <span className="text-sm font-bold text-[#00ffa3]">+{formatBSV(lock.amount)}</span>
                <span className="text-xs text-white/60">locked!</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Submissions Grid */}
        {isLoading && submissions.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9945FF]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {submissions.map((submission) => {
              const progress = ((submission.totalLocked || 0) / (submission.threshold || 1)) * 100;
              return (
                <div
                  key={submission.id}
                  className={`relative group bg-[#2A2A40] rounded-xl overflow-hidden border transition-all duration-300 ${
                    activeVideo === submission.id 
                      ? 'z-10 scale-105 shadow-2xl shadow-purple-500/20 border-[#00ffa3]'
                      : progress >= 70
                      ? 'border-[#FFB800] hover:border-[#00ffa3]'
                      : 'border-[#3D3D60] hover:border-[#9945FF]/50'
                  }`}
                >
                  {/* Video Container */}
                  <div 
                    className="relative aspect-square bg-black cursor-pointer overflow-hidden"
                    onClick={() => handleVideoClick(submission.id)}
                  >
                    <video
                      ref={el => { if (el) videoRefs.current[submission.id] = el; }}
                      src={submission.fileUrl}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        activeVideo === submission.id ? 'scale-110' : 'hover:scale-105'
                      }`}
                      loop
                      muted
                      playsInline
                      onMouseEnter={(e) => handleVideoMouseEnter(e.currentTarget, submission.id)}
                      onMouseLeave={(e) => handleVideoMouseLeave(e.currentTarget, submission.id)}
                    />
                    
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-all duration-300 ${
                      activeVideo === submission.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {/* Stats Bar */}
                      <div className="absolute inset-x-0 bottom-0 p-4 space-y-3">
                        {/* Progress Bar */}
                        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full transition-all duration-1000 ${
                              progress >= 100 
                                ? 'bg-gradient-to-r from-[#00ffa3] via-[#00ffa3] to-[#9945FF] animate-pulse'
                                : progress >= 70
                                ? 'bg-gradient-to-r from-[#FFB800] to-[#FF00FF] animate-progress-pulse'
                                : 'bg-gradient-to-r from-[#FF0000] to-[#FF00FF]'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                          {progress >= 70 && progress < 100 && (
                            <div className="absolute top-0 right-0 h-full w-1/4 bg-gradient-to-r from-transparent to-white/20 animate-shimmer" />
                          )}
                        </div>

                        {/* Lock Coins Input */}
                        {showLockInput === submission.id ? (
                          <div className="flex items-center space-x-2 animate-fade-in">
                            <input
                              type="number"
                              value={lockAmount}
                              onChange={(e) => setLockAmount(e.target.value)}
                              className="flex-1 px-2 py-1 bg-black/50 border border-[#00ffa3] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00ffa3]"
                              placeholder="Amount in BSV"
                              step="0.00000001"
                              min="0"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLockCoins(submission.id, parseFloat(lockAmount));
                              }}
                              disabled={lockingSubmissionId === submission.id || !lockAmount}
                              className={`px-3 py-1 rounded text-sm font-medium transition-all transform hover:scale-105 ${
                                lockingSubmissionId === submission.id
                                  ? 'bg-[#2A2A40] text-white/50'
                                  : 'bg-[#00ffa3] text-black hover:bg-[#00ffa3]/80'
                              }`}
                            >
                              {lockingSubmissionId === submission.id ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                'Lock'
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowLockInput(null);
                              }}
                              className="px-2 py-1 bg-black/30 text-white/60 rounded text-sm hover:bg-black/50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center ${
                                progress >= 100 ? 'text-[#00ffa3] animate-pulse' : 'text-[#00ffa3]'
                              }`}>
                                <FiLock className="w-3.5 h-3.5 mr-1" />
                                <span className="text-sm font-bold">{formatBSV(submission.totalLocked)}</span>
                              </div>
                              <div className="flex items-center text-white/60">
                                <FiClock className="w-3.5 h-3.5 mr-1" />
                                <span className="text-sm">{formatTimeLeft(submission.timeLeft)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowLockInput(submission.id);
                                }}
                                className={`p-1.5 rounded-full transition-all transform hover:scale-110 ${
                                  progress >= 70
                                    ? 'bg-[#00ffa3] text-black hover:bg-[#00ffa3]/80'
                                    : 'bg-[#00ffa3]/10 hover:bg-[#00ffa3]/20 text-[#00ffa3]'
                                }`}
                                title="Lock BSV"
                              >
                                <FiPlus className="w-3.5 h-3.5" />
                              </button>
                              {submission.isTop3 && (
                                <div className="flex items-center text-yellow-400 animate-bounce">
                                  <FiAward className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {submission.isTop10Percent && (
                                <div className="flex items-center text-purple-400 animate-pulse">
                                  <FiTrendingUp className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div className={`text-xs font-bold px-2 py-1 rounded-full transition-all ${
                                submission.position <= 3
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black animate-pulse'
                                  : submission.position <= 10
                                  ? 'bg-purple-500/30 text-purple-200'
                                  : 'bg-black/40 text-white/60'
                              }`}>
                                #{submission.position || 0}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Play Indicator */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      activeVideo === submission.id ? 'opacity-0 scale-150' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transform transition-transform group-hover:scale-110">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                      </div>
                    </div>

                    {/* Confetti Effect */}
                    {showConfetti === submission.id && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 animate-confetti-explosion">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 bg-[#00ffa3] rounded-full"
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                transform: `scale(${Math.random() * 2})`,
                                opacity: Math.random(),
                                animation: `confetti-particle 1s ease-out forwards ${Math.random() * 0.5}s`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {hasMore && !isLoading && (
          <div className="flex justify-center mt-8">
            <button
              className="px-6 py-3 bg-[#222235] rounded-lg font-semibold text-white hover:bg-[#2A2A40] transition-colors"
              onClick={handleLoadMore}
            >
              Load More
            </button>
          </div>
        )}

        {isLoading && submissions.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#9945FF]"></div>
          </div>
        )}
      </div>
      
      <CreateMemeModal
        onClose={() => {
          setIsCreateMemeModalOpen(false);
          setCurrentBlock(null);
        }}
        onMemeCreated={handleMemeCreated}
        currentBlock={currentBlock}
      />
    </div>
  );
};

export default MemeSubmissionGrid; 