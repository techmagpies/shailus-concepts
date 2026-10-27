# Product Catalog Guide

This guide describes the product catalog and image handling implemented in this repository. The storefront currently reads a static JSON file from the deployed site; it does not fetch products from MongoDB or a product-management API.

## Source of product data

The storefront catalog is [`giftcard.products.json`](./giftcard.products.json) at the repository root. [`products-data.js`](./products-data.js) fetches this file, checks that it is an array and that every `productId` is present and unique, then exposes its records as `window.products`. It uses each record's `productId` as the frontend `id`.

Each catalog record can include fields such as:

- `productId`: required, unique numeric product ID. Checkout accepts digit-only IDs.
- `name`: the product name.
- `category`: category name used to build the category list and filter products.
- `image`: primary image path saved with the record.
- `images`: optional array of image paths.
- `price`: price in rupees. The checkout service reads this same catalog and converts prices to paise.
- `description`: product detail description.
- `badge`, `rating`, `newArrival`, `bestSeller`: optional display/filter fields.
- `dimensions`, `shape`, `colour`, `material`, `moq`, `customization`: optional detail specifications.

For example, an existing record in `giftcard.products.json` has this shape:

```json
{
  "productId": 119,
  "name": "Wheat Fiber Water Bottle",
  "category": "water bottle",
  "image": "/uploads/products/1791379503052-641360652.png",
  "images": [],
  "price": 99,
  "newArrival": true,
  "bestSeller": false,
  "description": "Lightweight reusable water bottle with a secure lid and convenient carry handle. Ideal for everyday use, office, school, and travel."
}
```

The actual file also contains other fields, including Mongo-style `_id` and date metadata on some records. The storefront loader does not require those database metadata fields.

### Other catalog-looking files

- [`assets/products.json`](./assets/products.json) is a separate JSON file with Mongo-style product records and paths under `assets/images/products`. A repository search found no application code that loads it. Editing it alone will not update the storefront.
- The root [`giftcard.products.json`](./giftcard.products.json) contains Mongo-style `_id` values and some `/uploads/products/...` paths, but the frontend still loads the checked-in JSON file directly. No MongoDB client, product API, product-upload function, or product CRUD admin page was found in this project.
- [`admin/orders.html`](./admin/orders.html) and its API manage orders, not catalog products. Order records use Netlify Blobs; that is separate from the static product catalog.

## Product image storage and resolution

### ID-based storefront images

The main product-image convention is files in the repository's root [`assets/`](./assets) directory, usually named by catalog ID, for example:

```text
assets/id119.png
assets/id119a.png
assets/id119b.png
```

The product loader has an `imageFiles` allow-list in `products-data.js`. `ensureProductImages(product, includeGallery)` constructs `id<productId>`, `id<productId>a`, and `id<productId>b` candidates with `.png`, `.jpeg`, and `.jpg` extensions, but returns only candidates present in that allow-list. It also accepts explicitly cataloged `assets/<filename>` paths when the exact filename is in the same allow-list; use `image` for the primary image and `images` for alternates. With `includeGallery` false, only the first matching image is used. With it true, all matching images are used.

Consequently, adding an image file by itself is not enough: add its exact filename to the `imageFiles` set in `products-data.js`. The main homepage cards, product gallery, product detail page, and cart use `ensureProductImages`. Keep the filename, extension, catalog image path, and allow-list entry consistent. ID-based products can use `assets/id135.png` and its matching allow-list entry `'id135.png'`; products with other existing filenames can use their exact `assets/<filename>` path in the product record.

The root `assets/` directory also contains other files (for example, hero, comparison, and crockery artwork). Do not rename or repurpose existing files; only reference actual product images and allow-list their exact filenames.

### Category image folders

[`assets/images/products/`](./assets/images/products) contains category-organized static images in folders such as `wedding`, `birthday`, `baby`, `corporate`, `festival`, `housewarming`, and `customized`. The separate `assets/products.json` references some of these paths. The current storefront's main product image resolver does **not** scan these folders or use that separate JSON file, so placing a new product image there alone will not make it appear in the current catalog/gallery/detail surfaces. For products in `giftcard.products.json`, use an allow-listed image file directly under `assets/`.

### `/uploads/products/` paths

Some records in `giftcard.products.json` refer to `/uploads/products/<filename>`. Those are URL paths stored in the JSON, not local filesystem paths. No `uploads/products` directory or upload-handling code was found in this repository. The main gallery, detail renderer, and cart use the allow-listed local images created by `products-data.js`; uploaded paths alone do not resolve to local files. Therefore, do not assume that adding a `/uploads/products/...` value to the JSON uploads or deploys the file. For reliable storefront display from this repository, add the image under `assets/`, reference it in the product record, and add its exact filename to the loader allow-list.

## Where products are rendered

- [`index.html`](./index.html) renders New Collections from products with `newArrival: true`, category showcases, and Best Sellers from `bestSeller: true`. The product name appears on New Collections cards; category showcase and best-seller cards also use catalog names, and best-seller cards display price.
- [`gallery.html`](./gallery.html) loads [`gallery.js`](./gallery.js), which renders catalog products by category with their image, category, name, price, and links to details.
- [`views.html`](./views.html) loads the catalog and renders the selected product, its name, description, price, specifications, and image gallery. The selected ID comes from the `?id=<productId>` URL parameter.
- [`cart-store.js`](./cart-store.js) reads product names, prices, and images from `window.products` for cart items. [`checkout.html`](./checkout.html) submits cart item IDs and quantities; the server independently loads the same root catalog in [`netlify/lib/checkout-service.js`](./netlify/lib/checkout-service.js) to verify product IDs and prices.
- [`contact.js`](./contact.js) uses the catalog for contact-form product choices. [`customized.js`](./customized.js) uses it for customized-order product choices.
- [`login.html`](./login.html), [`navbar.html`](./navbar.html), and [`customized-order.html`](./customized-order.html) also load `products-data.js` for storefront/cart or product selection behavior.

