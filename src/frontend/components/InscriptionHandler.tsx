import React, { useState } from 'react';
import { inscribeImage, fileToBuffer } from '../utils/inscription-utils';

interface InscriptionHandlerProps {
    imageBlob: Blob;
    receiverAddress: string;
    onSuccess?: (mintTxId: string, transferTxId: string) => void;
    onError?: (error: Error) => void;
}

export const InscriptionHandler: React.FC<InscriptionHandlerProps> = ({
    imageBlob,
    receiverAddress,
    onSuccess,
    onError
}) => {
    const [isInscribing, setIsInscribing] = useState(false);
    const [status, setStatus] = useState<string>('');

    const handleInscription = async () => {
        try {
            setIsInscribing(true);
            setStatus('Converting image...');
            
            // Convert Blob to Buffer
            const imageBuffer = await fileToBuffer(new File([imageBlob], 'meme.png'));
            
            setStatus('Inscribing image...');
            const { mintTx, transferTx } = await inscribeImage(imageBuffer, receiverAddress);
            
            setStatus('Inscription complete!');
            onSuccess?.(mintTx, transferTx);
        } catch (error) {
            console.error('Error during inscription:', error);
            setStatus('Inscription failed');
            onError?.(error as Error);
        } finally {
            setIsInscribing(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleInscription}
                disabled={isInscribing}
                className={`px-4 py-2 rounded-lg ${
                    isInscribing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                } text-white font-semibold transition-colors`}
            >
                {isInscribing ? 'Inscribing...' : 'Inscribe Meme'}
            </button>
            {status && (
                <p className="text-sm text-gray-600">
                    {status}
                </p>
            )}
        </div>
    );
}; 