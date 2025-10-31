// Vercel Serverless Function (no Express needed)
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// tiny in-memory cache
const cache = {};
const TTL = 1000 * 60 * 60 * 24; // 24h
const keyFrom = (msgs = []) =>
  (msgs.filter(m => m.role === "user").pop()?.content || "")
    .trim()
    .toLowerCase();

export default async function handler(req, res) {
  // CORS (lock to your domain later)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, hint: "POST JSON: { messages: [...] }" });
  }

  try {
    const { messages = [] } = req.body || {};
    const key = keyFrom(messages);
    const hit = cache[key];
    if (hit && Date.now() - hit.t < TTL) {
      return res.status(200).json({ text: hit.a, cached: true });
    }

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are Julie Lite—warm, grounded, direct. Focus on dog-breeding FAQs, Dog Breeder Society, and Swan Essentials (Perfect Log). Avoid medical dosing. If unsure, ask one clarifying question or share one clear CTA."
        },
        ...messages
      ]
    });

    const answer = r.output_text;
    cache[key] = { a: answer, t: Date.now() };
    return res.status(200).json({ text: answer, cached: false });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
