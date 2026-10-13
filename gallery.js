function escapeGalleryHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function initializeGallery() {
    const galleryGrid = document.getElementById("galleryGrid");
    const categoryHeading = document.getElementById("galleryCategoryTitle");
    const searchInput = document.getElementById("gallerySearchInput");

    if (!galleryGrid || !categoryHeading || !searchInput) {
        console.error("Gallery markup is missing required elements.");
        return;
    }

    const products = window.products || [];
    const categories = window.categories || [];
    const categoryNames = new Map(categories.map(category => [
        categorySlug(category.name),
        category.name
    ]));
    const categoryAliases = {
        "brass-return-gifts": ["brass", "antique-gold-brass"],
        "kids-gifts": ["kids-gifts", "kids-gifts-photo-frames"],
        "wooden-trays-boxes": ["wooden-trays-boxes"],
        "home-decor-gifts": ["home-decor-gifts"],
        "pooja-devotional-gifts": ["pooja-devotional-gifts"],
        "german-silver": ["german-silver"],
        "kondapalli-bommalu": ["kondapalli-bommalu"],
        "traditional-gifts": ["traditional-gifts"],
        "return-gifts": ["return-gift", "thoughtful-return-gifts"],
        "crockery-return-gifts": ["crockery-return-gifts"],
        "combos": ["combos"],
        "water-bottles": ["water-bottle"],
        "corporate-gifts": ["corporate-gifts"],
        "meenakari": ["meenakarri", "meenakari-gifts"],
        "pichwai-items": []
    };
    const aliasHeadings = {
        "brass-return-gifts": "Brass Return Gifts",
        "kids-gifts": "Kids Gifts",
        "return-gifts": "Return Gifts",
        "water-bottles": "Water Bottles",
        "crockery-return-gifts": "Crockery Return Gifts",
        "meenakari": "Meenakari",
        "pichwai-items": "Pichwai Items"
    };
    const crockeryImages = {
        1: ["assets/crockery id1-a.jpeg", "assets/crockery id1-b.png"],
        2: ["assets/crockery id2-a.jpeg", "assets/crockery id2-b.png", "assets/crockery id2-c.png", "assets/crockery id2-d.png"],
        3: ["assets/crockery id3.jpeg"],
        4: ["assets/crockery id4.png"],
        5: ["assets/crockery id5.png"],
        6: ["assets/crockery id6.jpg"],
        7: ["assets/crockery id7.jpg"],
        8: ["assets/crockery id8-a.jpg"],
        9: ["assets/crockery id9-a.jpg", "assets/crockery id9-b.jpg"],
        10: ["assets/crockery id10.jpg"],
        11: ["assets/crockery id11.jpg"],
        12: ["assets/crockery id12.jpg"],
        13: ["assets/crockery id13.jpeg"],
        14: ["assets/crockery id14.png"],
        15: ["assets/crockery id15-a.png", "assets/crockery id15-b.png"],
        16: ["assets/crockery id16.png"],
        17: ["assets/crockery id17.png"],
        18: ["assets/crockery id18.png"],
        19: ["assets/crockery id19.png"],
        21: ["assets/crockery id21.png"],
        22: ["assets/crockery id22.png"]
    };

    function categorySlug(value) {
        return String(value || "").trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    if (!products.length) {
        galleryGrid.innerHTML = '<p class="gallery-message">No products are currently available.</p>';
        console.error("The product catalog is empty.");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category") || params.get("cat") || "";
    const requestedSlug = categorySlug(requestedCategory);
    const isAllCategory = !requestedCategory || requestedSlug === "all";
    let selectedCategorySlugs = null;
    let heading = "All Products";

    if (!isAllCategory) {
        if (categoryAliases[requestedSlug]) {
            selectedCategorySlugs = new Set(categoryAliases[requestedSlug].filter(slug => categoryNames.has(slug)));
            heading = aliasHeadings[requestedSlug] || categoryNames.get(requestedSlug) || requestedCategory;
        } else if (categoryNames.has(requestedSlug)) {
            selectedCategorySlugs = new Set([requestedSlug]);
            heading = categoryNames.get(requestedSlug);
        } else {
            selectedCategorySlugs = new Set();
            heading = requestedCategory;
        }
    }

    categoryHeading.textContent = heading;
    document.title = heading + " | Shailu's Concepts";
    if (requestedSlug === "crockery-return-gifts") {
        const imageSection = document.createElement("section");
        imageSection.className = "crockery-image-section";
        imageSection.setAttribute("aria-labelledby", "crockeryImagesHeading");
        imageSection.innerHTML = '<h2 id="crockeryImagesHeading">Crockery Images</h2>' +
            '<div class="crockery-image-grid">' +
            Object.entries(crockeryImages).map(([id, images]) =>
                '<article class="crockery-image-card" data-image-id="' + id + '">' +
                '<div class="crockery-image-main"><img src="' + escapeGalleryHtml(images[0]) +
                '" alt="Crockery ID ' + id + '" loading="lazy"></div>' +
                '<h3>Crockery ID ' + id + '</h3>' +
                (images.length > 1
                    ? '<div class="crockery-image-thumbnails" aria-label="More images for Crockery ID ' + id + '">' +
                      images.map((image, index) =>
                          '<button type="button" class="' + (index === 0 ? "active" : "") +
                          '" data-image-index="' + index + '" aria-label="Show image ' + (index + 1) +
                          ' for Crockery ID ' + id + '"' + (index === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
                          '<img src="' + escapeGalleryHtml(image) + '" alt="" loading="lazy"></button>'
                      ).join("") + '</div>'
                    : '') +
                '</article>'
            ).join("") + '</div>';
        galleryGrid.before(imageSection);
        const productsHeading = document.createElement("h2");
        productsHeading.className = "crockery-products-heading";
        productsHeading.textContent = "Crockery Products";
        galleryGrid.before(productsHeading);
        imageSection.addEventListener("click", function(event) {
            const button = event.target.closest("button[data-image-index]");
            if (!button) return;
            const card = button.closest(".crockery-image-card");
            const images = crockeryImages[card.dataset.imageId];
            const image = card.querySelector(".crockery-image-main img");
            const index = Number(button.dataset.imageIndex);
            image.src = images[index];
            image.alt = "Crockery ID " + card.dataset.imageId + ", image " + (index + 1);
            card.querySelectorAll(".crockery-image-thumbnails button").forEach(function(thumbnail, thumbnailIndex) {
                const active = thumbnailIndex === index;
                thumbnail.classList.toggle("active", active);
                thumbnail.setAttribute("aria-pressed", String(active));
            });
        });
    }

    let searchText = "";
    let renderVersion = 0;

    function render(list) {
        const version = ++renderVersion;
        if (!list.length) {
            galleryGrid.innerHTML = '<p class="gallery-message">No products found in this category.</p>';
            return;
        }
        Promise.all(list.map(product => window.ensureProductImages(product, false))).then(() => {
            if (version !== renderVersion) return;
            galleryGrid.innerHTML = list.map(product => {
                const image = Array.isArray(product.localImages) ? product.localImages[0] : "";
                const price = window.ShailusCart.getPrice(product);
                const productId = encodeURIComponent(product.id);
                return '<article class="gallery-card">' +
                    '<a class="gallery-product" href="views.html?id=' + productId + '">' +
                    '<div class="gallery-image">' +
                    (image
                        ? '<img src="' + escapeGalleryHtml(image) + '" alt="' + escapeGalleryHtml(product.name) + '" loading="lazy">'
                        : '<span class="image-empty">Image unavailable</span>') +
                    '</div><div class="gallery-info"><span class="gallery-category">' +
                    escapeGalleryHtml(product.category) + '</span><h2>' +
                    escapeGalleryHtml(product.name) + '</h2><p>' +
                    (price === null ? "Price unavailable" : "₹" + price.toFixed(2)) +
                    '</p></div></a><div class="gallery-actions">' +
                    '<a href="views.html?id=' + productId + '">View Details</a>' +
                    '<button type="button" class="add-to-cart" data-product-id="' + escapeGalleryHtml(product.id) +
                    '" data-image="' + escapeGalleryHtml(image) + '"' + (price === null ? " disabled" : "") +
                    '>Add to Cart</button></div></article>';
            }).join("");
        }).catch(function(error) {
            console.error("Gallery product images could not be resolved.", error);
            if (version === renderVersion) {
                galleryGrid.innerHTML = '<p class="gallery-message">Product images could not be loaded. Please refresh the page.</p>';
            }
        });
    }

    function applySearch() {
        let result = products;
        if (selectedCategorySlugs !== null) {
            result = result.filter(product => selectedCategorySlugs.has(categorySlug(product.category)));
        }
        if (searchText.trim()) {
            const query = searchText.trim().toLowerCase();
            result = result.filter(product => JSON.stringify(product).toLowerCase().includes(query));
        }
        render(result);
    }

    galleryGrid.addEventListener("click", function(event) {
        const button = event.target.closest(".add-to-cart");
        if (!button) return;

        const result = window.ShailusCart.add(button.dataset.productId, 1, button.dataset.image);
        const status = document.getElementById("galleryStatus");
        if (!result.ok) {
            if (result.error) console.error("The product could not be added to the cart.", result.error);
            if (status) {
                status.textContent = result.reason === "catalog-loading"
                    ? "The product catalog is still loading. Please try again."
                    : "This product could not be added to your cart.";
            }
            return;
        }

        const cartBadge = document.getElementById("cartBadge");
        if (cartBadge) cartBadge.textContent = String(window.ShailusCart.count(result.cart));
        button.textContent = "Added";
        if (status) status.textContent = "Added " + (window.ShailusCart.findProduct(button.dataset.productId).name) + " to your cart.";
        window.setTimeout(function() {
            if (button.isConnected) button.textContent = "Add to Cart";
        }, 1400);
    });

    searchInput.addEventListener("input", event => {
        searchText = event.target.value;
        applySearch();
    });
    applySearch();
}

function categorySlug(value) {
    return String(value || "").trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

window.productsReady.then(initializeGallery).catch(function(error) {
    console.error("Gallery could not load the product catalog.", error);
    const galleryGrid = document.getElementById("galleryGrid");
    if (galleryGrid) {
        galleryGrid.innerHTML = '<p class="gallery-message">Products could not be loaded. Please refresh the page.</p>';
    }
});
