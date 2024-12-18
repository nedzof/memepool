import { bsv } from '../bsv.js';
import { Buffer } from 'buffer';

// Fetch balance from WhatsOnChain API
export async function fetchBalanceFromWhatsOnChain(address) {
    try {
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/balance`);
        if (!response.ok) {
            throw new Error('Failed to fetch balance');
        }
        const data = await response.json();
        // Convert satoshis to BSV (confirmed + unconfirmed balance)
        const totalBalance = (data.confirmed + data.unconfirmed) / 100000000;
        return totalBalance;
    } catch (error) {
        console.error('Error fetching balance from WhatsOnChain:', error);
        return 0;
    }
}

// Check username availability on chain
export async function checkUsernameAvailability(username) {
    try {
        // Normalize username to lowercase and remove spaces
        const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
        
        // Create a BSV script to search for username registration
        const script = new bsv.Script()
            .add(bsv.Opcode.OP_RETURN)
            .add(Buffer.from('MEMEPIRE_USERNAME'))
            .add(Buffer.from(normalizedUsername));

        // Search for transactions with this script
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/script/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: script.toHex()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to check username availability');
        }

        const data = await response.json();
        
        // If we find any transactions, the username is taken
        return data.length === 0;
    } catch (error) {
        console.error('Error checking username availability:', error);
        // In case of error, we assume username is not available to prevent conflicts
        return false;
    }
}

// Retrieve username data from chain
export async function retrieveUsernameDataFromChain(username) {
    try {
        const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
        
        // Search for username registration directly
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/address/${username}/history`);

        if (!response.ok) {
            throw new Error('Failed to retrieve username data');
        }

        const data = await response.json();
        if (data.length === 0) {
            return null;
        }

        // Get the most recent registration
        return {
            username: normalizedUsername,
            registrationTx: data[data.length - 1].tx_hash,
            timestamp: Date.now(),
            address: username
        };
    } catch (error) {
        console.error('Error retrieving username data:', error);
        return null;
    }
}

// Retrieve avatar data from chain
export async function retrieveAvatarDataFromChain(address) {
    try {
        // For now, return a default avatar info
        return {
            avatarData: null, // Default to no avatar
            registrationTx: null,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error retrieving avatar data:', error);
        return null;
    }
} 