const db = require('../index');

/**
 * Migration: Add translation and multi-language support fields to news table
 * Version: 001
 * Date: 2025-11-27
 */

async function up() {
    console.log('Running migration: 001_add_translation_fields');

    try {
        // Add new columns for translation support
        await db.query(`
            -- Author and source metadata
            ALTER TABLE news 
            ADD COLUMN IF NOT EXISTS author_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS source_name VARCHAR(100);
        `);

        await db.query(`
            -- Language and translation fields
            ALTER TABLE news 
            ADD COLUMN IF NOT EXISTS original_language VARCHAR(10) DEFAULT 'en',
            ADD COLUMN IF NOT EXISTS original_content TEXT,
            ADD COLUMN IF NOT EXISTS translated_content_ko TEXT,
            ADD COLUMN IF NOT EXISTS summary_ko TEXT,
            ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT false;
        `);

        await db.query(`
            -- Timestamp fields
            ALTER TABLE news 
            ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // Create indexes for better query performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_news_original_language ON news(original_language);
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_news_is_translated ON news(is_translated);
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
        `);

        // Migrate existing data
        console.log('Migrating existing data...');

        // Copy existing 'summary' to 'summary_ko' for Korean summaries
        await db.query(`
            UPDATE news 
            SET summary_ko = summary 
            WHERE summary_ko IS NULL AND summary IS NOT NULL;
        `);

        // Copy existing 'content' to 'original_content'
        await db.query(`
            UPDATE news 
            SET original_content = content 
            WHERE original_content IS NULL AND content IS NOT NULL;
        `);

        // Set source_name from source field
        await db.query(`
            UPDATE news 
            SET source_name = CASE 
                WHEN source = 'x' THEN 'X (Twitter)'
                WHEN source = 'medium' THEN 'Medium'
                WHEN source = 'reddit' THEN 'Reddit'
                WHEN source = 'facebook' THEN 'Facebook'
                WHEN source = 'instagram' THEN 'Instagram'
                ELSE source
            END
            WHERE source_name IS NULL;
        `);

        // Set published_at from created_at if not set
        await db.query(`
            UPDATE news 
            SET published_at = created_at 
            WHERE published_at IS NULL;
        `);

        // Set fetched_at from created_at if not set
        await db.query(`
            UPDATE news 
            SET fetched_at = created_at 
            WHERE fetched_at IS NULL;
        `);

        console.log('✅ Migration 001 completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Migration 001 failed:', error);
        throw error;
    }
}

async function down() {
    console.log('Rolling back migration: 001_add_translation_fields');

    try {
        // Drop indexes
        await db.query(`
            DROP INDEX IF EXISTS idx_news_original_language;
            DROP INDEX IF EXISTS idx_news_is_translated;
            DROP INDEX IF EXISTS idx_news_published_at;
        `);

        // Remove columns
        await db.query(`
            ALTER TABLE news 
            DROP COLUMN IF EXISTS author_name,
            DROP COLUMN IF EXISTS source_name,
            DROP COLUMN IF EXISTS original_language,
            DROP COLUMN IF EXISTS original_content,
            DROP COLUMN IF EXISTS translated_content_ko,
            DROP COLUMN IF EXISTS summary_ko,
            DROP COLUMN IF EXISTS is_translated,
            DROP COLUMN IF EXISTS published_at,
            DROP COLUMN IF EXISTS fetched_at;
        `);

        console.log('✅ Migration 001 rolled back successfully');
        return true;
    } catch (error) {
        console.error('❌ Migration 001 rollback failed:', error);
        throw error;
    }
}

// Allow running this migration directly
if (require.main === module) {
    (async () => {
        try {
            await up();
            process.exit(0);
        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    })();
}

module.exports = { up, down };
