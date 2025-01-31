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
                <p className="text-gray-500 text-lg">No inscriptions yet</p>
                <p className="text-gray-400 text-sm mt-2">
                    Create and inscribe a meme to get started
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {inscriptions.map((inscription: Inscription) => (
                <div
                    key={inscription.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                    <img
                        src={inscription.imageUrl}
                        alt="Inscribed meme"
                        className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-gray-600">
                                Mint TX: {inscription.mintTx.slice(0, 8)}...
                            </p>
                            <p className="text-sm text-gray-600">
                                Transfer TX: {inscription.transferTx.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-gray-400">
                                {new Date(inscription.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}; 