import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function generateWithFallback(genAI, prompt, isImage = false) {
    // Correct 2026 Model Names
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
    
    for (const modelName of models) {
        try {
            console.log(`Attempting with ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            
            if (isImage) {
                const part = result.response.candidates[0].content.parts.find(p => p.inlineData || p.fileData);
                if (!part) throw new Error("No image data in response");
                return part;
            }
            return result.response.text();
        } catch (error) {
            if (error.status === 429 || error.status === 404) {
                console.warn(`Issue with ${modelName} (${error.status}). Trying next model...`);
                await new Promise(r => setTimeout(r, 2000));
            } else {
                throw error;
            }
        }
    }
    throw new Error("All models failed.");
}

async function main() {
    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    // 1. Get Holiday Text
    const infoPrompt = `Today is ${dateStr}. Identify a fun national holiday for today. 
    Return JSON format: {"holiday": "Name", "fact": "One sentence fun fact"}`;
    const textResponse = await generateWithFallback(genAI, infoPrompt);
    const data = JSON.parse(textResponse.replace(/```json|```/g, ""));

    // 2. Generate Image
    const imgPrompt = `Digital art for "${data.holiday}". 
    Text: "${data.holiday}" in bold white font at the top. 
    Characters: A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. 
    Style: Vibrant gaming aesthetic. NO other text.`;

    const imagePart = await generateWithFallback(genAI, [imgPrompt], true);
    
    // Convert image data for Discord
    let imageUrl = "";
    if (imagePart.inlineData) {
        imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    } else if (imagePart.fileData) {
        imageUrl = imagePart.fileData.fileUri;
    }

    // 3. Post to Discord
    const payload = {
        embeds: [{
            title: `🎨 Daily Doodle: ${data.holiday}`,
            description: data.fact,
            image: { url: imageUrl },
            color: 0x00FFFF
        }]
    };

    const res = await fetch(CONFIG.DISCORD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) console.log("Post successful!");
    else console.error("Discord Error:", await res.text());
}

main().catch(console.error);
