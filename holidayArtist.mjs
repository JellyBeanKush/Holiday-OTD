import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import fs from 'fs';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: process.env.DISCORD_HOLIDAY_WEBHOOK, 
    SAVE_FILE: 'current_holiday.txt',
    MODELS: ["gemini-2.5-flash", "gemini-1.5-flash"]
};

async function main() {
    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // 1. Get the best holiday for today
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const holidaySearch = await model.generateContent(`List the most prominent national or international holiday for ${todayFormatted}. 
    Pick the one that would make the coolest gaming-style art. 
    Return ONLY the name of the holiday.`);
    const holidayName = (await holidaySearch.response.text()).trim();

    // 2. Generate the Image with Text
    const imgModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // We tell the AI exactly how to handle the text
    const imgPrompt = `A high-quality 3D render for "${holidayName}". 
    Avoid having any text on the image. Make sure there are no weird AI artifacts. 
    Aesthetic: Vibrant gaming setup, Twitch-inspired lighting, cozy but high-tech, cute and fun! 
    Include two central characters: a small, round, vibrant yellow bear with a cream-colored belly patch and a cheerful, pill-shaped pink jellybean character wearing a signature teal baseball cap. both characters have only two legs and two arms each.`;

    console.log(`Creating art for: ${holidayName}`);

    // This calls the Nano Banana engine via the 2.5 model
    const result = await imgModel.generateContent([imgPrompt]);
    const imageUrl = result.response.candidates[0].content.parts.find(p => p.inlineData || p.fileData);

    // 3. Post to Discord
    const payload = {
        embeds: [{
            title: `🎨 Today's Holiday: ${holidayName}`,
            image: { url: imageUrl }, 
            color: 0x00ffcc,
            footer: { text: `Generated for the community — ${todayFormatted}` }
        }]
    };

    await fetch(CONFIG.DISCORD_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
}

main().catch(err => console.error(err));
