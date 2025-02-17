export interface PostMetadata {
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
  status: 'minted';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  initialVibes: number;
  totalLockLikeVibes: number;
  totalVibes: number;
  locklikes: {
    txid: string;
    amount: number;
    locked_until: number;
    created_at: Date;
  }[];
} 