module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://adi19811.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.status(501).json({
    error: "Wysyłka e-mail nie jest jeszcze skonfigurowana na serwerze. Skonfiguruj dostawcę (np. Resend) w api/send-email.js i dodaj klucz API w zmiennych środowiskowych Vercel.",
  });
};
