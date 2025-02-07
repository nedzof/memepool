import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage.service';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiTrendingUp, FiUsers, FiAward } from 'react-icons/fi';

interface StatsData {
  totalPosts: number;
  totalBSVLocked: number;
  totalParticipants: number;
  averageLockAmount: number;
  topPost: {
    content: string;
    lockedAmount: number;
  } | null;
  timeSeriesData: Array<{
    timestamp: string;
    locked: number;
  }>;
  postDistribution: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = ['#00ffa3', '#00ff9d', '#00ffff', '#ff00ff'];

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalPosts: 0,
    totalBSVLocked: 0,
    totalParticipants: 0,
    averageLockAmount: 0,
    topPost: null,
    timeSeriesData: [],
    postDistribution: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const posts = await storageService.getPosts(1, 100);
        
        // Calculate basic stats
        const totalBSVLocked = posts.reduce((sum, post) => {
          const initialAmount = post.locks / 100000000;
          const locklikesAmount = post.locklikes.reduce((sum, locklike) => 
            sum + (locklike.amount / 100000000), 0);
          return sum + initialAmount + locklikesAmount;
        }, 0);

        // Find top post
        const topPost = posts.reduce((max, post) => {
          const totalLocked = (post.locks / 100000000) + 
            post.locklikes.reduce((sum, locklike) => sum + (locklike.amount / 100000000), 0);
          return totalLocked > (max ? max.lockedAmount : 0) 
            ? { content: post.description, lockedAmount: totalLocked }
            : max;
        }, null as StatsData['topPost']);

        // Calculate unique participants
        const participants = new Set();
        posts.forEach(post => {
          participants.add(post.creator);
          post.locklikes.forEach(locklike => participants.add(locklike.txid));
        });

        // Create time series data
        const timeSeriesData = posts
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(post => {
            const totalLocked = (post.locks / 100000000) + 
              post.locklikes.reduce((sum, locklike) => sum + (locklike.amount / 100000000), 0);
            return {
              timestamp: new Date(post.createdAt).toLocaleDateString(),
              locked: totalLocked
            };
          });

        // Create post distribution data
        const postsByLockAmount = [
          { name: '0-1 BSV', value: 0 },
          { name: '1-5 BSV', value: 0 },
          { name: '5-10 BSV', value: 0 },
          { name: '10+ BSV', value: 0 }
        ];

        posts.forEach(post => {
          const totalLocked = (post.locks / 100000000) + 
            post.locklikes.reduce((sum, locklike) => sum + (locklike.amount / 100000000), 0);
          
          if (totalLocked <= 1) postsByLockAmount[0].value++;
          else if (totalLocked <= 5) postsByLockAmount[1].value++;
          else if (totalLocked <= 10) postsByLockAmount[2].value++;
          else postsByLockAmount[3].value++;
        });

        setStats({
          totalPosts: posts.length,
          totalBSVLocked,
          totalParticipants: participants.size,
          averageLockAmount: totalBSVLocked / posts.length,
          topPost,
          timeSeriesData,
          postDistribution: postsByLockAmount
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-[#00ffa3] mb-8 text-center">Platform Insights</h1>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#2A2A40] rounded-lg p-6 flex items-center">
            <FiTrendingUp className="w-8 h-8 text-[#00ffa3] mr-4" />
            <div>
              <p className="text-gray-400">Total Locked</p>
              <p className="text-2xl font-bold text-[#00ffa3]">{formatBSV(stats.totalBSVLocked)} BSV</p>
            </div>
          </div>
          
          <div className="bg-[#2A2A40] rounded-lg p-6 flex items-center">
            <FiUsers className="w-8 h-8 text-[#00ffa3] mr-4" />
            <div>
              <p className="text-gray-400">Community</p>
              <p className="text-2xl font-bold text-[#00ffa3]">{stats.totalParticipants} Members</p>
            </div>
          </div>

          <div className="bg-[#2A2A40] rounded-lg p-6 flex items-center">
            <FiAward className="w-8 h-8 text-[#00ffa3] mr-4" />
            <div>
              <p className="text-gray-400">Posts</p>
              <p className="text-2xl font-bold text-[#00ffa3]">{stats.totalPosts} Created</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* BSV Locked Over Time */}
          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">BSV Locked Over Time</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeSeriesData}>
                  <defs>
                    <linearGradient id="colorLocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffa3" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00ffa3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2A2A40',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#666' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="locked" 
                    stroke="#00ffa3" 
                    fillOpacity={1}
                    fill="url(#colorLocked)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Post Distribution */}
          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Post Distribution by Locked BSV</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.postDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {stats.postDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2A2A40',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Post */}
        {stats.topPost && (
          <div className="bg-[#2A2A40] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiAward className="w-6 h-6 text-[#00ffa3] mr-2" />
              Most Locked Post
            </h2>
            <div className="border-l-4 border-[#00ffa3] pl-4">
              <p className="text-gray-300 mb-2">{stats.topPost.content}</p>
              <p className="text-[#00ffa3] font-bold">
                {formatBSV(stats.topPost.lockedAmount)} BSV locked
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>All insights are calculated in real-time from on-chain data</p>
          <p className="mt-1">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Stats; 