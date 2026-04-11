const USER_KEY = "naisham_user_v1";
const ADMIN_LOGIN_ENDPOINT = "/api/admin-login";
const PRODUCTS_ENDPOINT = "/api/products";
const SETTINGS_ENDPOINT = "/api/settings";
const RETURN_POLICY_ASSURED = "assured";
const RETURN_POLICY_NOT_ASSURED = "not_assured";
const STOCK_IN = "in_stock";
const STOCK_OUT = "out_of_stock";

function getStoredUser() {
  const rawUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  if (!rawUser) return null;
  if (rawUser.isAdmin) return { ...rawUser, isAdmin: false };
  return rawUser;
}

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

const state = {
  products: [],
  cart: [],
  wishlist: [],
  settings: defaultSettings,
  user: getStoredUser(),
  authMode: "login",
  editingId: null,
  adminCredentials: null
};

const $ = (id) => document.getElementById(id);

const productGrid = $("productGrid");
const cartItems = $("cartItems");
const wishlistItems = $("wishlistItems");
const cartTotal = $("cartTotal");
const adminPanel = $("adminPanel");
const authBtn = $("authBtn");
const adminModeBtn = $("adminModeBtn");
const authDialog = $("authDialog");
const authForm = $("authForm");
const toggleAuthMode = $("toggleAuthMode");
const authTitle = $("authTitle");
const authName = $("authName");
const authEmail = $("authEmail");
const authPassword = $("authPassword");
const productForm = $("productForm");
const cancelEdit = $("cancelEdit");
const featuresGrid = $("featuresGrid");

function normalizeProduct(product) {
  return {
    ...product,
    returnPolicy: product?.returnPolicy === RETURN_POLICY_NOT_ASSURED ? RETURN_POLICY_NOT_ASSURED : RETURN_POLICY_ASSURED,
    stockStatus: product?.stockStatus === STOCK_OUT ? STOCK_OUT : STOCK_IN
  };
}

