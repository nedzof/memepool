export interface MemeVideoMetadata {
  id: string;
  creator: string;
  title: string;
  description: string;
  prompt: string;
  style: string;
  duration: number;
  format: string;
  fileUrl: string;
  thumbnailUrl: string;
  txId: string;
  locks: number;
  status: 'pending' | 'minted' | 'viral' | 'failed';
  tags: string[];
  views: number;
  likes: number;
  dislikes: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
} 