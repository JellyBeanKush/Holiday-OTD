import { GoogleGenAI } from "@google/genai"; // The new 2026 import
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    try {
        // Initialize the new 2026 Client
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        // 1. Get Holiday Data
        const textResult = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: `Today is ${dateStr}. Pick a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}` }] }]
        });
        
        const data = JSON.parse(textResult.text.replace(/```json|```/g, ""));

        // 2. Generate Image
        const imgPrompt = `A vibrant digital illustration for "${data.holiday}". 
        Text: "${data.holiday}" in bold white font at the top. 
        Characters: A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. 
        Style: Gaming aesthetic. NO other text.`;

        const imageResult = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: imgPrompt }] }]
        });

        // Extract image (Handling the new 2026 response format)
        const imagePart = imageResult.candidates[0].content.parts.find(p => p.inlineData || p.fileData);
        let imageUrl = imagePart?.inlineData 
            ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
            : "https://via.placeholder.com/512.png?text=Image+Error";

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

        if (res.ok) console.log(`Successfully posted: ${data.holiday}`);
        else console.error("Discord Error:", await res.text());

    } catch (err) {
        console.error("Bot Error:", err);
        process.exit(1);
    }
}

main();
