/**
 * Migration: Add user_settings table for user preferences
 */

const db = require('../index');

async function migrate() {
    try {
        console.log('Running migration: Add user_settings table...');

        // Create user_settings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                language VARCHAR(10) DEFAULT 'en',
                auto_translate BOOLEAN DEFAULT true,
                theme_mode VARCHAR(10) DEFAULT 'dark',
                priority_topics TEXT[] DEFAULT '{}',
                notifications_enabled BOOLEAN DEFAULT true,
                news_sort_preference VARCHAR(20) DEFAULT 'latest',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ user_settings table created');

        // Create index
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
        `);

        console.log('✅ index created on user_settings.user_id');

        // Add updated_at trigger
        try {
            await db.query(`
                CREATE TRIGGER update_user_settings_updated_at
                    BEFORE UPDATE ON user_settings
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column()
            `);
            console.log('✅ trigger created for user_settings.updated_at');
        } catch (err) {
            if (!err.message.includes('already exists')) {
                throw err;
            }
            console.log('⚠️  trigger already exists');
        }

        // Update users table to add nickname and profile_image_url if not exists
        await db.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
            ADD COLUMN IF NOT EXISTS profile_image_url TEXT
        `);

        console.log('✅ users table columns added (nickname, profile_image_url)');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate().then(() => process.exit(0));
}

module.exports = migrate;
