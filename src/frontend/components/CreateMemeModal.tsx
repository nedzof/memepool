import React, { useState, useEffect } from 'react';
import { useMemeTemplates } from '../hooks/useMemeTemplates';
import { useBlockMemes } from '../hooks/useBlockMemes';
import { FiX, FiLoader, FiTrendingUp } from 'react-icons/fi';

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
  // Return null if no currentBlock to prevent rendering
  if (!currentBlock) return null;

  const {
    templates,
    isLoading: isLoadingTemplates,
    error: templateError,
    generateMemeWithText,
    isTemplateLoaded
  } = useMemeTemplates();

  const {
    currentHeight,
    currentMeme,
    isLoading: isLoadingBlock,
    error: blockError,
    refreshBlockInfo
  } = useBlockMemes();

  const [prompt, setPrompt] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [viralityScore, setViralityScore] = useState<number | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Fetch current block info only when modal is opened (currentBlock exists)
  useEffect(() => {
    if (currentBlock) {
      refreshBlockInfo();
    }
  }, [currentBlock, refreshBlockInfo]);

  // Use default template (first template)
  useEffect(() => {
    if (templates.length > 0 && !isLoadingTemplates && currentBlock) {
      handlePromptChange(templates[0].id);
    }
  }, [templates, isLoadingTemplates, currentBlock]);

  const handlePromptChange = async (templateId: string) => {
    setIsPreviewLoading(true);
    try {
      const memeUrl = await generateMemeWithText(templateId, prompt, '');
      if (memeUrl) {
        setPreviewUrl(memeUrl);
        generateVideoPreview(memeUrl);
      }
    } catch (error) {
      console.error('Error updating preview:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const generateVideoPreview = async (memeUrl: string) => {
    setIsGeneratingVideo(true);
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: memeUrl,
          framesPerSecond: 6,
          numFrames: 14,
          motionBucketId: 127,
          condAug: 0.5
        })
      });
      
      const data = await response.json();
      setVideoPreviewUrl(data.video);
      
      // Calculate virality score (mock implementation)
      const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100 range
      setViralityScore(mockScore);
    } catch (error) {
      console.error('Error generating video:', error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templates.length) return;

    setIsGenerating(true);
    try {
      const memeUrl = await generateMemeWithText(templates[0].id, prompt, '');
      if (memeUrl) {
        onMemeCreated({
          templateId: templates[0].id,
          prompt,
          imageUrl: memeUrl,
          blockNumber: currentBlock.blockNumber || currentBlock.blockHeight,
          currentMemeUrl: currentMeme?.memeUrl,
          videoUrl: videoPreviewUrl,
          viralityScore
        });
      }
    } catch (error) {
      console.error('Error creating meme:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const error = templateError || blockError;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-[#1A1B23] rounded-xl w-full max-w-5xl overflow-hidden border border-[#00ffa3]/30">
          {/* Header */}
          <div className="p-6 border-b border-[#2A2A40]">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#00ffa3]">
                Create Meme for Block #{currentBlock.blockNumber || currentBlock.blockHeight}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2A2A40] rounded-full transition-colors"
              >
                <FiX className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border-l-4 border-red-500 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Left side - Current Meme */}
              <div>
                <h3 className="text-lg font-medium text-[#00ffa3] mb-4">Current Meme</h3>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-[#3D3D60]">
                  {isLoadingBlock ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#2A2A40]">
                      <FiLoader className="w-8 h-8 text-[#00ffa3] animate-spin" />
                    </div>
                  ) : (
                    <img
                      src={currentMeme?.memeUrl || currentBlock.memeUrl || currentBlock.imageUrl}
                      alt="Current Meme"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Right side - Video Preview */}
              <div>
                <h3 className="text-lg font-medium text-[#00ffa3] mb-4">Generated Video Preview</h3>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-[#3D3D60] bg-[#2A2A40]">
                  {isGeneratingVideo ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FiLoader className="w-8 h-8 text-[#00ffa3] animate-spin" />
                      <span className="ml-2 text-[#00ffa3]">Generating video...</span>
                    </div>
                  ) : videoPreviewUrl ? (
                    <>
                      <video
                        src={videoPreviewUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                      {viralityScore !== null && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-sm">
                          <div className="flex items-center">
                            <FiTrendingUp className="w-5 h-5 text-[#00ffa3]" />
                            <span className="ml-2 text-[#00ffa3] font-medium">
                              Virality Score: {viralityScore}%
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      Video preview will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="mt-6">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  handlePromptChange(templates[0]?.id);
                }}
                className="w-full p-4 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ffa3] focus:border-transparent resize-none h-24"
                placeholder="Enter your creative prompt here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-[#2A2A40]">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-400 bg-[#2A2A40] rounded-lg hover:bg-[#3D3D60] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || isPreviewLoading || isGeneratingVideo}
                className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                  isGenerating || isPreviewLoading || isGeneratingVideo
                    ? 'bg-[#2A2A40] text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-white hover:scale-105 transform transition-all duration-200'
                }`}
              >
                {(isGenerating || isPreviewLoading || isGeneratingVideo) && (
                  <FiLoader className="w-4 h-4 animate-spin" />
                )}
                <span>
                  {isGenerating ? 'Creating...' : 'Create Meme'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMemeModal; 