import { Meme, ListMemesInput } from '../models/meme.model';
import { db } from '../utils/db';
import { Collection } from 'mongodb';
import { File } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export class StorageService {
  private get collection(): Collection<Meme> {
    return db.getDb().collection('memes');
  }

  private readonly uploadDir: string;
  private readonly thumbnailDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.thumbnailDir = path.join(process.cwd(), 'thumbnails');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.thumbnailDir, { recursive: true });
  }

  async uploadFile(file: UploadedFile): Promise<string> {
    try {
      const fileId = uuidv4();
      const extension = path.extname(file.originalname);
      const fileName = `${fileId}${extension}`;
      const filePath = path.join(this.uploadDir, fileName);

      await fs.writeFile(filePath, file.buffer);
      return `/uploads/${fileName}`;
    } catch (error) {
      throw new Error('Failed to upload file');
    }
  }

  async generateThumbnail(videoUrl: string): Promise<string> {
    try {
      const thumbnailId = uuidv4();
      const thumbnailPath = path.join(this.thumbnailDir, `${thumbnailId}.jpg`);
      const videoPath = path.join(process.cwd(), videoUrl);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['50%'],
            filename: `${thumbnailId}.jpg`,
            folder: this.thumbnailDir,
            size: '320x240'
          })
          .on('end', resolve)
          .on('error', reject);
      });

      return `/thumbnails/${thumbnailId}.jpg`;
    } catch (error) {
      throw new Error('Failed to generate thumbnail');
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