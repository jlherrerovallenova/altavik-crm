
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
    const models = Array.isArray(response) ? response : (response.models || []);
    console.log("Model Names:", models.map(m => m.name).join(', '));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
