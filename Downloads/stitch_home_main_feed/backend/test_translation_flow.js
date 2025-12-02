require('dotenv').config();
const translator = require('./services/translator');
const { summarizeKorean } = require('./services/summarizer');
const languageDetector = require('./utils/languageDetector');

async function testSystem() {
    console.log('🚀 Starting System Stability Test (Isolated)...');

    // Test Data
    const testArticle = {
        title: "The Future of AI Agents",
        content: "Artificial Intelligence agents are becoming increasingly autonomous. They can plan, execute, and verify tasks without human intervention. This shift represents a major milestone in computer science history."
    };

    try {
        // 1. Language Detection
        console.log('\n1️⃣  Testing Language Detection...');
        const lang = languageDetector.detectLanguage(testArticle.content);
        console.log(`   Detected: ${lang}`);
        if (lang !== 'en') throw new Error('Language detection failed');
        console.log('   ✅ Passed');

        // 2. Translation
        console.log('\n2️⃣  Testing Translation (Gemini)...');
        console.log('   Translating to Korean...');
        const translated = await translator.translateToKorean(testArticle.content, lang);
        console.log(`   Result: ${translated.substring(0, 50)}...`);
        if (!translated || translated === testArticle.content) throw new Error('Translation failed');
        console.log('   ✅ Passed');

        // 3. Summarization
        console.log('\n3️⃣  Testing Summarization...');
        const summary = await summarizeKorean(translated, testArticle.title);
        console.log(`   Result: ${summary}`);
        if (!summary) throw new Error('Summarization failed');
        console.log('   ✅ Passed');

        console.log('\n✨ System Logic Verification Complete: STABLE');

    } catch (error) {
        console.error('\n❌ System Test Failed:', error);
        process.exit(1);
    }
}

testSystem();