function adminHeaders() {
  if (!state.adminCredentials) return {};
  return {
    "x-admin-email": state.adminCredentials.email,
    "x-admin-password": state.adminCredentials.password
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

async function fetchProducts() {
  const response = await fetch(PRODUCTS_ENDPOINT);
  if (!response.ok) throw new Error("Unable to fetch products.");
  const data = await response.json();
  if (!Array.isArray(data?.products)) throw new Error("Invalid products payload.");
  return data.products.map(normalizeProduct);
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

async function fetchSettings() {
  const response = await fetch(SETTINGS_ENDPOINT);
  if (!response.ok) throw new Error("Unable to fetch settings.");
  const data = await response.json();
  if (!data?.settings) throw new Error("Invalid settings payload.");
  return normalizeSettings(data.settings);
}

async function initProducts() {
  try {
    state.products = await fetchProducts();
  } catch (error) {
    console.error(error);
    state.products = defaultProducts.map(normalizeProduct);
    alert("Could not load shared products. Showing fallback catalog.");
  }
}

async function initSettings() {
  try {
    state.settings = await fetchSettings();
  } catch (error) {
    console.error(error);
    state.settings = { ...defaultSettings };
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function applyTheme(settings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", settings.themePrimary);
  root.style.setProperty("--primary-dark", settings.themePrimaryDark);
  root.style.setProperty("--primary-light", settings.themePrimaryLight);
  root.style.setProperty("--accent", settings.themeAccent);
  root.style.setProperty("--bg", settings.themeBackground);
}

function applySettings() {
  const settings = normalizeSettings(state.settings);
  state.settings = settings;

  const brandLogo = $("brandLogo");
  const brandName = $("brandName");
  const brandEyebrow = $("brandEyebrow");
  const brandSubtitle = $("brandSubtitle");
  const heroTitle = $("heroTitle");
  const heroSubtitle = $("heroSubtitle");
  const heroBadge = $("heroBadge");
  const heroCta = $("heroCta");
  const footerPhone = $("footerPhone");
  const footerEmail = $("footerEmail");
  const footerAddress = $("footerAddress");
  const footerWhatsApp = $("footerWhatsApp");

  if (brandLogo) brandLogo.src = settings.logo || defaultSettings.logo;
  if (brandName) brandName.textContent = settings.brandName;
  if (brandEyebrow) brandEyebrow.textContent = settings.brandEyebrow;
  if (brandSubtitle) brandSubtitle.textContent = settings.brandSubtitle;
  if (heroTitle) heroTitle.textContent = settings.heroTitle;
  if (heroSubtitle) heroSubtitle.textContent = settings.heroSubtitle;
  if (heroBadge) heroBadge.textContent = settings.heroBadge;

  const whatsappNumber = settings.whatsappNumber || defaultSettings.whatsappNumber;
  const ctaLink = settings.heroCtaLink || `https://wa.me/${whatsappNumber}`;
  if (heroCta) {
    heroCta.textContent = settings.heroCtaText || defaultSettings.heroCtaText;
    heroCta.href = ctaLink;
  }

  if (footerPhone) footerPhone.textContent = settings.contactPhone;
  if (footerEmail) footerEmail.textContent = settings.contactEmail;
  if (footerAddress) footerAddress.textContent = settings.contactAddress;
  if (footerWhatsApp) footerWhatsApp.textContent = `WhatsApp: ${settings.whatsappNumber}`;

  applyTheme(settings);
  renderHeroStats();
  renderFeatures();
}

function renderHeroStats() {
  const stats = normalizeSettings(state.settings).heroStats;
  const statOneValue = $("heroStatOneValue");
  const statOneLabel = $("heroStatOneLabel");
  const statTwoValue = $("heroStatTwoValue");
  const statTwoLabel = $("heroStatTwoLabel");
  const statThreeValue = $("heroStatThreeValue");
  const statThreeLabel = $("heroStatThreeLabel");

  const [one, two, three] = stats;
  if (one && statOneValue) statOneValue.textContent = one.value;
  if (one && statOneLabel) statOneLabel.textContent = one.label;
  if (two && statTwoValue) statTwoValue.textContent = two.value;
  if (two && statTwoLabel) statTwoLabel.textContent = two.label;
  if (three && statThreeValue) statThreeValue.textContent = three.value;
  if (three && statThreeLabel) statThreeLabel.textContent = three.label;
}

function renderFeatures() {
  const settings = normalizeSettings(state.settings);
  if (!featuresGrid) return;
  if (!settings.features.length) {
    featuresGrid.innerHTML = "<p class='hint'>No features configured.</p>";
    return;
  }

  featuresGrid.innerHTML = settings.features
    .map(
      (feature) => `
      <div class="feature-card">
        <div class="feature-icon">${feature.icon || "⭐"}</div>
        <h3>${feature.title}</h3>
        <p>${feature.description || ""}</p>
      </div>
    `
    )
    .join("");
}

function renderProducts() {
  if (!state.products.length) {
    productGrid.innerHTML = "<p>No products available.</p>";
    return;
  }

  const isAdmin = Boolean(state.user?.isAdmin);

  productGrid.innerHTML = state.products
    .map((rawProduct) => {
      const p = normalizeProduct(rawProduct);
      const isOutOfStock = p.stockStatus === STOCK_OUT;
      return `
      <article class="product-card">
        <img src="${p.image}" alt="${p.title}" />
        <h3>${p.title}</h3>
        <p class="price">${formatMoney(p.price)}</p>
        <p class="desc">${p.description}</p>
        <p class="hint">Return Policy: ${p.returnPolicy === RETURN_POLICY_ASSURED ? "Assured" : "Not Assured"}</p>
        <p class="hint">${isOutOfStock ? "Out of Stock" : "In Stock"}</p>
        <div class="btn-row">
          <button class="btn" data-add-cart="${p.id}" ${isOutOfStock ? "disabled" : ""}>${isOutOfStock ? "Out of Stock" : "Add to Cart"}</button>
          <button class="btn ghost" data-add-wish="${p.id}" ${isOutOfStock ? "disabled" : ""}>Wishlist</button>
        </div>
        ${
          isAdmin
            ? `
          <div class="btn-row">
            <button class="btn ghost" data-edit-product="${p.id}">Edit</button>
            <button class="btn ghost" data-delete-product="${p.id}">Delete</button>
          </div>
        `
            : ""
        }
      </article>
    `;
    })
    .join("");
}

function renderCart() {
  if (!state.cart.length) {
    cartItems.innerHTML = "<p class='hint'>Cart is empty.</p>";
    cartTotal.textContent = formatMoney(0);
    return;
  }

  cartItems.innerHTML = state.cart
    .map((item) => {
      const product = state.products.find((p) => p.id === item.id);
      if (!product) return "";
      return `
        <div class="list-item">
          <div>
            <strong>${product.title}</strong>
            <div class="hint">${item.qty} x ${formatMoney(product.price)}</div>
          </div>
          <div class="item-actions">
            <button class="mini" data-inc="${item.id}">+</button>
            <button class="mini" data-dec="${item.id}">-</button>
            <button class="mini danger" data-rm="${item.id}">x</button>
          </div>
        </div>
      `;
    })
    .join("");

  const total = state.cart.reduce((sum, item) => {
    const product = state.products.find((p) => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
  cartTotal.textContent = formatMoney(total);
}

function renderWishlist() {
  if (!state.wishlist.length) {
    wishlistItems.innerHTML = "<p class='hint'>Wishlist is empty.</p>";
    return;
  }

  wishlistItems.innerHTML = state.wishlist
    .map((id) => state.products.find((p) => p.id === id))
    .filter(Boolean)
    .map(
      (p) => `
      <div class="list-item">
        <span>${p.title}</span>
        <button class="mini danger" data-wrm="${p.id}">Remove</button>
      </div>
    `
    )
    .join("");
}

function addToCart(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product || normalizeProduct(product).stockStatus === STOCK_OUT) {
    alert("This product is out of stock.");
    return;
  }

  const existing = state.cart.find((c) => c.id === id);
  if (existing) existing.qty += 1;
  else state.cart.push({ id, qty: 1 });
  renderCart();
}

function addToWishlist(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product || normalizeProduct(product).stockStatus === STOCK_OUT) {
    alert("Out of stock product cannot be added to wishlist.");
    return;
  }

  if (!state.wishlist.includes(id)) {
    state.wishlist.push(id);
    renderWishlist();
  }
}

function removeWishlist(id) {
  state.wishlist = state.wishlist.filter((w) => w !== id);
  renderWishlist();
}

function updateUserButton() {
  if (state.user) authBtn.textContent = `Logged in: ${state.user.name || state.user.email}`;
  else authBtn.textContent = "Login / Signup";
}

function openAuthDialog() {
  authDialog.showModal();
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

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (state.authMode === "signup") {
    if (!name) {
      alert("Name is required for signup.");
      return;
    }
    state.user = { name, email, password, isAdmin: false };
    localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    authDialog.close();
    updateUserButton();
    return;
  }

  const isAdmin = await verifyAdminLogin(email, password);
  state.user = { name: isAdmin ? "Admin" : email.split("@")[0], email, isAdmin };
  state.adminCredentials = isAdmin ? { email, password } : null;
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  authDialog.close();
  updateUserButton();
  renderProducts();
}

function toggleAuth() {
  state.authMode = state.authMode === "login" ? "signup" : "login";
  authTitle.textContent = state.authMode === "login" ? "User Login" : "User Signup";
  toggleAuthMode.textContent = state.authMode === "login" ? "Switch to Signup" : "Switch to Login";
  authName.style.display = state.authMode === "signup" ? "block" : "none";
}

function goToAdminPage() {
  window.location.href = "admin.html";
}

async function saveProduct(event) {
  event.preventDefault();
  if (!state.user?.isAdmin || !state.adminCredentials) {
    alert("Admin login required.");
    return;
  }

  const payload = {
    id: $("productId").value || crypto.randomUUID(),
    title: $("productTitle").value.trim(),
    price: Number($("productPrice").value),
    image: $("productImage").value.trim(),
    description: $("productDescription").value.trim(),
    returnPolicy: $("productReturnPolicy").value,
    stockStatus: $("productStockStatus").value
  };
  const normalizedPayload = normalizeProduct(payload);

  try {
    await upsertProductOnServer(normalizedPayload);
    state.products = await fetchProducts();
    productForm.reset();
    $("productId").value = "";
    state.editingId = null;
    renderProducts();
  } catch (error) {
    alert(error.message || "Failed to save product.");
  }
}

function startEditProduct(id) {
  if (!state.user || !state.user.isAdmin) return;
  const product = state.products.find((p) => p.id === id);
  if (!product) return;

  adminPanel.classList.remove("hidden");
  $("productId").value = product.id;
  $("productTitle").value = product.title;
  $("productPrice").value = product.price;
  $("productImage").value = product.image;
  $("productDescription").value = product.description;
  $("productReturnPolicy").value = product.returnPolicy === RETURN_POLICY_NOT_ASSURED ? RETURN_POLICY_NOT_ASSURED : RETURN_POLICY_ASSURED;
  $("productStockStatus").value = product.stockStatus === STOCK_OUT ? STOCK_OUT : STOCK_IN;
  state.editingId = id;
}

async function deleteProduct(id) {
  if (!state.user?.isAdmin || !state.adminCredentials) return;

  try {
    await deleteProductOnServer(id);
    state.products = await fetchProducts();
    state.cart = state.cart.filter((c) => c.id !== id);
    state.wishlist = state.wishlist.filter((w) => w !== id);
    renderProducts();
    renderCart();
    renderWishlist();
  } catch (error) {
    alert(error.message || "Failed to delete product.");
  }
}

function handleCheckout(event) {
  event.preventDefault();

  if (!state.cart.length) {
    alert("Please add at least one product to cart.");
    return;
  }

  const customer = {
    name: $("customerName").value.trim(),
    phone: $("customerPhone").value.trim(),
    address: $("customerAddress").value.trim(),
    payment: $("paymentMethod").value
  };

  const lines = state.cart.map((item, idx) => {
    const product = state.products.find((p) => p.id === item.id);
    if (!product) return "";
    return `${idx + 1}. ${product.title} - Qty: ${item.qty} - ${formatMoney(product.price * item.qty)}`;
  });

  const total = cartTotal.textContent;
  const message =
    `New Gadget Order%0A` +
    `Name: ${encodeURIComponent(customer.name)}%0A` +
    `Phone: ${encodeURIComponent(customer.phone)}%0A` +
    `Address: ${encodeURIComponent(customer.address)}%0A` +
    `Payment: ${encodeURIComponent(customer.payment)}%0A%0A` +
    `Products:%0A${encodeURIComponent(lines.join("\n"))}%0A%0A` +
    `Total: ${encodeURIComponent(total)}`;

  const whatsappNumber = state.settings.whatsappNumber || defaultSettings.whatsappNumber;
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  alert("Order submitted. WhatsApp is opening.");
}

function bindEvents() {
  productGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.addCart) addToCart(target.dataset.addCart);
    if (target.dataset.addWish) addToWishlist(target.dataset.addWish);
    if (target.dataset.editProduct) startEditProduct(target.dataset.editProduct);
    if (target.dataset.deleteProduct) void deleteProduct(target.dataset.deleteProduct);
  });

  cartItems.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.inc) addToCart(target.dataset.inc);
    if (target.dataset.dec) {
      const row = state.cart.find((x) => x.id === target.dataset.dec);
      if (row) row.qty -= 1;
      state.cart = state.cart.filter((x) => x.qty > 0);
      renderCart();
    }
    if (target.dataset.rm) {
      state.cart = state.cart.filter((x) => x.id !== target.dataset.rm);
      renderCart();
    }
  });

  wishlistItems.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.wrm) removeWishlist(target.dataset.wrm);
  });

  authBtn.addEventListener("click", openAuthDialog);
  authForm.addEventListener("submit", handleAuthSubmit);
  toggleAuthMode.addEventListener("click", toggleAuth);
  adminModeBtn.addEventListener("click", goToAdminPage);
  productForm.addEventListener("submit", (event) => void saveProduct(event));
  cancelEdit.addEventListener("click", () => {
    state.editingId = null;
    productForm.reset();
    $("productId").value = "";
    $("productReturnPolicy").value = RETURN_POLICY_ASSURED;
    $("productStockStatus").value = STOCK_IN;
  });
  $("checkoutForm").addEventListener("submit", handleCheckout);
}

async function bootstrap() {
  await initSettings();
  await initProducts();
  applySettings();
  renderProducts();
  renderCart();
  renderWishlist();
  updateUserButton();
  bindEvents();
}

void bootstrap();
