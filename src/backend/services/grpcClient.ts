import * as grpc from '@grpc/grpc-js';
import { VideoGeneratorClient, VideoRequest, VideoResponse } from '../generated/video';

class GRPCClient {
  private client: VideoGeneratorClient;
  
  constructor() {
    this.client = new VideoGeneratorClient(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );
  }

  generateVideo(request: VideoRequest): Promise<VideoResponse> {
    return new Promise((resolve, reject) => {
      this.client.generateVideo(request, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }
}

export const grpcClient = new GRPCClient(); 