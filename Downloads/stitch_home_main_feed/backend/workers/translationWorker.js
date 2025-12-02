const db = require('../db');
const languageDetector = require('../utils/languageDetector');
const translator = require('../services/translator');
const { summarizeKorean } = require('../services/summarizer');

/**
 * Translation Worker
 * Background worker to process and translate untranslated news articles
 */

class TranslationWorker {
    constructor() {
        this.batchSize = parseInt(process.env.TRANSLATION_BATCH_SIZE) || 5;
        this.retryAttempts = parseInt(process.env.TRANSLATION_RETRY_ATTEMPTS) || 3;
    }

    /**
     * Run the translation worker
     * @param {number} limit - Maximum number of items to process in this run
     */
    async run(limit = 50) {
        console.log('🌐 Starting translation worker...');
        const startTime = Date.now();

        try {
            // Find untranslated news items
            const untranslated = await this.getUntranslatedNews(limit);

            if (untranslated.length === 0) {
                console.log('✅ No untranslated items found');
                return { processed: 0, failed: 0 };
            }

            console.log(`📊 Found ${untranslated.length} untranslated items`);

            // Process in batches
            let processed = 0;
            let failed = 0;

            for (let i = 0; i < untranslated.length; i += this.batchSize) {
                const batch = untranslated.slice(i, i + this.batchSize);
                console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}...`);

                for (const item of batch) {
                    const success = await this.translateNewsItem(item);
                    if (success) {
                        processed++;
                    } else {
                        failed++;
                    }
                }

                // Delay between batches to avoid rate limiting
                if (i + this.batchSize < untranslated.length) {
                    await this.delay(2000);
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n✅ Translation worker completed in ${duration}s`);
            console.log(`   Processed: ${processed}, Failed: ${failed}`);

            return { processed, failed };

        } catch (error) {
            console.error('❌ Translation worker failed:', error);
            throw error;
        }
    }

    /**
     * Get untranslated news items from database
     * @param {number} limit - Maximum number of items to fetch
     * @returns {Promise<Array>}
     */
    async getUntranslatedNews(limit) {
        const result = await db.query(`
            SELECT id, title, content, original_content, original_language
            FROM news
            WHERE (translated_content_ko IS NULL OR summary_ko IS NULL)
              AND (content IS NOT NULL OR original_content IS NOT NULL)
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);

        return result.rows;
    }

    /**
     * Translate a single news item
     * @param {object} item - News item to translate
     * @returns {Promise<boolean>} - Success status
     */
    async translateNewsItem(item) {
        try {
            console.log(`  🔄 Translating: ${item.title.substring(0, 50)}...`);

            const content = item.original_content || item.content;
            if (!content) {
                console.log('  ⚠️  No content to translate');
                return false;
            }

            // Detect language if not set
            let language = item.original_language;
            if (!language) {
                language = languageDetector.detectLanguage(content);
            }

            // Skip if already Korean
            if (language === 'ko') {
                console.log('  ✓ Already Korean, updating fields...');
                await db.query(`
                    UPDATE news
                    SET original_language = 'ko',
                        translated_content_ko = original_content,
                        summary_ko = COALESCE(summary_ko, summary),
                        is_translated = false
                    WHERE id = $1
                `, [item.id]);
                return true;
            }

            // Translate with retry
            const translatedContent = await this.translateWithRetry(content, language);
            if (!translatedContent) {
                return false;
            }

            // Generate Korean summary
            const koreanSummary = await summarizeKorean(translatedContent, item.title);

            // Update database
            await db.query(`
                UPDATE news
                SET original_language = $1,
                    original_content = $2,
                    translated_content_ko = $3,
                    summary_ko = $4,
                    is_translated = true
                WHERE id = $5
            `, [language, content, translatedContent, koreanSummary, item.id]);

            console.log(`  ✅ Successfully translated from ${language}`);
            return true;

        } catch (error) {
            console.error(`  ❌ Failed to translate item ${item.id}:`, error.message);
            return false;
        }
    }

    /**
     * Translate with retry logic
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language code
     * @returns {Promise<string|null>}
     */
    async translateWithRetry(text, sourceLanguage) {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await translator.translateToKorean(text, sourceLanguage);
            } catch (error) {
                console.log(`    Retry ${attempt}/${this.retryAttempts} failed`);
                if (attempt < this.retryAttempts) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        return null;
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get translation statistics
     * @returns {Promise<object>}
     */
    async getStats() {
        const result = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_translated = true THEN 1 END) as translated,
                COUNT(CASE WHEN is_translated = false OR is_translated IS NULL THEN 1 END) as untranslated,
                COUNT(CASE WHEN original_language = 'ko' THEN 1 END) as korean,
                COUNT(CASE WHEN original_language = 'en' THEN 1 END) as english,
                COUNT(CASE WHEN original_language NOT IN ('ko', 'en') THEN 1 END) as other_languages
            FROM news
        `);

        return result.rows[0];
    }
}

// If run directly
if (require.main === module) {
    (async () => {
        const worker = new TranslationWorker();

        // Show stats before
        console.log('\n📊 Translation Statistics (Before):');
        const statsBefore = await worker.getStats();
        console.log(`   Total: ${statsBefore.total}`);
        console.log(`   Translated: ${statsBefore.translated}`);
        console.log(`   Untranslated: ${statsBefore.untranslated}`);
        console.log(`   Korean: ${statsBefore.korean}`);
        console.log(`   English: ${statsBefore.english}`);
        console.log(`   Other: ${statsBefore.other_languages}\n`);

        // Run translation
        const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
        await worker.run(limit);

        // Show stats after
        console.log('\n📊 Translation Statistics (After):');
        const statsAfter = await worker.getStats();
        console.log(`   Total: ${statsAfter.total}`);
        console.log(`   Translated: ${statsAfter.translated}`);
        console.log(`   Untranslated: ${statsAfter.untranslated}`);
        console.log(`   Korean: ${statsAfter.korean}`);
        console.log(`   English: ${statsAfter.english}`);
        console.log(`   Other: ${statsAfter.other_languages}`);

        process.exit(0);
    })().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = TranslationWorker;
