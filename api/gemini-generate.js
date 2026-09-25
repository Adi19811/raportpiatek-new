const { GoogleGenAI } = require("@google/genai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY nie jest skonfigurowany na serwerze." });
    return;
  }

  try {
    const { model, contents, config } = req.body || {};
    if (!model || !contents) {
      res.status(400).json({ error: "Brakuje pola 'model' lub 'contents' w żądaniu." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({ model, contents, config });
    res.status(200).json({ text: result.text });
  } catch (err) {
    console.error("Gemini proxy error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Nieznany błąd Gemini API" });
  }
};
