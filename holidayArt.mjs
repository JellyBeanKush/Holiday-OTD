import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function generateWithUltimateFallback(client, options, isImage = false) {
    // 2026 Stable Model Strings
    const modelTiers = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
    
    for (const modelName of modelTiers) {
        try {
            console.log(`Checking ${modelName}...`);
            const result = await client.models.generateContent({
                ...options,
                model: modelName
            });

            if (isImage) {
                const part = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.fileData);
                if (!part) continue;
                return part;
            }
            return result.text;
        } catch (err) {
            // If quota is exhausted (429) or model name is slightly off in this region (404), move to next
            if (err.status === 429 || err.status === 404) {
                console.warn(`${modelName} unavailable. Pivoting to next tier...`);
                await new Promise(r => setTimeout(r, 2000));
                continue; 
            }
            throw err;
        }
    }
    throw new Error("All model tiers (2.5 and 2.0) are currently exhausted.");
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

        // 2. Generate Image with character descriptions
        const imgPrompt = `A vibrant digital illustration for "${data.holiday}". 
        Text: "${data.holiday}" in bold white at the top. 
        Characters: A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. 
        Style: Gaming aesthetic. NO other text.`;

        const imagePart = await generateWithUltimateFallback(client, {
            contents: [{ role: "user", parts: [{ text: imgPrompt }] }]
        }, true);

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
                    description: `**Did you know?** ${data.fact}`,
                    image: { url: imageUrl },
                    color: 0x00FFFF
                }]
            })
        });

        console.log(`Successfully posted: ${data.holiday}`);

    } catch (err) {
        console.error("Critical Bot Error:", err.message);
        process.exit(1);
    }
}

main();
