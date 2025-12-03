const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const cache = require('../services/cache');
const { authenticate, generateToken } = require('../middleware/auth');
const { getRecommendations } = require('../services/recommendation');

/**
 * POST /api/user/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, interests } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existing = await db.getOne('SELECT id FROM users WHERE email = $1', [email]);
        if (existing) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const user = await db.getOne(`
      INSERT INTO users (email, password_hash, interests)
      VALUES ($1, $2, $3)
      RETURNING id, email, interests, created_at
    `, [email, passwordHash, interests || []]);

        // Generate token
        const token = generateToken(user.id, user.email);

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                interests: user.interests,
                createdAt: user.created_at
            },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

/**
 * POST /api/user/login
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user
        const user = await db.getOne(
            'SELECT id, email, password_hash, interests FROM users WHERE email = $1',
            [email]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user.id, user.email);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                interests: user.interests
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * POST /api/user/save
 * Save/bookmark a news item
 */
router.post('/save', authenticate, async (req, res) => {
    try {
        const { newsId } = req.body;
        const userId = req.user.id;

        if (!newsId) {
            return res.status(400).json({ error: 'News ID is required' });
        }

        // Check if already saved
        const existing = await db.getOne(
            'SELECT id FROM saved_news WHERE user_id = $1 AND news_id = $2',
            [userId, newsId]
        );

        if (existing) {
            // Unsave (toggle)
            await db.query(
                'DELETE FROM saved_news WHERE user_id = $1 AND news_id = $2',
                [userId, newsId]
            );

            // Clear cache
            await cache.del(cache.keys.userSaved(userId));

            return res.json({ saved: false, message: 'News unsaved' });
        }

        // Save
        await db.query(
            'INSERT INTO saved_news (user_id, news_id) VALUES ($1, $2)',
            [userId, newsId]
        );

        // Clear cache
        await cache.del(cache.keys.userSaved(userId));

        res.json({ saved: true, message: 'News saved' });
    } catch (error) {
        console.error('Save news error:', error);
        res.status(500).json({ error: 'Failed to save news' });
    }
});

/**
 * GET /api/user/saved
 * Get user's saved news
 */
router.get('/saved', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Check cache
        const cacheKey = cache.keys.userSaved(userId);
        const cached = await cache.get(cacheKey);
        if (cached && page === 1) {
            return res.json(cached);
        }

        // Get saved news
        const savedNews = await db.getMany(`
      SELECT n.id, n.title, n.summary, n.source, n.url, n.thumbnail, n.tags,
             n.view_count, n.click_count, n.created_at, sn.saved_at
      FROM news n
      INNER JOIN saved_news sn ON n.id = sn.news_id
      WHERE sn.user_id = $1
      ORDER BY sn.saved_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

        const response = {
            news: savedNews.map(formatNewsItem)
        };

        // Cache first page
        if (page === 1) {
            await cache.set(cacheKey, response, cache.TTL.RECOMMENDATIONS);
        }

        res.json(response);
    } catch (error) {
        console.error('Get saved news error:', error);
        res.status(500).json({ error: 'Failed to fetch saved news' });
    }
});

/**
 * GET /api/user/recommend
 * Get personalized recommendations for user
 */
router.get('/recommend', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Check cache
        const cacheKey = cache.keys.userRecommendations(userId);
        const cached = await cache.get(cacheKey);
        if (cached && page === 1) {
            return res.json(cached);
        }

        // Get recommendations
        const recommendations = await getRecommendations(userId, limit, offset);

        const response = {
            news: recommendations.map(formatNewsItem)
        };

        // Cache first page
        if (page === 1) {
            await cache.set(cacheKey, response, cache.TTL.RECOMMENDATIONS);
        }

        res.json(response);
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

/**
 * PUT /api/user/interests
 * Update user interests
 */
router.put('/interests', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { interests } = req.body;

        if (!Array.isArray(interests)) {
            return res.status(400).json({ error: 'Interests must be an array' });
        }

        // Update interests
        await db.query(
            'UPDATE users SET interests = $1 WHERE id = $2',
            [interests, userId]
        );

        // Clear recommendation cache
        await cache.del(cache.keys.userRecommendations(userId));

        res.json({
            success: true,
            interests
        });
    } catch (error) {
        console.error('Update interests error:', error);
        res.status(500).json({ error: 'Failed to update interests' });
    }
});

/**
 * GET /api/user/profile
 * Get user profile
 */
router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db.getOne(
            'SELECT id, email, interests, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get saved news count
        const savedCount = await db.getOne(
            'SELECT COUNT(*) as count FROM saved_news WHERE user_id = $1',
            [userId]
        );

        res.json({
            user: {
                id: user.id,
                email: user.email,
                interests: user.interests || [],
                createdAt: user.created_at,
                savedCount: parseInt(savedCount.count)
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * Format news item for API response
 */
function formatNewsItem(news) {
    return {
        id: news.id,
        title: news.title,
        summary: news.summary,
        source: news.source,
        url: news.url,
        thumbnail: news.thumbnail,
        tags: news.tags || [],
        timestamp: news.created_at,
        savedAt: news.saved_at,
        stats: {
            views: news.view_count || 0,
            clicks: news.click_count || 0
        }
    };
}

/**
 * POST /api/user/google-auth
 * Google OAuth authentication endpoint
 * Handles both login and signup via Google
 */
router.post('/google-auth', async (req, res) => {
    try {
        const { email, name, picture, idToken } = req.body;

        // Validation
        if (!email || !idToken) {
            return res.status(400).json({ error: 'Email and ID token are required' });
        }

        console.log(`🔐 Google OAuth request for email: ${email}`);

        // Check if user already exists
        let user = await db.getOne(
            'SELECT id, email, nickname, profile_picture, created_at FROM users WHERE email = $1',
            [email]
        );

        if (user) {
            // Existing user - update profile picture if provided
            if (picture) {
                try {
                    await db.query(
                        'UPDATE users SET profile_picture = $1 WHERE id = $2',
                        [picture, user.id]
                    );
                    user.profile_picture = picture;
                } catch (updateError) {
                    console.warn('Failed to update profile picture:', updateError);
                }
            }
            console.log(`✅ Existing user logged in via Google: ${email}`);
        } else {
            // New user - create account
            try {
                user = await db.getOne(`
                    INSERT INTO users (email, nickname, profile_picture, provider, interests, created_at)
                    VALUES ($1, $2, $3, 'google', ARRAY['AI', 'Technology'], NOW())
                    RETURNING id, email, nickname, profile_picture, created_at
                `, [email, name || email.split('@')[0], picture]);
                console.log(`✅ New user created via Google: ${email}`);
            } catch (createError) {
                console.error('Failed to create user:', createError);
                // Fallback: Allow login without database storage
                console.warn('⚠️ Using session-only authentication');
            }
        }

        // Generate token
        const token = generateToken(user?.id || 'google_' + email, email);

        res.json({
            user: {
                id: user?.id || 'google_' + email,
                email: email,
                name: name || user?.nickname,
                picture: picture,
                provider: 'google',
                createdAt: user?.created_at || new Date().toISOString()
            },
            token
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ error: 'Google OAuth authentication failed' });
    }
});

module.exports = router;
