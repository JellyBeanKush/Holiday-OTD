import { GoogleGenAI } from "@google/genai";

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

        // 2. Get Holiday Data (using Text Model)
        const textResult = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: `Today is ${dayMonth}. Identify a fun national holiday. Return ONLY JSON: {"holiday": "Name", "fact": "One sentence fun fact"}` }] }]
        });
        
        const data = JSON.parse(textResult.text.replace(/```json|```/g, ""));

        // 3. Generate Image (using dedicated Image Model)
        const imgPrompt = `A vibrant digital illustration for "${data.holiday}". Text: "${data.holiday}" in bold white at the top. Characters: A small, round, yellow bear with a cream belly and a cheerful pink pill-shaped jellybean wearing a teal baseball cap. Gaming aesthetic.`;

        const imageResult = await client.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: imgPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1'
            }
        });

        // 4. Convert the image data into a physical File/Blob
        const base64Data = imageResult.generatedImages[0].image.imageBytes;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

        // 5. Package it all up for Discord
        const formData = new FormData();
        
        // Attach the image file!
        formData.append('file', blob, 'doodle.jpg');

        // Note: \n instead of \n\n to remove the double space!
        const payload = {
            content: `**${dateHeader}**\n# ${data.holiday.toUpperCase()}\n${data.fact}`,
            embeds: [{
                // Tell Discord to look at the attached file we just made
                image: { url: 'attachment://doodle.jpg' },
                color: 0x00FFFF
            }]
        };

        formData.append('payload_json', JSON.stringify(payload));

        // Send to Discord
        const res = await fetch(CONFIG.DISCORD_URL, {
            method: 'POST',
            body: formData
        });

        if (res.ok) console.log(`Successfully posted ${data.holiday} with image!`);
        else console.error("Discord Error:", await res.text());

    } catch (err) {
        console.error("Critical Bot Error:", err);
        process.exit(1);
    }
}

main();
