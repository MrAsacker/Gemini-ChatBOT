export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY; // Set this in Vercel dashboard
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.status(200).json(data);
}


