import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage.service';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';

interface StatsData {
  totalPosts: number;
  totalBSVLocked: number;
  totalParticipants: number;
  averageLockAmount: number;
  timeSeriesData: Array<{
    timestamp: string;
    totalLocked: number;
    uniqueLocks: number;
  }>;
  postDistribution: Array<{
    name: string;
    value: number;
  }>;
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

        // Create time series data with total locked and unique locks
        const timeSeriesMap = new Map();
        posts.forEach(post => {
          const date = new Date(post.createdAt).toLocaleDateString();
          const postData = timeSeriesMap.get(date) || { totalLocked: 0, uniqueLocks: new Set() };
          
          // Add initial post lock
          postData.totalLocked += post.locks / 100000000;
          postData.uniqueLocks.add(post.creator);
          
          // Add locklikes
          post.locklikes.forEach(locklike => {
            postData.totalLocked += locklike.amount / 100000000;
            postData.uniqueLocks.add(locklike.txid);
          });
          
          timeSeriesMap.set(date, postData);
        });

        const timeSeriesData = Array.from(timeSeriesMap.entries())
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .map(([timestamp, data]) => ({
            timestamp,
            totalLocked: data.totalLocked,
            uniqueLocks: data.uniqueLocks.size
          }));

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
        
        {/* Total Locked and Unique Locks Chart */}
        <div className="bg-[#2A2A40] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Total Locked BSV & Unique Locks</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeSeriesData}>
                <defs>
                  <linearGradient id="colorLocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffa3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00ffa3" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#666" />
                <YAxis yAxisId="left" stroke="#00ffa3" />
                <YAxis yAxisId="right" orientation="right" stroke="#00ffff" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#2A2A40',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#666' }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="totalLocked" 
                  name="Total BSV Locked"
                  stroke="#00ffa3" 
                  fill="url(#colorLocked)" 
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="uniqueLocks" 
                  name="Unique Locks"
                  stroke="#00ffff" 
                  fill="url(#colorUnique)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

          {/* Lock Value Distribution */}
          <div className="bg-[#2A2A40] rounded-lg p-6">
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