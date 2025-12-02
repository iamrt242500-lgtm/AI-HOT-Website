const { GoogleGenerativeAI } = require('@google/generative-ai');
const languageDetector = require('../utils/languageDetector');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const translator = {
    /**
     * Translate text to Korean using Gemini
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language code (optional)
     * @returns {Promise<string>} - Translated text
     */
    async translateToKorean(text, sourceLanguage = 'auto') {
        try {
            if (!text) return '';

            // Skip if already Korean
            if (sourceLanguage === 'ko' || languageDetector.isKorean(text)) {
                return text;
            }

            const prompt = `
            Translate the following technical news content into natural, professional Korean.
            
            Rules:
            1. Maintain a professional tech news tone.
            2. Keep technical terms (e.g., AI, LLM, API, Framework) in English if they are commonly used in the industry.
            3. Translate "Generative AI" as "생성형 AI".
            4. Do not add any explanatory text, just the translation.
            
            Content to translate:
            ${text}
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();

        } catch (error) {
            console.error('Translation error:', error.message);
            // Fallback to original text if translation fails
            return text;
        }
    },

    /**
     * Translate title to Korean
     * @param {string} title - Title to translate
     * @returns {Promise<string>} - Translated title
     */
    async translateTitle(title) {
        try {
            if (!title) return '';
            if (languageDetector.isKorean(title)) return title;

            const prompt = `Translate this news headline to Korean. Keep it concise and impactful. Maintain technical terms in English if appropriate.\n\nHeadline: "${title}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().replace(/^["']|["']$/g, '').trim(); // Remove quotes if present

        } catch (error) {
            console.error('Title translation error:', error.message);
            return title;
        }
    },

    /**
     * Retries translation with exponential backoff.
     * @param {string} text - Text to translate.
     * @param {string} sourceLang - Source language code.
     * @param {number} retries - Number of retry attempts.
     * @returns {Promise<string>} - Translated text.
     */
    async translateWithRetry(text, sourceLang, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.translateToKorean(text, sourceLang);
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    },

    /**
     * Batch translate items
     * @param {Array} items - Array of items with content/title
     * @returns {Promise<Array>} - Items with translated fields
     */
    async translateBatch(items) {
        const translatedItems = [];
        for (const item of items) {
            try {
                const translatedContent = await this.translateToKorean(item.content || item.title);
                const translatedTitle = await this.translateTitle(item.title);

                translatedItems.push({
                    ...item,
                    translated_content_ko: translatedContent,
                    title_ko: translatedTitle,
                    is_translated: true
                });

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Batch translation failed for item ${item.title}:`, error);
                translatedItems.push({ ...item, is_translated: false });
            }
        }
        return translatedItems;
    },

    /**
     * Smart translate: detect language and translate if needed
     * @param {string} text - Text to translate
     * @returns {Promise<{originalLanguage: string, translatedText: string, isTranslated: boolean}>}
     */
    async smartTranslate(text) {
        try {
            const detectedLanguage = languageDetector.detectLanguage(text);
            const needsTranslation = languageDetector.needsTranslation(detectedLanguage);

            if (!needsTranslation) {
                return {
                    originalLanguage: detectedLanguage,
                    translatedText: text,
                    isTranslated: false
                };
            }

            const translatedText = await this.translateWithRetry(text, detectedLanguage);

            return {
                originalLanguage: detectedLanguage,
                translatedText,
                isTranslated: true
            };
        } catch (error) {
            console.error('Smart translate error:', error);
            return {
                originalLanguage: 'en',
                translatedText: text,
                isTranslated: false
            };
        }
    }
};

module.exports = translator;
