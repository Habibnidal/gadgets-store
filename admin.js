const STORAGE_KEY = "naisham_products_v1";
const ADMIN_LOGIN_ENDPOINT = "/api/admin-login";
const RETURN_POLICY_ASSURED = "assured";
const RETURN_POLICY_NOT_ASSURED = "not_assured";
const STOCK_IN = "in_stock";
const STOCK_OUT = "out_of_stock";

const defaultProducts = [
  {
    id: crypto.randomUUID(),
    title: "Smart Watch X2",
    price: 59.99,
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80",
    description: "Fitness tracking, heart-rate monitor, and 5-day battery.",
    returnPolicy: RETURN_POLICY_ASSURED,
    stockStatus: STOCK_IN
  },
  {
    id: crypto.randomUUID(),
    title: "Noise Cancelling Headset",
    price: 84.5,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
    description: "Deep bass wireless headset with fast charging support.",
    returnPolicy: RETURN_POLICY_ASSURED,
    stockStatus: STOCK_IN
  },
  {
    id: crypto.randomUUID(),
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
  adminAuthenticated: false
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

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const baseProducts = saved ? JSON.parse(saved) : defaultProducts;
  state.products = baseProducts.map(normalizeProduct);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
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
  return state.adminAuthenticated;
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

  const idx = state.products.findIndex((item) => item.id === normalizedPayload.id);
  if (idx >= 0) state.products[idx] = normalizedPayload;
  else state.products.push(normalizedPayload);

  saveProducts();
  renderList();
  resetForm();
}

function deleteProduct(id) {
  if (!isAdminLoggedIn()) return;
  state.products = state.products.filter((item) => item.id !== id);
  saveProducts();
  renderList();
}

function logout() {
  state.adminAuthenticated = false;
  closeAdminContent();
  resetForm();
}

function bindEvents() {
  adminLoginForm.addEventListener("submit", loginAdmin);
  productForm.addEventListener("submit", saveProduct);
  cancelEdit.addEventListener("click", resetForm);
  logoutBtn.addEventListener("click", logout);

  adminProductList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.edit) fillForm(target.dataset.edit);
    if (target.dataset.delete) deleteProduct(target.dataset.delete);
  });
}

loadProducts();
checkSession();
bindEvents();
