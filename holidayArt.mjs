import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    try {
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        
        // FIX: Force West Coast (PST) time regardless of where the server is
        const now = new Date();
        const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        
        const dateHeader = pstDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        const dayMonth = pstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        // 1. Get Holiday Data
        const textResult = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: `Today is ${dayMonth}. Identify a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}` }] }]
        });
        
        const data = JSON.parse(textResult.text.replace(/```json|```/g, ""));

        // 2. Generate Image
        const imgPrompt = `A vibrant digital illustration for "${data.holiday}". 
        Text: "${data.holiday}" in bold white at the top. 
        Characters: A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. 
        Gaming aesthetic.`;

        const imageResult = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: imgPrompt }] }]
        });

        // FIX: Extracting the actual image file data
        const imagePart = imageResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.fileData);
        let imageUrl = "";
        
        if (imagePart?.inlineData) {
            imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }

        // 3. Post to Discord in the requested format
        const payload = {
            content: `**${dateHeader}**\n\n# ${data.holiday.toUpperCase()}\n${data.fact}`,
            embeds: imageUrl ? [{
                image: { url: imageUrl },
                color: 0x00FFFF
            }] : []
        };

        const res = await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) console.log(`Successfully posted for ${dateHeader}`);
        else console.error("Discord Error:", await res.text());

    } catch (err) {
        console.error("Critical Bot Error:", err.message);
        process.exit(1);
    }
}

main();
