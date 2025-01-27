import { MemeVideoMetadata } from '../../shared/types/metadata';

const DUMMY_IMAGES = [
  'https://picsum.photos/800/800?random=1',
  'https://picsum.photos/800/800?random=2',
  'https://picsum.photos/800/800?random=3',
  'https://picsum.photos/800/800?random=4',
  'https://picsum.photos/800/800?random=5',
  'https://picsum.photos/800/800?random=6',
  'https://picsum.photos/800/800?random=7',
  'https://picsum.photos/800/800?random=8',
  'https://picsum.photos/800/800?random=9',
  'https://picsum.photos/800/800?random=10',
];

export class DummyDataService {
  private static instance: DummyDataService;
  private currentImageIndex: number = 0;

  private constructor() {}

  public static getInstance(): DummyDataService {
    if (!DummyDataService.instance) {
      DummyDataService.instance = new DummyDataService();
    }
    return DummyDataService.instance;
  }

  public getNextDummyMeme(): MemeVideoMetadata {
    const imageUrl = DUMMY_IMAGES[this.currentImageIndex];
    this.currentImageIndex = (this.currentImageIndex + 1) % DUMMY_IMAGES.length;

    return {
      id: `meme_${Date.now()}`,
      creator: 'dummy_creator',
      title: `Dummy Meme ${this.currentImageIndex + 1}`,
      description: 'This is a dummy meme for testing purposes',
      prompt: 'Generate a random meme',
      style: 'random',
      duration: 30,
      format: 'image/jpeg',
      fileUrl: imageUrl,
      thumbnailUrl: imageUrl,
      txId: `tx_${Date.now()}`,
      locks: Math.floor(Math.random() * 100),
      status: 'minted',
      tags: ['dummy', 'test', 'random'],
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 100),
      dislikes: Math.floor(Math.random() * 20),
      shares: Math.floor(Math.random() * 50),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  public getDummyMemes(count: number): MemeVideoMetadata[] {
    const memes: MemeVideoMetadata[] = [];
    for (let i = 0; i < count; i++) {
      memes.push(this.getNextDummyMeme());
    }
    return memes;
  }
}

export const dummyDataService = DummyDataService.getInstance();
export default dummyDataService; 