import { sha256, toByteString } from 'scrypt-ts'
import { HashLockNFT } from '../contracts/HashLockNFT'
import { OrdiMethodCallOptions, OrdiNFTP2PKH } from 'scrypt-ord'
import { Addr } from 'scrypt-ts'

export async function inscribeImage(
    imageData: Buffer,
    receiverAddress: string
): Promise<{ mintTx: string; transferTx: string }> {
    try {
        // Create contract instance
        const message = toByteString('Hello sCrypt', true)
        const hash = sha256(message)
        const hashLock = new HashLockNFT(hash)

        // Inscribe image into contract
        const mintTx = await hashLock.inscribeImage(imageData, 'image/png')

        // Create receiver instance
        const receiver = new OrdiNFTP2PKH(Addr(toByteString(receiverAddress)))

        // Transfer the inscription
        const { tx: transferTx } = await hashLock.methods.unlock(
            message,
            {
                transfer: receiver,
            } as OrdiMethodCallOptions<HashLockNFT>
        )

        return {
            mintTx: mintTx.id,
            transferTx: transferTx.id,
        }
    } catch (error) {
        console.error('Error inscribing image:', error)
        throw error
    }
}

// Helper function to convert File/Blob to Buffer
export async function fileToBuffer(file: File): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer
            const buffer = Buffer.from(arrayBuffer)
            resolve(buffer)
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
} 
