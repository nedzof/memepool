import React, { useState } from 'react';
import { useWallet } from '../../providers/WalletProvider';
import { InscriptionsTab } from './InscriptionsTab';

type TabType = 'send' | 'receive' | 'history' | 'inscriptions';

export const WalletInterface: React.FC = () => {
    const { connected, btcAddress, balance } = useWallet();
    const [activeTab, setActiveTab] = useState<TabType>('send');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('0.0');

    if (!connected) {
        return (
            <div className="p-4 text-center">
                <p className="text-gray-500">Please connect your wallet to continue</p>
            </div>
        );
    }

    const renderSendTab = () => (
        <div className="space-y-4 p-4">
            <div>
                <label className="text-gray-400 text-sm">Recipient Address</label>
                <input
                    type="text"
                    placeholder="Enter BSV address"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full mt-1 bg-[#1A1245] border border-gray-700 rounded p-2 text-white"
                />
            </div>
            <div>
                <label className="text-gray-400 text-sm">Amount (BSV)</label>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full mt-1 bg-[#1A1245] border border-gray-700 rounded p-2 text-white"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        BSV
                    </span>
                </div>
                <p className="text-right text-[#00FFA3] text-sm mt-1">Max: 100 BSV</p>
            </div>
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded p-3 mt-4 flex items-center justify-center gap-2">
                <span className="transform rotate-90">⌃</span>
                Send BSV
            </button>
        </div>
    );

    const renderReceiveTab = () => (
        <div className="p-4">
            <p>Receive functionality coming soon...</p>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="p-4">
            <p>Transaction history coming soon...</p>
        </div>
    );

    return (
        <div className="bg-[#120C34] text-white rounded-lg overflow-hidden">
            <div className="flex border-b border-gray-700">
                <button
                    className={`flex-1 px-4 py-2 text-center ${
                        activeTab === 'send' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'
                    }`}
                    onClick={() => setActiveTab('send')}
                >
                    Send
                </button>
                <button
                    className={`flex-1 px-4 py-2 text-center ${
                        activeTab === 'receive' ? 'text-[#00FFA3] border-b-2 border-[#00FFA3]' : 'text-gray-400'
                    }`}
                    onClick={() => setActiveTab('receive')}
                >
                    Receive
                </button>
                <button
                    className={`flex-1 px-4 py-2 text-center ${
                        activeTab === 'history' ? 'text-[#00FFA3] border-b-2 border-[#00FFA3]' : 'text-gray-400'
                    }`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
                <button
                    className={`flex-1 px-4 py-2 text-center ${
                        activeTab === 'inscriptions' ? 'text-[#00FFA3] border-b-2 border-[#00FFA3]' : 'text-gray-400'
                    }`}
                    onClick={() => setActiveTab('inscriptions')}
                >
                    Inscriptions
                </button>
            </div>

            {activeTab === 'send' && renderSendTab()}
            {activeTab === 'receive' && renderReceiveTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'inscriptions' && <InscriptionsTab />}
        </div>
    );
}; 