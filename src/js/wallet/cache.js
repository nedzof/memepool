// Cache duration (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Memory cache
const memoryCache = new Map();

// Get data from cache
export function getFromCache(key, type = 'profile') {
    // Try memory cache first
    const memKey = `${type}_${key}`;
    if (memoryCache.has(memKey)) {
        const cached = memoryCache.get(memKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        memoryCache.delete(memKey);
    }

    // Try localStorage cache
    const storageKey = `memepire_${type}_${key}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
            // Update memory cache
            memoryCache.set(memKey, parsedCache);
            return parsedCache.data;
        }
        localStorage.removeItem(storageKey);
    }

    return null;
}

// Set data in cache
export function setInCache(key, data, type = 'profile') {
    const cacheObject = {
        timestamp: Date.now(),
        data: data
    };

    // Set in memory cache
    const memKey = `${type}_${key}`;
    memoryCache.set(memKey, cacheObject);

    // Set in localStorage
    const storageKey = `memepire_${type}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(cacheObject));
}

// Update profile with persistence
export async function updateProfileWithPersistence(address) {
    try {
        // Get cached profile data
        const cachedProfile = getFromCache(address);
        if (cachedProfile) {
            return cachedProfile;
        }

        // Create new profile data
        const profileData = {
            address: address,
            timestamp: Date.now()
        };

        // Cache the profile data
        setInCache(address, profileData);

        return profileData;
    } catch (error) {
        console.error('Error updating profile:', error);
        return null;
    }
}

// Clear cache for specific data
export function clearProfileCache(username, address) {
    // Clear from memory cache
    memoryCache.delete(`username_${username}`);
    memoryCache.delete(`avatar_${address}`);

    // Clear from localStorage
    localStorage.removeItem(`memepire_username_${username}`);
    localStorage.removeItem(`memepire_avatar_${address}`);
}

// Clear all cache
export function clearAllCache() {
    // Clear memory cache
    memoryCache.clear();
    
    // Clear localStorage (only Memepire related items)
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('memepire_')) {
            localStorage.removeItem(key);
        }
    });
} 