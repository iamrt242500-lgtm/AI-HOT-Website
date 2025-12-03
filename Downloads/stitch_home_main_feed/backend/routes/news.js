const express = require('express');
const router = express.Router();
const db = require('../db');
const cache = require('../services/cache');
const { optionalAuth } = require('../middleware/auth');
const { getTrendingNews } = require('../services/recommendation');

// Mock data for demo purposes - Expanded with diverse sources
const mockNews = [
    // OpenAI News
    {
        id: '1',
        title: 'OpenAI Releases GPT-5 with Revolutionary Capabilities',
        summary: 'OpenAI announced the latest generation of their language model with significant improvements in reasoning and multimodal capabilities.',
        source: 'OpenAI Blog',
        url: 'https://openai.com/blog/gpt-5-release',
        thumbnail: 'https://via.placeholder.com/300x200?text=GPT-5',
        tags: ['AI', 'GPT', 'OpenAI'],
        view_count: 1250,
        click_count: 89,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '2',
        title: 'OpenAI API Gains New Vision Capabilities',
        summary: 'Enhanced vision capabilities allow developers to build more sophisticated applications with image understanding and generation.',
        source: 'OpenAI Announcements',
        url: 'https://openai.com/blog/vision-api',
        thumbnail: 'https://via.placeholder.com/300x200?text=Vision+API',
        tags: ['API', 'Vision', 'OpenAI'],
        view_count: 890,
        click_count: 65,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    
    // Google DeepMind News
    {
        id: '3',
        title: 'Google DeepMind Achieves Breakthrough in Protein Folding',
        summary: 'Google DeepMind announced significant progress in protein structure prediction, advancing drug discovery and biomedical research.',
        source: 'DeepMind Blog',
        url: 'https://www.deepmind.com/blog/proteins',
        thumbnail: 'https://via.placeholder.com/300x200?text=DeepMind',
        tags: ['AI', 'Biology', 'DeepMind'],
        view_count: 765,
        click_count: 52,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '4',
        title: 'DeepMind AlphaFold3 Predicts Molecular Interactions',
        summary: 'A new version of AlphaFold can now predict interactions between proteins and other molecules with unprecedented accuracy.',
        source: 'DeepMind',
        url: 'https://www.deepmind.com/blog/alphafold3',
        thumbnail: 'https://via.placeholder.com/300x200?text=AlphaFold3',
        tags: ['Science', 'AI', 'Research'],
        view_count: 654,
        click_count: 48,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    
    // Anthropic News
    {
        id: '5',
        title: 'Anthropic Releases Claude 3.5 with Extended Context',
        summary: 'Anthropic announced a new version of Claude with support for longer context windows and improved performance on complex tasks.',
        source: 'Anthropic Blog',
        url: 'https://www.anthropic.com/news/claude-35',
        thumbnail: 'https://via.placeholder.com/300x200?text=Claude+3.5',
        tags: ['AI', 'LLM', 'Anthropic'],
        view_count: 542,
        click_count: 41,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '6',
        title: 'Claude API Updates: Improved Performance and Lower Costs',
        summary: 'Anthropic continues to optimize Claude with faster response times and reduced pricing for enterprise customers.',
        source: 'Anthropic Announcements',
        url: 'https://www.anthropic.com/api/updates',
        thumbnail: 'https://via.placeholder.com/300x200?text=Claude+API',
        tags: ['API', 'Performance', 'Cost'],
        view_count: 498,
        click_count: 37,
        created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    },

    // Meta AI News
    {
        id: '7',
        title: 'Meta Introduces New AI Models for Creative Tasks',
        summary: 'Meta released a suite of AI models designed to help creators with image generation, text synthesis, and creative content.',
        source: 'Meta AI Blog',
        url: 'https://www.meta.com/ai/creative-models',
        thumbnail: 'https://via.placeholder.com/300x200?text=Meta+AI',
        tags: ['AI', 'Creative', 'Meta'],
        view_count: 432,
        click_count: 31,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '8',
        title: 'Meta LLaMA 2 Open Source Model Reaches 1 Million Downloads',
        summary: 'The open-source LLaMA 2 model continues to gain traction in the AI community with over a million downloads in the first month.',
        source: 'Meta Research',
        url: 'https://www.meta.com/research/llama2',
        thumbnail: 'https://via.placeholder.com/300x200?text=LLaMA+2',
        tags: ['Open Source', 'LLM', 'Meta'],
        view_count: 521,
        click_count: 38,
        created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString()
    },

    // Microsoft News
    {
        id: '9',
        title: 'Microsoft Azure AI Services See Record Adoption',
        summary: 'Microsoft reports unprecedented growth in adoption of its Azure AI services, with enterprises integrating AI across operations.',
        source: 'Microsoft Azure Blog',
        url: 'https://azure.microsoft.com/en-us/blog/ai-services',
        thumbnail: 'https://via.placeholder.com/300x200?text=Azure+AI',
        tags: ['Cloud', 'AI', 'Microsoft'],
        view_count: 387,
        click_count: 28,
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '10',
        title: 'Microsoft Copilot Pro Expands Enterprise Features',
        summary: 'New enterprise capabilities for Microsoft Copilot Pro enable better integration with business workflows and data security.',
        source: 'Microsoft News',
        url: 'https://news.microsoft.com/copilot-pro',
        thumbnail: 'https://via.placeholder.com/300x200?text=Copilot+Pro',
        tags: ['Enterprise', 'AI', 'Productivity'],
        view_count: 425,
        click_count: 32,
        created_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString()
    },

    // Mistral News
    {
        id: '11',
        title: 'Mistral AI Releases Mixtral Model with Efficient Performance',
        summary: 'Mistral AI introduces Mixtral, a mixture-of-experts model that offers state-of-the-art performance with improved efficiency.',
        source: 'Mistral Blog',
        url: 'https://mistral.ai/news/mixtral',
        thumbnail: 'https://via.placeholder.com/300x200?text=Mixtral',
        tags: ['LLM', 'Efficient', 'Mistral'],
        view_count: 356,
        click_count: 26,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '12',
        title: 'Mistral Large Model Available on Multiple Platforms',
        summary: 'Mistral Large is now accessible on various cloud platforms, making advanced AI capabilities more accessible to developers.',
        source: 'Mistral Announcements',
        url: 'https://mistral.ai/deployment',
        thumbnail: 'https://via.placeholder.com/300x200?text=Mistral+Large',
        tags: ['Deployment', 'Cloud', 'Accessibility'],
        view_count: 289,
        click_count: 21,
        created_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString()
    },

    // Industry News - General AI
    {
        id: '13',
        title: 'AI Industry Sees Record Funding in Q3 2024',
        summary: 'Venture capital investments in AI companies reached all-time highs, with major players and startups securing significant funding rounds.',
        source: 'TechCrunch',
        url: 'https://techcrunch.com/ai-funding-q3',
        thumbnail: 'https://via.placeholder.com/300x200?text=AI+Funding',
        tags: ['Funding', 'Startup', 'Industry'],
        view_count: 634,
        click_count: 47,
        created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '14',
        title: 'Regulations Shape Future of Generative AI',
        summary: 'New regulatory frameworks are emerging globally to govern the development and deployment of generative AI systems.',
        source: 'AI Policy',
        url: 'https://aipolicy.org/regulations',
        thumbnail: 'https://via.placeholder.com/300x200?text=Regulations',
        tags: ['Policy', 'Regulation', 'Governance'],
        view_count: 412,
        click_count: 31,
        created_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString()
    },

    // Research & Innovation
    {
        id: '15',
        title: 'New Research Shows AI Models Can Explain Their Reasoning',
        summary: 'Scientists develop techniques to make AI models more interpretable and transparent in their decision-making processes.',
        source: 'AI Research',
        url: 'https://airesearch.org/interpretability',
        thumbnail: 'https://via.placeholder.com/300x200?text=Interpretability',
        tags: ['Research', 'Explainability', 'Safety'],
        view_count: 498,
        click_count: 36,
        created_at: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '16',
        title: 'Multimodal AI Models Show Promising Results in Robotics',
        summary: 'Integration of multimodal AI with robotics enables more autonomous and intelligent robotic systems for complex tasks.',
        source: 'Robotics Weekly',
        url: 'https://robotics.org/multimodal',
        thumbnail: 'https://via.placeholder.com/300x200?text=Robotics+AI',
        tags: ['Robotics', 'Multimodal', 'Innovation'],
        view_count: 367,
        click_count: 27,
        created_at: new Date(Date.now() - 17 * 60 * 60 * 1000).toISOString()
    },

    // Enterprise Applications
    {
        id: '17',
        title: 'Fortune 500 Companies Accelerate AI Adoption',
        summary: 'Major enterprises are rapidly deploying AI solutions across departments, from customer service to supply chain optimization.',
        source: 'Business AI',
        url: 'https://businessai.org/enterprise-adoption',
        thumbnail: 'https://via.placeholder.com/300x200?text=Enterprise+AI',
        tags: ['Enterprise', 'Business', 'Adoption'],
        view_count: 543,
        click_count: 40,
        created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '18',
        title: 'AI-Powered Analytics Transform Data Science',
        summary: 'Automated machine learning and AI analytics platforms enable faster insights and decision-making for organizations.',
        source: 'Data Science Today',
        url: 'https://datasciencetoday.org/ai-analytics',
        thumbnail: 'https://via.placeholder.com/300x200?text=AI+Analytics',
        tags: ['Analytics', 'Data', 'Business Intelligence'],
        view_count: 421,
        click_count: 31,
        created_at: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString()
    },

    // Ethics & Safety
    {
        id: '19',
        title: 'AI Safety Research Focuses on Alignment and Control',
        summary: 'Researchers invest in developing techniques to ensure AI systems remain aligned with human values and intentions.',
        source: 'AI Safety Institute',
        url: 'https://aisafety.org/alignment',
        thumbnail: 'https://via.placeholder.com/300x200?text=AI+Safety',
        tags: ['Safety', 'Ethics', 'Research'],
        view_count: 378,
        click_count: 28,
        created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    },
    {
        id: '20',
        title: 'Bias in AI Models Addressed Through New Training Methods',
        summary: 'New approaches to model training reduce bias and improve fairness in AI systems across various applications.',
        source: 'Fairness in AI',
        url: 'https://fairnessinai.org/bias-reduction',
        thumbnail: 'https://via.placeholder.com/300x200?text=Bias+Reduction',
        tags: ['Fairness', 'Bias', 'Ethics'],
        view_count: 289,
        click_count: 21,
        created_at: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString()
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
 * Specific routes MUST come before generic /:id route
 */

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

        console.log(`🔍 Searching for keyword: ${keyword}`);

        // Check cache first (non-critical failure)
        const cacheKey = cache.keys.searchResults(keyword, page);
        let cached;
        try {
            cached = await cache.get(cacheKey);
            if (cached) {
                console.log(`✅ Search cache hit for: ${keyword}`);
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

        console.log(`✅ Search returned ${news.length} results for: ${keyword}`);
        res.json(response);
    } catch (error) {
        console.error('Search news error:', error);
        res.status(500).json({ error: 'Failed to search news' });
    }
});

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
