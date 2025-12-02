const cron = require('node-cron');
const newsCollector = require('../workers/newsCollector');

class Scheduler {
    constructor() {
        this.jobs = [];
    }

    /**
     * Start all scheduled jobs
     */
    start() {
        // Collect news every 5 minutes
        const collectionInterval = parseInt(process.env.COLLECTION_INTERVAL_MINUTES) || 5;
        const newsCollectionJob = cron.schedule(`*/${collectionInterval} * * * *`, async () => {
            console.log(`\n⏰ [${new Date().toISOString()}] Running scheduled news collection`);
            try {
                await newsCollector.run();
            } catch (error) {
                console.error('Scheduled news collection failed:', error);
            }
        });

        this.jobs.push({ name: 'News Collection', job: newsCollectionJob });

        // Clean old news every day at midnight
        const cleanupJob = cron.schedule('0 0 * * *', async () => {
            console.log(`\n🧹 [${new Date().toISOString()}] Running news cleanup`);
            try {
                await this.cleanOldNews();
            } catch (error) {
                console.error('News cleanup failed:', error);
            }
        });

        this.jobs.push({ name: 'News Cleanup', job: cleanupJob });

        console.log(`✅ Scheduler started with ${this.jobs.length} jobs`);
    }

    /**
     * Stop all scheduled jobs
     */
    stop() {
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`⏹️  Stopped job: ${name}`);
        });
    }

    /**
     * Clean old news from database
     */
    async cleanOldNews() {
        const db = require('../db');
        const retentionDays = parseInt(process.env.NEWS_RETENTION_DAYS) || 30;

        try {
            const result = await db.query(`
        DELETE FROM news
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      `);

            console.log(`🗑️  Cleaned ${result.rowCount} old news items (older than ${retentionDays} days)`);
        } catch (error) {
            console.error('Error cleaning old news:', error);
        }
    }
}

module.exports = new Scheduler();
