module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.status(501).json({
    error: "Wysyłka e-mail nie jest jeszcze skonfigurowana na serwerze. Skonfiguruj dostawcę (np. Resend) w api/send-email.js i dodaj klucz API w zmiennych środowiskowych Vercel.",
  });
};
