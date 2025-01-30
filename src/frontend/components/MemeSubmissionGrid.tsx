import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiLock, FiAward, FiClock, FiPlus } from 'react-icons/fi';
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
    setActiveVideo(activeVideo === videoId ? null : videoId);
  };

  const handleVideoMouseEnter = (videoElement: HTMLVideoElement) => {
    videoElement.play().catch(console.error);
  };

  const handleVideoMouseLeave = (videoElement: HTMLVideoElement) => {
    videoElement.pause();
    videoElement.currentTime = 0;
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

      // Call your contract or API to lock coins
      await wallet.lockCoins(submissionId, amount);

      // Update the submission's locked amount
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            totalLocked: (sub.totalLocked || 0) + amount
          };
        }
        return sub;
      }));

      // Reset states
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Submissions Grid */}
        {isLoading && submissions.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9945FF]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className={`relative group bg-[#2A2A40] rounded-xl overflow-hidden border border-[#3D3D60] hover:border-[#9945FF]/50 transition-all duration-300 ${
                  activeVideo === submission.id ? 'z-10 scale-105 shadow-2xl shadow-purple-500/20' : 'z-0'
                }`}
              >
                {/* Video Container */}
                <div 
                  className="relative aspect-square bg-black cursor-pointer"
                  onClick={() => handleVideoClick(submission.id)}
                >
                  <video
                    src={submission.fileUrl}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      activeVideo === submission.id ? 'scale-105' : ''
                    }`}
                    loop
                    muted
                    playsInline
                    onMouseEnter={(e) => handleVideoMouseEnter(e.currentTarget)}
                    onMouseLeave={(e) => handleVideoMouseLeave(e.currentTarget)}
                  />
                  
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 ${
                    activeVideo === submission.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {/* Stats Bar */}
                    <div className="absolute inset-x-0 bottom-0 p-4 space-y-3">
                      {/* Progress Bar */}
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(submission.totalLocked, submission.threshold)} transition-all duration-300`}
                          style={{
                            width: `${Math.min(
                              ((submission.totalLocked || 0) / (submission.threshold || 1)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      {/* Lock Coins Input */}
                      {showLockInput === submission.id ? (
                        <div className="flex items-center space-x-2 animate-fade-in">
                          <input
                            type="number"
                            value={lockAmount}
                            onChange={(e) => setLockAmount(e.target.value)}
                            className="flex-1 px-2 py-1 bg-black/50 border border-[#00ffa3] rounded text-sm text-white focus:outline-none"
                            placeholder="Amount in BSV"
                            step="0.00000001"
                            min="0"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLockCoins(submission.id, parseFloat(lockAmount));
                            }}
                            disabled={lockingSubmissionId === submission.id || !lockAmount}
                            className="px-3 py-1 bg-[#00ffa3] text-black rounded text-sm font-medium hover:bg-[#00ffa3]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {lockingSubmissionId === submission.id ? (
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                            <div className="flex items-center text-[#00ffa3]">
                              <FiLock className="w-3.5 h-3.5 mr-1" />
                              <span className="text-sm font-medium">{formatBSV(submission.totalLocked)}</span>
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
                              className="p-1.5 bg-[#00ffa3]/10 hover:bg-[#00ffa3]/20 text-[#00ffa3] rounded-full transition-colors"
                              title="Lock BSV"
                            >
                              <FiPlus className="w-3.5 h-3.5" />
                            </button>
                            {submission.isTop3 && (
                              <div className="flex items-center text-yellow-400">
                                <FiAward className="w-3.5 h-3.5" />
                              </div>
                            )}
                            {submission.isTop10Percent && (
                              <div className="flex items-center text-purple-400">
                                <FiTrendingUp className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div className="text-xs font-medium text-white/60 bg-black/40 px-2 py-1 rounded-full">
                              #{submission.position || 0}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Play Indicator */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                    activeVideo === submission.id ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
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