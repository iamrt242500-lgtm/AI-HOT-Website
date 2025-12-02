const axios = require('axios');

/**
 * Facebook News Collector
 * Note: Facebook Graph API has restrictions. This is a basic implementation.
 * For production, you'll need proper app setup and page access tokens.
 */
class FacebookCollector {
    constructor() {
        this.baseUrl = 'https://graph.facebook.com/v18.0';
        this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

        // Official tech company pages - Focus on verified accounts
        this.pageIds = [
            // Official tech company pages (verified)
            'OpenAI',              // OpenAI official page
            'DeepMind',            // Google DeepMind
            'Anthropic-AI',        // Anthropic
            'MetaAI',              // Meta AI Research
            'MSResearch',          // Microsoft Research
            'TechCrunch',          // Tech news
            'VentureBeat',         // Tech news
            'Wired',               // Tech & science
            'MIT-CSAIL',           // MIT AI Lab
            'Stanford-HAI'         // Stanford Human-Centered AI
        ];

        console.log('Facebook Collector initialized with official tech company pages');
    }

    /**
     * Collect news from Facebook
     * @returns {Promise<Array>} - Array of news items
     */
    async collect() {
        try {
            // Check if access token is available
            if (!this.accessToken || this.pageIds.length === 0) {
                console.warn('Facebook collector: No access token or page IDs configured');
                return [];
            }

            const allPosts = [];

            for (const pageId of this.pageIds) {
                const posts = await this.getPagePosts(pageId);
                allPosts.push(...posts);
            }

            return this.formatNews(allPosts);
        } catch (error) {
            console.error('Facebook Collector error:', error);
            return [];
        }
    }

    /**
     * Get posts from a Facebook page
     * @param {string} pageId - Page ID
     * @returns {Promise<Array>} - Array of posts
     */
    async getPagePosts(pageId) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/${pageId}/posts`,
                {
                    params: {
                        access_token: this.accessToken,
                        fields: 'id,message,created_time,full_picture,permalink_url,attachments',
                        limit: 10
                    }
                }
            );

            return response.data.data || [];
        } catch (error) {
            console.error(`Facebook page error for ${pageId}:`, error);
            return [];
        }
    }

    /**
     * Format posts into standard news format
     * @param {Array} posts - Raw posts
     * @returns {Array} - Formatted news items
     */
    formatNews(posts) {
        return posts
            .filter(post => post.message) // Has content
            .map(post => {
                return {
                    title: this.extractTitle(post.message),
                    content: post.message,
                    source: 'facebook',
                    url: post.permalink_url,
                    thumbnail: post.full_picture || this.extractThumbnail(post),
                    tags: ['Tech', 'Facebook'],
                    timestamp: new Date(post.created_time)
                };
            });
    }

    /**
     * Extract title from message
     * @param {string} message - Post message
     * @returns {string} - Title
     */
    extractTitle(message) {
        const firstLine = message.split('\n')[0];
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
        if (post.attachments && post.attachments.data && post.attachments.data[0]) {
            const media = post.attachments.data[0].media;
            if (media && media.image) {
                return media.image.src;
            }
        }

        return null;
    }
}

module.exports = new FacebookCollector();
