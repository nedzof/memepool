import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Header } from '../../components/Header';
import { FiBell } from 'react-icons/fi';

interface LayoutProps {
  totalLocked: number;
  participantCount: number;
  btcAddress: string;
  isPhantomInstalled: boolean;
  connected: boolean;
  onShowBSVModal: () => void;
  onCreatePost: () => void;
  onConnectPhantom: () => void;
  onDisconnect: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  totalLocked,
  participantCount,
  btcAddress,
  isPhantomInstalled,
  connected,
  onShowBSVModal,
  onCreatePost,
  onConnectPhantom,
  onDisconnect
}) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#1A1B23]">
      <Header
        totalLocked={totalLocked}
        participantCount={participantCount}
        onShowBSVModal={onShowBSVModal}
        onCreatePost={onCreatePost}
        btcAddress={btcAddress}
        isPhantomInstalled={isPhantomInstalled}
        connected={connected}
        onConnectPhantom={onConnectPhantom}
        onDisconnect={onDisconnect}
      />

      {/* Navigation */}
      <nav className="bg-[#2A2A40] py-2">
        <div className="max-w-7xl mx-auto px-4 flex space-x-4">
          <Link
            to="/"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/') 
                ? 'text-[#00ffa3] bg-[#1A1B23]' 
                : 'text-gray-300 hover:text-[#00ffa3]'
            }`}
          >
            Posts
          </Link>
          <Link
            to="/stats"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/stats')
                ? 'text-[#00ffa3] bg-[#1A1B23]'
                : 'text-gray-300 hover:text-[#00ffa3]'
            }`}
          >
            Statistics
          </Link>
          <Link
            to="/notifications"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              isActive('/notifications')
                ? 'text-[#00ffa3] bg-[#1A1B23]'
                : 'text-gray-300 hover:text-[#00ffa3]'
            }`}
          >
            <FiBell className="w-4 h-4 mr-1" />
            Notifications
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 