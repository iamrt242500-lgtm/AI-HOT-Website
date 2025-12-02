const stringSimilarity = require('string-similarity');

/**
 * Check if a news item is a duplicate based on title similarity and URL
 * @param {string} title - News title
 * @param {string} url - News URL
 * @param {Array} existingNews - Array of existing news items
 * @returns {boolean} - True if duplicate
 */
const isDuplicate = (title, url, existingNews) => {
    // Check for exact URL match
    const urlMatch = existingNews.some(news => news.url === url);
    if (urlMatch) {
        return true;
    }

    // Check for title similarity (>= 85% similar)
    const titles = existingNews.map(news => news.title);
    const matches = stringSimilarity.findBestMatch(title, titles);

    if (matches.bestMatch.rating >= 0.85) {
        return true;
    }

    return false;
};

/**
 * Filter out duplicate news items
 * @param {Array} newNews - Array of new news items to check
 * @param {Array} existingNews - Array of existing news items
 * @returns {Array} - Filtered array without duplicates
 */
const filterDuplicates = (newNews, existingNews) => {
    return newNews.filter(item =>
        !isDuplicate(item.title, item.url, existingNews)
    );
};

/**
 * Remove duplicates within a single array
 * @param {Array} newsArray - Array of news items
 * @returns {Array} - Deduplicated array
 */
const deduplicateArray = (newsArray) => {
    const seen = new Map();
    const result = [];

    for (const item of newsArray) {
        // Check URL
        if (seen.has(item.url)) {
            continue;
        }

        // Check title similarity
        let isDupe = false;
        for (const existing of result) {
            const similarity = stringSimilarity.compareTwoStrings(item.title, existing.title);
            if (similarity >= 0.85) {
                isDupe = true;
                break;
            }
        }

        if (!isDupe) {
            seen.set(item.url, true);
            result.push(item);
        }
    }

    return result;
};

/**
 * Normalize URL for comparison
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
const normalizeUrl = (url) => {
    try {
        const urlObj = new URL(url);
        // Remove tracking parameters
        urlObj.searchParams.delete('utm_source');
        urlObj.searchParams.delete('utm_medium');
        urlObj.searchParams.delete('utm_campaign');
        urlObj.searchParams.delete('ref');

        return urlObj.toString();
    } catch (error) {
        return url;
    }
};

module.exports = {
    isDuplicate,
    filterDuplicates,
    deduplicateArray,
    normalizeUrl
};
