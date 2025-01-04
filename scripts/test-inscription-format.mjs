import { BSVService } from '../src/services/bsv-service.js';
import fs from 'fs/promises';

/**
 * Test script to verify inscription format without blockchain
 * @param {string} videoPath - Path to test video file
 */
async function testInscriptionFormat(videoPath) {
    try {
        console.log('Testing inscription format with video:', videoPath);
        
        // Read test video file
        const videoData = await fs.readFile(videoPath);
        console.log('Video file loaded, size:', videoData.length, 'bytes');
        
        // Create test metadata
        const testMetadata = {
            protocol: 'memepool',
            version: '1.0',
            content: {
                id: 'test-inscription-' + Date.now(),
                title: 'test_video.mp4',
                creator: 'test_address',
                timestamp: new Date().toISOString(),
                blockHash: '0000000000000000000000000000000000000000000000000000000000000000',
                metadata: {
                    format: 'video/mp4',
                    size: videoData.length,
                    duration: 4.01,
                    dimensions: '854x480',
                    bitrate: 312904
                }
            }
        };

        // Create script parts (simulating the inscription process)
        const scriptParts = [];
        
        // 1. OP_FALSE OP_RETURN
        scriptParts.push(Buffer.from([0x00, 0x6a]));
        
        // 2. Metadata with PUSHDATA4
        const metadataStr = JSON.stringify(testMetadata);
        const metadataBuffer = Buffer.from(metadataStr, 'utf8');
        const metadataLenBuffer = Buffer.alloc(5);
        metadataLenBuffer[0] = 0x4e; // PUSHDATA4 opcode
        metadataLenBuffer.writeUInt32LE(metadataBuffer.length, 1);
        const metadataChunk = Buffer.concat([metadataLenBuffer, metadataBuffer]);
        scriptParts.push(metadataChunk);
        
        // 3. Video data with PUSHDATA4
        const videoLenBuffer = Buffer.alloc(5);
        videoLenBuffer[0] = 0x4e; // PUSHDATA4 opcode
        videoLenBuffer.writeUInt32LE(videoData.length, 1);
        const videoChunk = Buffer.concat([videoLenBuffer, videoData]);
        scriptParts.push(videoChunk);

        // Combine into final script
        const scriptBuffer = Buffer.concat(scriptParts);
        
        console.log('\nScript structure analysis:');
        console.log('Total size:', scriptBuffer.length, 'bytes');
        console.log('- OP_FALSE OP_RETURN:', scriptParts[0].length, 'bytes');
        console.log('- Metadata chunk:', scriptParts[1].length, 'bytes');
        console.log('- Video chunk:', scriptParts[2].length, 'bytes');

        // Now verify the script structure
        console.log('\nVerifying script structure...');
        let pos = 0;

        // 1. Verify OP_FALSE OP_RETURN
        const opReturn = scriptBuffer.slice(0, 2);
        console.log('OP_FALSE OP_RETURN:', opReturn.toString('hex'));
        if (opReturn.toString('hex') !== '006a') {
            throw new Error('Invalid OP_FALSE OP_RETURN');
        }
        pos += 2;

        // 2. Extract and verify metadata
        if (scriptBuffer[pos] !== 0x4e) {
            throw new Error('Expected PUSHDATA4 for metadata');
        }
        const metadataLength = scriptBuffer.readUInt32LE(pos + 1);
        console.log('Metadata length:', metadataLength);
        pos += 5;

        const extractedMetadata = scriptBuffer.slice(pos, pos + metadataLength);
        const parsedMetadata = JSON.parse(extractedMetadata.toString('utf8'));
        console.log('Metadata parsed successfully:', parsedMetadata.protocol);
        pos += metadataLength;

        // 3. Extract and verify video
        if (scriptBuffer[pos] !== 0x4e) {
            throw new Error('Expected PUSHDATA4 for video');
        }
        const videoLength = scriptBuffer.readUInt32LE(pos + 1);
        console.log('Video length:', videoLength);
        pos += 5;

        const extractedVideo = scriptBuffer.slice(pos, pos + videoLength);
        console.log('Video data extracted:', extractedVideo.length, 'bytes');
        
        // Verify video format
        const videoHeader = extractedVideo.slice(0, 16);
        const isMP4 = videoHeader.slice(4, 8).toString() === 'ftyp';
        console.log('Video format check (MP4):', isMP4);
        
        // Save extracted files for verification
        await fs.writeFile('test_extracted_metadata.json', JSON.stringify(parsedMetadata, null, 2));
        await fs.writeFile('test_extracted_video.mp4', extractedVideo);
        
        console.log('\nTest files created:');
        console.log('- test_extracted_metadata.json');
        console.log('- test_extracted_video.mp4');
        
        // Compare with original
        const originalHash = Buffer.from(videoData).toString('hex');
        const extractedHash = Buffer.from(extractedVideo).toString('hex');
        const videosMatch = originalHash === extractedHash;
        
        console.log('\nVerification results:');
        console.log('Video size match:', videoData.length === extractedVideo.length);
        console.log('Video content match:', videosMatch);
        console.log('Metadata format valid:', parsedMetadata.protocol === 'memepool');
        
        if (!videosMatch) {
            console.warn('WARNING: Extracted video does not match original!');
            console.log('First 32 bytes original:', originalHash.slice(0, 64));
            console.log('First 32 bytes extracted:', extractedHash.slice(0, 64));
        }

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Check if video path is provided
const videoPath = process.argv[2];
if (!videoPath) {
    console.error('Please provide a path to a test video file');
    console.error('Usage: node scripts/test-inscription-format.mjs <video-path>');
    process.exit(1);
}

// Run test
testInscriptionFormat(videoPath); 