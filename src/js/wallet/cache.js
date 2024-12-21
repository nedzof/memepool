// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Simple in-memory cache
const profileCache = new Map();

// Update profile with persistence
export async function updateProfileWithPersistence(address) {
    try {
        if (!address) return;
        
        // Cache the profile data
        profileCache.set(address, {
            timestamp: Date.now(),
            lastActive: Date.now()
        });
        
        // Store in localStorage for persistence
        localStorage.setItem('memepire_last_profile', JSON.stringify({
            address,
            timestamp: Date.now()
        }));
        
        return true;
    } catch (error) {
        console.error('Error updating profile cache:', error);
        return false;
    }
} 