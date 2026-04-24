const ADMIN_LOGIN_ENDPOINT = "/api/admin-login";
const PRODUCTS_ENDPOINT = "/api/products";
const SETTINGS_ENDPOINT = "/api/settings";
const RETURN_POLICY_ASSURED = "assured";
const RETURN_POLICY_NOT_ASSURED = "not_assured";
const STOCK_IN = "in_stock";
const STOCK_OUT = "out_of_stock";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80";

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

const state = {
  products: [],
  settings: { ...defaultSettings },
  adminAuthenticated: false,
  adminCredentials: null,
  editingFeatureId: null
};

const $ = (id) => document.getElementById(id);
const adminLoginSection = $("adminLoginSection");
const adminContent = $("adminContent");
const productsCard = $("productsCard");
const adminProductList = $("adminProductList");
const adminLoginForm = $("adminLoginForm");
const productForm = $("productForm");
const productImageFile = $("productImageFile");
const cancelEdit = $("cancelEdit");
const logoutBtn = $("logoutBtn");
const settingsCard = $("settingsCard");
const settingsForm = $("settingsForm");
const siteLogoFile = $("siteLogoFile");
const resetSettingsBtn = $("resetSettings");
const featuresCard = $("featuresCard");
const featureForm = $("featureForm");
const cancelFeatureEdit = $("cancelFeatureEdit");
const featureList = $("featureList");
const adminStats = $("adminStats");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(raw, options = {}) {
  const { allowDataImage = false, fallback = "#" } = options;
  const value = String(raw || "").trim();
  if (!value) return fallback;

  if (allowDataImage && value.startsWith("data:image/")) return value;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch (error) {
    return fallback;
  }

  return fallback;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

async function resolveProductImage(existingImage = "") {
  const uploadedFile = productImageFile?.files?.[0];
  if (uploadedFile) {
    if (!uploadedFile.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return null;
    }

    try {
      return await fileToDataUrl(uploadedFile);
    } catch (error) {
      console.error(error);
      alert("Failed to process the uploaded image.");
      return null;
    }
  }

  const imageUrl = $("productImage").value.trim();
  if (imageUrl) return imageUrl;
  if (existingImage) return existingImage;
  return "";
}

function normalizeProduct(product) {
  return {
    ...product,
    returnPolicy: product?.returnPolicy === RETURN_POLICY_NOT_ASSURED ? RETURN_POLICY_NOT_ASSURED : RETURN_POLICY_ASSURED,
    stockStatus: product?.stockStatus === STOCK_OUT ? STOCK_OUT : STOCK_IN
  };
}

function normalizeSettings(settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    heroStats: Array.isArray(settings.heroStats) ? settings.heroStats : defaultSettings.heroStats,
    features: Array.isArray(settings.features) ? settings.features : defaultSettings.features
  };
}

function adminHeaders() {
  if (!state.adminCredentials) return {};
  return {
    "x-admin-email": state.adminCredentials.email,
    "x-admin-password": state.adminCredentials.password
  };
}

async function fetchProducts() {
  const response = await fetch(PRODUCTS_ENDPOINT);
  if (!response.ok) throw new Error("Unable to load products.");
  const data = await response.json();
  if (!Array.isArray(data?.products)) throw new Error("Invalid products payload.");
  return data.products.map(normalizeProduct);
}

async function fetchSettings() {
  const response = await fetch(SETTINGS_ENDPOINT);
  if (!response.ok) throw new Error("Unable to load settings.");
  const data = await response.json();
  if (!data?.settings) throw new Error("Invalid settings payload.");
  return normalizeSettings(data.settings);
}

async function upsertProductOnServer(product) {
  const response = await fetch(PRODUCTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders()
    },
    body: JSON.stringify(product)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to save product.");
  }
}

async function deleteProductOnServer(id) {
  const response = await fetch(PRODUCTS_ENDPOINT, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders()
    },
    body: JSON.stringify({ id })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to delete product.");
  }
}

async function upsertSettingsOnServer(settings) {
  const response = await fetch(SETTINGS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders()
    },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to save settings.");
  }
}

async function loadProducts() {
  try {
    state.products = await fetchProducts();
  } catch (error) {
    console.error(error);
    state.products = defaultProducts.map(normalizeProduct);
    alert("Could not load shared products. Showing fallback catalog.");
  }
}

async function loadSettings() {
  try {
    state.settings = await fetchSettings();
  } catch (error) {
    console.error(error);
    state.settings = { ...defaultSettings };
    alert("Could not load settings. Using defaults.");
  }
}

