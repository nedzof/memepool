import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9945FF] focus:border-transparent transition-colors"
          placeholder="Search creators, inscriptions, or rounds..."
        />
      </div>
    </form>
  );
};

export default SearchBar; 