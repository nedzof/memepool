import { useState, useEffect } from 'react';
import axios from 'axios';

interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

export const useMemeTemplates = () => {
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/memes/templates');
      const fetchedTemplates = response.data;
      setTemplates(fetchedTemplates);

      // Preload template images
      fetchedTemplates.forEach((template: MemeTemplate) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => ({ ...prev, [template.id]: true }));
        };
        img.src = template.url;
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching meme templates:', err);
      setError('Failed to load meme templates');
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomTemplate = () => {
    if (templates.length === 0) return null;
    const loadedTemplates = templates.filter(t => loadedImages[t.id]);
    if (loadedTemplates.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * loadedTemplates.length);
    return loadedTemplates[randomIndex];
  };

  const getRandomMemeUrl = async (width: number = 300) => {
    try {
      const response = await axios.get(`/api/memes/random?width=${width}`);
      const imageUrl = response.data.url;

      // Ensure the image is loaded before returning
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(imageUrl);
        img.onerror = () => reject(new Error('Failed to load meme image'));
        img.src = imageUrl;
      });
    } catch (err) {
      console.error('Error getting random meme:', err);
      return null;
    }
  };

  const generateMemeWithText = async (
    templateId: string,
    topText: string = '',
    bottomText: string = '',
    width: number = 300
  ) => {
    try {
      const response = await axios.get('/api/memes/generate', {
        params: { templateId, topText, bottomText, width }
      });
      const imageUrl = response.data.url;

      // Ensure the generated meme is loaded before returning
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(imageUrl);
        img.onerror = () => reject(new Error('Failed to load generated meme'));
        img.src = imageUrl;
      });
    } catch (err) {
      console.error('Error generating meme:', err);
      return null;
    }
  };

  const isTemplateLoaded = (templateId: string) => {
    return loadedImages[templateId] || false;
  };

  return {
    templates,
    isLoading,
    error,
    getRandomTemplate,
    getRandomMemeUrl,
    generateMemeWithText,
    refreshTemplates: fetchTemplates,
    isTemplateLoaded
  };
}; 