function openAdminContent() {
  adminLoginSection.classList.add("hidden");
  adminContent.classList.remove("hidden");
  productsCard.classList.remove("hidden");
  settingsCard.classList.remove("hidden");
  featuresCard.classList.remove("hidden");
}

function closeAdminContent() {
  adminLoginSection.classList.remove("hidden");
  adminContent.classList.add("hidden");
  productsCard.classList.add("hidden");
  settingsCard.classList.add("hidden");
  featuresCard.classList.add("hidden");
}

function renderList() {
  const totalProducts = state.products.length;
  const outOfStockCount = state.products.filter((product) => product.stockStatus === STOCK_OUT).length;
  const assuredCount = state.products.filter((product) => product.returnPolicy === RETURN_POLICY_ASSURED).length;

  if (adminStats) {
    adminStats.innerHTML = `
      <article class="stat-chip">
        <span class="stat-val">${totalProducts}</span>
        <span class="stat-label">Total Products</span>
      </article>
      <article class="stat-chip">
        <span class="stat-val">${assuredCount}</span>
        <span class="stat-label">Assured Return</span>
      </article>
      <article class="stat-chip">
        <span class="stat-val">${outOfStockCount}</span>
        <span class="stat-label">Out Of Stock</span>
      </article>
    `;
  }

  if (!state.products.length) {
    adminProductList.innerHTML = "<div class='hint'>No products available.</div>";
    return;
  }

  adminProductList.innerHTML = state.products
    .map((product) => {
      const imageSrc = safeUrl(product.image, { allowDataImage: true, fallback: FALLBACK_IMAGE });
      const isOutOfStock = product.stockStatus === STOCK_OUT;
      return `
      <div class="list-item admin-product-row">
        <img src="${imageSrc}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.src='${FALLBACK_IMAGE}'" />
        <div class="item-info">
          <strong class="item-name">${escapeHtml(product.title)}</strong>
          <div class="item-meta">
            <span class="item-price">${formatMoney(product.price)}</span>
            <span class="item-badge ${product.returnPolicy === RETURN_POLICY_ASSURED ? "assured" : "not-assured"}">${product.returnPolicy === RETURN_POLICY_ASSURED ? "Assured" : "Not Assured"}</span>
            <span class="item-badge ${isOutOfStock ? "out-stock" : "in-stock"}">${isOutOfStock ? "Out of Stock" : "In Stock"}</span>
          </div>
          <div class="hint">${escapeHtml(product.description)}</div>
        </div>
        <div class="item-actions">
          <button class="mini" data-edit="${escapeHtml(product.id)}">Edit</button>
          <button class="mini danger" data-delete="${escapeHtml(product.id)}">Delete</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function resetForm() {
  productForm.reset();
  $("productId").value = "";
  $("productReturnPolicy").value = RETURN_POLICY_ASSURED;
  $("productStockStatus").value = STOCK_IN;
  if (productImageFile) productImageFile.value = "";
}

function fillForm(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;

  $("productId").value = product.id;
  $("productTitle").value = product.title;
  $("productPrice").value = product.price;
  $("productImage").value = product.image.startsWith("data:image/") ? "" : product.image;
  $("productDescription").value = product.description;
  $("productReturnPolicy").value = product.returnPolicy === RETURN_POLICY_NOT_ASSURED ? RETURN_POLICY_NOT_ASSURED : RETURN_POLICY_ASSURED;
  $("productStockStatus").value = product.stockStatus === STOCK_OUT ? STOCK_OUT : STOCK_IN;
  if (productImageFile) productImageFile.value = "";
}

function resetSettingsForm() {
  settingsForm.reset();
  if (siteLogoFile) siteLogoFile.value = "";
}

function fillSettingsForm() {
  const settings = normalizeSettings(state.settings);

  $("siteBrandName").value = settings.brandName;
  $("siteBrandEyebrow").value = settings.brandEyebrow;
  $("siteBrandSubtitle").value = settings.brandSubtitle;
  $("siteLogoUrl").value = settings.logo && !settings.logo.startsWith("data:image/") ? settings.logo : "";
  $("siteHeroTitle").value = settings.heroTitle;
  $("siteHeroSubtitle").value = settings.heroSubtitle;
  $("siteHeroBadge").value = settings.heroBadge;
  $("siteHeroCtaText").value = settings.heroCtaText;
  $("siteHeroCtaLink").value = settings.heroCtaLink;
  $("heroStatOneValue").value = settings.heroStats?.[0]?.value || "";
  $("heroStatOneLabel").value = settings.heroStats?.[0]?.label || "";
  $("heroStatTwoValue").value = settings.heroStats?.[1]?.value || "";
  $("heroStatTwoLabel").value = settings.heroStats?.[1]?.label || "";
  $("heroStatThreeValue").value = settings.heroStats?.[2]?.value || "";
  $("heroStatThreeLabel").value = settings.heroStats?.[2]?.label || "";
  $("siteWhatsapp").value = settings.whatsappNumber;
  $("siteContactEmail").value = settings.contactEmail;
  $("siteContactPhone").value = settings.contactPhone;
  $("siteContactAddress").value = settings.contactAddress;
  $("themePrimary").value = settings.themePrimary;
  $("themePrimaryDark").value = settings.themePrimaryDark;
  $("themePrimaryLight").value = settings.themePrimaryLight;
  $("themeAccent").value = settings.themeAccent;
  $("themeBackground").value = settings.themeBackground;
  if (siteLogoFile) siteLogoFile.value = "";
}

function renderFeatureList() {
  const features = normalizeSettings(state.settings).features;
  if (!featureList) return;
  if (!features.length) {
    featureList.innerHTML = "<p class='hint'>No features configured.</p>";
    return;
  }

  featureList.innerHTML = features
    .map(
      (feature) => `
      <div class="list-item admin-product-row">
        <div>
          <strong>${escapeHtml(feature.title)}</strong>
          <div class="hint">${escapeHtml(feature.description || "")}</div>
          <div class="hint">Icon: ${escapeHtml(feature.icon || "*")}</div>
        </div>
        <div class="item-actions">
          <button class="mini" data-feature-edit="${escapeHtml(feature.id)}">Edit</button>
          <button class="mini danger" data-feature-delete="${escapeHtml(feature.id)}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");
}

function fillFeatureForm(id) {
  const feature = normalizeSettings(state.settings).features.find((item) => item.id === id);
  if (!feature) return;
  $("featureId").value = feature.id;
  $("featureTitle").value = feature.title;
  $("featureDescription").value = feature.description || "";
  $("featureIcon").value = feature.icon || "";
  state.editingFeatureId = feature.id;
}

function resetFeatureForm() {
  featureForm.reset();
  $("featureId").value = "";
  state.editingFeatureId = null;
}

function isAdminLoggedIn() {
  return state.adminAuthenticated && Boolean(state.adminCredentials);
}

function checkSession() {
  closeAdminContent();
}

async function verifyAdminLogin(email, password) {
  try {
    const response = await fetch(ADMIN_LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.ok);
  } catch (error) {
    console.error("Admin login verification failed:", error);
    alert("Unable to verify admin login. Check Vercel function and try again.");
    return false;
  }
}

async function loginAdmin(event) {
  event.preventDefault();
  const email = $("adminEmail").value.trim().toLowerCase();
  const password = $("adminPassword").value;

  const isValidAdmin = await verifyAdminLogin(email, password);
  if (!isValidAdmin) {
    alert("Invalid admin credentials.");
    return;
  }

  state.adminAuthenticated = true;
  state.adminCredentials = { email, password };
  await loadProducts();
  await loadSettings();
  openAdminContent();
  renderList();
  fillSettingsForm();
  renderFeatureList();
  adminLoginForm.reset();
}

async function saveProduct(event) {
  event.preventDefault();
  if (!isAdminLoggedIn()) {
    alert("Admin login required.");
    return;
  }

  const productId = $("productId").value || crypto.randomUUID();
  const existingProduct = state.products.find((item) => item.id === productId);
  const resolvedImage = await resolveProductImage(existingProduct?.image || "");
  if (resolvedImage === null) return;
  if (!resolvedImage) {
    alert("Please provide an image URL or upload an image file.");
    return;
  }

  const payload = {
    id: productId,
    title: $("productTitle").value.trim(),
    price: Number($("productPrice").value),
    image: resolvedImage,
    description: $("productDescription").value.trim(),
    returnPolicy: $("productReturnPolicy").value,
    stockStatus: $("productStockStatus").value
  };
  const normalizedPayload = normalizeProduct(payload);

  try {
    await upsertProductOnServer(normalizedPayload);
    state.products = await fetchProducts();
    renderList();
    resetForm();
  } catch (error) {
    alert(error.message || "Failed to save product.");
  }
}

async function deleteProduct(id) {
  if (!isAdminLoggedIn()) return;

  try {
    await deleteProductOnServer(id);
    state.products = await fetchProducts();
    renderList();
  } catch (error) {
    alert(error.message || "Failed to delete product.");
  }
}

async function saveSettings(event) {
  event.preventDefault();
  if (!isAdminLoggedIn()) {
    alert("Admin login required.");
    return;
  }

  let logo = $("siteLogoUrl").value.trim();
  const uploadedLogo = siteLogoFile?.files?.[0];
  if (uploadedLogo) {
    if (!uploadedLogo.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    try {
      logo = await fileToDataUrl(uploadedLogo);
    } catch (error) {
      console.error(error);
      alert("Failed to process the uploaded logo.");
      return;
    }
  }

  const settings = normalizeSettings({
    brandName: $("siteBrandName").value.trim(),
    brandEyebrow: $("siteBrandEyebrow").value.trim(),
    brandSubtitle: $("siteBrandSubtitle").value.trim(),
    logo: logo || defaultSettings.logo,
    heroTitle: $("siteHeroTitle").value.trim(),
    heroSubtitle: $("siteHeroSubtitle").value.trim(),
    heroBadge: $("siteHeroBadge").value.trim(),
    heroCtaText: $("siteHeroCtaText").value.trim(),
    heroCtaLink: $("siteHeroCtaLink").value.trim(),
    whatsappNumber: $("siteWhatsapp").value.trim(),
    contactEmail: $("siteContactEmail").value.trim(),
    contactPhone: $("siteContactPhone").value.trim(),
    contactAddress: $("siteContactAddress").value.trim(),
    themePrimary: $("themePrimary").value,
    themePrimaryDark: $("themePrimaryDark").value,
    themePrimaryLight: $("themePrimaryLight").value,
    themeAccent: $("themeAccent").value,
    themeBackground: $("themeBackground").value,
    heroStats: [
      {
        id: "stat-one",
        value: $("heroStatOneValue").value.trim(),
        label: $("heroStatOneLabel").value.trim()
      },
      {
        id: "stat-two",
        value: $("heroStatTwoValue").value.trim(),
        label: $("heroStatTwoLabel").value.trim()
      },
      {
        id: "stat-three",
        value: $("heroStatThreeValue").value.trim(),
        label: $("heroStatThreeLabel").value.trim()
      }
    ],
    features: normalizeSettings(state.settings).features
  });

  try {
    await upsertSettingsOnServer(settings);
    state.settings = settings;
    fillSettingsForm();
    renderFeatureList();
    alert("Settings saved.");
  } catch (error) {
    alert(error.message || "Failed to save settings.");
  }
}

async function saveFeature(event) {
  event.preventDefault();
  if (!isAdminLoggedIn()) {
    alert("Admin login required.");
    return;
  }

  const features = [...normalizeSettings(state.settings).features];
  const title = $("featureTitle").value.trim();
  if (!title) {
    alert("Feature title is required.");
    return;
  }

  const payload = {
    id: $("featureId").value || crypto.randomUUID(),
    title,
    description: $("featureDescription").value.trim(),
    icon: $("featureIcon").value.trim()
  };

  const idx = features.findIndex((item) => item.id === payload.id);
  if (idx >= 0) features[idx] = payload;
  else features.push(payload);

  const settings = normalizeSettings({ ...state.settings, features });
  try {
    await upsertSettingsOnServer(settings);
    state.settings = settings;
    renderFeatureList();
    resetFeatureForm();
  } catch (error) {
    alert(error.message || "Failed to save feature.");
  }
}

async function deleteFeature(id) {
  if (!isAdminLoggedIn()) return;
  const features = normalizeSettings(state.settings).features.filter((item) => item.id !== id);
  const settings = normalizeSettings({ ...state.settings, features });
  try {
    await upsertSettingsOnServer(settings);
    state.settings = settings;
    renderFeatureList();
  } catch (error) {
    alert(error.message || "Failed to delete feature.");
  }
}

function logout() {
  state.adminAuthenticated = false;
  state.adminCredentials = null;
  closeAdminContent();
  resetForm();
  resetSettingsForm();
  resetFeatureForm();
}

function bindEvents() {
  adminLoginForm.addEventListener("submit", (event) => void loginAdmin(event));
  productForm.addEventListener("submit", (event) => void saveProduct(event));
  cancelEdit.addEventListener("click", resetForm);
  logoutBtn.addEventListener("click", logout);
  settingsForm.addEventListener("submit", (event) => void saveSettings(event));
  resetSettingsBtn.addEventListener("click", resetSettingsForm);
  featureForm.addEventListener("submit", (event) => void saveFeature(event));
  cancelFeatureEdit.addEventListener("click", resetFeatureForm);

  adminProductList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.edit) fillForm(target.dataset.edit);
    if (target.dataset.delete) void deleteProduct(target.dataset.delete);
  });

  featureList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.featureEdit) fillFeatureForm(target.dataset.featureEdit);
    if (target.dataset.featureDelete) void deleteFeature(target.dataset.featureDelete);
  });
}

async function bootstrap() {
  await loadProducts();
  await loadSettings();
  checkSession();
  bindEvents();
}

void bootstrap();
