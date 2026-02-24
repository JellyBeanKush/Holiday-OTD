import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

const CONFIG = {
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    // Using your specific webhook and thread ID from the logs
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    try {
        const client = new GoogleGenAI({ apiKey: CONFIG.GEMINI_KEY });
        const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

        const now = new Date();
        const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        const dateHeader = pstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // 1. Generate Holiday Data
        const prompt = `Today is ${dateHeader}. Identify a fun national holiday for today. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}`;
        const textResult = await model.generateContent(prompt);
        const data = JSON.parse(textResult.response.text().replace(/```json|```/g, ""));

        // 2. Generate Image URL with your specific characters
        // Note: Using your requested character descriptions for the yellow bear and teal-capped jellybean
        const imgPrompt = `Vibrant digital art for ${data.holiday}. A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. High quality, 2d vector style, solid background.`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`;

        // 3. Download the image into memory
        console.log(`Downloading image for ${data.holiday}...`);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error("Failed to download image from API");
        
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBlob = new Blob([arrayBuffer], { type: 'image/png' });

        // 4. Build the Multipart Form Data for Discord
        const formData = new FormData();
        const payload = {
            content: `**${dateHeader}**\n# ${data.holiday.toUpperCase()}\n${data.fact}`,
        };

        formData.set('payload_json', JSON.stringify(payload));
        formData.set('files[0]', imageBlob, 'holiday_art.png');

        // 5. Post to Discord
        const res = await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            console.log(`✅ Successfully posted ${data.holiday} with image attachment!`);
        } else {
            const errorText = await res.text();
            console.error("❌ Discord Webhook Error:", errorText);
        }

    } catch (err) {
        console.error("❌ Critical Bot Error:", err);
        process.exit(1);
    }
}

main();
