module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  const adminEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({
      ok: false,
      error: "Admin credentials are not configured."
    });
  }

  if (email === adminEmail && password === adminPassword) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false });
};
