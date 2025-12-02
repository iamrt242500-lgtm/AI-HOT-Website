/**
 * Language Detection Utility
 * Detects the language of a given text
 */

/**
 * Detect if text is primarily Korean
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if text contains Korean characters
 */
function isKorean(text) {
    if (!text) return false;

    // Korean Hangul Unicode range: AC00-D7AF
    // Korean Jamo Unicode range: 1100-11FF, 3130-318F
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    return koreanRegex.test(text);
}

/**
 * Detect if text is primarily Japanese
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if text contains Japanese characters
 */
function isJapanese(text) {
    if (!text) return false;

    // Japanese Hiragana: 3040-309F
    // Japanese Katakana: 30A0-30FF
    // Japanese Kanji: 4E00-9FAF
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
}

/**
 * Detect if text is primarily Chinese
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if text contains Chinese characters
 */
function isChinese(text) {
    if (!text) return false;

    // Chinese characters (CJK Unified Ideographs)
    // Check if it has Chinese but not Japanese kana
    const chineseRegex = /[\u4E00-\u9FFF]/;
    return chineseRegex.test(text) && !isJapanese(text);
}

/**
 * Detect language code from text
 * @param {string} text - Text to analyze
 * @returns {string} - Language code: 'ko', 'ja', 'zh', 'en', etc.
 */
function detectLanguage(text) {
    if (!text || typeof text !== 'string') {
        return 'en'; // Default to English
    }

    // Sample first 500 characters for performance
    const sample = text.substring(0, 500);

    // Count Korean characters
    const koreanMatches = sample.match(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/g);
    const koreanCount = koreanMatches ? koreanMatches.length : 0;

    // Count Japanese kana characters
    const japaneseMatches = sample.match(/[\u3040-\u309F\u30A0-\u30FF]/g);
    const japaneseCount = japaneseMatches ? japaneseMatches.length : 0;

    // Count CJK characters (could be Chinese or Japanese Kanji)
    const cjkMatches = sample.match(/[\u4E00-\u9FFF]/g);
    const cjkCount = cjkMatches ? cjkMatches.length : 0;

    // Determine language based on character counts
    const totalLength = sample.length;
    const threshold = 0.1; // 10% of characters

    // Korean has priority if detected
    if (koreanCount / totalLength > threshold) {
        return 'ko';
    }

    // Japanese if kana is present (distinguishes from Chinese)
    if (japaneseCount / totalLength > threshold) {
        return 'ja';
    }

    // Chinese if CJK without kana
    if (cjkCount / totalLength > threshold && japaneseCount === 0) {
        return 'zh';
    }

    // Check for common European languages
    // Spanish/Portuguese accented characters
    if (/[áéíóúñü]/i.test(sample)) {
        return 'es'; // Could be Spanish or Portuguese, default to Spanish
    }

    // French accented characters
    if (/[àâæçèéêëîïôœùûü]/i.test(sample)) {
        return 'fr';
    }

    // German specific characters
    if (/[äöüß]/i.test(sample)) {
        return 'de';
    }

    // Default to English if no specific language detected
    return 'en';
}

/**
 * Get language name from language code
 * @param {string} code - Language code
 * @returns {string} - Language name
 */
function getLanguageName(code) {
    const languageNames = {
        'ko': '한국어',
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch',
        'pt': 'Português',
        'ru': 'Русский',
        'ar': 'العربية'
    };

    return languageNames[code] || code.toUpperCase();
}

/**
 * Check if translation is needed (i.e., not Korean)
 * @param {string} languageCode - Detected language code
 * @returns {boolean} - True if translation to Korean is needed
 */
function needsTranslation(languageCode) {
    return languageCode !== 'ko';
}

module.exports = {
    isKorean,
    isJapanese,
    isChinese,
    detectLanguage,
    getLanguageName,
    needsTranslation
};
