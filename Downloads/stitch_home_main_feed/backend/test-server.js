/**
 * Simple Test Server
 * Runs without database for quick testing
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*'
}));
app.use(express.json());

// Mock news data
const mockNews = [
    {
        id: 1,
        title: "NVIDIA's Blackwell GPU platform is set to redefine the future of generative AI",
        summary: "NVIDIA announces breakthrough GPU architecture for AI workloads",
        source: "x",
        url: "https://twitter.com/example/status/123",
        thumbnail: null,
        tags: ["AI", "GPU", "NVIDIA"],
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        stats: { views: 150, clicks: 45 }
    },
    {
        id: 2,
        title: "The Ethics of AI: Navigating the Moral Landscape of Artificial Intelligence",
        summary: "As AI becomes more integrated into our daily lives, the ethical implications are becoming increasingly complex",
        source: "medium",
        url: "https://medium.com/example/ai-ethics",
        thumbnail: null,
        tags: ["AI", "Ethics"],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        stats: { views: 200, clicks: 60 }
    },
    {
        id: 3,
        title: "Boston Dynamics unveils new all-electric Atlas robot",
        summary: "Revolutionary humanoid robot showcases advanced mobility and dexterity",
        source: "facebook",
        url: "https://facebook.com/example/post/123",
        thumbnail: null,
        tags: ["Robotics", "AI"],
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        stats: { views: 300, clicks: 90 }
    },
    {
        id: 4,
        title: "Quick look at quantum computing advancements",
        summary: "Latest quantum computing breakthroughs making waves in tech industry",
        source: "instagram",
        url: "https://instagram.com/p/example",
        thumbnail: null,
        tags: ["QuantumComputing", "Tech"],
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        stats: { views: 180, clicks: 55 }
    },
    {
        id: 5,
        title: "Cloud Native Architecture Best Practices for 2024",
        summary: "Comprehensive guide to building scalable cloud-native applications",
        source: "medium",
        url: "https://medium.com/example/cloud-native",
        thumbnail: null,
        tags: ["Cloud", "DevOps"],
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        stats: { views: 250, clicks: 75 }
    }
];

const mockKeywords = [
    { keyword: "AI", weight: 100, count: 150 },
    { keyword: "Cloud", weight: 85, count: 120 },
    { keyword: "Robotics", weight: 75, count: 95 },
    { keyword: "QuantumComputing", weight: 70, count: 88 },
    { keyword: "Cybersecurity", weight: 65, count: 82 }
];

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Test server running (mock data mode)',
        timestamp: new Date().toISOString()
    });
});

// News endpoints
app.get('/api/news/latest', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    res.json({
        news: mockNews,
        pagination: {
            page,
            limit,
            total: mockNews.length,
            totalPages: 1
        }
    });
});

app.get('/api/news/trending', (req, res) => {
    const trending = [...mockNews].sort((a, b) =>
        (b.stats.views + b.stats.clicks * 2) - (a.stats.views + a.stats.clicks * 2)
    );

    res.json({ news: trending });
});

app.get('/api/news/search', (req, res) => {
    const keyword = req.query.keyword || req.query.q || '';

    const results = mockNews.filter(news =>
        news.title.toLowerCase().includes(keyword.toLowerCase()) ||
        news.summary.toLowerCase().includes(keyword.toLowerCase()) ||
        news.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    );

    res.json({
        keyword,
        news: results,
        count: results.length
    });
});

app.get('/api/news/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const news = mockNews.find(n => n.id === id);

    if (!news) {
        return res.status(404).json({ error: 'News not found' });
    }

    res.json(news);
});

// Trend endpoints
app.get('/api/trend/keywords', (req, res) => {
    res.json({ keywords: mockKeywords });
});

app.get('/api/trend/topics', (req, res) => {
    const topics = mockKeywords.slice(0, 10).map(k => ({
        name: k.keyword,
        weight: k.weight
    }));

    res.json({ topics });
});

app.get('/api/trend/stats', (req, res) => {
    res.json({
        totalNews: mockNews.length,
        recentNews: mockNews.filter(n =>
            new Date() - new Date(n.timestamp) < 24 * 60 * 60 * 1000
        ).length,
        bySource: [
            { source: 'medium', count: mockNews.filter(n => n.source === 'medium').length },
            { source: 'x', count: mockNews.filter(n => n.source === 'x').length },
            { source: 'facebook', count: mockNews.filter(n => n.source === 'facebook').length },
            { source: 'instagram', count: mockNews.filter(n => n.source === 'instagram').length }
        ],
        popularTags: mockKeywords.slice(0, 10)
    });
});

// User endpoints (simplified)
app.post('/api/user/register', (req, res) => {
    const { email } = req.body;
    res.status(201).json({
        user: { id: 1, email, interests: [] },
        token: 'mock_jwt_token_for_testing'
    });
});

app.post('/api/user/login', (req, res) => {
    const { email } = req.body;
    res.json({
        user: { id: 1, email, interests: ['AI', 'Cloud'] },
        token: 'mock_jwt_token_for_testing'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('🎯 ===================================');
    console.log('🚀 Test Server Running!');
    console.log('🎯 ===================================');
    console.log('');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🔍 Health: http://localhost:${PORT}/health`);
    console.log(`📰 Latest: http://localhost:${PORT}/api/news/latest`);
    console.log(`🔥 Trending: http://localhost:${PORT}/api/trend/keywords`);
    console.log('');
    console.log('⚠️  Note: Running in MOCK MODE (no database required)');
    console.log('   To use real data, set up PostgreSQL and Redis');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
});
