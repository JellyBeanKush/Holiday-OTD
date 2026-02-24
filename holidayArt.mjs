import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function generateWithRetry(client, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await client.models.generateContent(options);
        } catch (err) {
            if (err.status === 429 && i < retries - 1) {
                console.log(`Rate limit hit. Waiting 10 seconds (Attempt ${i + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                throw err;
            }
        }
    }
}

async function main() {
    try {
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        // 1. Get Holiday Data (using Flash-Lite for better quota)
        const textResult = await generateWithRetry(client, {
            model: "gemini-2.0-flash-lite",
            contents: [{ role: "user", parts: [{ text: `Today is ${dateStr}. Pick a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}` }] }]
        });
        
        const data = JSON.parse(textResult.text.replace(/```json|```/g, ""));

        // 2. Generate Image
        const imgPrompt = `Vibrant digital art for "${data.holiday}". 
        Text: "${data.holiday}" in bold white at the top. 
        Characters: A small, round, yellow bear with a cream belly and a cheerful pink jellybean wearing a teal baseball cap. 
        Gaming aesthetic.`;

        const imageResult = await generateWithRetry(client, {
            model: "gemini-2.0-flash", // Image generation is best on standard Flash
            contents: [{ role: "user", parts: [{ text: imgPrompt }] }]
        });

        const imagePart = imageResult.candidates[0].content.parts.find(p => p.inlineData || p.fileData);
        let imageUrl = imagePart?.inlineData 
            ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
            : "https://via.placeholder.com/512.png?text=Art+Rendering...";

        // 3. Post to Discord
        await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: `🎨 Daily Doodle: ${data.holiday}`,
                    description: data.fact,
                    image: { url: imageUrl },
                    color: 0x00FFFF
                }]
            })
        });

        console.log(`Successfully posted: ${data.holiday}`);

    } catch (err) {
        console.error("Bot Error:", err.message);
        process.exit(1);
    }
}

main();
