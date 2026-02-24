import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    try {
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        const now = new Date();
        const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        const dateHeader = pstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // 1. Get Holiday Data
        const textResult = await client.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(
            `Today is February 23. Identify a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}`
        );
        const data = JSON.parse(textResult.response.text().replace(/```json|```/g, ""));

        // 2. Generate Image URL (Characters: small yellow bear + pink pill-shaped jellybean)
        const imgPrompt = `Vibrant digital art for ${data.holiday}. A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. High quality, 2d vector style.`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`;

        // 3. PHYSICAL DOWNLOAD (The secret sauce)
        console.log("Downloading generated image...");
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBlob = new Blob([arrayBuffer], { type: 'image/png' });

        // 4. Upload to Discord as an attachment
        const formData = new FormData();
        const payload = {
            content: `**${dateHeader}**\n# ${data.holiday.toUpperCase()}\n${data.fact}`,
        };

        formData.set('payload_json', JSON.stringify(payload));
        formData.set('files[0]', imageBlob, 'holiday_art.png');

        const res = await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            body: formData
        });

        if (res.ok) console.log(`✅ Successfully posted ${data.holiday} with direct image upload!`);
        else console.error("❌ Discord Error:", await res.text());

    } catch (err) {
        console.error("❌ Critical Bot Error:", err);
        process.exit(1);
    }
}

main();
