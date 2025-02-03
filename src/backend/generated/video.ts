// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.6.1
//   protoc               v3.20.3
// source: src/backend/proto/video.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import {
  type CallOptions,
  ChannelCredentials,
  Client,
  type ClientOptions,
  type ClientUnaryCall,
  type handleUnaryCall,
  makeGenericClientConstructor,
  Metadata,
  type ServiceError,
  type UntypedServiceImplementation,
} from "@grpc/grpc-js";

export const protobufPackage = "";

export interface VideoRequest {
  image: Buffer;
  fps: number;
  frames: number;
  motion: number;
}

export interface VideoResponse {
  video: Buffer;
  metadata: VideoMetadata | undefined;
}

export interface VideoMetadata {
  modelVersion: string;
  duration: number;
  processingTime: number;
}

function createBaseVideoRequest(): VideoRequest {
  return { image: Buffer.alloc(0), fps: 0, frames: 0, motion: 0 };
}

export const VideoRequest: MessageFns<VideoRequest> = {
  encode(message: VideoRequest, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.image.length !== 0) {
      writer.uint32(10).bytes(message.image);
    }
    if (message.fps !== 0) {
      writer.uint32(16).uint32(message.fps);
    }
    if (message.frames !== 0) {
      writer.uint32(24).uint32(message.frames);
    }
    if (message.motion !== 0) {
      writer.uint32(37).float(message.motion);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): VideoRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVideoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.image = Buffer.from(reader.bytes());
          continue;
        }
        case 2: {
          if (tag !== 16) {
            break;
          }

          message.fps = reader.uint32();
          continue;
        }
        case 3: {
          if (tag !== 24) {
            break;
          }

          message.frames = reader.uint32();
          continue;
        }
        case 4: {
          if (tag !== 37) {
            break;
          }

          message.motion = reader.float();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VideoRequest {
    return {
      image: isSet(object.image) ? Buffer.from(bytesFromBase64(object.image)) : Buffer.alloc(0),
      fps: isSet(object.fps) ? globalThis.Number(object.fps) : 0,
      frames: isSet(object.frames) ? globalThis.Number(object.frames) : 0,
      motion: isSet(object.motion) ? globalThis.Number(object.motion) : 0,
    };
  },

  toJSON(message: VideoRequest): unknown {
    const obj: any = {};
    if (message.image.length !== 0) {
      obj.image = base64FromBytes(message.image);
    }
    if (message.fps !== 0) {
      obj.fps = Math.round(message.fps);
    }
    if (message.frames !== 0) {
      obj.frames = Math.round(message.frames);
    }
    if (message.motion !== 0) {
      obj.motion = message.motion;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<VideoRequest>, I>>(base?: I): VideoRequest {
    return VideoRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<VideoRequest>, I>>(object: I): VideoRequest {
    const message = createBaseVideoRequest();
    message.image = object.image ?? Buffer.alloc(0);
    message.fps = object.fps ?? 0;
    message.frames = object.frames ?? 0;
    message.motion = object.motion ?? 0;
    return message;
  },
};

function createBaseVideoResponse(): VideoResponse {
  return { video: Buffer.alloc(0), metadata: undefined };
}

export const VideoResponse: MessageFns<VideoResponse> = {
  encode(message: VideoResponse, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.video.length !== 0) {
      writer.uint32(10).bytes(message.video);
    }
    if (message.metadata !== undefined) {
      VideoMetadata.encode(message.metadata, writer.uint32(18).fork()).join();
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): VideoResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVideoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.video = Buffer.from(reader.bytes());
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.metadata = VideoMetadata.decode(reader, reader.uint32());
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VideoResponse {
    return {
      video: isSet(object.video) ? Buffer.from(bytesFromBase64(object.video)) : Buffer.alloc(0),
      metadata: isSet(object.metadata) ? VideoMetadata.fromJSON(object.metadata) : undefined,
    };
  },

  toJSON(message: VideoResponse): unknown {
    const obj: any = {};
    if (message.video.length !== 0) {
      obj.video = base64FromBytes(message.video);
    }
    if (message.metadata !== undefined) {
      obj.metadata = VideoMetadata.toJSON(message.metadata);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<VideoResponse>, I>>(base?: I): VideoResponse {
    return VideoResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<VideoResponse>, I>>(object: I): VideoResponse {
    const message = createBaseVideoResponse();
    message.video = object.video ?? Buffer.alloc(0);
    message.metadata = (object.metadata !== undefined && object.metadata !== null)
      ? VideoMetadata.fromPartial(object.metadata)
      : undefined;
    return message;
  },
};

function createBaseVideoMetadata(): VideoMetadata {
  return { modelVersion: "", duration: 0, processingTime: 0 };
}

export const VideoMetadata: MessageFns<VideoMetadata> = {
  encode(message: VideoMetadata, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.modelVersion !== "") {
      writer.uint32(10).string(message.modelVersion);
    }
    if (message.duration !== 0) {
      writer.uint32(21).float(message.duration);
    }
    if (message.processingTime !== 0) {
      writer.uint32(29).float(message.processingTime);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): VideoMetadata {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVideoMetadata();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.modelVersion = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 21) {
            break;
          }

          message.duration = reader.float();
          continue;
        }
        case 3: {
          if (tag !== 29) {
            break;
          }

          message.processingTime = reader.float();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VideoMetadata {
    return {
      modelVersion: isSet(object.modelVersion) ? globalThis.String(object.modelVersion) : "",
      duration: isSet(object.duration) ? globalThis.Number(object.duration) : 0,
      processingTime: isSet(object.processingTime) ? globalThis.Number(object.processingTime) : 0,
    };
  },

  toJSON(message: VideoMetadata): unknown {
    const obj: any = {};
    if (message.modelVersion !== "") {
      obj.modelVersion = message.modelVersion;
    }
    if (message.duration !== 0) {
      obj.duration = message.duration;
    }
    if (message.processingTime !== 0) {
      obj.processingTime = message.processingTime;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<VideoMetadata>, I>>(base?: I): VideoMetadata {
    return VideoMetadata.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<VideoMetadata>, I>>(object: I): VideoMetadata {
    const message = createBaseVideoMetadata();
    message.modelVersion = object.modelVersion ?? "";
    message.duration = object.duration ?? 0;
    message.processingTime = object.processingTime ?? 0;
    return message;
  },
};

export type VideoGeneratorService = typeof VideoGeneratorService;
export const VideoGeneratorService = {
  generateVideo: {
    path: "/VideoGenerator/GenerateVideo",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: VideoRequest) => Buffer.from(VideoRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => VideoRequest.decode(value),
    responseSerialize: (value: VideoResponse) => Buffer.from(VideoResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => VideoResponse.decode(value),
  },
} as const;

export interface VideoGeneratorServer extends UntypedServiceImplementation {
  generateVideo: handleUnaryCall<VideoRequest, VideoResponse>;
}

export interface VideoGeneratorClient extends Client {
  generateVideo(
    request: VideoRequest,
    callback: (error: ServiceError | null, response: VideoResponse) => void,
  ): ClientUnaryCall;
  generateVideo(
    request: VideoRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: VideoResponse) => void,
  ): ClientUnaryCall;
  generateVideo(
    request: VideoRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: VideoResponse) => void,
  ): ClientUnaryCall;
}

export const VideoGeneratorClient = makeGenericClientConstructor(
  VideoGeneratorService,
  "VideoGenerator",
) as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): VideoGeneratorClient;
  service: typeof VideoGeneratorService;
  serviceName: string;
};

function bytesFromBase64(b64: string): Uint8Array {
  return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
}

function base64FromBytes(arr: Uint8Array): string {
  return globalThis.Buffer.from(arr).toString("base64");
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
