import React, { useState, useEffect } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';

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
  isTop3?: boolean;
  isViral?: boolean;
}

const SearchModal: React.FC<SearchModalProps> = ({ onClose, initialBlockNumber }) => {
  const [searchQuery, setSearchQuery] = useState(initialBlockNumber ? `Block #${initialBlockNumber}` : '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
          isTop3: true,
          isViral: true
        },
      ];
      setResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  performSearch(e.target.value);
                }}
                className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-white placeholder-white/50"
                placeholder="Search by block number, creator, or inscription ID..."
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
        </div>

        {/* Results Section */}
        <div className="overflow-y-auto p-4 max-h-[calc(90vh-100px)]">
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