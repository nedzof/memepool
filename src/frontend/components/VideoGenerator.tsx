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

  useEffect(() => {
    fetchTemplates();
  }, []);

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
    if (!previewUrl) {
      setError('Please select a meme template first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert the meme URL to base64
      const response = await axios.get(previewUrl, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');

      const videoResponse = await axios.post('/api/video/generate', {
        image: base64Image,
        framesPerSecond: 6,
        numFrames: 14,
        motionBucketId: 127,
        condAug: 0.5
      });

      if (onVideoGenerated) {
        onVideoGenerated(videoResponse.data.video);
      }
    } catch (err) {
      setError('Failed to generate video. Please try again.');
      console.error('Video generation error:', err);
    } finally {
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