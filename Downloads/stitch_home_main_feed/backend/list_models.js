const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // For some reason listModels is not directly exposed on genAI instance in some versions,
        // but let's try the standard way if available or just try a known model.
        // Actually, the SDK doesn't have a simple listModels method on the top level client in all versions.
        // But let's try to just run a simple generation with 'gemini-pro' again and print the FULL error object.

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Success with gemini-pro:", response.text());
    } catch (error) {
        console.error("Error with gemini-pro:", error);
    }
}

listModels();
