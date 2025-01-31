import axios from 'axios';

interface InscriptionResponse {
    inscriptionId: string;
    transferTxId: string;
    inscription: string;
}

export class InscriptionService {
    private static baseUrl = '/api/inscriptions';

    static async inscribeImage(imageData: string, mimeType: string = 'image/png', bsvAddress: string): Promise<InscriptionResponse> {
        try {
            // Convert base64 image data to proper format if needed
            const cleanImageData = imageData.replace(/^data:image\/(png|jpeg|jpg|mp4);base64,/, '');

            // Send to backend for inscription
            const response = await axios.post<InscriptionResponse>(`${this.baseUrl}/inscribe`, {
                imageData: cleanImageData,
                mimeType,
                bsvAddress
            });

            return response.data;
        } catch (error) {
            console.error('Error inscribing image:', error);
            throw error;
        }
    }

    static async getInscription(inscriptionId: string): Promise<InscriptionResponse> {
        try {
            const response = await axios.get<InscriptionResponse>(`${this.baseUrl}/${inscriptionId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting inscription:', error);
            throw error;
        }
    }
} 