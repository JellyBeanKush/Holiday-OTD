import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

// This function tries every available model tier before giving up
async function generateWithUltimateFallback(client, options, isImage = false) {
    const modelTiers = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
    
    for (const modelName of modelTiers) {
        try {
            console.log(`Checking ${modelName}...`);
            const result = await client.models.generateContent({
                ...options,
                model: modelName
            });

            if (isImage) {
                const part = result.candidates[0].content.parts.find(p => p.inlineData || p.fileData);
                if (!part) continue; // Try next model if no image generated
                return part;
            }
            return result.text;
        } catch (err) {
            if (err.status === 429) {
                console.warn(`${modelName} quota full. Trying next tier...`);
                await new Promise(r => setTimeout(r, 2000)); // Short 2s breather
                continue; 
            }
            throw err;
        }
    }
    throw new Error("All Gemini models are currently exhausted. Try again in 1 hour.");
}

async function main() {
    try {
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        // 1. Get Holiday Data
        const textResponse = await generateWithUltimateFallback(client, {
            contents: [{ role: "user", parts: [{ text: `Today is ${dateStr}. Pick a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}` }] }]
        });
        
        const data = JSON.parse(textResponse.replace(/```json|```/g, ""));

        // 2. Generate Image
        const imgPrompt = `A vibrant digital illustration for "${data.holiday}". Text: "${data.holiday}" in bold white font at the top. Characters: A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. Style: Gaming aesthetic.`;

        const imagePart = await generateWithUltimateFallback(client, {
            contents: [{ role: "user", parts: [{ text: imgPrompt }] }]
        }, true);

        let imageUrl = imagePart?.inlineData 
            ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
            : "https://via.placeholder.com/512.png?text=Art+Rendering+Delayed";

        // 3. Post to Discord
        const res = await fetch(CONFIG.DISCORD_URL, {
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

        if (res.ok) console.log(`Post Successful for ${data.holiday}!`);
        else console.error("Discord Error:", await res.text());

    } catch (err) {
        console.error("Critical Bot Error:", err.message);
        process.exit(1);
    }
}

main();
