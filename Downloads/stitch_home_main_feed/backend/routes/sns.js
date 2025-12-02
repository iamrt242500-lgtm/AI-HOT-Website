const express = require('express');
const router = express.Router();
const snsCollector = require('../collectors/snsCollector');
const cache = require('../services/cache');
const { optionalAuth } = require('../middleware/auth');

/**
 * Verify if article is recently updated (within 7 days)
 */
function isRecentArticle(article, daysThreshold = 7) {
    if (!article.timestamp) return false;
    
    try {
        const articleDate = new Date(article.timestamp);
        const now = new Date();
        const diffMs = now - articleDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        return diffDays <= daysThreshold;
    } catch (error) {
        console.warn('⚠️ Error verifying article date:', error);
        return false;
    }
}

/**
 * Sort articles by timestamp (newest first)
 */
function sortArticlesByDate(articles) {
    return articles.sort((a, b) => {
        try {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB - dateA; // Newest first
        } catch (error) {
            console.warn('⚠️ Error sorting articles:', error);
            return 0;
        }
    });
}

/**
 * GET /api/sns/latest
 * Get latest SNS articles from official AI company accounts
 */
router.get('/latest', optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Check cache first
        const cacheKey = `sns:latest:${page}`;
        let cached;
        try {
            cached = await cache.get(cacheKey);
            if (cached) {
                console.log('📦 SNS articles from cache');
                return res.json(cached);
            }
        } catch (cacheError) {
            console.warn('⚠️ Cache error:', cacheError.message);
        }

        // Get SNS articles
        let articles = await snsCollector.getSNSArticles(limit * 3);
        
        // Filter recent articles (within 7 days)
        articles = articles.filter(article => isRecentArticle(article, 7));
        
        // Sort by date (newest first)
        articles = sortArticlesByDate(articles);
        
        console.log(`✅ Verified ${articles.length} recent SNS articles`);
        
        // Paginate
        const paginatedArticles = articles.slice(offset, offset + limit);
        
        const response = {
            success: true,
            page,
            limit,
            count: paginatedArticles.length,
            total: articles.length,
            articles: paginatedArticles,
            totalPages: Math.ceil(articles.length / limit),
            verificationInfo: {
                verified: true,
                verifiedAt: new Date().toISOString(),
                articlesVerifiedCount: articles.length,
                daysThreshold: 7
            }
        };

        // Cache the result
        try {
            await cache.set(cacheKey, response, 3600);
        } catch (cacheError) {
            console.warn('⚠️ Cache set error:', cacheError.message);
        }

        res.json(response);
    } catch (error) {
        console.error('Error fetching SNS articles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch SNS articles',
            message: error.message
        });
    }
});

/**
 * GET /api/sns/by-company/:company
 * Get SNS articles by specific company
 */
router.get('/by-company/:company', optionalAuth, async (req, res) => {
    try {
        const company = req.params.company.toLowerCase();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let articles = await snsCollector.getSNSArticles(100);
        
        // Filter by company with null-safety checks
        let filtered = articles.filter(article => {
            if (!article) return false;
            
            const source = article.source ? String(article.source).toLowerCase() : '';
            const sourceId = article.sourceId ? String(article.sourceId).toLowerCase() : '';
            
            return source.includes(company) || sourceId.includes(company);
        });
        
        // Filter recent articles (within 7 days)
        filtered = filtered.filter(article => isRecentArticle(article, 7));
        
        // Sort by date (newest first)
        filtered = sortArticlesByDate(filtered);
        
        console.log(`✅ Verified ${filtered.length} recent SNS articles for ${company}`);

        const paginatedArticles = filtered.slice(offset, offset + limit);

        res.json({
            success: true,
            company,
            page,
            limit,
            count: paginatedArticles.length,
            total: filtered.length,
            articles: paginatedArticles,
            totalPages: Math.ceil(filtered.length / limit),
            verificationInfo: {
                verified: true,
                verifiedAt: new Date().toISOString(),
                articlesVerifiedCount: filtered.length,
                daysThreshold: 7
            }
        });
    } catch (error) {
        console.error('Error filtering SNS articles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to filter SNS articles',
            message: error.message
        });
    }
});

/**
 * GET /api/sns/featured
 * Get featured SNS articles
 */
router.get('/featured', optionalAuth, async (req, res) => {
    try {
        const articles = await snsCollector.getSNSArticles(50);
        const featured = articles.filter(article => article.featured).slice(0, 10);

        res.json({
            success: true,
            count: featured.length,
            articles: featured
        });
    } catch (error) {
        console.error('Error fetching featured SNS articles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured SNS articles',
            message: error.message
        });
    }
});

/**
 * GET /api/sns/companies
 * Get list of SNS sources (companies)
 */
router.get('/companies', (req, res) => {
    try {
        const companies = [
            { id: 'openai', name: 'OpenAI', icon: '🟢', color: '#1DB954' },
            { id: 'google', name: 'Google AI', icon: '🔴', color: '#EA4335' },
            { id: 'deepmind', name: 'DeepMind', icon: '🔵', color: '#2196F3' },
            { id: 'anthropic', name: 'Anthropic', icon: '⭐', color: '#FFD700' },
            { id: 'meta', name: 'Meta AI', icon: '👍', color: '#1877F2' },
            { id: 'mistral', name: 'Mistral AI', icon: '🎨', color: '#FF6B35' }
        ];

        res.json({
            success: true,
            count: companies.length,
            companies
        });
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch companies',
            message: error.message
        });
    }
});

module.exports = router;
