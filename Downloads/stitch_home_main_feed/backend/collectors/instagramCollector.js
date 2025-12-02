const axios = require('axios');
const Parser = require('rss-parser');

/**
 * Instagram News Collector
 * Note: Instagram doesn't have an official public API for most use cases.
 * This implementation uses RSS feeds from third-party services or hashtag pages.
 * For production, consider using official Instagram Graph API if you have business account access.
 */
class InstagramCollector {
    constructor() {
        this.parser = new Parser();

        // Official tech company Instagram accounts converted to RSS feeds
        // Using instagrapi or RSS bridge services for public data
        this.officialAccounts = {
            'OpenAI': '@openai',
            'Google AI': '@googleai',
            'Meta AI': '@metaai',
            'NVIDIA': '@nvidia',
            'Tesla': '@tesla',
            'MIT': '@mit',
            'Stanford': '@stanford_university'
        };

        // Alternative: Use Instagram hashtag RSS or third-party services
        this.feedUrls = [
            // These would be RSS feeds or data sources
            // Example: scrapestorm feeds or RSS bridge for Instagram
        ];

        console.log('Instagram Collector initialized with official tech company accounts');
    }

    /**
     * Collect news from Instagram
     * @returns {Promise<Array>} - Array of news items
     */
    async collect() {
        try {
            // If no feed URLs configured, return empty
            if (this.feedUrls.length === 0) {
                console.warn('Instagram collector: No feed URLs configured');
                return this.getMockData(); // Return mock data for demonstration
            }

            const allPosts = [];

            for (const feedUrl of this.feedUrls) {
                const posts = await this.parseFeed(feedUrl);
                allPosts.push(...posts);
            }

            return this.formatNews(allPosts);
        } catch (error) {
            console.error('Instagram Collector error:', error);
            return [];
        }
    }

    /**
     * Parse RSS feed
     * @param {string} feedUrl - Feed URL
     * @returns {Promise<Array>} - Array of posts
     */
    async parseFeed(feedUrl) {
        try {
            const feed = await this.parser.parseURL(feedUrl);
            return feed.items.slice(0, 10);
        } catch (error) {
            console.error(`Instagram feed parse error for ${feedUrl}:`, error);
            return [];
        }
    }

    /**
     * Get mock data for demonstration
     * In production, replace this with actual Instagram data source
     * @returns {Array} - Mock news items
     */
    getMockData() {
        return [
            {
                title: 'Latest AI developments showcased at tech conference',
                content: 'Tech leaders demonstrate cutting-edge AI innovations #AI #Tech',
                source: 'instagram',
                url: 'https://instagram.com/p/mock_post_1',
                thumbnail: null,
                tags: ['AI', 'Tech', 'Innovation'],
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
                title: 'Cloud infrastructure trends for 2024',
                content: 'Exploring the future of cloud computing and serverless architecture #Cloud #DevOps',
                source: 'instagram',
                url: 'https://instagram.com/p/mock_post_2',
                thumbnail: null,
                tags: ['Cloud', 'DevOps'],
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
            }
        ];
    }

    /**
     * Format posts into standard news format
     * @param {Array} posts - Raw posts
     * @returns {Array} - Formatted news items
     */
    formatNews(posts) {
        return posts.map(post => {
            return {
                title: post.title || this.extractTitle(post.content || post.contentSnippet),
                content: post.content || post.contentSnippet,
                source: 'instagram',
                url: post.link,
                thumbnail: this.extractThumbnail(post),
                tags: this.extractTags(post),
                timestamp: new Date(post.pubDate || post.isoDate)
            };
        });
    }

    /**
     * Extract title from content
     * @param {string} content - Post content
     * @returns {string} - Title
     */
    extractTitle(content) {
        const firstLine = content.split('\n')[0];
        return firstLine.length > 100
            ? firstLine.substring(0, 100) + '...'
            : firstLine;
    }

    /**
     * Extract thumbnail from post
     * @param {object} post - Post object
     * @returns {string|null} - Thumbnail URL
     */
    extractThumbnail(post) {
        if (post.enclosure && post.enclosure.url) {
            return post.enclosure.url;
        }

        if (post.content) {
            const imgMatch = post.content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                return imgMatch[1];
            }
        }

        return null;
    }

    /**
     * Extract tags from post
     * @param {object} post - Post object
     * @returns {Array<string>} - Tags
     */
    extractTags(post) {
        const content = post.content || post.contentSnippet || '';
        const hashtags = content.match(/#\w+/g) || [];
        const tags = hashtags.map(tag => tag.substring(1)).slice(0, 5);

        if (tags.length === 0) {
            return ['Tech', 'Instagram'];
        }

        return tags;
    }
}

module.exports = new InstagramCollector();
