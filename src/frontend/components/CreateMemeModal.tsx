import React, { useState } from 'react';
import { useMemeTemplates } from '../hooks/useMemeTemplates';
import { FiX, FiLoader } from 'react-icons/fi';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
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
  const {
    templates,
    isLoading: isLoadingTemplates,
    error,
    generateMemeWithText,
    isTemplateLoaded
  } = useMemeTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  if (!currentBlock) {
    return null;
  }

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      setIsPreviewLoading(true);
      try {
        const memeUrl = await generateMemeWithText(templateId, topText, bottomText);
        if (memeUrl) {
          setPreviewUrl(memeUrl);
        }
      } catch (error) {
        console.error('Error generating preview:', error);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const handleTextChange = async () => {
    if (selectedTemplate) {
      setIsPreviewLoading(true);
      try {
        const memeUrl = await generateMemeWithText(selectedTemplate, topText, bottomText);
        if (memeUrl) {
          setPreviewUrl(memeUrl);
        }
      } catch (error) {
        console.error('Error updating preview:', error);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      const memeUrl = await generateMemeWithText(selectedTemplate, topText, bottomText);
      if (memeUrl) {
        onMemeCreated({
          templateId: selectedTemplate,
          topText,
          bottomText,
          imageUrl: memeUrl,
          blockNumber: currentBlock.blockNumber
        });
      }
    } catch (error) {
      console.error('Error creating meme:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Create Meme for Block {currentBlock.blockNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={isLoadingTemplates}
            >
              <option value="">Choose a template...</option>
              {templates.map(template => (
                <option 
                  key={template.id} 
                  value={template.id}
                  disabled={!isTemplateLoaded(template.id)}
                >
                  {template.name} {!isTemplateLoaded(template.id) ? '(Loading...)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          {(previewUrl || isPreviewLoading) && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="relative">
                {isPreviewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <FiLoader className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Meme Preview"
                    className={`max-w-full h-auto rounded-lg shadow-sm transition-opacity duration-300 ${
                      isPreviewLoading ? 'opacity-50' : 'opacity-100'
                    }`}
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTemplate || isGenerating || isPreviewLoading}
              className={`px-4 py-2 text-white rounded flex items-center space-x-2 ${
                !selectedTemplate || isGenerating || isPreviewLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isGenerating && <FiLoader className="w-4 h-4 animate-spin" />}
              <span>{isGenerating ? 'Creating...' : 'Create Meme'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMemeModal; 