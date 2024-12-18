import { bsv } from '../bsv.js';
import { Buffer } from 'buffer';

// Rate limiting setup
const API_COOLDOWN = 2000; // 2 seconds between requests
let lastRequestTime = 0;

// Helper function to handle rate limiting
async function rateLimitedFetch(url, options = {}) {
    console.log('Fetching from:', url);
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Cache for balance data
const balanceCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Fetch balance from GorillaPool
export async function fetchBalanceFromGorillaPool(address) {
    console.log('Fetching balance for address:', address);
    try {
        // Remove 0x prefix if present
        const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
        
        // GorillaPool API endpoint
        const url = `https://api.gorillapool.io/address/${cleanAddress}/balance`;
        
        const data = await rateLimitedFetch(url);
        console.log('GorillaPool response:', data);
        
        if (data && typeof data.balance !== 'undefined') {
            // Convert satoshis to BSV
            const balanceInBSV = data.balance / 100000000;
            console.log('Balance in BSV:', balanceInBSV);
            return balanceInBSV;
        }
        
        return 0;
    } catch (error) {
        console.error('Error fetching balance from GorillaPool:', error);
        return 0;
    }
}

// Backup balance fetch from WhatsOnChain
async function fetchBalanceFromWhatsOnChain(address) {
    try {
        const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
        const url = `https://api.whatsonchain.com/v1/bsv/main/address/${cleanAddress}/balance`;
        const data = await rateLimitedFetch(url);
        return data.confirmed / 100000000; // Convert satoshis to BSV
    } catch (error) {
        console.error('Error fetching balance from WhatsOnChain:', error);
        throw error;
    }
}

// Main balance fetch function with fallback
export async function fetchBalance(address) {
    try {
        // Try GorillaPool first
        const balance = await fetchBalanceFromGorillaPool(address);
        return balance;
    } catch (error) {
        console.log('GorillaPool failed, trying WhatsOnChain...');
        try {
            // Fallback to WhatsOnChain
            return await fetchBalanceFromWhatsOnChain(address);
        } catch (whatsOnChainError) {
            console.error('Both APIs failed:', error, whatsOnChainError);
            return 0;
        }
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