Descriptions are displayed on the product detail page (`views.html`), not on the New Collections cards. A description change will therefore be visible after opening that product's detail page.

## Add a product manually

The current root catalog contains 134 products, with unique IDs from the existing records and a maximum ID of 134. The following example uses ID 135 only because it is the next available ID in this checked-out catalog. Before adding a product later, check `giftcard.products.json` again and choose an unused numeric ID; never change an existing product's ID.

1. Add the product image file to the repository's root `assets/` folder, for example:

   ```text
   assets/id135.png
   ```

   If you want additional gallery images, use names such as `assets/id135a.png` and `assets/id135b.png`.

2. In `products-data.js`, add each exact image filename to the existing `imageFiles` set, for example:

   ```js
   'id135.png', 'id135a.png'
   ```

   This is what allows `ensureProductImages` to return those files. Only list files that actually exist.

3. In `giftcard.products.json`, append a comma after the previous last record, then add a record like this before the final `]`. Replace the example product details with accurate details for the item:

   ```json
   {
     "productId": 135,
     "name": "Handcrafted Brass Diya Set",
     "category": "return gift",
     "image": "assets/id135.png",
     "images": ["assets/id135.png", "assets/id135a.png"],
     "price": 499,
     "badge": "New Collections",
     "rating": 5,
     "newArrival": true,
     "bestSeller": false,
     "description": "A handcrafted brass diya set suitable for festive gifting and traditional pooja occasions.",
     "dimensions": "6 inches",
     "shape": "Round",
     "colour": "Gold",
     "material": "Brass",
     "moq": 1,
     "customization": ""
   }
   ```

   The `image` and `images` values are resolved by the file allow-list. Keep those values consistent with the image you added. The object above shows fields already used by actual catalog records; `productId` is the field explicitly required by the loader. A usable checkout product also needs a valid numeric `price`.

4. Ensure the ID is unique, the JSON remains a single valid array, the image files exist at the exact paths, and each image filename is present in the `imageFiles` set. Save the files.

5. To show the product in homepage New Collections, set `"newArrival": true`. To show it in Best Sellers, set `"bestSeller": true`. To have it included in a category, use the intended `"category"` value. `gallery.html` reads products from the catalog and supports category filtering.

## Image naming rules

- For ID-based filenames, match the numeric product ID: `id135.png`, not `id13.png` or `id1350.png`.
- Supported extensions in the resolver are `.png`, `.jpeg`, and `.jpg`; the exact complete filename must also be in the `imageFiles` set.
- For ID-based multiple images, use only the recognized suffixes: no suffix, `a`, or `b`, for example `id135.png`, `id135a.png`, `id135b.png`.
- Avoid overwriting an existing product image. Use an unused product ID and new filenames.
- Catalog image paths use web-style `/` separators. Allow-listed local image paths use the form `assets/<filename>`.
- The upload-style `/uploads/products/...` value does not copy, upload, or generate a file.

## Deployment: local files versus the live site

The catalog and ID-based product images are static repository files. Editing a local JSON file or copying an image into a local folder does not change the deployed website until the changes are included in a deployment.

This project configures Netlify to publish the repository root (`publish = "."` in `netlify.toml`). Once your normal Git workflow includes the catalog edit, new image file(s), and allow-list edit, push the changes to the branch connected to the Netlify site and allow its deploy to complete. Verify the product on the deployed home page or gallery and open its `views.html?id=135` detail page (substitute the chosen ID). Do not put product changes in the orders dashboard or the unrelated `assets/products.json`.

## Admin dashboard and database storage

The existing admin dashboard is for customer orders and order-status updates. It has no product editor or product-image upload control. Product edits made to the local catalog are not written to MongoDB or Netlify Blobs by that dashboard.

The site does use Netlify Blobs for order records, but this repository's product frontend instead fetches the static `giftcard.products.json` file. There is no product API or product database client in the application code found here. Although catalog records contain Mongo-style `_id`/date fields and some upload URL strings, those fields alone do not demonstrate a live MongoDB integration. The separate `assets/products.json` is not loaded by current application code.

## Troubleshooting

If a product is missing or incorrect:

1. Check the deployed `giftcard.products.json` (or the repository copy before deploy) and confirm the record is in the top-level array, its `productId` is present and unique, and its `name`, `category`, `price`, and `description` values are valid.
2. Confirm the browser can load `giftcard.products.json` from the same deployed site. `products-data.js` reports a catalog request/JSON error in the browser console if fetching or parsing fails.
3. Confirm the file is at the exact root path `assets/id<productId>.<extension>` and the filename is present in `products-data.js`'s `imageFiles` set. A file not in that set is intentionally not returned by `ensureProductImages`.
4. Check spelling, capitalization, and extension. Verify the image URL in browser Developer Tools → Network and inspect its HTTP status. A missing static asset usually means the deployed file path does not match the URL.
5. Remember that homepage collection membership depends on `newArrival`, Best Sellers depends on `bestSeller`, and category filters depend on the `category` value.
6. If the name/price appears but the description does not, inspect the record's `description` field and open the product detail page (`views.html?id=<productId>`); cards do not show descriptions.
7. Confirm the deployment that contains both the JSON/image changes and the `products-data.js` allow-list edit has finished. A JSON-only edit cannot make an unlisted image appear in the current gallery/detail renderer.
