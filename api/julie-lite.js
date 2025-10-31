// Minimal Express server with caching (from earlier)
import OpenAI from "openai";
import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// 🔒 Lock CORS to your domain(s) once you know them:
const allowed = [
  "https://YOUR-WP-DOMAIN.com", 
  "https://www.YOUR-WP-DOMAIN.com"
];
app.use(cors({
  origin: (o, cb) => {
    if (!o) return cb(null, true);
    if (allowed.includes(o)) return cb(null, true);
    return cb(null, false);
  }
}));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory cache
const cache = {};
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
const keyFrom = (msgs) =>
  (msgs.filter(m=>m.role==="user").pop()?.content || "").trim().toLowerCase();

app.post("/api/julie-lite", async (req, res) => {
  const { messages = [] } = req.body;
  const key = keyFrom(messages);
  const hit = cache[key];
  if (hit && (Date.now() - hit.t < CACHE_TTL)) {
    return res.json({ text: hit.a, cached: true });
  }

  try {
    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content:
          "You are Julie Lite—warm, grounded, direct. Focus on dog-breeding FAQs, Dog Breeder Society, and Swan Essentials (Perfect Log). Avoid medical dosing. If unsure, ask one clarifying question or share a single clear CTA." },
        ...messages
      ]
    });
    const answer = r.output_text;
    cache[key] = { a: answer, t: Date.now() };
    res.json({ text: answer, cached: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Vercel will call this handler
export default app;
