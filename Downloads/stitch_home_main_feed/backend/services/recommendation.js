const db = require('../db');

/**
 * Calculate recommendation score for a news item based on user interests
 * @param {object} newsItem - News item
 * @param {Array<string>} userInterests - User's interests
 * @returns {number} - Recommendation score
 */
const calculateRecommendationScore = (newsItem, userInterests) => {
    let score = 0;

    // Base score from recency (newer = higher score)
    const hoursSinceCreation = (Date.now() - new Date(newsItem.created_at)) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 100 - hoursSinceCreation); // Max 100 for brand new
    score += recencyScore * 0.3; // 30% weight

    // Popularity score (views + clicks)
    const popularityScore = (newsItem.view_count || 0) + (newsItem.click_count || 0) * 2;
    score += Math.min(popularityScore, 100) * 0.3; // 30% weight, capped at 100

    // Interest matching score
    if (userInterests && userInterests.length > 0 && newsItem.tags) {
        const matchingTags = newsItem.tags.filter(tag =>
            userInterests.some(interest =>
                interest.toLowerCase() === tag.toLowerCase()
            )
        );
        const interestScore = (matchingTags.length / userInterests.length) * 100;
        score += interestScore * 0.4; // 40% weight
    }

    return score;
};

/**
 * Get recommended news for a user
 * @param {number} userId - User ID
 * @param {number} limit - Number of recommendations
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} - Recommended news items
 */
const getRecommendations = async (userId, limit = 20, offset = 0) => {
    try {
        // Get user interests
        const user = await db.getOne(
            'SELECT interests FROM users WHERE id = $1',
            [userId]
        );

        const userInterests = user?.interests || [];

        // Get recent news (last 7 days)
        const recentNews = await db.getMany(`
      SELECT id, title, summary, content, source, url, thumbnail, tags, 
             view_count, click_count, created_at
      FROM news
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 100
    `);

        // Get recently saved news to avoid recommending
        const savedNews = await db.getMany(
            'SELECT news_id FROM saved_news WHERE user_id = $1',
            [userId]
        );
        const savedIds = new Set(savedNews.map(s => s.news_id));

        // Calculate scores and filter
        const scoredNews = recentNews
            .filter(item => !savedIds.has(item.id))
            .map(item => ({
                ...item,
                score: calculateRecommendationScore(item, userInterests)
            }))
            .sort((a, b) => b.score - a.score);

        // Apply source diversity - no more than 2 from same source in top 10
        const diversified = ensureSourceDiversity(scoredNews);

        // Paginate
        return diversified.slice(offset, offset + limit);
    } catch (error) {
        console.error('Recommendation error:', error);
        throw error;
    }
};

/**
 * Ensure source diversity in recommendations
 * @param {Array} newsItems - Sorted news items
 * @returns {Array} - Diversified news items
 */
const ensureSourceDiversity = (newsItems) => {
    const result = [];
    const sourceCounts = {};
    const maxPerSource = 3;

    for (const item of newsItems) {
        const source = item.source;
        const count = sourceCounts[source] || 0;

        if (count < maxPerSource) {
            result.push(item);
            sourceCounts[source] = count + 1;
        }
    }

    return result;
};

/**
 * Get trending news based on view/click counts and recency
 * @param {number} limit - Number of trending items
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} - Trending news items
 */
const getTrendingNews = async (limit = 20, offset = 0) => {
    try {
        const news = await db.getMany(`
      SELECT id, title, summary, content, source, url, thumbnail, tags,
             view_count, click_count, created_at,
             (view_count + click_count * 2) * 
             (1.0 / (EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 1)) as trending_score
      FROM news
      WHERE created_at >= NOW() - INTERVAL '3 days'
      ORDER BY trending_score DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

        return news;
    } catch (error) {
        console.error('Get trending news error:', error);
        throw error;
    }
};

module.exports = {
    calculateRecommendationScore,
    getRecommendations,
    ensureSourceDiversity,
    getTrendingNews
};
