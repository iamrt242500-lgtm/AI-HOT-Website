/**
 * Saved News Routes (Bookmarks)
 * Handles saving, retrieving, and deleting bookmarked news articles
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

/**
 * POST /user/save-news
 * Save a news article as bookmark
 */
router.post('/save-news', authenticate, async (req, res) => {
    try {
        const { news_id } = req.body;
        const userId = req.user.id;

        if (!news_id) {
            return res.status(400).json({ success: false, error: 'news_id is required' });
        }

        // Check if news exists
        const newsCheck = await db.query('SELECT id FROM news WHERE id = $1', [news_id]);
        if (newsCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'News not found' });
        }

        // Try to save (UNIQUE constraint will prevent duplicates)
        const result = await db.query(`
            INSERT INTO saved_news (user_id, news_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, news_id) DO NOTHING
            RETURNING *
        `, [userId, news_id]);

        res.json({
            success: true,
            saved: result.rows.length > 0,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error saving news:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /user/saved-news
 * Get all saved news for current user with pagination
 */
router.get('/saved-news', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Get saved news with details
        const result = await db.query(`
            SELECT 
                n.*,
                sn.saved_at,
                json_build_object(
                    'views', n.view_count,
                    'clicks', n.click_count
                ) as stats
            FROM saved_news sn
            JOIN news n ON sn.news_id = n.id
            WHERE sn.user_id = $1
            ORDER BY sn.saved_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) as total FROM saved_news WHERE user_id = $1',
            [userId]
        );

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            news: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching saved news:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /user/saved-news/:newsId
 * Remove a news article from bookmarks
 */
router.delete('/saved-news/:newsId', authenticate, async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'DELETE FROM saved_news WHERE user_id = $1 AND news_id = $2 RETURNING *',
            [userId, newsId]
        );

        res.json({
            success: true,
            deleted: result.rows.length > 0
        });
    } catch (error) {
        console.error('Error deleting saved news:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /user/saved-news/check/:newsId
 * Check if a specific news is saved
 */
router.get('/saved-news/check/:newsId', authenticate, async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'SELECT id FROM saved_news WHERE user_id = $1 AND news_id = $2',
            [userId, newsId]
        );

        res.json({
            success: true,
            isSaved: result.rows.length > 0
        });
    } catch (error) {
        console.error('Error checking saved news:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /user/saved-news
 * Clear all saved news (with confirmation)
 */
router.delete('/saved-news', authenticate, async (req, res) => {
    try {
        const { confirmed } = req.body;
        const userId = req.user.id;

        if (!confirmed) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please confirm this action',
                requiresConfirmation: true 
            });
        }

        const result = await db.query(
            'DELETE FROM saved_news WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            deleted: result.rowCount
        });
    } catch (error) {
        console.error('Error clearing saved news:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
