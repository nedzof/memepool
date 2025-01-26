export interface MemeVideoMetadata {
  id: string;
  title: string;
  description: string;
  prompt: string;
  style: string;
  duration: number;
  format: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  dislikes: number;
  shares: number;
  tags: string[];
  nsfw: boolean;
  visibility: 'public' | 'private' | 'unlisted';
  license: string;
  blockchain: {
    txId: string;
    blockHeight: number;
    mintedAt: Date;
  };
  nft: {
    tokenId: string;
    contractAddress: string;
    ownerAddress: string;
    mintedAt: Date;
    marketplaceUrl: string;
  };
  revenue: {
    totalEarned: number;
    totalPaidOut: number;
    outstandingBalance: number;
  };
} 