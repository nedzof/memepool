import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiLock, FiAward, FiClock } from 'react-icons/fi';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import CreateMemeModal from './CreateMemeModal';
import { storageService } from '../services/storage.service';
import RoundStats from './RoundStats';

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
                className="relative group bg-[#2A2A40] rounded-xl overflow-hidden border border-[#3D3D60] hover:border-[#9945FF]/50 transition-all duration-300"
              >
                {/* Square Thumbnail */}
                <div className="relative aspect-square bg-black">
                  <video
                    src={submission.fileUrl}
                    className="w-full h-full object-cover"
                    loop
                    muted
                    playsInline
                  />
                  
                  {/* Overlay Content */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-[#00ffa3]">
                          <FiLock className="w-3 h-3 mr-1" />
                          <span className="text-sm font-medium">{formatBSV(submission.totalLocked)}</span>
                        </div>
                        <div className="text-xs text-white/60">
                          Position #{submission.position || 0}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-white/90">
                        {submission.creator}
                      </div>
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