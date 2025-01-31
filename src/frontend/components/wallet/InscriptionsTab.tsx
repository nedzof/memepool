import React from 'react';
import { useWallet } from '../../providers/WalletProvider';

interface Inscription {
    id: string;
    mintTx: string;
    transferTx: string;
    imageUrl: string;
    timestamp: number;
}

export const InscriptionsTab: React.FC = () => {
    const { inscriptions = [] } = useWallet();

    if (inscriptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-400 text-lg">No inscriptions yet</p>
                <p className="text-gray-500 text-sm mt-2">
                    Create and inscribe a meme to get started
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inscriptions.map((inscription: Inscription) => (
                <div
                    key={inscription.id}
                    className="bg-[#1A1245] rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                >
                    <div className="relative aspect-square">
                        <img
                            src={inscription.imageUrl}
                            alt="Inscribed meme"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120C34] to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4 space-y-2">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Mint TX</span>
                                <span className="text-[#00FFA3] font-mono text-sm">
                                    {inscription.mintTx.slice(0, 8)}...
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Transfer TX</span>
                                <span className="text-[#00FFA3] font-mono text-sm">
                                    {inscription.transferTx.slice(0, 8)}...
                                </span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-gray-700">
                            <p className="text-gray-500 text-xs text-right">
                                {new Date(inscription.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}; 