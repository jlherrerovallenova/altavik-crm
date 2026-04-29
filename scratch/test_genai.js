import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || 'fake-key';
  const ai = new GoogleGenAI({ apiKey });
  console.log("ai instance created");
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'hola' }] }]
    });
    console.log(result.text);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
