export default async function handler(req, res) {
  // 1. Only allow POST requests (security check)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Access the SECRET key (not VITE_)
  // This key is safe here because it stays on the Vercel server!
  const key = process.env.GEMINI_KEY;
  if (!key) {
    console.error('SERVER ERROR: GEMINI_KEY missing from environment');
    return res.status(500).json({ error: 'AI service not configured on server' });
  }

  const model = 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    // 3. Forward the request to Google Gemini
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // 4. Send the AI response back to the website
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('FETCH ERROR:', err);
    return res.status(500).json({ error: 'Failed to reach AI service', details: err.message });
  }
}
