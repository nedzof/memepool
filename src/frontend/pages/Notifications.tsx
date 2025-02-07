import React, { useState } from 'react';
import { FiBell, FiPlus, FiTrash2 } from 'react-icons/fi';

interface NotificationSetting {
  threshold: number;
  enabled: boolean;
}

const DEFAULT_THRESHOLDS = [0.1, 0.5, 1, 5, 10];

const Notifications: React.FC = () => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(
    DEFAULT_THRESHOLDS.map(threshold => ({
      threshold,
      enabled: false
    }))
  );
  const [newThreshold, setNewThreshold] = useState<string>('');
  const [showAddThreshold, setShowAddThreshold] = useState(false);

  const handleAddThreshold = () => {
    const threshold = parseFloat(newThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      alert('Please enter a valid number greater than 0');
      return;
    }

    if (notificationSettings.some(setting => setting.threshold === threshold)) {
      alert('This threshold already exists');
      return;
    }

    const newSettings = [...notificationSettings, { threshold, enabled: true }]
      .sort((a, b) => a.threshold - b.threshold);
    
    setNotificationSettings(newSettings);
    setNewThreshold('');
    setShowAddThreshold(false);
  };

  const handleRemoveThreshold = (threshold: number) => {
    const newSettings = notificationSettings.filter(setting => setting.threshold !== threshold);
    setNotificationSettings(newSettings);
  };

  const handleToggle = (threshold: number) => {
    const newSettings = notificationSettings.map(setting =>
      setting.threshold === threshold
        ? { ...setting, enabled: !setting.enabled }
        : setting
    );
    setNotificationSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#2A2A40] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <FiBell className="w-6 h-6 text-[#00ffa3] mr-2" />
              BSV Lock Notifications
            </h2>
            <button
              onClick={() => setShowAddThreshold(true)}
              className="flex items-center px-4 py-2 bg-[#1A1B23] text-[#00ffa3] rounded-lg hover:bg-[#2A2A40] transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-1" />
              Add Threshold
            </button>
          </div>

          {showAddThreshold && (
            <div className="mb-6 bg-[#1A1B23] p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">
                    BSV Threshold
                  </label>
                  <input
                    type="number"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    placeholder="Enter BSV amount"
                    step="0.1"
                    min="0"
                    className="w-full bg-[#2A2A40] border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <button
                  onClick={handleAddThreshold}
                  className="px-4 py-2 bg-[#00ffa3] text-black rounded hover:bg-[#00ff9d] transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddThreshold(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {notificationSettings.map((setting, index) => (
              <div key={index} className="bg-[#1A1B23] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Notify when post reaches</p>
                    <p className="text-xl font-bold text-[#00ffa3]">{setting.threshold} BSV</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={setting.enabled}
                        onChange={() => handleToggle(setting.threshold)}
                      />
                      <div className={`
                        w-11 h-6 bg-gray-700 rounded-full peer 
                        peer-checked:after:translate-x-full peer-checked:bg-[#00ffa3]
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                        after:bg-white after:rounded-full after:h-5 after:w-5 
                        after:transition-all
                      `}></div>
                    </label>
                    <button
                      onClick={() => handleRemoveThreshold(setting.threshold)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#1A1B23] rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How it works</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>You'll receive browser notifications when any post reaches these BSV thresholds</li>
              <li>Make sure to enable browser notifications when prompted</li>
              <li>Notifications are only sent once per threshold per post</li>
              <li>Your notification preferences are saved automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications; 