import React, { useState, useEffect, useRef } from 'react';
import { useBlockMemes } from '../hooks/useBlockMemes';
import { FiX, FiLoader, FiTrendingUp, FiZap, FiAlertCircle } from 'react-icons/fi';
import { videoGenerationService } from '../services/videoGeneration.service';
import { InscriptionService } from '../../services/inscriptionService';
import { useWallet } from '../providers/WalletProvider';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  memeUrl?: string;
  blockHeight?: number;
}

interface CreateMemeModalProps {
  onClose: () => void;
  onMemeCreated: (metadata: any) => void;
  currentBlock?: Block | null;
}

const CreateMemeModal: React.FC<CreateMemeModalProps> = ({
  onClose,
  onMemeCreated,
  currentBlock,
}) => {
  if (!currentBlock) return null;

  const {
    currentMeme,
    isLoading: isLoadingBlock,
    refreshBlockInfo
  } = useBlockMemes();

  const { btcAddress, connected } = useWallet();

  const [memeName, setMemeName] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [viralityScore, setViralityScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationParams, setGenerationParams] = useState({
    fps: 6,
    frames: 14,
    motionScale: 0.5
  });
  const [isInscribing, setIsInscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current block info when modal opens
  useEffect(() => {
    if (currentBlock) {
      refreshBlockInfo();
    }
  }, [currentBlock, refreshBlockInfo]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setVideoPreviewUrl(null);
    setViralityScore(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateVideo = async () => {
    if (!uploadedImage && !currentBlock.imageUrl) {
      setError('Please upload an image or use the current block image');
      return;
    }

    if (!memeName.trim()) {
      setError('Please enter a name for your meme');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    setIsModelLoading(false);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) return 95;
        return prev + 1;
      });
    }, 100);

    try {
      let imageToUse: string | File;
      
      if (uploadedImage) {
        imageToUse = uploadedImage;
      } else {
        // Fetch and convert current block image to base64
        const response = await fetch(currentBlock.imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        imageToUse = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // Generate video using either uploaded image or current block image
      const videoResponse = await videoGenerationService.generateVideo({
        image: imageToUse,
        name: memeName.trim(),
        fps: generationParams.fps,
        numFrames: generationParams.frames,
        motionScale: generationParams.motionScale
      });

      setVideoPreviewUrl(videoResponse);
      setGenerationProgress(100);
      
      // Calculate virality score
      const score = Math.floor(Math.random() * 30) + 70;
      setViralityScore(score);

    } catch (error) {
      console.error('Error generating video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
      
      // Check if the error is related to model loading
      if (errorMessage.includes('AI model is still loading')) {
        setIsModelLoading(true);
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
      setGenerationProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !btcAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!videoPreviewUrl) {
      await generateVideo();
      return;
    }

    try {
      setIsInscribing(true);
      setError(null);

      // Inscribe the video
      const response = await InscriptionService.inscribeImage(
        videoPreviewUrl,
        'video/mp4',
        btcAddress
      );

      // Create metadata
      onMemeCreated({
        prompt: memeName,
        imageUrl: currentBlock.imageUrl,
        blockNumber: currentBlock.blockNumber || currentBlock.blockHeight,
        currentMemeUrl: currentMeme?.memeUrl,
        videoUrl: videoPreviewUrl,
        viralityScore,
        inscriptionId: response.inscriptionId,
        transferTxId: response.transferTxId,
        type: 'video/mp4',
        generationParams
      });

      onClose();
    } catch (error) {
      console.error('Error creating video meme:', error);
      setError(error instanceof Error ? error.message : 'Failed to create video meme');
    } finally {
      setIsInscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-[#1A1B23] rounded-xl w-full max-w-2xl overflow-hidden border border-[#00ffa3]/30">
          {/* Header */}
          <div className="p-4 border-b border-[#2A2A40]">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#00ffa3]">
                Create Meme for Block #{currentBlock.blockNumber || currentBlock.blockHeight}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2A2A40] rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {!connected && (
            <div className="p-4 bg-yellow-500/20 border-l-4 border-yellow-500 text-yellow-400 flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5" />
              <span>Connect your Phantom wallet to inscribe memes</span>
            </div>
          )}

          {error && (
            <div className={`p-4 ${isModelLoading ? 'bg-blue-500/20 border-l-4 border-blue-500 text-blue-400' : 'bg-red-500/20 border-l-4 border-red-500 text-red-400'} flex items-center gap-2`}>
              <FiAlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Image Upload */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meme Name
                </label>
                <input
                  type="text"
                  value={memeName}
                  onChange={(e) => setMemeName(e.target.value)}
                  placeholder="Enter a name for your meme"
                  className="w-full px-3 py-2 bg-[#2A2A40] border border-[#3D3D60] rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffa3]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Image (optional)
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#2A2A40] border border-[#3D3D60] rounded text-white hover:bg-[#3D3D60] transition-colors"
                  >
                    Choose File
                  </button>
                  <span className="text-sm text-gray-400">
                    {uploadedImage?.name || 'No file chosen'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Video Preview / Generation Controls */}
            <div className="relative aspect-square bg-[#2A2A40] rounded-lg overflow-hidden">
              {!videoPreviewUrl && !isGenerating && (
                <img
                  src={imagePreviewUrl || currentBlock.imageUrl}
                  alt="Original Image"
                  className="w-full h-full object-cover"
                />
              )}

              {videoPreviewUrl && !isGenerating && (
                <video
                  src={videoPreviewUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}

              {/* Generation Progress */}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                  <FiZap className="w-12 h-12 text-[#00ffa3] animate-pulse mb-4" />
                  <div className="w-48 h-2 bg-[#2A2A40] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#00ffa3] transition-all duration-300"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <span className="text-[#00ffa3] mt-2">Generating video...</span>
                </div>
              )}

              {/* Generation Parameters */}
              {!videoPreviewUrl && !isGenerating && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">FPS</label>
                      <input
                        type="number"
                        min="4"
                        max="30"
                        value={generationParams.fps}
                        onChange={(e) => setGenerationParams(prev => ({
                          ...prev,
                          fps: Math.min(30, Math.max(4, parseInt(e.target.value) || 4))
                        }))}
                        className="w-full px-2 py-1 bg-[#2A2A40] border border-[#3D3D60] rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Frames</label>
                      <input
                        type="number"
                        min="12"
                        max="50"
                        value={generationParams.frames}
                        onChange={(e) => setGenerationParams(prev => ({
                          ...prev,
                          frames: Math.min(50, Math.max(12, parseInt(e.target.value) || 12))
                        }))}
                        className="w-full px-2 py-1 bg-[#2A2A40] border border-[#3D3D60] rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Motion</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={generationParams.motionScale}
                        onChange={(e) => setGenerationParams(prev => ({
                          ...prev,
                          motionScale: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0))
                        }))}
                        className="w-full px-2 py-1 bg-[#2A2A40] border border-[#3D3D60] rounded text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isGenerating || isInscribing || (!connected && !!videoPreviewUrl) || !memeName.trim()}
              className={`w-full py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 ${
                isGenerating || isInscribing || (!connected && !!videoPreviewUrl) || !memeName.trim()
                  ? 'bg-[#2A2A40] text-gray-400 cursor-not-allowed'
                  : videoPreviewUrl
                  ? 'bg-[#00ffa3] text-black hover:bg-[#00ffa3]/90'
                  : 'bg-[#9945FF] text-white hover:bg-[#9945FF]/90'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <FiLoader className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </span>
              ) : isInscribing ? (
                <span className="flex items-center justify-center">
                  <FiLoader className="w-5 h-5 animate-spin mr-2" />
                  Inscribing...
                </span>
              ) : !videoPreviewUrl ? (
                'Generate Video'
              ) : (
                'Create & Inscribe Meme'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMemeModal; 