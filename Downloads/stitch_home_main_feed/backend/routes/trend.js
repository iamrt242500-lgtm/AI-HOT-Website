const express = require('express');
const router = express.Router();
const db = require('../db');
const cache = require('../services/cache');

/**
 * GET /api/trend/keywords
 * Get trending keywords sorted by weight
 */
router.get('/keywords', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        // Check cache
        const cacheKey = cache.keys.trendingKeywords();
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Get trending keywords from database
        const keywords = await db.getMany(`
      SELECT keyword, weight, count, updated_at
      FROM trending_keywords
      ORDER BY weight DESC, count DESC
      LIMIT $1
    `, [limit]);

        const response = {
            keywords: keywords.map(k => ({
                keyword: k.keyword,
                weight: Math.round(k.weight),
                count: k.count,
                updatedAt: k.updated_at
            }))
        };

        // Cache response
        await cache.set(cacheKey, response, cache.TTL.KEYWORDS);

        res.json(response);
    } catch (error) {
        console.error('Get trending keywords error:', error);
        res.status(500).json({ error: 'Failed to fetch trending keywords' });
    }
});

/**
 * GET /api/trend/topics
 * Get hot topics (trending keywords for UI)
 */
router.get('/topics', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Check cache
        const cacheKey = 'trend:topics';
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Get top trending keywords
        const keywords = await db.getMany(`
      SELECT keyword, weight
      FROM trending_keywords
      WHERE updated_at >= NOW() - INTERVAL '24 hours'
      ORDER BY weight DESC
      LIMIT $1
    `, [limit]);

        const response = {
            topics: keywords.map(k => ({
                name: k.keyword,
                weight: Math.round(k.weight)
            }))
        };

        // Cache response
        await cache.set(cacheKey, response, cache.TTL.KEYWORDS);

        res.json(response);
    } catch (error) {
        console.error('Get hot topics error:', error);
        res.status(500).json({ error: 'Failed to fetch hot topics' });
    }
});

/**
 * GET /api/trend/stats
 * Get overall platform statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Total news count
        const totalNews = await db.getOne('SELECT COUNT(*) as count FROM news');

        // News by source
        const newsBySource = await db.getMany(`
      SELECT source, COUNT(*) as count
      FROM news
      GROUP BY source
      ORDER BY count DESC
    `);

        // Recent activity (last 24 hours)
        const recentActivity = await db.getOne(`
      SELECT COUNT(*) as count
      FROM news
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

        // Most popular tags
        const popularTags = await db.getMany(`
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM news
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `);

        res.json({
            totalNews: parseInt(totalNews.count),
            recentNews: parseInt(recentActivity.count),
            bySource: newsBySource.map(s => ({
                source: s.source,
                count: parseInt(s.count)
            })),
            popularTags: popularTags.map(t => ({
                tag: t.tag,
                count: parseInt(t.count)
            }))
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
