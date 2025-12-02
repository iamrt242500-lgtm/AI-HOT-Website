const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');

/**
 * X (Twitter) News Collector
 * Collects AI/IT news from X using Twitter API v2
 * Focuses on official verified accounts for AI/Tech news
 */
class XCollector {
    constructor() {
        this.bearerToken = process.env.X_BEARER_TOKEN;
        // Official verified accounts to follow
        this.officialAccounts = {
            'OpenAI': '@OpenAI',
            'Google DeepMind': '@DeepMindAI',
            'Google AI': '@GoogleAI',
            'Meta AI': '@MetaAI',
            'Anthropic': '@AnthropicAI',
            'Microsoft Research': '@MSResearch',
            'Tesla': '@Tesla',
            'NVIDIA': '@nvidia',
            'MIT CSAIL': '@MIT_CSAIL',
            'Stanford AI': '@StanfordAI'
        };
    }

    /**
     * Collect news from X
     * @returns {Promise<Array>} - Array of news items
     */
    async collect() {
        try {
            if (!this.bearerToken) {
                console.warn('⚠️  X Bearer Token not configured, skipping X collection');
                return [];
            }

            const allTweets = [];

            // Collect from official accounts
            for (const [name, handle] of Object.entries(this.officialAccounts)) {
                try {
                    const tweets = await this.collectFromAccount(handle, name);
                    allTweets.push(...tweets);
                } catch (error) {
                    console.warn(`  ⚠️  Failed to collect from ${name} (${handle}):`, error.message);
                }
            }

            return this.formatNews(allTweets);
        } catch (error) {
            console.error('X Collector error:', error);
            return [];
        }
    }

    /**
     * Collect tweets from a specific account
     * @param {string} handle - Twitter handle
     * @param {string} name - Account name
     * @returns {Promise<Array>} - Array of tweets
     */
    async collectFromAccount(handle, name) {
        try {
            const baseUrl = 'https://api.twitter.com/2/tweets/search/recent';
            const keywords = ['AI', 'machine learning', 'neural', 'model', 'algorithm'];
            
            const allTweets = [];
            
            for (const keyword of keywords) {
                const query = `from:${handle.substring(1)} (${keyword}) -is:retweet lang:en`;
                
                const response = await axios.get(baseUrl, {
                    params: {
                        query: query,
                        max_results: 10,
                        'tweet.fields': 'created_at,author_id,public_metrics',
                        'expansions': 'author_id',
                        'user.fields': 'verified,username'
                    },
                    headers: {
                        'Authorization': `Bearer ${this.bearerToken}`
                    }
                });

                if (response.data?.data) {
                    allTweets.push(...response.data.data);
                }
            }

            return allTweets.slice(0, 10); // Limit to 10 per account
        } catch (error) {
            if (error.response?.status === 429) {
                console.warn(`  ⚠️  Rate limited for ${handle}`);
            }
            throw error;
        }
    }

    /**
     * Format tweets into standard news format
     * @param {Array} tweets - Raw tweets
     * @returns {Array} - Formatted news items
     */
    formatNews(tweets) {
        return tweets.map(tweet => {
            const url = `https://twitter.com/i/web/status/${tweet.id}`;

            return {
                title: this.extractTitle(tweet.text),
                summary: tweet.text,
                content: tweet.text,
                source: 'X (Twitter)',
                url: url,
                thumbnail: null,
                tags: this.extractTags(tweet.text),
                timestamp: new Date(tweet.created_at),
                stats: {
                    views: tweet.public_metrics?.impression_count || 0,
                    clicks: tweet.public_metrics?.like_count || 0
                }
            };
        });
    }

    /**
     * Extract title from tweet text
     * @param {string} text - Tweet text
     * @returns {string} - Title
     */
    extractTitle(text) {
        // Use first sentence or first 100 chars
        const firstSentence = text.split(/[.!?]/)[0];
        return firstSentence.length > 100
            ? firstSentence.substring(0, 100) + '...'
            : firstSentence;
    }

    /**
     * Extract tags from tweet text
     * @param {string} text - Tweet text
     * @returns {Array<string>} - Tags
     */
    extractTags(text) {
        const hashtags = text.match(/#\w+/g) || [];
        const tags = hashtags.map(tag => tag.substring(1)).slice(0, 5); // Remove #, limit to 5

        // Add default tech tags if none found
        if (tags.length === 0) {
            return ['AI', 'Technology'];
        }

        return tags;
    }
}

module.exports = new XCollector();
