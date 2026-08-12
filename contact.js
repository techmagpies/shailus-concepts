// ==========================================
// CONTACT / ORDER PAGE LOGIC
// ==========================================

const params = new URLSearchParams(window.location.search);
const productId = parseInt(params.get("id"));

const allProducts = window.products || [];

// DOM elements
const productSelect = document.getElementById("product");
const form = document.getElementById("contactForm");

// WhatsApp number (CHANGE THIS)
const WHATSAPP_NUMBER = "917093640638";

// ==========================================
// 1. LOAD PRODUCTS INTO DROPDOWN
// ==========================================

function loadProducts() {
    if (!productSelect || !allProducts.length) return;

    productSelect.innerHTML = `<option value="">Select Product</option>`;

    allProducts.forEach(product => {
        const option = document.createElement("option");
        option.value = product.name;
        option.textContent = `${product.name} - ${product.price}`;
        productSelect.appendChild(option);
    });
}

// ==========================================
// 2. AUTO SELECT PRODUCT FROM URL
// ==========================================

function autoSelectProduct() {
    if (!productId || !productSelect) return;

    const selectedProduct = allProducts.find(p => p.id === productId);

    if (selectedProduct) {
        productSelect.value = selectedProduct.name;
    }
}

// ==========================================
// 3. BUILD WHATSAPP MESSAGE
// ==========================================

function buildMessage(data) {
    return `
🛒 *New Order Request*

👤 Name: ${data.name}
📱 Phone: ${data.phone}
📧 Email: ${data.email || "Not provided"}

📦 Product: ${data.product}
🔢 Quantity: ${data.quantity}

📍 Address:
${data.address || "Not provided"}

📝 Notes:
${data.message || "No extra details"}

Thank you!
`;
}

// ==========================================
// 4. HANDLE FORM SUBMIT
// ==========================================

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const data = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        product: document.getElementById("product").value,
        quantity: document.getElementById("quantity").value,
        address: document.getElementById("address").value,
        message: document.getElementById("message").value
    };

    const text = buildMessage(data);

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
});

// ==========================================
// INIT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    autoSelectProduct();
});