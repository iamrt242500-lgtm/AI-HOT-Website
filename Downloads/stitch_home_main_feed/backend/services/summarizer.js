const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Summarize news content using OpenAI GPT-4
 * @param {string} content - Full news content
 * @param {string} title - News title
 * @param {boolean} forceKorean - Force Korean output regardless of input language
 * @returns {Promise<string>} - Summarized content (2-3 sentences)
 */
const summarizeNews = async (content, title, forceKorean = false) => {
    try {
        if (content && content.length < 200) {
            return content;
        }

        const prompt = `
        Summarize the following IT/AI news article into 2-3 concise sentences.
        Title: ${title}
        Content: ${content}
        
        ${forceKorean ? 'Output MUST be in Korean.' : 'Output should be in the same language as the content.'}
        Tone: Professional tech news.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error) {
        console.error('Summarization error:', error);
        if (content) {
            return content.substring(0, 200) + '...';
        }
        return title;
    }
};

const summarizeKorean = async (content, title) => {
    try {
        if (!content || content.length < 200) {
            return content || title;
        }

        const prompt = `
        다음 IT/AI 뉴스 기사를 한국어로 3~5문장으로 요약해주세요.
        
        제목: ${title}
        본문: ${content}
        
        규칙:
        1. 핵심 내용 위주로 간결하게 작성
        2. 기술 용어는 원어 병기 또는 업계 통용어 사용
        3. "~함", "~임" 등의 개조식 어미 대신 "~다"로 끝나는 문장 사용
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error) {
        console.error('Korean summarization error:', error);
        return title;
    }
};

/**
 * Batch summarize multiple news items
 * @param {Array} newsItems - Array of news objects with title and content
 * @returns {Promise<Array>} - News items with summaries
 */
const summarizeBatch = async (newsItems) => {
    try {
        const summaries = [];
        for (const item of newsItems) {
            const summary = await summarizeNews(item.content || item.title, item.title);
            summaries.push(summary);
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return newsItems.map((item, index) => ({
            ...item,
            summary: summaries[index]
        }));
    } catch (error) {
        console.error('Batch summarization error:', error);
        return newsItems;
    }
};

/**
 * Extract tags from content using Gemini
 * @param {string} content - News content
 * @param {string} title - News title
 * @returns {Promise<Array<string>>} - Array of tags
 */
const extractTags = async (content, title) => {
    try {
        const prompt = `
        Extract 3-5 relevant tags/keywords from this tech news.
        Title: ${title}
        Content: ${content ? content.substring(0, 500) : ''}
        
        Output format: comma-separated list (e.g. AI, Machine Learning, Google)
        Do not add any other text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // Parse comma-separated tags
        return text.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    } catch (error) {
        console.error('Tag extraction error:', error);
        return ['Tech', 'News'];
    }
};

module.exports = {
    summarizeNews,
    summarizeKorean,
    summarizeBatch,
    extractTags
};
