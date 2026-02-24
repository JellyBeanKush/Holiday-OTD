import { OpenAI } from 'openai';
import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

const CONFIG = {
    OPENAI_KEY: process.env.OPENAI_API_KEY,
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    const holiday = "National Dog Biscuit Day";
    const dateHeader = "February 23, 2026";
    const fact = "Dog biscuits were invented in the 1800s by a butcher who accidentally made a hard, bone-shaped cookie!";
    
    // Character descriptions: Yellow bear (cream belly) + pink pill jellybean (teal cap)
    const prompt = `Vibrant digital art for ${holiday}. A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. They are celebrating with dogs. High quality 2d vector style.`;

    let imageBuffer;

    // --- STRATEGY 1: TRY OPENAI (DALL-E 3) ---
    try {
        console.log("🎨 Attempting OpenAI (DALL-E 3)...");
        const openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY });
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        });

        const imageRes = await fetch(response.data[0].url);
        imageBuffer = await imageRes.arrayBuffer();
        console.log("✅ OpenAI Success!");
    } catch (err) {
        console.error("⚠️ OpenAI Failed or Key Missing, falling back to Pollinations...");
        
        // --- STRATEGY 2: FALLBACK TO POLLINATIONS ---
        try {
            const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.random()}`;
            const pollRes = await fetch(pollUrl);
            
            if (!pollRes.ok) throw new Error("Pollinations also failed.");
            
            imageBuffer = await pollRes.arrayBuffer();
            
            // Safety check for the 16-byte error
            if (imageBuffer.byteLength < 100) throw new Error("Pollinations returned a broken file.");
            
            console.log("✅ Pollinations Fallback Success!");
        } catch (pollErr) {
            console.error("❌ All image providers failed.");
            return;
        }
    }

    // --- POST TO DISCORD ---
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    const payload = { content: `**${dateHeader}**\n# ${holiday.toUpperCase()}\n${fact}` };

    formData.set('payload_json', JSON.stringify(payload));
    formData.set('files[0]', imageBlob, 'holiday_art.png');

    const res = await fetch(CONFIG.DISCORD_URL, { method: 'POST', body: formData });
    if (res.ok) console.log("🎉 Post successful!");
}

main();
