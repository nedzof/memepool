import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import SearchModal from './modals/SearchModal';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleSearchClick = () => {
    setShowSearchModal(true);
  };

  return (
    <>
      <div 
        className="flex items-center w-full max-w-xl px-4 py-2 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
        onClick={handleSearchClick}
      >
        <FiSearch className="w-5 h-5 text-[#9945FF]" />
        <div className="ml-3 text-white/50">Search memes...</div>
      </div>

      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
        />
      )}
    </>
  );
};

export default SearchBar; 