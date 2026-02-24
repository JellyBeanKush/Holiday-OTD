import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: process.env.DISCORD_HOLIDAY_WEBHOOK
};

async function main() {
    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
    // Use the latest model for better reasoning
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 1. Get Today's Holiday
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const infoPrompt = `Today is ${dateStr}. Identify the most fun national holiday. 
    Return JSON: {"holiday": "Name", "fact": "One sentence fun fact"}`;
    
    const infoResult = await model.generateContent(infoPrompt);
    const data = JSON.parse(infoResult.response.text().replace(/```json|```/g, ""));

    // 2. The Updated Default Image Prompt
    const imgPrompt = `A high-quality digital illustration for "${data.holiday}". 
    The text "${data.holiday}" must be written in a bold, clean, stylized font at the top of the image. 
    Include two central characters: a small, round, vibrant yellow bear with a cream-colored belly patch 
    and a cheerful, pill-shaped pink jellybean character wearing a signature teal baseball cap. 
    The duo is celebrating ${data.holiday} in a cozy gaming room with neon lighting. 
    Ensure the text is spelled exactly as "${data.holiday}".`;

    // 3. Generate Image (Assuming the Nano-integrated model)
    const imageResult = await model.generateContent([imgPrompt]);
    const imageUrl = imageResult.response.candidates[0].content.parts.find(p => p.inlineData || p.fileData);

    // 4. Send to Discord
    const payload = {
        embeds: [{
            title: `📅 ${data.holiday}`,
            description: data.fact,
            image: { url: imageUrl },
            color: 0xFFD700 // Golden Yellow
        }]
    };

    await fetch(CONFIG.DISCORD_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
}

main();
