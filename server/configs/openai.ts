import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.BETTER_AUTH_URL,
    "X-Title": "AI Site Builder"
  }
});

export default openai