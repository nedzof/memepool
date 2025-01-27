import React, { useState, useEffect } from 'react';
import { MemeVideoMetadata } from '../../shared/types/metadata';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
}

interface MemeVideoFormProps {
  onSubmit: (metadata: MemeVideoMetadata) => void;
  onCancel: () => void;
  currentBlock: Block;
}

const MemeVideoForm: React.FC<MemeVideoFormProps> = ({ onSubmit, onCancel, currentBlock }) => {
  const [prompt, setPrompt] = useState('');
  const [viralityScore, setViralityScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analyzePrompt = async () => {
      if (!prompt || prompt.length < 3) {
        setViralityScore(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const score = Math.random() * 100;
        setViralityScore(score);
      } catch (err) {
        setError('Failed to analyze prompt');
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounce = setTimeout(analyzePrompt, 500);
    return () => clearTimeout(debounce);
  }, [prompt]);

  const getViralityEmoji = (score: number) => {
    if (score >= 80) return '🔥';
    if (score >= 60) return '✨';
    if (score >= 40) return '💫';
    return '✌️';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) {
      setError('drop some text first! 👆');
      return;
    }

    try {
      const now = new Date();
      const metadata: Omit<MemeVideoMetadata, 'id'> = {
        title: prompt,
        description: prompt,
        creator: currentBlock.creator || 'anonymous',
        prompt,
        style: 'default',
        duration: 0,
        format: 'video/mp4',
        fileUrl: '',
        thumbnailUrl: currentBlock.imageUrl,
        txId: currentBlock.txId || '',
        locks: 0,
        status: 'pending',
        tags: [],
        views: 0,
        likes: 0,
        dislikes: 0,
        shares: 0,
        createdAt: now,
        updatedAt: now,
      };

      onSubmit(metadata as MemeVideoMetadata);
    } catch (err) {
      setError('oops! something went wrong 😅');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-32 bg-white/10 backdrop-blur-xl rounded-2xl border-2 border-[#00ffa3]/20 text-white placeholder-white/50 focus:outline-none focus:border-[#00ffa3] px-4 py-3 text-lg transition-all resize-none"
          placeholder="drop your meme idea here..."
          style={{ scrollbarWidth: 'none' }}
        />
        
        {viralityScore !== null && !isAnalyzing && (
          <div className="absolute -right-2 -top-2 bg-[#00ffa3] text-black text-xl font-bold rounded-full w-12 h-12 flex items-center justify-center transform transition-all duration-300 hover:scale-110">
            {getViralityEmoji(viralityScore)}
          </div>
        )}
      </div>

      {viralityScore !== null && !isAnalyzing && (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4">
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00ffa3] to-[#9945FF] transition-all duration-500"
              style={{ width: `${viralityScore}%` }}
            />
          </div>
          <div className="mt-2 text-center font-medium text-white/80">
            {viralityScore >= 80 ? "this could go viral! 🚀" :
             viralityScore >= 60 ? "looking good! ✨" :
             viralityScore >= 40 ? "not bad! 💫" :
             "keep trying! ✌️"}
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex justify-center">
          <div className="animate-bounce text-2xl">✨</div>
        </div>
      )}

      {error && (
        <div className="text-[#ff6b6b] text-center">{error}</div>
      )}

      <button
        type="submit"
        disabled={!prompt || isAnalyzing}
        className="w-full py-4 rounded-2xl font-medium text-lg bg-gradient-to-r from-[#00ffa3] to-[#9945FF] text-black hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isAnalyzing ? "analyzing..." : "create meme ✨"}
      </button>
    </form>
  );
};

export default MemeVideoForm; 