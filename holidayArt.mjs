import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

const CONFIG = {
    // Your specific webhook and thread ID from your logs
    DISCORD_URL: "https://discord.com/api/webhooks/1475400524881854495/A2eo18Vsm-cIA0p9wN-XdB60vMdEcZ5PJ1MOGLD5sRDM1weRLRk_1xWKo5C7ANTzjlH2?thread_id=1475685722341245239"
};

async function main() {
    try {
        console.log("🚀 Running Quota-Proof version for Feb 23...");

        // 1. Hardcoded Holiday Data (Saves your API quota)
        const holiday = "National Dog Biscuit Day";
        const fact = "Dog biscuits were invented in the 1800s by a butcher who accidentally made a hard, bone-shaped cookie!";
        const dateHeader = "February 23, 2026";

        // 2. Generate Image via Pollinations (Free, No API Key needed)
        // Featuring: Small yellow bear + pink pill jellybean in a teal cap
        const imgPrompt = `Vibrant digital art for ${holiday}. A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. They are surrounded by dog treats. High quality, 2d vector style.`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`;

        // 3. Download the image
        console.log(`Downloading art for ${holiday}...`);
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBlob = new Blob([arrayBuffer], { type: 'image/png' });

        // 4. Build the post
        const formData = new FormData();
        const payload = {
            content: `**${dateHeader}**\n# ${holiday.toUpperCase()}\n${fact}`,
        };

        formData.set('payload_json', JSON.stringify(payload));
        formData.set('files[0]', imageBlob, 'holiday_art.png');

        // 5. Post to Discord
        const res = await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            console.log(`✅ SUCCESS! Check Discord for the ${holiday} art!`);
        } else {
            console.error("❌ Discord Error:", await res.text());
        }

    } catch (err) {
        console.error("❌ Error:", err);
    }
}

main();
