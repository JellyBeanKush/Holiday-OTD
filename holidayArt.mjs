import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    try {
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        
        // 1. Force West Coast (PST) Time
        const now = new Date();
        const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        
        const dateHeader = pstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const dayMonth = pstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        // 2. Get Holiday Data 
        const textResult = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Today is ${dayMonth}. Identify a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}`
        });
        
        const data = JSON.parse(textResult.text.replace(/```json|```/g, ""));

        // 3. Generate the Image using a Free API (Pollinations.ai)
        // We use the holiday name to build a custom prompt URL
        const imgPrompt = `A vibrant digital illustration for ${data.holiday}. A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. Gaming aesthetic.`;
        
        // Encode the prompt so it can be safely used in a URL
        const safePrompt = encodeURIComponent(imgPrompt);
        // Add a random seed so it generates a new image every time
        const randomSeed = Math.floor(Math.random() * 100000);
        const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?seed=${randomSeed}&width=1024&height=1024&nologo=true`;

        // 4. Package it up for Discord
        // Note: We don't need to download the image, Discord will automatically embed this URL!
        const payload = {
            content: `**${dateHeader}**\n# ${data.holiday.toUpperCase()}\n${data.fact}`,
            embeds: [{
                image: { url: imageUrl },
                color: 0x00FFFF
            }]
        };

        const res = await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) console.log(`Successfully posted ${data.holiday} with image!`);
        else console.error("Discord Error:", await res.text());

    } catch (err) {
        console.error("Critical Bot Error:", err);
        process.exit(1);
    }
}

main();
