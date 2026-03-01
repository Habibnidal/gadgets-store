const ADMIN_LOGIN_ENDPOINT = "/api/admin-login";
const PRODUCTS_ENDPOINT = "/api/products";
const RETURN_POLICY_ASSURED = "assured";
const RETURN_POLICY_NOT_ASSURED = "not_assured";
const STOCK_IN = "in_stock";
const STOCK_OUT = "out_of_stock";

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

const state = {
  products: [],
  adminAuthenticated: false,
  adminCredentials: null
};

const $ = (id) => document.getElementById(id);
const adminContent = $("adminContent");
const productsCard = $("productsCard");
const adminProductList = $("adminProductList");
const adminLoginForm = $("adminLoginForm");
const productForm = $("productForm");
const productImageFile = $("productImageFile");
const cancelEdit = $("cancelEdit");
const logoutBtn = $("logoutBtn");

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

async function loadProducts() {
  try {
    state.products = await fetchProducts();
  } catch (error) {
    console.error(error);
    state.products = defaultProducts.map(normalizeProduct);
    alert("Could not load shared products. Showing fallback catalog.");
  }
}

function openAdminContent() {
  adminContent.classList.remove("hidden");
  productsCard.classList.remove("hidden");
}

function closeAdminContent() {
  adminContent.classList.add("hidden");
  productsCard.classList.add("hidden");
}

function renderList() {
  if (!state.products.length) {
    adminProductList.innerHTML = "<p class='hint'>No products available.</p>";
    return;
  }

  adminProductList.innerHTML = state.products
    .map(
      (product) => `
      <div class="list-item admin-product-row">
        <div>
          <strong>${product.title}</strong>
          <div class="hint">${formatMoney(product.price)}</div>
          <div class="hint">${product.description}</div>
          <div class="hint">Return Policy: ${product.returnPolicy === RETURN_POLICY_ASSURED ? "Assured" : "Not Assured"}</div>
          <div class="hint">Stock: ${product.stockStatus === STOCK_OUT ? "Out of Stock" : "In Stock"}</div>
        </div>
        <div class="item-actions">
          <button class="mini" data-edit="${product.id}">Edit</button>
          <button class="mini danger" data-delete="${product.id}">Delete</button>
        </div>
      </div>
    `
    )
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
  openAdminContent();
  renderList();
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

function logout() {
  state.adminAuthenticated = false;
  state.adminCredentials = null;
  closeAdminContent();
  resetForm();
}

function bindEvents() {
  adminLoginForm.addEventListener("submit", (event) => void loginAdmin(event));
  productForm.addEventListener("submit", (event) => void saveProduct(event));
  cancelEdit.addEventListener("click", resetForm);
  logoutBtn.addEventListener("click", logout);

  adminProductList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.edit) fillForm(target.dataset.edit);
    if (target.dataset.delete) void deleteProduct(target.dataset.delete);
  });
}

async function bootstrap() {
  await loadProducts();
  checkSession();
  bindEvents();
}

void bootstrap();
