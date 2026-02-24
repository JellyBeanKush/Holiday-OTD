import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function generateWithFallback(genAI, prompt, isImage = false) {
    // List of models to try in order
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
    
    for (const modelName of models) {
        try {
            console.log(`Attempting with ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            
            if (isImage) {
                // Return the part containing image data
                return result.response.candidates[0].content.parts.find(p => p.inlineData || p.fileData);
            }
            return result.response.text();
        } catch (error) {
            if (error.status === 429) {
                console.warn(`Rate limit hit on ${modelName}. Retrying with next model in 10s...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                throw error; // Re-throw if it's not a rate limit issue
            }
        }
    }
    throw new Error("All models failed due to rate limits.");
}

async function main() {
    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    // 1. Get Holiday Data (with Fallback)
    const infoPrompt = `Today is ${dateStr}. Identify a fun national holiday for today. 
    Return JSON format: {"holiday": "Name", "fact": "One sentence fun fact"}`;
    
    const textResponse = await generateWithFallback(genAI, infoPrompt);
    const data = JSON.parse(textResponse.replace(/```json|```/g, ""));

    // 2. Generate Image (with Fallback)
    const imgPrompt = `A high-quality digital illustration for "${data.holiday}". 
    The text "${data.holiday}" must be clearly written in a bold, clean, stylized font at the top. 
    Include two central characters: a small, round, vibrant yellow bear with a cream-colored belly patch 
    and a cheerful, pill-shaped pink jellybean character wearing a signature teal baseball cap. 
    The duo is celebrating ${data.holiday} in a vibrant gaming-themed environment.
    Ensure the text is spelled exactly as "${data.holiday}".`;

    const imageUrl = await generateWithFallback(genAI, [imgPrompt], true);

    // 3. Post to Discord
    const payload = {
        embeds: [{
            title: `🎨 Daily Doodle: ${data.holiday}`,
            description: `**Did you know?** ${data.fact}`,
            image: { url: imageUrl },
            color: 0x00FFFF
        }]
    };

    await fetch(CONFIG.DISCORD_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });

    console.log(`Successfully posted ${data.holiday}!`);
}

main().catch(console.error);
