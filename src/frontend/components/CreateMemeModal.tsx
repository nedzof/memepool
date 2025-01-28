import React, { useState, useEffect, useRef } from 'react';
import { useMemeTemplates } from '../hooks/useMemeTemplates';
import { useBlockMemes } from '../hooks/useBlockMemes';
import { FiX, FiLoader, FiTrendingUp, FiZap } from 'react-icons/fi';
import { videoGenerationService } from '../services/videoGeneration.service';

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
    templates,
    isLoading: isLoadingTemplates,
    generateMemeWithText,
    isTemplateLoaded
  } = useMemeTemplates();

  const {
    currentMeme,
    isLoading: isLoadingBlock,
    refreshBlockInfo
  } = useBlockMemes();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [viralityScore, setViralityScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [distortionLevel, setDistortionLevel] = useState(0);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });
  const [colorShift, setColorShift] = useState(0);
  const [waveEffect, setWaveEffect] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const distortionIntervalRef = useRef<NodeJS.Timeout>();

  // Fetch current block info when modal opens
  useEffect(() => {
    if (currentBlock) {
      refreshBlockInfo();
    }
  }, [currentBlock, refreshBlockInfo]);

  // Use default template
  useEffect(() => {
    if (templates.length > 0 && !isLoadingTemplates && currentBlock) {
      handlePromptChange(templates[0].id);
    }
  }, [templates, isLoadingTemplates, currentBlock]);

  const handlePromptChange = async (templateId: string) => {
    // Clear previous timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (distortionIntervalRef.current) {
      clearInterval(distortionIntervalRef.current);
    }

    setIsTyping(true);
    setDistortionLevel(0);
    setGlitchOffset({ x: 0, y: 0 });
    setColorShift(0);
    setWaveEffect(0);

    // Create random distortion effects while typing
    distortionIntervalRef.current = setInterval(() => {
      // Random distortion level
      setDistortionLevel(Math.random());
      
      // Random glitch offset
      setGlitchOffset({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10
      });
      
      // Random color shift
      setColorShift(Math.random() * 360);
      
      // Random wave effect
      setWaveEffect(Math.random() * Math.PI * 2);
    }, 100);

    // Set new timeout to stop effects after typing
    typingTimeoutRef.current = setTimeout(() => {
      if (distortionIntervalRef.current) {
        clearInterval(distortionIntervalRef.current);
      }
      setIsTyping(false);
      setDistortionLevel(0);
      setGlitchOffset({ x: 0, y: 0 });
      setColorShift(0);
      setWaveEffect(0);
    }, 1000);
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 30);

    try {
      const imageResponse = await fetch(currentBlock.imageUrl);
      const imageBlob = await imageResponse.blob();
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(imageBlob);
      });

      const videoUrl = await videoGenerationService.generateVideo({
        image: base64Image.split(',')[1],
        fps: 4,
        numFrames: 12,
        motionScale: 0.5
      });

      setVideoPreviewUrl(videoUrl);
      
      // Calculate virality score with fun animation
      let score = 0;
      const scoreInterval = setInterval(() => {
        score += Math.random() * 5;
        if (score >= 100) {
          score = Math.min(score, 100);
          clearInterval(scoreInterval);
        }
        setViralityScore(Math.floor(score));
      }, 50);

    } catch (error) {
      console.error('Error generating video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
      setError(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templates.length || isGenerating) return;

    if (!videoPreviewUrl) {
      await generateVideo();
    } else {
      try {
        onMemeCreated({
          templateId: templates[0].id,
          prompt,
          imageUrl: currentBlock.imageUrl,
          blockNumber: currentBlock.blockNumber || currentBlock.blockHeight,
          currentMemeUrl: currentMeme?.memeUrl,
          videoUrl: videoPreviewUrl,
          viralityScore
        });
      } catch (error) {
        console.error('Error creating meme:', error);
      }
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

          {error && (
            <div className="p-4 bg-red-500/20 border-l-4 border-red-500 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4">
            {/* Single Image Display */}
            <div className="relative aspect-square rounded-lg overflow-hidden border border-[#3D3D60] mb-4">
              {isLoadingBlock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#2A2A40]">
                  <FiLoader className="w-8 h-8 text-[#00ffa3] animate-spin" />
                </div>
              ) : (
                <>
                  {/* Original Image */}
                  <div className="relative w-full h-full">
                    <img
                      src={currentMeme?.memeUrl || currentBlock.memeUrl || currentBlock.imageUrl}
                      alt="Meme"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        isTyping 
                          ? `blur-${Math.floor(distortionLevel * 3)}xl`
                          : ''
                      }`}
                      style={{
                        transform: isTyping 
                          ? `
                            translate(${glitchOffset.x}px, ${glitchOffset.y}px)
                            rotate(${distortionLevel * 2}deg)
                            scale(${1 + distortionLevel * 0.1})
                            skew(${distortionLevel * 5}deg)
                          `
                          : 'none',
                        filter: isTyping
                          ? `
                            hue-rotate(${colorShift}deg)
                            contrast(${1 + distortionLevel})
                            brightness(${1 + distortionLevel * 0.5})
                          `
                          : 'none',
                        transition: 'all 0.2s ease-out'
                      }}
                    />
                    {isTyping && (
                      <>
                        {/* Glitch Overlay 1 */}
                        <div
                          className="absolute inset-0 mix-blend-screen"
                          style={{
                            transform: `translate(${-glitchOffset.x * 2}px, ${-glitchOffset.y * 1.5}px)`,
                            background: `rgba(255, 0, 0, ${distortionLevel * 0.2})`,
                            clipPath: `polygon(${Math.random() * 100}% 0, 100% ${Math.random() * 100}%, ${Math.random() * 100}% 100%, 0 ${Math.random() * 100}%)`
                          }}
                        />
                        {/* Glitch Overlay 2 */}
                        <div
                          className="absolute inset-0 mix-blend-screen"
                          style={{
                            transform: `translate(${glitchOffset.x * 1.5}px, ${glitchOffset.y * 2}px)`,
                            background: `rgba(0, 255, 255, ${distortionLevel * 0.2})`,
                            clipPath: `polygon(${Math.random() * 100}% 0, 100% ${Math.random() * 100}%, ${Math.random() * 100}% 100%, 0 ${Math.random() * 100}%)`
                          }}
                        />
                        {/* Wave Effect */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `linear-gradient(${waveEffect * 180}deg, transparent, rgba(255, 255, 255, ${distortionLevel * 0.1}), transparent)`,
                            transform: `translateY(${Math.sin(waveEffect) * 100}%)`,
                            transition: 'transform 0.5s ease-out'
                          }}
                        />
                      </>
                    )}
                  </div>
                  
                  {/* Video Preview Overlay */}
                  {videoPreviewUrl && !isTyping && !isGenerating && (
                    <video
                      src={videoPreviewUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}

                  {/* Generation Progress Overlay */}
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

                  {/* Virality Score */}
                  {viralityScore !== null && !isTyping && !isGenerating && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FiTrendingUp className="w-5 h-5 text-[#00ffa3]" />
                          <span className="ml-2 text-[#00ffa3] font-medium">
                            Virality Score: {viralityScore}%
                          </span>
                        </div>
                        <span className="text-[#00ffa3]/60 text-sm">
                          3s • 12 frames
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Prompt Input */}
            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  handlePromptChange(templates[0]?.id);
                }}
                className="w-full p-4 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ffa3] focus:border-transparent resize-none h-24"
                placeholder="✨ Drop your creative prompt here and watch the magic happen..."
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating || (!videoPreviewUrl && !prompt.trim())}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                  isGenerating || (!videoPreviewUrl && !prompt.trim())
                    ? 'bg-[#2A2A40] text-gray-400 cursor-not-allowed'
                    : 'bg-[#00ffa3] text-black hover:bg-[#00ffa3]/90'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <FiLoader className="w-5 h-5 animate-spin mr-2" />
                    Generating...
                  </span>
                ) : !videoPreviewUrl ? (
                  'Generate Video'
                ) : (
                  'Create Meme'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMemeModal; 