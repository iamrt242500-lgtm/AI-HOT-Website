const express = require('express');
const router = express.Router();
const db = require('../db');
const cache = require('../services/cache');
const { optionalAuth } = require('../middleware/auth');
const { getTrendingNews } = require('../services/recommendation');

// Mock data for demo purposes
const mockNews = [
    {
        id: '1',
        title: 'OpenAI Releases GPT-5 with Revolutionary Capabilities',
        summary: 'OpenAI announced the latest generation of their language model with significant improvements in reasoning and multimodal capabilities.',
        source: 'AI News',
        url: 'https://openai.com/blog/gpt-5-release',
        thumbnail: 'https://via.placeholder.com/300x200?text=GPT-5',
        tags: ['AI', 'GPT', 'OpenAI'],
        view_count: 1250,
        click_count: 89,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '2',
        title: 'Google DeepMind Achieves Breakthrough in Protein Folding',
        summary: 'Google DeepMind announced significant progress in protein structure prediction, advancing drug discovery and biomedical research.',
        source: 'Tech News',
        url: 'https://www.deepmind.com/blog/proteins',
        thumbnail: 'https://via.placeholder.com/300x200?text=DeepMind',
        tags: ['AI', 'Biology', 'DeepMind'],
        view_count: 890,
        click_count: 65,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '3',
        title: 'Meta Introduces New AI Models for Creative Tasks',
        summary: 'Meta released a suite of AI models designed to help creators with image generation, text synthesis, and creative content.',
        source: 'Meta Blog',
        url: 'https://www.meta.com/ai/creative-models',
        thumbnail: 'https://via.placeholder.com/300x200?text=Meta+AI',
        tags: ['AI', 'Creative', 'Meta'],
        view_count: 765,
        click_count: 52,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '4',
        title: 'Microsoft Azure AI Services See Record Adoption',
        summary: 'Microsoft reports unprecedented growth in adoption of its Azure AI services, with enterprises integrating AI across operations.',
        source: 'Cloud News',
        url: 'https://azure.microsoft.com/en-us/blog/ai-services',
        thumbnail: 'https://via.placeholder.com/300x200?text=Azure+AI',
        tags: ['Cloud', 'AI', 'Microsoft'],
        view_count: 654,
        click_count: 48,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '5',
        title: 'Anthropic Releases Claude 3.5 with Extended Context',
        summary: 'Anthropic announced a new version of Claude with support for longer context windows and improved performance on complex tasks.',
        source: 'Anthropic',
        url: 'https://www.anthropic.com/news/claude-35',
        thumbnail: 'https://via.placeholder.com/300x200?text=Claude+3.5',
        tags: ['AI', 'LLM', 'Anthropic'],
        view_count: 542,
        click_count: 41,
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    }
];

// Helper function to safely call cache/db operations
async function safeDbCall(fn, fallbackData) {
    try {
        return await fn();
    } catch (error) {
        console.warn('Database/Cache error (using fallback data):', error.message);
        return fallbackData;
    }
}

/**
 * GET /api/news/latest
 * Get latest news with pagination
 */
