import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage.service';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { FiTrendingUp, FiUsers, FiAward, FiActivity, FiBarChart2 } from 'react-icons/fi';

interface StatsData {
  totalPosts: number;
  totalBSVLocked: number;
  totalParticipants: number;
  averageLockAmount: number;
  timeSeriesData: Array<{
    timestamp: string;
    locked: number;
  }>;
  postDistribution: Array<{
    name: string;
    value: number;
  }>;
  engagementMetrics: {
    averageLockTime: number; // in hours
    mostActiveHour: number; // 0-23
    returnRate: number; // percentage
    averageResponseTime: number; // in minutes
    postSuccessRate: number; // percentage
  };
  lockValueDistribution: Array<{
    range: string;
    count: number;
    totalValue: number;
  }>;
}

const COLORS = ['#00ffa3', '#00ff9d', '#00ffff', '#ff00ff'];

const LOCK_RANGES = [
  { min: 0, max: 0.1, label: '0-0.1 BSV' },
  { min: 0.1, max: 0.5, label: '0.1-0.5 BSV' },
  { min: 0.5, max: 1, label: '0.5-1 BSV' },
  { min: 1, max: 5, label: '1-5 BSV' },
  { min: 5, max: 10, label: '5-10 BSV' },
  { min: 10, max: Infinity, label: '10+ BSV' }
];

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalPosts: 0,
    totalBSVLocked: 0,
    totalParticipants: 0,
    averageLockAmount: 0,
    timeSeriesData: [],
    postDistribution: [],
    engagementMetrics: {
      averageLockTime: 0,
      mostActiveHour: 0,
      returnRate: 0,
      averageResponseTime: 0,
      postSuccessRate: 0
    },
    lockValueDistribution: []
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

        // Calculate engagement metrics
        const currentBlockHeight = 830000;
        const hourCounts = new Array(24).fill(0);
        let totalLockTime = 0;
        let totalResponseTime = 0;
        let postsWithLocks = 0;
        const uniqueUsers = new Set<string>();
        const returningUsers = new Set<string>();

        posts.forEach(post => {
          const postDate = new Date(post.createdAt);
          hourCounts[postDate.getHours()]++;

          post.locklikes.forEach(lock => {
            const lockTime = (lock.locked_until - currentBlockHeight) * 10;
            totalLockTime += lockTime;

            if (uniqueUsers.has(lock.txid)) {
              returningUsers.add(lock.txid);
            } else {
              uniqueUsers.add(lock.txid);
            }

            const lockDate = new Date(lock.created_at);
            const responseTime = (lockDate.getTime() - postDate.getTime()) / (1000 * 60);
            totalResponseTime += responseTime;
          });

          if (post.locklikes.length > 0) {
            postsWithLocks++;
          }
        });

        const engagementMetrics = {
          averageLockTime: totalLockTime / (60 * posts.reduce((sum, post) => sum + post.locklikes.length, 0) || 1),
          mostActiveHour: hourCounts.indexOf(Math.max(...hourCounts)),
          returnRate: (returningUsers.size / uniqueUsers.size) * 100 || 0,
          averageResponseTime: totalResponseTime / posts.reduce((sum, post) => sum + post.locklikes.length, 0) || 0,
          postSuccessRate: (postsWithLocks / posts.length) * 100 || 0
        };

        // Calculate lock value distribution
        const lockValueDistribution = LOCK_RANGES.map(range => {
          const locksInRange = posts.flatMap(post => {
            const locks = [
              { amount: post.locks / 100000000 },
              ...post.locklikes.map(lock => ({ amount: lock.amount / 100000000 }))
            ];
            return locks.filter(lock => 
              lock.amount > range.min && lock.amount <= range.max
            );
          });

          return {
            range: range.label,
            count: locksInRange.length,
            totalValue: locksInRange.reduce((sum, lock) => sum + lock.amount, 0)
          };
        });

        setStats({
          totalPosts: posts.length,
          totalBSVLocked,
          totalParticipants: participants.size,
          averageLockAmount: totalBSVLocked / posts.length,
          timeSeriesData,
          postDistribution: postsByLockAmount,
          engagementMetrics,
          lockValueDistribution
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

        {/* Engagement Metrics */}
        <div className="bg-[#2A2A40] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold flex items-center mb-6">
            <FiActivity className="w-6 h-6 text-[#00ffa3] mr-2" />
            Engagement Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#1A1B23] rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Average Lock Duration</p>
              <p className="text-2xl font-bold text-[#00ffa3]">
                {stats.engagementMetrics.averageLockTime.toFixed(1)} hours
              </p>
            </div>
            <div className="bg-[#1A1B23] rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Most Active Time</p>
              <p className="text-2xl font-bold text-[#00ffa3]">
                {stats.engagementMetrics.mostActiveHour}:00
              </p>
            </div>
            <div className="bg-[#1A1B23] rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Return Rate</p>
              <p className="text-2xl font-bold text-[#00ffa3]">
                {stats.engagementMetrics.returnRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-[#1A1B23] rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Avg. Response Time</p>
              <p className="text-2xl font-bold text-[#00ffa3]">
                {stats.engagementMetrics.averageResponseTime.toFixed(0)} min
              </p>
            </div>
            <div className="bg-[#1A1B23] rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Post Success Rate</p>
              <p className="text-2xl font-bold text-[#00ffa3]">
                {stats.engagementMetrics.postSuccessRate.toFixed(1)}%
              </p>
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

        {/* Lock Value Distribution */}
        <div className="bg-[#2A2A40] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold flex items-center mb-6">
            <FiBarChart2 className="w-6 h-6 text-[#00ffa3] mr-2" />
            Lock Value Distribution
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.lockValueDistribution}>
                <XAxis dataKey="range" stroke="#666" />
                <YAxis yAxisId="left" stroke="#666" />
                <YAxis yAxisId="right" orientation="right" stroke="#00ffa3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2A2A40',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                />
                <Bar yAxisId="left" dataKey="count" fill="#666" name="Number of Locks" />
                <Bar yAxisId="right" dataKey="totalValue" fill="#00ffa3" name="Total BSV" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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