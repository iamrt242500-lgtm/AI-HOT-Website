const axios = require('axios');

/**
 * Reddit News Collector
 * Collects AI/IT news from relevant subreddits
 */
class RedditCollector {
    constructor() {
        this.baseUrl = 'https://oauth.reddit.com';
        this.authUrl = 'https://www.reddit.com/api/v1/access_token';
        this.accessToken = null;

        // Official tech company & AI-focused subreddits
        this.subreddits = [
            'OpenAI',           // OpenAI official
            'MachineLearning',  // ML research & discussions
            'LanguageModels',   // LLM focused
            'artificial',       // AI news
            'technology',       // General tech news
            'programming'       // Programming & dev
        ];
    }

    /**
     * Get OAuth access token
     * @returns {Promise<string>} - Access token
     */
    async getAccessToken() {
        if (this.accessToken) {
            return this.accessToken;
        }

        try {
            const auth = Buffer.from(
                `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
            ).toString('base64');

            const response = await axios.post(
                this.authUrl,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': process.env.REDDIT_USER_AGENT || 'ai-news-aggregator/1.0'
                    }
                }
            );

            this.accessToken = response.data.access_token;

            // Reset token after 55 minutes (tokens expire in 1 hour)
            setTimeout(() => {
                this.accessToken = null;
            }, 55 * 60 * 1000);

            return this.accessToken;
        } catch (error) {
            console.error('Reddit auth error:', error);
            throw error;
        }
    }

    /**
     * Collect news from Reddit
     * @returns {Promise<Array>} - Array of news items
     */
    async collect() {
        try {
            const token = await this.getAccessToken();
            const allPosts = [];

            for (const subreddit of this.subreddits) {
                const posts = await this.getSubredditPosts(subreddit, token);
                allPosts.push(...posts);
            }

            return this.formatNews(allPosts);
        } catch (error) {
            console.error('Reddit Collector error:', error);
            return [];
        }
    }

    /**
     * Get posts from a subreddit
     * @param {string} subreddit - Subreddit name
     * @param {string} token - Access token
     * @returns {Promise<Array>} - Array of posts
     */
    async getSubredditPosts(subreddit, token) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/r/${subreddit}/hot`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': process.env.REDDIT_USER_AGENT || 'ai-news-aggregator/1.0'
                    },
                    params: {
                        limit: 10,
                        t: 'day' // Posts from last day
                    }
                }
            );

            return response.data.data.children.map(child => child.data);
        } catch (error) {
            console.error(`Reddit subreddit error for r/${subreddit}:`, error);
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
            .filter(post => !post.is_self || post.selftext) // Has content
            .map(post => {
                return {
                    title: post.title,
                    content: post.selftext || post.url,
                    source: 'reddit',
                    url: `https://reddit.com${post.permalink}`,
                    thumbnail: this.extractThumbnail(post),
                    tags: this.extractTags(post),
                    timestamp: new Date(post.created_utc * 1000)
                };
            });
    }

    /**
     * Extract thumbnail from post
     * @param {object} post - Post object
     * @returns {string|null} - Thumbnail URL
     */
    extractThumbnail(post) {
        if (post.thumbnail && post.thumbnail.startsWith('http')) {
            return post.thumbnail;
        }

        if (post.preview && post.preview.images && post.preview.images[0]) {
            return post.preview.images[0].source.url.replace(/&amp;/g, '&');
        }

        return null;
    }

    /**
     * Extract tags from post
     * @param {object} post - Post object
     * @returns {Array<string>} - Tags
     */
    extractTags(post) {
        const tags = [post.subreddit];

        // Extract flair
        if (post.link_flair_text) {
            tags.push(post.link_flair_text);
        }

        return tags.slice(0, 5);
    }
}

module.exports = new RedditCollector();
