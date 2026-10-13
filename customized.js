/* ==========================================
   ELEMENTS
========================================== */

const form = document.getElementById("customOrderForm");

const productSelect = document.getElementById("product");

const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const occasionInput = document.getElementById("occasion");
const quantityInput = document.getElementById("quantity");
const dateInput = document.getElementById("date");
const detailsInput = document.getElementById("details");
const addressInput = document.getElementById("address");


/* ==========================================
   LOAD PRODUCTS
========================================== */

const params = new URLSearchParams(window.location.search);

const productId = Number(params.get("id"));

function populateCustomizedProducts(catalog) {
    const customizableProducts = catalog.filter(product =>
        typeof product.customization === "string" && product.customization.trim()
    );
    customizableProducts.forEach(product => {
        const option = document.createElement("option");
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });

    if (!productId) return;

    const selectedProduct = catalog.find(product => product.id === productId);

    if (selectedProduct) productSelect.value = selectedProduct.name;
}

window.productsReady.then(populateCustomizedProducts).catch(error => {
    console.error("Customized-order product options could not be loaded.", error);
});


/* ==========================================
   MINIMUM DATE
========================================== */

const today = new Date().toISOString().split("T")[0];

dateInput.min = today;


/* ==========================================
   FORM SUBMIT
========================================== */

form.addEventListener("submit", function (e) {

    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const product = productSelect.value;
    const occasion = occasionInput.value;
    const quantity = quantityInput.value;
    const deliveryDate = dateInput.value;
    const details = detailsInput.value.trim();
    const address = addressInput.value.trim();

    const ownerNumber = "919704123499";

    const message =

`🎁 *New Customized Order Request*

👤 Name : ${name}

📞 Mobile : ${phone}

📧 Email : ${email || "Not Provided"}

🎁 Product : ${product}

🎉 Occasion : ${occasion}

📦 Quantity : ${quantity}

📅 Delivery Date : ${deliveryDate}

📝 Customization Details :
${details}

🏠 Delivery Address :
${address || "Not Provided"}

Please contact me regarding this customized order.

Thank you.`;

    const whatsappURL =
        `https://wa.me/${ownerNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, "_blank");

});


/* ==========================================
   PHONE VALIDATION
========================================== */

phoneInput.addEventListener("input", () => {

    phoneInput.value = phoneInput.value.replace(/\D/g, "");

    if (phoneInput.value.length > 10) {

        phoneInput.value = phoneInput.value.slice(0, 10);

    }

});


/* ==========================================
   QUANTITY VALIDATION
========================================== */

quantityInput.addEventListener("input", () => {

    if (quantityInput.value < 1) {

        quantityInput.value = 1;

    }

});


/* ==========================================
   SUCCESS ANIMATION
========================================== */

const inputs = document.querySelectorAll("input, select, textarea");

inputs.forEach(input => {

    input.addEventListener("focus", () => {

        input.parentElement.classList.add("active");

    });

    input.addEventListener("blur", () => {

        input.parentElement.classList.remove("active");

    });

});