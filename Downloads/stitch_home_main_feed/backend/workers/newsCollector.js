const db = require('../db');
const { deduplicateArray, normalizeUrl } = require('../utils/deduplication');
const { summarizeNews, summarizeKorean, extractTags } = require('../services/summarizer');
const languageDetector = require('../utils/languageDetector');
const translator = require('../services/translator');

// Import all collectors
const xCollector = require('../collectors/xCollector');
const mediumCollector = require('../collectors/mediumCollector');
const redditCollector = require('../collectors/redditCollector');
const facebookCollector = require('../collectors/facebookCollector');
const instagramCollector = require('../collectors/instagramCollector');

/**
 * Main News Collector Worker
 * Collects news from all platforms, deduplicates, summarizes, and stores
 */
class NewsCollector {
    constructor() {
        this.collectors = [
            { name: 'X', collector: xCollector },
            { name: 'Medium', collector: mediumCollector },
            { name: 'Reddit', collector: redditCollector },
            { name: 'Facebook', collector: facebookCollector },
            { name: 'Instagram', collector: instagramCollector }
        ];
    }

    /**
     * Run the news collection process
     */
    async run() {
        console.log('🔄 Starting news collection...');
        const startTime = Date.now();

        try {
            // Collect from all platforms in parallel
            const collectionPromises = this.collectors.map(async ({ name, collector }) => {
                try {
                    console.log(`  📰 Collecting from ${name}...`);
                    const news = await collector.collect();
                    console.log(`  ✅ ${name}: Collected ${news.length} items`);
                    return news;
                } catch (error) {
                    console.error(`  ❌ ${name}: Collection failed`, error);
                    return [];
                }
            });

            const results = await Promise.all(collectionPromises);
            const allNews = results.flat();

            console.log(`📊 Total items collected: ${allNews.length}`);

            if (allNews.length === 0) {
                console.log('⚠️  No news items collected');
                return;
            }

            // Deduplicate new news items
            const deduplicated = deduplicateArray(allNews);
            console.log(`🔍 After deduplication: ${deduplicated.length} items`);

            // Check against existing news in database
            const existingNews = await this.getRecentNews();
            const newItems = this.filterAgainstExisting(deduplicated, existingNews);
            console.log(`🆕 New items to add: ${newItems.length}`);

            if (newItems.length === 0) {
                console.log('✅ No new items to add');
                return;
            }

            // Summarize and extract tags using AI
            console.log('🤖 Generating summaries and tags...');
            const processed = await this.processNewsItems(newItems);

            // Save to database
            console.log('💾 Saving to database...');
            await this.saveNews(processed);

            // Update trending keywords
            await this.updateTrendingKeywords(processed);

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ News collection completed in ${duration}s`);
            console.log(`   Added ${processed.length} new items`);

        } catch (error) {
            console.error('❌ News collection failed:', error);
        }
    }

    /**
     * Get recent news from database (last 7 days)
     * @returns {Promise<Array>}
     */
    async getRecentNews() {
        const result = await db.query(`
      SELECT title, url
      FROM news
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
        return result.rows;
    }

    /**
     * Filter new items against existing news
     * @param {Array} newItems - New news items
     * @param {Array} existingNews - Existing news from DB
     * @returns {Array} - Filtered new items
     */
    filterAgainstExisting(newItems, existingNews) {
        const existingUrls = new Set(existingNews.map(n => normalizeUrl(n.url)));
        const existingTitles = existingNews.map(n => n.title);

        return newItems.filter(item => {
            const normalizedUrl = normalizeUrl(item.url);
            if (existingUrls.has(normalizedUrl)) {
                return false;
            }

            // Check title similarity (simple check)
            const isDuplicateTitle = existingTitles.some(title =>
                title.toLowerCase() === item.title.toLowerCase()
            );

            return !isDuplicateTitle;
        });
    }

    /**
     * Process news items: detect language, translate, summarize and extract tags
     * @param {Array} newsItems - News items
     * @returns {Promise<Array>} - Processed items
     */
    async processNewsItems(newsItems) {
        const processed = [];

        for (const item of newsItems) {
            try {
                const content = item.content || item.title;

                // Detect language
                const detectedLang = languageDetector.detectLanguage(content);
                const isKorean = detectedLang === 'ko';

                let originalContent = content;
                let translatedContentKo = content;
                let summaryKo = item.summary || '';
                let isTranslated = false;

                // If not Korean, translate
                if (!isKorean && content) {
                    console.log(`  🌐 Translating from ${detectedLang} to Korean...`);
                    translatedContentKo = await translator.translateToKorean(content, detectedLang);
                    isTranslated = true;
                }

                // Generate Korean summary
                if (!summaryKo) {
                    summaryKo = await summarizeKorean(translatedContentKo, item.title);
                }

                // Extract tags if not already present
                let tags = item.tags || [];
                if (tags.length === 0) {
                    tags = await extractTags(translatedContentKo, item.title);
                }

                processed.push({
                    ...item,
                    original_language: detectedLang,
                    original_content: originalContent,
                    translated_content_ko: translatedContentKo,
                    summary_ko: summaryKo,
                    is_translated: isTranslated,
                    tags
                });

            } catch (error) {
                console.error(`Error processing item "${item.title}":`, error);
                // Add anyway with original data
                processed.push({
                    ...item,
                    original_language: 'en',
                    original_content: item.content || item.title,
                    translated_content_ko: item.content || item.title,
                    summary_ko: item.summary || item.title,
                    is_translated: false
                });
            }
        }

        return processed;
    }

    /**
     * Save news items to database with translation fields
     * @param {Array} newsItems - Processed news items
     */
    async saveNews(newsItems) {
        for (const item of newsItems) {
            try {
                await db.query(`
          INSERT INTO news (
            title, summary, content, source, url, thumbnail, tags,
            author_name, source_name, original_language,
            original_content, translated_content_ko, summary_ko,
            is_translated, published_at, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (url) DO NOTHING
        `, [
                    item.title,
                    item.summary_ko || item.summary || item.title,
                    item.content || item.translated_content_ko || '',
                    item.source,
                    item.url,
                    item.thumbnail,
                    item.tags || [],
                    item.author || null,
                    item.source_name || item.source,
                    item.original_language || 'en',
                    item.original_content || item.content || '',
                    item.translated_content_ko || item.content || '',
                    item.summary_ko || item.summary || item.title,
                    item.is_translated || false,
                    item.published_at || item.timestamp || new Date(),
                    item.timestamp || new Date()
                ]);
            } catch (error) {
                console.error(`Error saving item "${item.title}":`, error);
            }
        }
    }

    /**
     * Update trending keywords based on collected news tags
     * @param {Array} newsItems - News items with tags
     */
    async updateTrendingKeywords(newsItems) {
        const tagCounts = {};

        // Count tag occurrences
        newsItems.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        // Update database
        for (const [keyword, count] of Object.entries(tagCounts)) {
            try {
                await db.query(`
          INSERT INTO trending_keywords (keyword, weight, count)
          VALUES ($1, $2, $3)
          ON CONFLICT (keyword)
          DO UPDATE SET
            count = trending_keywords.count + $3,
            weight = (trending_keywords.weight * 0.9) + ($2 * 0.1),
            updated_at = NOW()
        `, [keyword, count * 10, count]);
            } catch (error) {
                console.error(`Error updating keyword "${keyword}":`, error);
            }
        }
    }
}

// If run directly
if (require.main === module) {
    const collector = new NewsCollector();
    collector.run()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = new NewsCollector();
