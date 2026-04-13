
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function list() {
  try {
    const list = await genAI.models.list();
    // list es un objeto que contiene una propiedad 'models' o es un iterable
    for await (const model of list) {
       console.log(`FOUND: ${model.name}`);
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
}

list();
