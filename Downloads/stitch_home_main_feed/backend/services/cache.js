const redis = require('redis');

// Create Redis client
const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                console.warn('⚠️ Redis connection failed - operating in memory mode');
                return false;
            }
            return retries * 100;
        }
    }
});

// Error handling
client.on('error', (err) => {
    console.warn('⚠️ Redis Error (non-critical):', err.message);
});

client.on('connect', () => {
    console.log('✅ Connected to Redis');
});

// Connect to Redis (non-blocking)
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.warn('⚠️ Failed to connect to Redis - using memory cache fallback:', err.message);
    }
})();

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached data or null
 */
const get = async (key) => {
    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
};

/**
 * Set cache data
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
const set = async (key, value, ttl = 300) => {
    try {
        await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
        console.error('Cache set error:', error);
    }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 */
const del = async (key) => {
    try {
        await client.del(key);
    } catch (error) {
        console.error('Cache delete error:', error);
    }
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Pattern to match
 */
const clearPattern = async (pattern) => {
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
    } catch (error) {
        console.error('Cache clear pattern error:', error);
    }
};

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
const exists = async (key) => {
    try {
        return await client.exists(key) === 1;
    } catch (error) {
        console.error('Cache exists error:', error);
        return false;
    }
};

// Cache key builders
const keys = {
    latestNews: (page = 1) => `news:latest:${page}`,
    trendingNews: (page = 1) => `news:trending:${page}`,
    newsDetail: (id) => `news:detail:${id}`,
    searchResults: (keyword, page = 1) => `news:search:${keyword}:${page}`,
    trendingKeywords: () => `trending:keywords`,
    userRecommendations: (userId) => `user:${userId}:recommendations`,
    userSaved: (userId) => `user:${userId}:saved`
};

// Default TTL values (in seconds)
const TTL = {
    LATEST: parseInt(process.env.CACHE_TTL_LATEST) || 300,      // 5 minutes
    TRENDING: parseInt(process.env.CACHE_TTL_TRENDING) || 600,  // 10 minutes
    RECOMMENDATIONS: parseInt(process.env.CACHE_TTL_RECOMMENDATIONS) || 900, // 15 minutes
    DETAIL: 3600,      // 1 hour
    SEARCH: 600,       // 10 minutes
    KEYWORDS: 600      // 10 minutes
};

module.exports = {
    client,
    get,
    set,
    del,
    clearPattern,
    exists,
    keys,
    TTL
};
