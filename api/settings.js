const SETTINGS_KEY = process.env.SETTINGS_KV_KEY || "naisham_settings_v1";
const MAX_TEXT = 4000;

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
    { id: "rating", value: "4.9/5", label: "Customer Rating" },
    { id: "support", value: "24/7", label: "WhatsApp Support" }
  ],
  features: [
    {
      id: "fast-delivery",
      title: "Fast Delivery",
      description: "Quick dispatch with reliable tracking updates.",
      icon: "FD"
    },
    {
      id: "secure-payments",
      title: "Secure Payments",
      description: "Multiple payment options with trusted checkout.",
      icon: "SP"
    },
    {
      id: "support-team",
      title: "Friendly Support",
      description: "We answer your questions in minutes.",
      icon: "CS"
    }
  ]
};

function cleanText(value, maxLength) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanUrl(value, options = {}) {
  const { allowDataImage = false, allowRelative = false } = options;
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (allowDataImage && raw.startsWith("data:image/")) return raw;

  try {
    const parsed = new URL(raw, "https://example.com");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (!allowRelative && parsed.hostname === "example.com" && !raw.startsWith("http")) return "";
    return raw;
  } catch (error) {
    return "";
  }
}

function normalizeFeature(feature) {
  return {
    id: cleanText(feature?.id, 120),
    title: cleanText(feature?.title, 120),
    description: cleanText(feature?.description, 260),
    icon: cleanText(feature?.icon, 24)
  };
}

function normalizeStat(stat) {
  return {
    id: cleanText(stat?.id, 120),
    value: cleanText(stat?.value, 40),
    label: cleanText(stat?.label, 60)
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
    brandName: cleanText(raw.brandName || defaultSettings.brandName, 120),
    brandEyebrow: cleanText(raw.brandEyebrow || defaultSettings.brandEyebrow, 120),
    brandSubtitle: cleanText(raw.brandSubtitle || defaultSettings.brandSubtitle, 200),
    logo: cleanUrl(raw.logo || defaultSettings.logo, { allowDataImage: true, allowRelative: true }) || defaultSettings.logo,
    heroTitle: cleanText(raw.heroTitle || defaultSettings.heroTitle, 180),
    heroSubtitle: cleanText(raw.heroSubtitle || defaultSettings.heroSubtitle, MAX_TEXT),
    heroBadge: cleanText(raw.heroBadge || defaultSettings.heroBadge, 100),
    heroCtaText: cleanText(raw.heroCtaText || defaultSettings.heroCtaText, 60),
    heroCtaLink: cleanUrl(raw.heroCtaLink || defaultSettings.heroCtaLink),
    whatsappNumber: cleanText(raw.whatsappNumber || defaultSettings.whatsappNumber, 30),
    contactEmail: cleanText(raw.contactEmail || defaultSettings.contactEmail, 150),
    contactPhone: cleanText(raw.contactPhone || defaultSettings.contactPhone, 50),
    contactAddress: cleanText(raw.contactAddress || defaultSettings.contactAddress, 200),
    themePrimary: cleanText(raw.themePrimary || defaultSettings.themePrimary, 20),
    themePrimaryDark: cleanText(raw.themePrimaryDark || defaultSettings.themePrimaryDark, 20),
    themePrimaryLight: cleanText(raw.themePrimaryLight || defaultSettings.themePrimaryLight, 20),
    themeAccent: cleanText(raw.themeAccent || defaultSettings.themeAccent, 20),
    themeBackground: cleanText(raw.themeBackground || defaultSettings.themeBackground, 20),
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
