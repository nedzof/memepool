export interface Meme {
  id: string;
  creator: string;
  title: string;
  description: string;
  fileUrl: string;
  txId: string;
  locks: number;
  status: 'pending' | 'minted' | 'viral' | 'failed';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemeInput {
  creator: string;
  title: string;
  description: string;
  tags: string[];
  file: Express.Multer.File;
}

export interface ListMemesInput {
  status?: string;
  creator?: string;
  page: number;
  limit: number;
}

export interface ListMemesOutput {
  memes: Meme[];
  total: number;
  page: number;
  pages: number;
} 