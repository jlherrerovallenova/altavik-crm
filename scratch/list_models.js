import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("No API key found in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    const response = await ai.models.list();
    let names = [];
    if (response.models) {
      names = response.models.map(m => m.name);
    } else {
      for await (const m of response) {
        names.push(m.name);
      }
    }
    console.log("Model Names:", names.join('\n'));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
