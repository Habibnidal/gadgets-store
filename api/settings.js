const SETTINGS_KEY = process.env.SETTINGS_KV_KEY || "naisham_settings_v1";

const defaultSettings = {
  brandName: "Trust",
  brandEyebrow: "Smart Gadget Store",
  brandSubtitle: "Shop quality gadgets in one click.",
  logo: "assets/trust-logo.png",
  heroTitle: "Smart Gadgets. Smarter Living.",
  heroSubtitle: "Curated picks, clear pricing, and fast support for your everyday tech.",
  heroBadge: "Trusted Gadget Partner",
  heroCtaText: "Chat on WhatsApp",
  heroCtaLink: "",
  whatsappNumber: "918590889829",
  contactEmail: "support@naishamgadgets.com",
  contactPhone: "+91 85908 89829",
  contactAddress: "Kolkata, India",
  themePrimary: "#2563eb",
  themePrimaryDark: "#1d4ed8",
  themePrimaryLight: "#dbeafe",
  themeAccent: "#10b981",
  themeBackground: "#f0f4ff",
  heroStats: [
    { id: "deliveries", value: "250+", label: "Gadgets Delivered" },
    { id: "rating", value: "4.9★", label: "Customer Rating" },
    { id: "support", value: "24/7", label: "WhatsApp Support" }
  ],
  features: [
    {
      id: "fast-delivery",
      title: "Fast Delivery",
      description: "Quick dispatch with reliable tracking updates.",
      icon: "🚚"
    },
    {
      id: "secure-payments",
      title: "Secure Payments",
      description: "Multiple payment options with trusted checkout.",
      icon: "🔒"
    },
    {
      id: "support-team",
      title: "Friendly Support",
      description: "We answer your questions in minutes.",
      icon: "💬"
    }
  ]
};

function normalizeFeature(feature) {
  return {
    id: String(feature?.id || "").trim(),
    title: String(feature?.title || "").trim(),
    description: String(feature?.description || "").trim(),
    icon: String(feature?.icon || "").trim()
  };
}

function normalizeStat(stat) {
  return {
    id: String(stat?.id || "").trim(),
    value: String(stat?.value || "").trim(),
    label: String(stat?.label || "").trim()
  };
}

function sanitizeStats(raw) {
  if (!Array.isArray(raw)) return defaultSettings.heroStats.map(normalizeStat);
  const cleaned = raw.map(normalizeStat).filter((item) => item.id && item.value && item.label);
  return cleaned.length ? cleaned : defaultSettings.heroStats.map(normalizeStat);
}

function sanitizeFeatures(raw) {
  if (!Array.isArray(raw)) return defaultSettings.features.map(normalizeFeature);
  const cleaned = raw.map(normalizeFeature).filter((item) => item.id && item.title);
  return cleaned.length ? cleaned : defaultSettings.features.map(normalizeFeature);
}

function normalizeSettings(raw = {}) {
  return {
    brandName: String(raw.brandName || defaultSettings.brandName).trim(),
    brandEyebrow: String(raw.brandEyebrow || defaultSettings.brandEyebrow).trim(),
    brandSubtitle: String(raw.brandSubtitle || defaultSettings.brandSubtitle).trim(),
    logo: String(raw.logo || defaultSettings.logo).trim(),
    heroTitle: String(raw.heroTitle || defaultSettings.heroTitle).trim(),
    heroSubtitle: String(raw.heroSubtitle || defaultSettings.heroSubtitle).trim(),
    heroBadge: String(raw.heroBadge || defaultSettings.heroBadge).trim(),
    heroCtaText: String(raw.heroCtaText || defaultSettings.heroCtaText).trim(),
    heroCtaLink: String(raw.heroCtaLink || defaultSettings.heroCtaLink).trim(),
    whatsappNumber: String(raw.whatsappNumber || defaultSettings.whatsappNumber).trim(),
    contactEmail: String(raw.contactEmail || defaultSettings.contactEmail).trim(),
    contactPhone: String(raw.contactPhone || defaultSettings.contactPhone).trim(),
    contactAddress: String(raw.contactAddress || defaultSettings.contactAddress).trim(),
    themePrimary: String(raw.themePrimary || defaultSettings.themePrimary).trim(),
    themePrimaryDark: String(raw.themePrimaryDark || defaultSettings.themePrimaryDark).trim(),
    themePrimaryLight: String(raw.themePrimaryLight || defaultSettings.themePrimaryLight).trim(),
    themeAccent: String(raw.themeAccent || defaultSettings.themeAccent).trim(),
    themeBackground: String(raw.themeBackground || defaultSettings.themeBackground).trim(),
    heroStats: sanitizeStats(raw.heroStats),
    features: sanitizeFeatures(raw.features)
  };
}

function getAdminFromRequest(req) {
  const email = String(req.headers["x-admin-email"] || req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.headers["x-admin-password"] || req.body?.password || "");
  return { email, password };
}

function isAdminValid(email, password) {
  const adminEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");
  if (!adminEmail || !adminPassword) return false;
  return email === adminEmail && password === adminPassword;
}

function isKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function isProd() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function setNoCache(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

async function callKv(path, method, body) {
  const response = await fetch(`${process.env.KV_REST_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body
  });
  const data = await response.json();
  return { ok: response.ok, data };
}

function getInMemorySettings() {
  if (!globalThis.__NAISHAM_SETTINGS__) {
    globalThis.__NAISHAM_SETTINGS__ = normalizeSettings(defaultSettings);
  }
  return globalThis.__NAISHAM_SETTINGS__;
}

async function readSettings() {
  if (!isKvConfigured()) return getInMemorySettings();

  const kvRead = await callKv(`/get/${encodeURIComponent(SETTINGS_KEY)}`, "GET");
  if (!kvRead.ok) throw new Error("Unable to read settings from KV.");

  const raw = kvRead.data?.result;
  if (!raw) return normalizeSettings(defaultSettings);
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return normalizeSettings(parsed);
}

async function writeSettings(settings) {
  const sanitized = normalizeSettings(settings);

  if (!isKvConfigured()) {
    globalThis.__NAISHAM_SETTINGS__ = sanitized;
    return;
  }

  const kvWrite = await callKv(`/set/${encodeURIComponent(SETTINGS_KEY)}`, "POST", JSON.stringify(sanitized));
  if (!kvWrite.ok) throw new Error("Unable to write settings to KV.");
}

module.exports = async (req, res) => {
  setNoCache(res);

  if (isProd() && !isKvConfigured()) {
    return res.status(500).json({
      ok: false,
      error: "KV is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN."
    });
  }

  if (req.method === "GET") {
    try {
      const settings = await readSettings();
      return res.status(200).json({ ok: true, settings });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "Failed to fetch settings." });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, password } = getAdminFromRequest(req);
  if (!isAdminValid(email, password)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const incoming = normalizeSettings(req.body || {});
    await writeSettings(incoming);
    return res.status(200).json({ ok: true, settings: incoming });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Failed to update settings." });
  }
};
