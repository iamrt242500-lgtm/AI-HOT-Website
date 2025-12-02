const express = require('express');
const router = express.Router();

// Mock data for AI Tools
const aiTools = [
    {
        id: 1,
        name: "Midjourney",
        description: "Advanced text-to-image generation with stunning quality.",
        category: "image",
        url: "https://midjourney.com",
        featured: true,
        icon: "🎨"
    },
    {
        id: 2,
        name: "GitHub Copilot",
        description: "AI assistant for code completion and coding assistance.",
        category: "coding",
        url: "https://github.com/features/copilot",
        featured: true,
        icon: "💻"
    },
    {
        id: 3,
        name: "Runway Gen-3",
        description: "AI-powered video generation and editing platform.",
        category: "video",
        url: "https://runwayml.com",
        featured: true,
        icon: "🎬"
    },
    {
        id: 4,
        name: "ElevenLabs",
        description: "Natural-sounding text-to-speech and voice synthesis.",
        category: "voice",
        url: "https://elevenlabs.io",
        featured: true,
        icon: "🔊"
    },
    {
        id: 5,
        name: "OpenAI o3",
        description: "Advanced AI model for reasoning and data analysis.",
        category: "analysis",
        url: "https://openai.com",
        featured: true,
        icon: "🧠"
    },
    {
        id: 6,
        name: "Canva AI",
        description: "Design tool with AI-powered image and layout generation.",
        category: "image",
        url: "https://canva.com",
        featured: false,
        icon: "🖌️"
    },
    {
        id: 7,
        name: "Cursor",
        description: "IDE built for pair programming with Claude AI.",
        category: "coding",
        url: "https://cursor.com",
        featured: false,
        icon: "✨"
    },
    {
        id: 8,
        name: "HeyGen",
        description: "AI video generation platform with avatar creation.",
        category: "video",
        url: "https://heygen.com",
        featured: false,
        icon: "👤"
    }
];

// Category definitions
const categories = [
    { id: 'all', name: 'All', icon: '⭐' },
    { id: 'image', name: 'Image', icon: '🎨' },
    { id: 'coding', name: 'Coding', icon: '💻' },
    { id: 'video', name: 'Video', icon: '🎬' },
    { id: 'voice', name: 'Voice', icon: '🔊' },
    { id: 'analysis', name: 'Analysis', icon: '🧠' }
];

/**
 * GET /api/ai-tools
 * Get list of AI tools with optional filtering
 */
router.get('/', (req, res) => {
    try {
        const category = req.query.category || 'all';
        
        let filteredTools = aiTools;
        if (category !== 'all') {
            filteredTools = aiTools.filter(tool => tool.category === category);
        }

        res.json({
            success: true,
            count: filteredTools.length,
            tools: filteredTools,
            categories: categories
        });
    } catch (error) {
        console.error('Error fetching AI tools:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI tools',
            message: error.message
        });
    }
});

/**
 * GET /api/ai-tools/featured
 * Get only featured AI tools
 */
router.get('/featured', (req, res) => {
    try {
        const featuredTools = aiTools.filter(tool => tool.featured);
        
        res.json({
            success: true,
            count: featuredTools.length,
            tools: featuredTools
        });
    } catch (error) {
        console.error('Error fetching featured AI tools:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured AI tools',
            message: error.message
        });
    }
});

/**
 * GET /api/ai-tools/categories
 * Get all available categories
 */
router.get('/categories', (req, res) => {
    try {
        res.json({
            success: true,
            count: categories.length,
            categories: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});

/**
 * GET /api/ai-tools/:id
 * Get a specific AI tool by ID
 */
router.get('/:id', (req, res) => {
    try {
        const tool = aiTools.find(t => t.id === parseInt(req.params.id));
        
        if (!tool) {
            return res.status(404).json({
                success: false,
                error: 'Tool not found'
            });
        }

        res.json({
            success: true,
            tool: tool
        });
    } catch (error) {
        console.error('Error fetching AI tool:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI tool',
            message: error.message
        });
    }
});

module.exports = router;
