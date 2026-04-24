const RETURN_POLICY_ASSURED = "assured";
const RETURN_POLICY_NOT_ASSURED = "not_assured";
const STOCK_IN = "in_stock";
const STOCK_OUT = "out_of_stock";
const PRODUCTS_KEY = process.env.PRODUCTS_KV_KEY || "naisham_products_v1";
const MAX_TEXT = 3000;

const defaultProducts = [
  {
    id: "smart-watch-x2",
    title: "Smart Watch X2",
    price: 59.99,
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80",
    description: "Fitness tracking, heart-rate monitor, and 5-day battery.",
    returnPolicy: RETURN_POLICY_ASSURED,
    stockStatus: STOCK_IN
  },
  {
    id: "noise-cancelling-headset",
    title: "Noise Cancelling Headset",
    price: 84.5,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
    description: "Deep bass wireless headset with fast charging support.",
    returnPolicy: RETURN_POLICY_ASSURED,
    stockStatus: STOCK_IN
  },
  {
    id: "portable-speaker-mini",
    title: "Portable Speaker Mini",
    price: 39,
    image: "https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?auto=format&fit=crop&w=800&q=80",
    description: "Pocket-size Bluetooth speaker, crisp sound, water resistant.",
    returnPolicy: RETURN_POLICY_NOT_ASSURED,
    stockStatus: STOCK_IN
  }
];

function normalizeProduct(product) {
  const id = cleanText(product?.id, 120);
  const title = cleanText(product?.title, 180);
  const image = cleanImageUrl(product?.image);
  const description = cleanText(product?.description, MAX_TEXT);
  const price = Number(product?.price || 0);

  return {
    id,
    title,
    price: Number.isFinite(price) ? price : 0,
    image,
    description,
    returnPolicy: product?.returnPolicy === RETURN_POLICY_NOT_ASSURED ? RETURN_POLICY_NOT_ASSURED : RETURN_POLICY_ASSURED,
    stockStatus: product?.stockStatus === STOCK_OUT ? STOCK_OUT : STOCK_IN
  };
}

function cleanText(value, maxLength) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:image/")) return raw;

  try {
    const parsed = new URL(raw, "https://example.com");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return raw;
  } catch (error) {
    return "";
  }

  return "";
}

function sanitizeProducts(raw) {
  if (!Array.isArray(raw)) return defaultProducts.map(normalizeProduct);
  return raw
    .map(normalizeProduct)
    .filter((item) => item.id && item.title && item.price > 0 && item.image && item.description);
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

function getInMemoryProducts() {
  if (!globalThis.__NAISHAM_PRODUCTS__) {
    globalThis.__NAISHAM_PRODUCTS__ = defaultProducts.map(normalizeProduct);
  }
  return globalThis.__NAISHAM_PRODUCTS__;
}

async function readProducts() {
  if (!isKvConfigured()) return getInMemoryProducts();

  const kvRead = await callKv(`/get/${encodeURIComponent(PRODUCTS_KEY)}`, "GET");
  if (!kvRead.ok) throw new Error("Unable to read products from KV.");

  const raw = kvRead.data?.result;
  if (!raw) return defaultProducts.map(normalizeProduct);
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return sanitizeProducts(parsed);
}

async function writeProducts(products) {
  const sanitized = sanitizeProducts(products);

  if (!isKvConfigured()) {
    globalThis.__NAISHAM_PRODUCTS__ = sanitized;
    return;
  }

  const kvWrite = await callKv(`/set/${encodeURIComponent(PRODUCTS_KEY)}`, "POST", JSON.stringify(sanitized));
  if (!kvWrite.ok) throw new Error("Unable to write products to KV.");
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
      const products = await readProducts();
      return res.status(200).json({ ok: true, products });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "Failed to fetch products." });
    }
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, password } = getAdminFromRequest(req);
  if (!isAdminValid(email, password)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const products = await readProducts();

    if (req.method === "POST") {
      const incoming = normalizeProduct(req.body);
      if (!incoming.id || !incoming.title || !incoming.image || !incoming.description || incoming.price <= 0) {
        return res.status(400).json({ ok: false, error: "Invalid product payload." });
      }

      const idx = products.findIndex((item) => item.id === incoming.id);
      if (idx >= 0) products[idx] = incoming;
      else products.push(incoming);
      await writeProducts(products);
      return res.status(200).json({ ok: true, products: sanitizeProducts(products) });
    }

    const id = String(req.body?.id || "").trim();
    if (!id) {
      return res.status(400).json({ ok: false, error: "Product id is required." });
    }

    const updated = products.filter((item) => item.id !== id);
    await writeProducts(updated);
    return res.status(200).json({ ok: true, products: sanitizeProducts(updated) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Failed to update products." });
  }
};
