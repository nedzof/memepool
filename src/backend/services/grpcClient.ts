import * as grpc from '@grpc/grpc-js';
import * as video_proto from '../../generated/video';

class GRPCClient {
  private client: video_proto.VideoGeneratorClient;
  
  constructor() {
    this.client = new video_proto.VideoGeneratorClient(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );
  }

  generateVideo(request: video_proto.VideoRequest): Promise<video_proto.VideoResponse> {
    return new Promise((resolve, reject) => {
      this.client.GenerateVideo(request, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }
}

export const grpcClient = new GRPCClient(); 