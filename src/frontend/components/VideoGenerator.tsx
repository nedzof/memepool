import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onVideoGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generationParams, setGenerationParams] = useState({
    fps: 6,
    frames: 14,
    motionScale: 0.5
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!activeTaskId) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/video/tasks/${activeTaskId}`);
        const task = response.data;
        
        if (task.status === 'completed') {
          clearInterval(interval);
          setActiveTaskId(null);
          if (onVideoGenerated && task.payload?.videoUrl) {
            onVideoGenerated(task.payload.videoUrl);
          }
        } else if (task.status === 'failed') {
          clearInterval(interval);
          setActiveTaskId(null);
          setError('Video generation failed');
        }
        
        const age = Date.now() - new Date(task.createdAt).getTime();
        setProgress(Math.min(95, Math.floor(age / 1000)));

      } catch (error) {
        console.error('Error checking task status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTaskId, onVideoGenerated]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('https://api.memegen.link/templates');
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load meme templates');
    }
  };

  const handleTemplateSelect = async (template: MemeTemplate) => {
    setSelectedTemplate(template);
    const memeUrl = await generateMemePreview(template.id);
    setPreviewUrl(memeUrl);
  };

  const generateMemePreview = async (templateId: string) => {
    const encodedTop = encodeURIComponent(topText);
    const encodedBottom = encodeURIComponent(bottomText);
    return `https://api.memegen.link/images/${templateId}/${encodedTop}/${encodedBottom}.jpg?width=300`;
  };

  const handleTextChange = async () => {
    if (selectedTemplate) {
      const memeUrl = await generateMemePreview(selectedTemplate.id);
      setPreviewUrl(memeUrl);
    }
  };

  const handleGenerate = async () => {
    try {
      if (!selectedTemplate) {
        setError('Please select a meme template');
        return;
      }

      if (generationParams.frames < 12 || generationParams.frames > 100) {
        setError('Frames must be between 12-100');
        return;
      }

      setIsLoading(true);
      setError(null);
      
      const base64Image = await convertPreviewToBase64();
      
      const response = await axios.post('/api/video/generate', {
        image: base64Image,
        config: {
          fps: generationParams.fps,
          frames: generationParams.frames,
          motion: generationParams.motionScale
        }
      });

      setActiveTaskId(response.data.jobId);
      setProgress(0);
    } catch (error) {
      console.error('Generation failed:', error);
      setError(error.response?.data?.error || 'Generation failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Meme to 3D Video Generator</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Meme Template
        </label>
        <select
          className="w-full p-2 border rounded"
          onChange={(e) => {
            const template = templates.find(t => t.id === e.target.value);
            if (template) handleTemplateSelect(template);
          }}
          value={selectedTemplate?.id || ''}
        >
          <option value="">Choose a template...</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Top Text
            </label>
            <input
              type="text"
              value={topText}
              onChange={(e) => {
                setTopText(e.target.value);
                handleTextChange();
              }}
              className="w-full p-2 border rounded"
              placeholder="Enter top text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bottom Text
            </label>
            <input
              type="text"
              value={bottomText}
              onChange={(e) => {
                setBottomText(e.target.value);
                handleTextChange();
              }}
              className="w-full p-2 border rounded"
              placeholder="Enter bottom text"
            />
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="mb-4">
          <img
            src={previewUrl}
            alt="Meme Preview"
            className="max-w-xs rounded-lg shadow-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            FPS (3-30)
            <input
              type="number"
              min="3"
              max="30"
              value={generationParams.fps}
              onChange={(e) => setGenerationParams(prev => ({
                ...prev,
                fps: Math.min(30, Math.max(3, parseInt(e.target.value) || 3))
              }))}
              className="w-full p-2 border rounded"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frames (14-100)
            <input
              type="number"
              min="14"
              max="100"
              value={generationParams.frames}
              onChange={(e) => setGenerationParams(prev => ({
                ...prev,
                frames: Math.min(100, Math.max(14, parseInt(e.target.value) || 14))
              }))}
              className="w-full p-2 border rounded"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motion Scale (0-1)
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
              className="w-full p-2 border rounded"
            />
          </label>
        </div>
      </div>

      {activeTaskId && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded">
            <div 
              className="h-full bg-blue-500 rounded transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Generating video... {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isLoading || !previewUrl}
        className={`px-4 py-2 rounded ${
          isLoading || !previewUrl
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600'
        } text-white transition-colors`}
      >
        {isLoading ? 'Generating...' : 'Generate 3D Video'}
      </button>
    </div>
  );
};

export default VideoGenerator; 