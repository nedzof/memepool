import { PostMetadata } from '../../shared/types/metadata';
import { supabase } from '../utils/supabaseClient';
import type { Database } from '../../types/supabase';

interface Transaction {
  txid: string;
  amount: number;
  handle_id: string;
  note: string;
  locked_until: number;
  created_at: Date;
  totalAmountandLockLiked: number;
  totalAmountandLockLikedForReplies: number;
  locklikes: LockLike[];
  initialVibes: number;
  totalLockLikeVibes: number;
  totalVibes: number;
  mediaUrl?: string;
}

interface LockLike {
  txid: string;
  amount: number;
  locked_until: number;
  created_at: Date;
}

interface Post {
  content: string;
  mediaUrl?: string | null;
  lockUntilBlock: number;
  amount: number;
  initialVibes: number;
  timestamp: number;
  txid: string;
}

type DatabasePost = Database['public']['Tables']['posts']['Row'] & {
  creator: Database['public']['Tables']['creators']['Row'];
  locklikes: Database['public']['Tables']['locklikes']['Row'][];
};

type DatabaseLockLike = Database['public']['Tables']['locklikes']['Row'];

class StorageService {
  private currentBlockHeight: number = 0;

  constructor() {
    this.fetchCurrentBlockHeight();
  }

  private async fetchCurrentBlockHeight(): Promise<void> {
    try {
      const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
      const data = await response.json();
      this.currentBlockHeight = data.blocks;
    } catch (error) {
      console.error('Failed to fetch block height:', error);
      this.currentBlockHeight = 830000; // Fallback value
    }
  }

  private calculateVibes(amount: number, lockPeriod: number): number {
    return (amount / 100000000) * Math.log(lockPeriod);
  }

  async getPosts(page: number, limit: number): Promise<PostMetadata[]> {
    try {
      console.log('Fetching posts, page:', page, 'limit:', limit);
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          creator:handle_id (
            handle,
            created_at
          ),
          locklikes!post_txid (
            txid,
            amount,
            locked_until,
            created_at
          )
        `)
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { posts, error });

      if (error) throw error;
      if (!posts) return [];

      const mappedPosts = posts.map((post: DatabasePost) => {
        const totalLockLiked = post.locklikes.reduce((sum: number, locklike: DatabaseLockLike) => sum + locklike.amount, 0);
        const totalAmountandLockLiked = post.amount + totalLockLiked;

        const lockPeriod = post.locked_until - this.currentBlockHeight;
        const initialVibes = this.calculateVibes(post.amount, Math.max(1, lockPeriod));
        const totalLockLikeVibes = post.locklikes.reduce((sum: number, locklike: DatabaseLockLike) => {
          const locklikePeriod = locklike.locked_until - this.currentBlockHeight;
          return sum + this.calculateVibes(locklike.amount, Math.max(1, locklikePeriod));
        }, 0);

        return {
          id: post.txid,
          creator: post.creator.handle,
          title: `Post by ${post.creator.handle}`,
          description: post.content,
          prompt: '',
          style: 'viral',
          duration: 30,
          format: 'image',
          fileUrl: post.media_url || `https://placehold.co/600x400/1A1B23/00ffa3?text=Post+by+${post.creator.handle}`,
          thumbnailUrl: post.media_url || `https://placehold.co/600x400/1A1B23/00ffa3?text=Post+by+${post.creator.handle}`,
          txId: post.txid,
          locks: totalAmountandLockLiked,
          status: 'minted' as const,
          tags: ['post'],
          createdAt: new Date(post.created_at),
          updatedAt: new Date(post.created_at),
          initialVibes,
          totalLockLikeVibes,
          totalVibes: initialVibes + totalLockLikeVibes,
          locklikes: post.locklikes.map((locklike: DatabaseLockLike) => ({
            txid: locklike.txid,
            amount: locklike.amount,
            locked_until: locklike.locked_until,
            created_at: new Date(locklike.created_at)
          }))
        };
      });

      console.log('Mapped posts:', mappedPosts);
      return mappedPosts;
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      throw error;
    }
  }

  async createPost(post: Post): Promise<void> {
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          txid: post.txid,
          amount: Math.floor(post.amount * 100000000), // Convert BSV to satoshis
          content: post.content,
          media_url: post.mediaUrl || null,
          locked_until: post.lockUntilBlock,
          handle_id: 'anon', // For now, use anon handle
          created_at: new Date(post.timestamp).toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async uploadMedia(mediaData: string): Promise<string> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, mediaData);

      if (error) throw error;
      if (!data) throw new Error('No data returned from upload');

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      return `https://placehold.co/600x400/1A1B23/00ffa3?text=Upload+Failed`;
    }
  }
}

export const storageService = new StorageService();
export default storageService; 