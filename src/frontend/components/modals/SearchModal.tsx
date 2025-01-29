import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiFilter, FiAward, FiTrendingUp, FiClock, FiHash, FiUser, FiTag } from 'react-icons/fi';

interface SearchModalProps {
  onClose: () => void;
  initialBlockNumber?: number;
}

interface SearchResult {
  id: string;
  title: string;
  creator: string;
  blockHeight: number;
  memeUrl: string;
  timestamp: string;
  inscriptionId?: string;
  tags?: string[];
  isTop3?: boolean;
  isViral?: boolean;
}

interface FilterState {
  creator: string;
  inscriptionId: string;
  blockNumber: string;
  timeRange: '24h' | '7d' | '30d' | 'all';
  tags: string[];
  achievements: ('top3' | 'viral' | 'trending')[];
}

const SearchModal: React.FC<SearchModalProps> = ({ onClose, initialBlockNumber }) => {
  const [searchQuery, setSearchQuery] = useState(initialBlockNumber ? `Block #${initialBlockNumber}` : '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    creator: '',
    inscriptionId: '',
    blockNumber: initialBlockNumber?.toString() || '',
    timeRange: 'all',
    tags: [],
    achievements: []
  });

  const timeRangeOptions = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: 'all', label: 'All' }
  ];

  const achievementOptions = [
    { value: 'top3', label: 'Top 3 🏆', icon: FiAward },
    { value: 'viral', label: 'Viral 🔥', icon: FiTrendingUp },
    { value: 'trending', label: 'Trending 📈', icon: FiClock }
  ];

  const popularTags = ['funny', 'crypto', 'art', 'meme', 'viral', 'nft'];

  useEffect(() => {
    if (initialBlockNumber) {
      performSearch(initialBlockNumber.toString());
    }
  }, [initialBlockNumber]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: 'Meme Title 1',
          creator: 'Creator1',
          blockHeight: initialBlockNumber || 0,
          memeUrl: 'https://example.com/meme1.jpg',
          timestamp: new Date().toISOString(),
          inscriptionId: 'insc123',
          tags: ['funny', 'crypto'],
          isTop3: true,
          isViral: true
        },
        // Add more mock results
      ];
      setResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleAchievement = (achievement: 'top3' | 'viral' | 'trending') => {
    setFilters(prev => ({
      ...prev,
      achievements: prev.achievements.includes(achievement)
        ? prev.achievements.filter(a => a !== achievement)
        : [...prev.achievements, achievement]
    }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-[#1A1B23] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-[#9945FF]/20">
        {/* Header with Search */}
        <div className="p-4 border-b border-[#9945FF]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 px-4 bg-white/5 rounded-xl">
              <FiSearch className="w-5 h-5 text-[#9945FF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-white placeholder-white/50"
                placeholder="Search memes..."
                autoFocus
              />
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <FiX className="w-6 h-6 text-white/70" />
            </button>
          </div>

          {/* Quick Filters Row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Time Range Pills */}
            <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
              {timeRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('timeRange', option.value)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${
                    filters.timeRange === option.value
                      ? 'bg-[#9945FF] text-white'
                      : 'text-white/70 hover:bg-[#9945FF]/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Achievement Pills */}
            <div className="flex items-center gap-2">
              {achievementOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleAchievement(value as any)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${
                    filters.achievements.includes(value as any)
                      ? 'bg-[#9945FF] text-white'
                      : 'bg-black/20 text-white/70 hover:bg-[#9945FF]/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Popular Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {popularTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${
                    filters.tags.includes(tag)
                      ? 'bg-[#9945FF] text-white'
                      : 'bg-black/20 text-white/70 hover:bg-[#9945FF]/20'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Search Row */}
          <div className="mt-3 flex gap-3">
            <input
              type="text"
              value={filters.creator}
              onChange={(e) => handleFilterChange('creator', e.target.value)}
              className="flex-1 bg-black/20 border border-[#9945FF]/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#9945FF]/50"
              placeholder="Creator"
            />
            <input
              type="text"
              value={filters.inscriptionId}
              onChange={(e) => handleFilterChange('inscriptionId', e.target.value)}
              className="flex-1 bg-black/20 border border-[#9945FF]/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#9945FF]/50"
              placeholder="Inscription ID"
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="overflow-y-auto p-4 max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#9945FF] border-t-transparent"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-black/20 border border-[#9945FF]/20 hover:border-[#9945FF]/60 transition-all"
                >
                  <img
                    src={result.memeUrl}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="text-sm font-medium text-white">{result.title}</div>
                      <div className="text-xs text-[#9945FF]">by {result.creator}</div>
                      <div className="text-xs text-white/60 mt-1">Block #{result.blockHeight}</div>
                      {result.tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.tags.map(tag => (
                            <span key={tag} className="text-xs bg-black/40 text-white/80 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Achievement Badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {result.isTop3 && (
                        <span className="bg-[#9945FF] text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <FiAward className="w-3 h-3" />
                          Top 3
                        </span>
                      )}
                      {result.isViral && (
                        <span className="bg-[#FF00FF] text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <FiTrendingUp className="w-3 h-3" />
                          Viral
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/60 py-12">
              {initialBlockNumber ? 
                `No memes found for Block #${initialBlockNumber}` : 
                'Start typing to search memes...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal; 