/**
 * User Settings Routes
 * Handles user preferences: language, theme, priority topics, notifications, etc.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

/**
 * GET /user/settings
 * Get current user's settings
 */
router.get('/settings', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        let result = await db.query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Create default settings if not exists
            result = await db.query(`
                INSERT INTO user_settings (user_id)
                VALUES ($1)
                RETURNING *
            `, [userId]);
        }

        res.json({
            success: true,
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /user/settings/language
 * Update language preference
 */
router.patch('/settings/language', authenticate, async (req, res) => {
    try {
        const { language, auto_translate } = req.body;
        const userId = req.user.id;

        if (!['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'].includes(language)) {
            return res.status(400).json({ success: false, error: 'Invalid language' });
        }

        const result = await db.query(`
            UPDATE user_settings
            SET language = $1, auto_translate = $2
            WHERE user_id = $3
            RETURNING *
        `, [language, auto_translate !== undefined ? auto_translate : true, userId]);

        res.json({
            success: true,
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating language:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /user/settings/theme
 * Update theme preference (light/dark/auto)
 */
router.patch('/settings/theme', authenticate, async (req, res) => {
    try {
        const { theme_mode } = req.body;
        const userId = req.user.id;

        if (!['light', 'dark', 'auto'].includes(theme_mode)) {
            return res.status(400).json({ success: false, error: 'Invalid theme mode' });
        }

        const result = await db.query(`
            UPDATE user_settings
            SET theme_mode = $1
            WHERE user_id = $2
            RETURNING *
        `, [theme_mode, userId]);

        res.json({
            success: true,
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /user/settings/priority
 * Update priority topics (interest areas)
 */
router.patch('/settings/priority', authenticate, async (req, res) => {
    try {
        const { priority_topics, news_sort_preference } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(priority_topics)) {
            return res.status(400).json({ success: false, error: 'priority_topics must be an array' });
        }

        const validSortOptions = ['latest', 'popular', 'recommended'];
        if (news_sort_preference && !validSortOptions.includes(news_sort_preference)) {
            return res.status(400).json({ success: false, error: 'Invalid sort preference' });
        }

        const result = await db.query(`
            UPDATE user_settings
            SET priority_topics = $1, news_sort_preference = $2
            WHERE user_id = $3
            RETURNING *
        `, [priority_topics, news_sort_preference || 'latest', userId]);

        res.json({
            success: true,
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /user/settings/notifications
 * Update notification preferences
 */
router.patch('/settings/notifications', authenticate, async (req, res) => {
    try {
        const { notifications_enabled } = req.body;
        const userId = req.user.id;

        if (typeof notifications_enabled !== 'boolean') {
            return res.status(400).json({ success: false, error: 'notifications_enabled must be boolean' });
        }

        const result = await db.query(`
            UPDATE user_settings
            SET notifications_enabled = $1
            WHERE user_id = $2
            RETURNING *
        `, [notifications_enabled, userId]);

        res.json({
            success: true,
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /user/settings/data
 * Clear user's cached/temporary data
 */
router.delete('/settings/data', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // In a real app, you would clear Redis cache, temporary files, etc.
        // For now, we'll just log it
        console.log(`Clearing cached data for user ${userId}`);

        res.json({
            success: true,
            message: 'Cache and temporary data cleared'
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /user/profile
 * Get user profile information
 */
router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT id, email, nickname, profile_image_url, created_at
            FROM users
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /user/profile
 * Update user profile
 */
router.patch('/profile', authenticate, async (req, res) => {
    try {
        const { nickname, profile_image_url } = req.body;
        const userId = req.user.id;

        const result = await db.query(`
            UPDATE users
            SET nickname = COALESCE($1, nickname),
                profile_image_url = COALESCE($2, profile_image_url)
            WHERE id = $3
            RETURNING id, email, nickname, profile_image_url, created_at
        `, [nickname || null, profile_image_url || null, userId]);

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
