document.addEventListener("DOMContentLoaded", () => {

    const galleryGrid = document.getElementById("galleryGrid");
    const filterButtons = document.querySelectorAll(".gallery-btn");
    const searchInput = document.getElementById("searchInput");

    if (!galleryGrid || !searchInput) {
        console.error("Missing DOM elements");
        return;
    }

    const products = window.products || [];

    if (products.length === 0) {
        console.error("Products not loaded");
        return;
    }

    let activeCategory = "all";
    let searchText = "";

    function render(list) {
        galleryGrid.innerHTML = "";

        if (list.length === 0) {
            galleryGrid.innerHTML = `
                <h2 style="grid-column:1/-1;text-align:center;">
                    No Products Found
                </h2>`;
            return;
        }

        list.forEach(product => {
            galleryGrid.innerHTML += `
                <div class="gallery-card">
                    
                    <div class="gallery-image" style="position:relative;">
                        <img src="${product.image}" alt="${product.name}">
                        
                        <div class="gallery-overlay">
                            <a href="product-details.html?id=${product.id}">
                                View Details
                            </a>
                        </div>
                    </div>

                    <div class="gallery-info">
                        <span>${product.category}</span>
                        <h3>${product.name}</h3>
                        <p>${product.price}</p>
                    </div>

                </div>
            `;
        });
    }

    function applyFilters() {

        let result = products;

        if (activeCategory !== "all") {
            result = result.filter(p => p.category === activeCategory);
        }

        if (searchText.trim() !== "") {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchText) ||
                p.category.toLowerCase().includes(searchText)
            );
        }

        render(result);
    }

    // INIT
    render(products);

    // FILTER
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {

            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            activeCategory = btn.dataset.category;
            applyFilters();
        });
    });

    // SEARCH
    searchInput.addEventListener("input", (e) => {
        searchText = e.target.value.toLowerCase();
        applyFilters();
    });

});