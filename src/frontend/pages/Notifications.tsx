import React, { useState } from 'react';
import { FiBell, FiPlus, FiTrash2, FiTrendingUp, FiUnlock, FiUser, FiStar } from 'react-icons/fi';

interface NotificationSetting {
  id: string;
  type: 'threshold' | 'viral' | 'unlock' | 'creator' | 'milestone';
  enabled: boolean;
  value?: number | string;
  label: string;
  description: string;
}

const DEFAULT_SETTINGS: NotificationSetting[] = [
  {
    id: 'viral',
    type: 'viral',
    enabled: false,
    label: 'Viral Posts',
    description: 'Get notified when a post becomes viral (automatically calculated based on platform activity)'
  },
  {
    id: 'unlock',
    type: 'unlock',
    enabled: false,
    label: 'Unlocks',
    description: 'Get notified when your locked BSV becomes available for withdrawal'
  },
  {
    id: 'milestone_1',
    type: 'milestone',
    enabled: false,
    value: 1,
    label: '1 BSV Milestone',
    description: 'Get notified when a post reaches 1 BSV in locks'
  },
  {
    id: 'milestone_5',
    type: 'milestone',
    enabled: false,
    value: 5,
    label: '5 BSV Milestone',
    description: 'Get notified when a post reaches 5 BSV in locks'
  },
  {
    id: 'milestone_10',
    type: 'milestone',
    enabled: false,
    value: 10,
    label: '10 BSV Milestone',
    description: 'Get notified when a post reaches 10 BSV in locks'
  }
];

const Notifications: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>(DEFAULT_SETTINGS);
  const [showAddCreator, setShowAddCreator] = useState(false);
  const [newCreatorAddress, setNewCreatorAddress] = useState('');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');

  const handleToggle = (id: string) => {
    setSettings(settings.map(setting =>
      setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
    ));
  };

  const handleAddCreator = () => {
    if (!newCreatorAddress.trim()) {
      alert('Please enter a valid address');
      return;
    }

    const newSetting: NotificationSetting = {
      id: `creator_${newCreatorAddress}`,
      type: 'creator',
      enabled: true,
      value: newCreatorAddress,
      label: `Creator: ${newCreatorAddress.slice(0, 8)}...`,
      description: 'Get notified when this creator posts new content'
    };

    setSettings([...settings, newSetting]);
    setNewCreatorAddress('');
    setShowAddCreator(false);
  };

  const handleAddMilestone = () => {
    const value = parseFloat(newMilestone);
    if (isNaN(value) || value <= 0) {
      alert('Please enter a valid number greater than 0');
      return;
    }

    const newSetting: NotificationSetting = {
      id: `milestone_${value}`,
      type: 'milestone',
      enabled: true,
      value,
      label: `${value} BSV Milestone`,
      description: `Get notified when a post reaches ${value} BSV in locks`
    };

    setSettings([...settings, newSetting]);
    setNewMilestone('');
    setShowAddMilestone(false);
  };

  const handleRemove = (id: string) => {
    setSettings(settings.filter(setting => setting.id !== id));
  };

  const renderSettingCard = (setting: NotificationSetting) => (
    <div key={setting.id} className="bg-[#1A1B23] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            {setting.type === 'viral' && <FiTrendingUp className="w-4 h-4 text-[#00ffa3] mr-2" />}
            {setting.type === 'unlock' && <FiUnlock className="w-4 h-4 text-[#00ffa3] mr-2" />}
            {setting.type === 'creator' && <FiUser className="w-4 h-4 text-[#00ffa3] mr-2" />}
            {setting.type === 'milestone' && <FiStar className="w-4 h-4 text-[#00ffa3] mr-2" />}
            <p className="text-lg font-bold text-[#00ffa3]">{setting.label}</p>
          </div>
          <p className="text-sm text-gray-400">{setting.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={setting.enabled}
              onChange={() => handleToggle(setting.id)}
            />
            <div className={`
              w-11 h-6 bg-gray-700 rounded-full peer 
              peer-checked:after:translate-x-full peer-checked:bg-[#00ffa3]
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
              after:bg-white after:rounded-full after:h-5 after:w-5 
              after:transition-all
            `}></div>
          </label>
          {(setting.type === 'creator' || setting.type === 'milestone') && (
            <button
              onClick={() => handleRemove(setting.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#2A2A40] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <FiBell className="w-6 h-6 text-[#00ffa3] mr-2" />
              Notification Settings
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddCreator(true)}
                className="flex items-center px-4 py-2 bg-[#1A1B23] text-[#00ffa3] rounded-lg hover:bg-[#2A2A40] transition-colors"
              >
                <FiUser className="w-4 h-4 mr-1" />
                Follow Creator
              </button>
              <button
                onClick={() => setShowAddMilestone(true)}
                className="flex items-center px-4 py-2 bg-[#1A1B23] text-[#00ffa3] rounded-lg hover:bg-[#2A2A40] transition-colors"
              >
                <FiStar className="w-4 h-4 mr-1" />
                Add Milestone
              </button>
            </div>
          </div>

          {showAddCreator && (
            <div className="mb-6 bg-[#1A1B23] p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">
                    Creator Address
                  </label>
                  <input
                    type="text"
                    value={newCreatorAddress}
                    onChange={(e) => setNewCreatorAddress(e.target.value)}
                    placeholder="Enter BSV address"
                    className="w-full bg-[#2A2A40] border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <button
                  onClick={handleAddCreator}
                  className="px-4 py-2 bg-[#00ffa3] text-black rounded hover:bg-[#00ff9d] transition-colors"
                >
                  Follow
                </button>
                <button
                  onClick={() => setShowAddCreator(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showAddMilestone && (
            <div className="mb-6 bg-[#1A1B23] p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">
                    BSV Milestone
                  </label>
                  <input
                    type="number"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="Enter BSV amount"
                    step="0.1"
                    min="0"
                    className="w-full bg-[#2A2A40] border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <button
                  onClick={handleAddMilestone}
                  className="px-4 py-2 bg-[#00ffa3] text-black rounded hover:bg-[#00ff9d] transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddMilestone(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Platform Notifications */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Platform Notifications</h3>
              {settings.filter(s => s.type === 'viral' || s.type === 'unlock').map(renderSettingCard)}
            </div>

            {/* Milestone Notifications */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Milestone Notifications</h3>
              {settings.filter(s => s.type === 'milestone').map(renderSettingCard)}
            </div>

            {/* Creator Notifications */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Creator Notifications</h3>
              {settings.filter(s => s.type === 'creator').map(renderSettingCard)}
              {settings.filter(s => s.type === 'creator').length === 0 && (
                <p className="text-gray-400 text-sm">No creators followed yet</p>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#1A1B23] rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How it works</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>Viral post notifications are triggered when a post gains significant traction</li>
              <li>Unlock notifications remind you when your locked BSV becomes available</li>
              <li>Creator notifications alert you when specific creators post new content</li>
              <li>Milestone notifications trigger when posts reach specific BSV thresholds</li>
              <li>Make sure to enable browser notifications when prompted</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications; 