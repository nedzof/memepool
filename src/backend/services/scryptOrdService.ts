import { ScryptOrd } from 'scrypt-ord';

const SCRYPT_ORD_CONFIG = {
  apiKey: process.env.SCRYPT_ORD_API_KEY || '',
  network: process.env.SCRYPT_ORD_NETWORK || 'mainnet',
};

export const inscribeMeme = async (videoUrl: string): Promise<{ inscriptionId: string; blockHeight: number }> => {
  try {
    const scryptOrd = new ScryptOrd(SCRYPT_ORD_CONFIG);

    // Fetch the video data from the URL
    const response = await fetch(videoUrl);
    const videoData = await response.arrayBuffer();

    // Inscribe the video data on-chain
    const inscriptionId = await scryptOrd.inscribeData(videoData);

    // Retrieve the block height of the inscription
    const inscription = await scryptOrd.getInscription(inscriptionId);
    const blockHeight = inscription.blockHeight;

    return { inscriptionId, blockHeight };
  } catch (error) {
    console.error('Failed to inscribe meme using scrypt-ord:', error);
    throw error;
  }
};

export const getMemeVideoInscription = async (inscriptionId: string): Promise<any> => {
  try {
    const scryptOrd = new ScryptOrd(SCRYPT_ORD_CONFIG);
    const inscription = await scryptOrd.getInscription(inscriptionId);
    return inscription;
  } catch (error) {
    console.error('Failed to get meme video inscription using scrypt-ord:', error);
    throw error;
  }
}; 