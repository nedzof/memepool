import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage.service';

interface StatsData {
  totalPosts: number;
  totalBSVLocked: number;
  totalParticipants: number;
  averageLockAmount: number;
  topPost: {
    content: string;
    lockedAmount: number;
  } | null;
}

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalPosts: 0,
    totalBSVLocked: 0,
    totalParticipants: 0,
    averageLockAmount: 0,
    topPost: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const posts = await storageService.getPosts(1, 100); // Get a large sample
        
        // Calculate total BSV locked
        const totalBSVLocked = posts.reduce((sum, post) => {
          const initialAmount = post.locks / 100000000;
          const locklikesAmount = post.locklikes.reduce((sum, locklike) => 
            sum + (locklike.amount / 100000000), 0);
          return sum + initialAmount + locklikesAmount;
        }, 0);

        // Find post with most BSV locked
        const topPost = posts.reduce((max, post) => {
          const totalLocked = (post.locks / 100000000) + 
            post.locklikes.reduce((sum, locklike) => sum + (locklike.amount / 100000000), 0);
          return totalLocked > (max ? max.lockedAmount : 0) 
            ? { content: post.description, lockedAmount: totalLocked }
            : max;
        }, null as StatsData['topPost']);

        // Calculate unique participants (creators + lockers)
        const participants = new Set();
        posts.forEach(post => {
          participants.add(post.creator);
          post.locklikes.forEach(locklike => participants.add(locklike.txid));
        });

        setStats({
          totalPosts: posts.length,
          totalBSVLocked,
          totalParticipants: participants.size,
          averageLockAmount: totalBSVLocked / posts.length,
          topPost
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatBSV = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B23] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#00ffa3]">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#00ffa3] mb-8">Platform Statistics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats Cards */}
          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Total Posts</h2>
            <p className="text-3xl font-bold text-[#00ffa3]">{stats.totalPosts}</p>
          </div>

          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Total BSV Locked</h2>
            <p className="text-3xl font-bold text-[#00ffa3]">{formatBSV(stats.totalBSVLocked)} BSV</p>
          </div>

          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Total Participants</h2>
            <p className="text-3xl font-bold text-[#00ffa3]">{stats.totalParticipants}</p>
          </div>

          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Average Lock Amount</h2>
            <p className="text-3xl font-bold text-[#00ffa3]">{formatBSV(stats.averageLockAmount)} BSV</p>
          </div>
        </div>

        {/* Top Post Section */}
        {stats.topPost && (
          <div className="mt-8 bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Top Locked Post</h2>
            <div className="border-l-4 border-[#00ffa3] pl-4">
              <p className="text-gray-300 mb-2">{stats.topPost.content}</p>
              <p className="text-[#00ffa3] font-bold">
                {formatBSV(stats.topPost.lockedAmount)} BSV locked
              </p>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-8 text-center text-gray-400">
          <p>All statistics are calculated in real-time from on-chain data.</p>
          <p className="mt-2">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Stats; 