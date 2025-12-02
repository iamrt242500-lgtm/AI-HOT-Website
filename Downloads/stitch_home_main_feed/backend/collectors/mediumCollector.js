const Parser = require('rss-parser');

/**
 * Medium News Collector
 * Collects AI/IT news from Medium RSS feeds
 */
class MediumCollector {
    constructor() {
        this.parser = new Parser({
            customFields: {
                item: [
                    ['media:content', 'mediaContent'],
                    ['content:encoded', 'contentEncoded']
                ]
            }
        });

        // Medium topic RSS feeds
        this.feeds = [
            'https://medium.com/feed/tag/artificial-intelligence',
            'https://medium.com/feed/tag/machine-learning',
            'https://medium.com/feed/tag/technology',
            'https://medium.com/feed/tag/programming',
            'https://medium.com/feed/tag/cloud-computing'
        ];
    }

    /**
     * Collect news from Medium
     * @returns {Promise<Array>} - Array of news items
     */
    async collect() {
        try {
            const allArticles = [];

            for (const feedUrl of this.feeds) {
                const articles = await this.parseFeed(feedUrl);
                allArticles.push(...articles);
            }

            return this.formatNews(allArticles);
        } catch (error) {
            console.error('Medium Collector error:', error);
            return [];
        }
    }

    /**
     * Parse RSS feed
     * @param {string} feedUrl - Feed URL
     * @returns {Promise<Array>} - Array of articles
     */
    async parseFeed(feedUrl) {
        try {
            const feed = await this.parser.parseURL(feedUrl);
            return feed.items.slice(0, 10); // Limit to 10 per feed
        } catch (error) {
            console.error(`Medium feed parse error for ${feedUrl}:`, error);
            return [];
        }
    }

    /**
     * Format articles into standard news format
     * @param {Array} articles - Raw articles
     * @returns {Array} - Formatted news items
     */
    formatNews(articles) {
        return articles.map(article => {
            // Extract thumbnail from content or media
            const thumbnail = this.extractThumbnail(article);

            // Extract plain text content
            const content = this.extractContent(article);

            return {
                title: article.title,
                content: content,
                source: 'medium',
                url: article.link,
                thumbnail: thumbnail,
                tags: this.extractTags(article),
                timestamp: new Date(article.pubDate || article.isoDate)
            };
        });
    }

    /**
     * Extract thumbnail from article
     * @param {object} article - Article object
     * @returns {string|null} - Thumbnail URL
     */
    extractThumbnail(article) {
        // Try media:content
        if (article.mediaContent && article.mediaContent.$) {
            return article.mediaContent.$.url;
        }

        // Try to extract from content
        if (article.contentEncoded || article.content) {
            const html = article.contentEncoded || article.content;
            const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                return imgMatch[1];
            }
        }

        return null;
    }

    /**
     * Extract plain text content
     * @param {object} article - Article object
     * @returns {string} - Plain text content
     */
    extractContent(article) {
        const html = article.contentEncoded || article.content || article.contentSnippet || '';
        // Remove HTML tags
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Extract tags from article
     * @param {object} article - Article object
     * @returns {Array<string>} - Tags
     */
    extractTags(article) {
        const tags = [];

        // Get categories
        if (article.categories && Array.isArray(article.categories)) {
            tags.push(...article.categories.slice(0, 5));
        }

        // Default tag
        if (tags.length === 0) {
            tags.push('Tech', 'Medium');
        }

        return tags;
    }
}

module.exports = new MediumCollector();
