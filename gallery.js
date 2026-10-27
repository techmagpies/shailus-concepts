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
        "pichwai": ["pichwai"],
        "pichwai-items": ["pichwai"]
    };
    const aliasHeadings = {
        "brass-return-gifts": "Brass Return Gifts",
        "kids-gifts": "Kids Gifts",
        "return-gifts": "Return Gifts",
        "water-bottles": "Water Bottles",
        "crockery-return-gifts": "Crockery Return Gifts",
        "meenakari": "Meenakari",
        "pichwai": "Pichwai",
        "pichwai-items": "Pichwai"
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
                    escapeGalleryHtml(product.category) + '</span>' +
                    (product.priceProvisional === true
                        ? '<span class="provisional-price-note">Provisional price</span>'
                        : '') + '<h2>' +
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
