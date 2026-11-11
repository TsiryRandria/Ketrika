import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Server-side Gemini API proxy route
  app.post('/api/assistant', async (req, res) => {
    try {
      const { message, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.json({ reply: null, fallback: true });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${context || ''}\n\nQuestion de l'utilisateur: ${message}` }],
          },
        ],
      });

      res.json({
        reply: response.text || "Je suis à votre disposition pour vous aider dans vos projets Ketrika.",
        fallback: false,
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
      res.json({ reply: null, fallback: true });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ketrika server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
