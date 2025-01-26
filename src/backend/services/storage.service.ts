import { Meme, ListMemesInput } from '../models/meme.model';
import { db } from '../utils/db';
import { Collection } from 'mongodb';

export class StorageService {
  private get collection(): Collection<Meme> {
    return db.getDb().collection('memes');
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      // TODO: Implement file upload to cloud storage (e.g., AWS S3)
      const fileUrl = `https://storage.memepool.com/${file.filename}`;
      return fileUrl;
    } catch (error) {
      throw new Error('Failed to upload file');
    }
  }

  async storeMeme(meme: Meme): Promise<void> {
    try {
      await this.collection.insertOne(meme);
    } catch (error) {
      throw new Error('Failed to store meme');
    }
  }

  async getMeme(id: string): Promise<Meme | null> {
    try {
      return await this.collection.findOne({ id });
    } catch (error) {
      throw new Error('Failed to get meme');
    }
  }

  async listMemes(input: ListMemesInput): Promise<{ memes: Meme[]; total: number }> {
    try {
      const query: any = {};
      if (input.status) query.status = input.status;
      if (input.creator) query.creator = input.creator;

      const skip = (input.page - 1) * input.limit;
      const [memes, total] = await Promise.all([
        this.collection
          .find(query)
          .skip(skip)
          .limit(input.limit)
          .toArray(),
        this.collection.countDocuments(query)
      ]);

      return { memes, total };
    } catch (error) {
      throw new Error('Failed to list memes');
    }
  }

  async updateMeme(meme: Meme): Promise<void> {
    try {
      await this.collection.updateOne(
        { id: meme.id },
        { $set: meme }
      );
    } catch (error) {
      throw new Error('Failed to update meme');
    }
  }
} 