router.get('/latest', optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Check cache first (non-critical failure)
        const cacheKey = cache.keys.latestNews(page);
        let cached;
        try {
            cached = await cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
        } catch (cacheError) {
            console.warn('Cache error:', cacheError.message);
        }

        // Query database with fallback to mock data
        let news = [];
        let total = mockNews.length;
        
        try {
            news = await db.getMany(`
      SELECT id, title, summary, source, url, thumbnail, tags, 
             view_count, click_count, created_at
      FROM news
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

            // Get total count
            const countResult = await db.getOne('SELECT COUNT(*) as total FROM news');
            total = parseInt(countResult.total);
        } catch (dbError) {
            console.warn('Database error, using mock data:', dbError.message);
            // Use mock data
            news = mockNews.slice(offset, offset + limit);
            total = mockNews.length;
        }

        const response = {
            news: news.map(formatNewsItem),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

        // Try to cache response (non-critical)
        try {
            await cache.set(cacheKey, response, cache.TTL.LATEST);
        } catch (cacheError) {
            console.warn('Failed to set cache:', cacheError.message);
        }

        res.json(response);
    } catch (error) {
        console.error('Get latest news error:', error);
        res.status(500).json({ error: 'Failed to fetch latest news' });
    }
});

/**
 * GET /api/news/trending
 * Get trending news based on popularity and recency
 */
router.get('/trending', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Check cache first (non-critical failure)
        const cacheKey = cache.keys.trendingNews(page);
        let cached;
        try {
            cached = await cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
        } catch (cacheError) {
            console.warn('Cache error:', cacheError.message);
        }

        let news = [];

        try {
            // Get trending news
            news = await getTrendingNews(limit, offset);
        } catch (dbError) {
            console.warn('Database error, using mock data:', dbError.message);
            // Use mock data sorted by view count
            news = [...mockNews]
                .sort((a, b) => b.view_count - a.view_count)
                .slice(offset, offset + limit);
        }

        const response = {
            news: news.map(formatNewsItem)
        };

        // Try to cache response (non-critical)
        try {
            await cache.set(cacheKey, response, cache.TTL.TRENDING);
        } catch (cacheError) {
            console.warn('Failed to set cache:', cacheError.message);
        }

        res.json(response);
    } catch (error) {
        console.error('Get trending news error:', error);
        res.status(500).json({ error: 'Failed to fetch trending news' });
    }
});

/**
 * GET /api/news/search
 * Search news by keyword
 */
router.get('/search', async (req, res) => {
    try {
        const keyword = req.query.keyword || req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        // Check cache first (non-critical failure)
        const cacheKey = cache.keys.searchResults(keyword, page);
        let cached;
        try {
            cached = await cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
        } catch (cacheError) {
            console.warn('Cache error:', cacheError.message);
        }

        let news = [];
        const keywordLower = keyword.toLowerCase();

        try {
            // Search in title, summary, content, and tags
            news = await db.getMany(`
      SELECT id, title, summary, source, url, thumbnail, tags,
             view_count, click_count, created_at
      FROM news
      WHERE 
        title ILIKE $1 OR
        summary ILIKE $1 OR
        content ILIKE $1 OR
        $2 = ANY(tags)
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `, [`%${keyword}%`, keyword, limit, offset]);
        } catch (dbError) {
            console.warn('Database error, using mock data:', dbError.message);
            // Use mock data with keyword filtering
            news = mockNews.filter(item => 
                item.title.toLowerCase().includes(keywordLower) ||
                item.summary.toLowerCase().includes(keywordLower) ||
                item.tags.some(tag => tag.toLowerCase().includes(keywordLower))
            ).slice(offset, offset + limit);
        }

        const response = {
            keyword,
            news: news.map(formatNewsItem),
            count: news.length
        };

        // Try to cache response (non-critical)
        try {
            await cache.set(cacheKey, response, cache.TTL.SEARCH);
        } catch (cacheError) {
            console.warn('Failed to set cache:', cacheError.message);
        }

        res.json(response);
    } catch (error) {
        console.error('Search news error:', error);
        res.status(500).json({ error: 'Failed to search news' });
    }
});

/**
 * GET /api/news/:id
 * Get news detail by ID with full translation support
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check cache
        const cacheKey = cache.keys.newsDetail(id);
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Get news from database with all translation fields
        const news = await db.getOne(`
      SELECT id, title, summary, content, source, url, thumbnail, tags,
             view_count, click_count, created_at,
             author_name, source_name, original_language,
             original_content, translated_content_ko, summary_ko,
             is_translated, published_at, fetched_at
      FROM news
      WHERE id = $1
    `, [id]);

        if (!news) {
            return res.status(404).json({ error: 'News not found' });
        }

        // Increment view count
        await db.query('UPDATE news SET view_count = view_count + 1 WHERE id = $1', [id]);

        // Check if translation is needed and missing
        const needsTranslation = news.original_language && news.original_language !== 'ko';
        const missingTranslation = needsTranslation && !news.translated_content_ko;

        // On-demand translation if needed
        if (missingTranslation && news.original_content) {
            console.log(`On-demand translation for news ${id}`);

            const translator = require('../services/translator');
            const summarizer = require('../services/summarizer');

            try {
                // Translate content
                const translatedContent = await translator.translateToKorean(
                    news.original_content,
                    news.original_language
                );

                // Generate Korean summary
                const koreanSummary = await summarizer.summarizeKorean(
                    translatedContent,
                    news.title
                );

                // Update database asynchronously (don't wait)
                db.query(`
                    UPDATE news 
                    SET translated_content_ko = $1,
                        summary_ko = $2,
                        is_translated = true
                    WHERE id = $3
                `, [translatedContent, koreanSummary, id]).catch(err => {
                    console.error('Failed to save translation:', err);
                });

                // Update news object for response
                news.translated_content_ko = translatedContent;
                news.summary_ko = koreanSummary;
                news.is_translated = true;

                // Invalidate cache
                await cache.del(cacheKey);
            } catch (translationError) {
                console.error('On-demand translation failed:', translationError);
                // Continue with whatever data we have
            }
        }

        const response = formatNewsDetailItem(news);

        // Cache response
        await cache.set(cacheKey, response, cache.TTL.DETAIL);

        res.json(response);
    } catch (error) {
        console.error('Get news detail error:', error);
        res.status(500).json({ error: 'Failed to fetch news detail' });
    }
});

/**
 * POST /api/news/:id/click
 * Track click on news item
 */
router.post('/:id/click', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('UPDATE news SET click_count = click_count + 1 WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Track click error:', error);
        res.status(500).json({ error: 'Failed to track click' });
    }
});

/**
 * GET /api/news/source/:source
 * Get news by source
 */
router.get('/source/:source', async (req, res) => {
    try {
        const { source } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const news = await db.getMany(`
      SELECT id, title, summary, source, url, thumbnail, tags,
             view_count, click_count, created_at
      FROM news
      WHERE source = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [source, limit, offset]);

        res.json({
            source,
            news: news.map(formatNewsItem)
        });
    } catch (error) {
        console.error('Get news by source error:', error);
        res.status(500).json({ error: 'Failed to fetch news by source' });
    }
});

/**
 * Format news item for detailed API response with translation support
 * @param {object} news - News item from database
 * @returns {object} - Formatted detailed news item
 */
function formatNewsDetailItem(news) {
    return {
        id: news.id,
        title: news.title,
        source_name: news.source_name || news.source,
        author_name: news.author_name || null,
        original_language: news.original_language || 'en',
        published_at: news.published_at || news.created_at,
        url: news.url,
        is_translated: news.is_translated || false,
        meta: {
            source_name: news.source_name || news.source,
            author_name: news.author_name || null,
            published_at: news.published_at || news.created_at
        },
        content: {
            original: news.original_content || news.content || '',
            translated_ko: news.translated_content_ko || news.content || ''
        },
        summary: {
            ko: news.summary_ko || news.summary || ''
        },
        tags: news.tags || [],
        stats: {
            views: news.view_count || 0,
            clicks: news.click_count || 0
        }
    };
}

/**
 * Format news item for API response
 * @param {object} news - News item from database
 * @returns {object} - Formatted news item
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
        stats: {
            views: news.view_count || 0,
            clicks: news.click_count || 0
        }
    };
}

module.exports = router;
