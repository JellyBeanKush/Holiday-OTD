import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function main() {
    try {
        console.log("🎨 Determining today's holiday and generating art...");

        // 1. Generate the Image Prompt using Gemini
        // Today is Feb 23: National Dog Biscuit Day
        const promptSystem = `Today is February 23, National Dog Biscuit Day. 
        Create a detailed prompt for an image generator featuring two characters:
        1. A small, round, yellow bear with a cream-colored belly.
        2. A pink, pill-shaped jellybean character wearing a teal baseball cap.
        
        They should be celebrating the holiday by baking giant, gourmet dog biscuits in a cozy, 
        vibrant kitchen surrounded by happy, cartoonish dogs. The style should be 3D-render, 
        whimsical, and high-quality. Do not use any names for the characters.`;

        const textResponse = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: promptSystem
        });

        const imagePrompt = textResponse.text;
        console.log("✨ Generated Prompt:", imagePrompt);

        // 2. Generate the Image using Imagen
        const imageResult = await client.models.generateImages({
            model: 'imagen-3',
            prompt: imagePrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1'
            }
        });

        const imageBase64 = imageResult.generatedImages[0].imageBinary; // Base64 string
        const imageBuffer = Buffer.from(imageBase64, 'base64');

        // 3. Send to Discord via Webhook
        const form = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        
        form.append('file', blob, 'holiday_art.png');
        form.append('payload_json', JSON.stringify({
            content: `🐶 **Happy National Dog Biscuit Day!** 🍪\nGenerated for today's stream art!`,
        }));

        const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            body: form
        });

        if (discordResponse.ok) {
            console.log("✅ Art successfully posted to Discord!");
        } else {
            console.error("❌ Discord Error:", await discordResponse.text());
        }

    } catch (error) {
        console.error("❌ Critical Bot Error:", error);
        process.exit(1);
    }
}

main();
