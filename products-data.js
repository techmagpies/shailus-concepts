const products = [

{
    id: 1,
    name: "Premium Wedding Hamper",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding1.jpg",
        "../assets/images/products/wedding/wedding1-2.jpg",
        "../assets/images/products/wedding/wedding1-3.jpg",
        "../assets/images/products/wedding/wedding1-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding1.jpg",
    price: "₹799",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Elegant wedding return gift hamper with premium packing."
},

{
    id: 2,
    name: "Traditional Kumkum Bharani Set",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding2.jpg",
        "../assets/images/products/wedding/wedding2-2.jpg",
        "../assets/images/products/wedding/wedding2-3.jpg",
        "../assets/images/products/wedding/wedding2-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding2.jpg",
    price: "₹499",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Traditional brass kumkum bharani perfect for weddings."
},

{
    id: 3,
    name: "Silver Bowl Return Gift",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding3.jpg",
        "../assets/images/products/wedding/wedding3-2.jpg",
        "../assets/images/products/wedding/wedding3-3.jpg",
        "../assets/images/products/wedding/wedding3-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding3.jpg",
    price: "₹699",
    badge: "Best Seller",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Premium silver bowl gift set for memorable occasions."
},

{
    id: 4,
    name: "Dry Fruit Gift Box",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding4.jpg",
        "../assets/images/products/wedding/wedding4-2.jpg",
        "../assets/images/products/wedding/wedding4-3.jpg",
        "../assets/images/products/wedding/wedding4-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding4.jpg",
    price: "₹899",
    badge: "",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Luxury dry fruit gift box with decorative packaging."
},

{
    id: 5,
    name: "Decorative Potli Gift Set",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding5.jpg",
        "../assets/images/products/wedding/wedding5-2.jpg",
        "../assets/images/products/wedding/wedding5-3.jpg",
        "../assets/images/products/wedding/wedding5-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding5.jpg",
    price: "₹399",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Beautiful decorative potli bags with premium finish."
},

{
    id: 6,
    name: "Wooden Pooja Box",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding6.jpg",
        "../assets/images/products/wedding/wedding6-2.jpg",
        "../assets/images/products/wedding/wedding6-3.jpg",
        "../assets/images/products/wedding/wedding6-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding6.jpg",
    price: "₹849",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Traditional wooden pooja essentials gift box."
},

{
    id: 7,
    name: "Brass Diya Gift Set",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding7.jpg",
        "../assets/images/products/wedding/wedding7-2.jpg",
        "../assets/images/products/wedding/wedding7-3.jpg",
        "../assets/images/products/wedding/wedding7-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding7.jpg",
    price: "₹599",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Elegant brass diya set for return gifting."
},

{
    id: 8,
    name: "Handcrafted Jute Basket",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding8.jpg",
        "../assets/images/products/wedding/wedding8-2.jpg",
        "../assets/images/products/wedding/wedding8-3.jpg",
        "../assets/images/products/wedding/wedding8-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding8.jpg",
    price: "₹549",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Eco-friendly handcrafted jute basket gift."
},

{
    id: 9,
    name: "Premium Chocolate Hamper",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding9.jpg",
        "../assets/images/products/wedding/wedding9-2.jpg",
        "../assets/images/products/wedding/wedding9-3.jpg",
        "../assets/images/products/wedding/wedding9-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding9.jpg",
    price: "₹999",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Luxury assorted chocolate hamper with elegant packaging."
},

{
    id: 10,
    name: "Designer Return Gift Tray",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding10.jpg",
        "../assets/images/products/wedding/wedding10-2.jpg",
        "../assets/images/products/wedding/wedding10-3.jpg",
        "../assets/images/products/wedding/wedding10-4.jpg"
    ],
    image: "../assets/images/products/wedding/wedding10.jpg",
    price: "₹749",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Designer decorative tray with premium return gifts."
},

{
    id: 11,
    name: "Birthday Surprise Hamper",
    category: "birthday",
    images: [
        "../assets/images/products/birthday/birthday1.jpg",
        "../assets/images/products/birthday/birthday1-2.jpg",
        "../assets/images/products/birthday/birthday1-3.jpg",
        "../assets/images/products/birthday/birthday1-4.jpg"
    ],
    image: "../assets/images/products/birthday/birthday1.jpg",
    price: "₹699",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Birthday surprise hamper filled with premium goodies."
},

{
    id: 12,
    name: "Personalized Birthday Box",
    category: "birthday",
    images: [
        "../assets/images/products/birthday/birthday2.jpg",
        "../assets/images/products/birthday/birthday2-2.jpg",
        "../assets/images/products/birthday/birthday2-3.jpg",
        "../assets/images/products/birthday/birthday2-4.jpg"
    ],
    image: "../assets/images/products/birthday/birthday2.jpg",
    price: "₹799",
    badge: "Best Seller",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Customized birthday gift box with name and message."
},

{
    id: 13,
    name: "Birthday Chocolate Basket",
    category: "birthday",
    images: [
        "../assets/images/products/birthday/birthday3.jpg",
        "../assets/images/products/birthday/birthday3-2.jpg",
        "../assets/images/products/birthday/birthday3-3.jpg",
        "../assets/images/products/birthday/birthday3-4.jpg"
    ],
    image: "../assets/images/products/birthday/birthday3.jpg",
    price: "₹649",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Decorative basket filled with premium chocolates."
},

{
    id: 14,
    name: "LED Birthday Photo Frame",
    category: "birthday",
    images: [
        "../assets/images/products/birthday/birthday4.jpg",
        "../assets/images/products/birthday/birthday4-2.jpg",
        "../assets/images/products/birthday/birthday4-3.jpg",
        "../assets/images/products/birthday/birthday4-4.jpg"
    ],
    image: "../assets/images/products/birthday/birthday4.jpg",
    price: "₹999",
    badge: "Popular",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Customized LED photo frame for birthday memories."
},

{
    id: 15,
    name: "Luxury Birthday Gift Basket",
    category: "birthday",
    images: [
        "../assets/images/products/birthday/birthday5.jpg",
        "../assets/images/products/birthday/birthday5-2.jpg",
        "../assets/images/products/birthday/birthday5-3.jpg",
        "../assets/images/products/birthday/birthday5-4.jpg"
    ],
    image: "../assets/images/products/birthday/birthday5.jpg",
    price: "₹1199",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Luxury birthday hamper with premium gift collection."
},
{
    id: 16,
    name: "Baby Welcome Hamper",
    category: "baby",
    images: [
        "../assets/images/products/baby/baby1.jpg",
        "../assets/images/products/baby/baby1-2.jpg",
        "../assets/images/products/baby/baby1-3.jpg",
        "../assets/images/products/baby/baby1-4.jpg"
    ],
    image: "../assets/images/products/baby/baby1.jpg",
    price: "₹799",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Cute baby welcome hamper with premium essentials."
},

{
    id: 17,
    name: "Baby Shower Return Gift",
    category: "baby",
    images: [
        "../assets/images/products/baby/baby2.jpg",
        "../assets/images/products/baby/baby2-2.jpg",
        "../assets/images/products/baby/baby2-3.jpg",
        "../assets/images/products/baby/baby2-4.jpg"
    ],
    image: "../assets/images/products/baby/baby2.jpg",
    price: "₹499",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Elegant baby shower return gift with decorative packaging."
},

{
    id: 18,
    name: "Personalized Baby Frame",
    category: "baby",
    images: [
        "../assets/images/products/baby/baby3.jpg",
        "../assets/images/products/baby/baby3-2.jpg",
        "../assets/images/products/baby/baby3-3.jpg",
        "../assets/images/products/baby/baby3-4.jpg"
    ],
    image: "../assets/images/products/baby/baby3.jpg",
    price: "₹999",
    badge: "Popular",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Customized baby photo frame with LED lighting."
},

{
    id: 19,
    name: "Baby Toy Gift Basket",
    category: "baby",
    images: [
        "../assets/images/products/baby/baby4.jpg",
        "../assets/images/products/baby/baby4-2.jpg",
        "../assets/images/products/baby/baby4-3.jpg",
        "../assets/images/products/baby/baby4-4.jpg"
    ],
    image: "../assets/images/products/baby/baby4.jpg",
    price: "₹699",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Soft toy hamper specially packed for newborn celebrations."
},

{
    id: 20,
    name: "Premium Baby Gift Box",
    category: "baby",
    images: [
        "../assets/images/products/baby/baby5.jpg",
        "../assets/images/products/baby/baby5-2.jpg",
        "../assets/images/products/baby/baby5-3.jpg",
        "../assets/images/products/baby/baby5-4.jpg"
    ],
    image: "../assets/images/products/baby/baby5.jpg",
    price: "₹1199",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Luxury baby gift box with premium accessories."
},

{
    id: 21,
    name: "Housewarming Gift Hamper",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home1.jpg",
        "../assets/images/products/housewarming/home1-2.jpg",
        "../assets/images/products/housewarming/home1-3.jpg",
        "../assets/images/products/housewarming/home1-4.jpg"
    ],
    image: "../assets/images/products/housewarming/home1.jpg",
    price: "₹899",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Beautiful housewarming hamper with premium décor items."
},

{
    id: 22,
    name: "Decorative Wooden Name Plate",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home2.jpg",
        "../assets/images/products/housewarming/home2-2.jpg",
        "../assets/images/products/housewarming/home2-3.jpg",
        "../assets/images/products/housewarming/home2-4.jpg"
    ],
    image: "../assets/images/products/housewarming/home2.jpg",
    price: "₹699",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Customized wooden name plate for new homes."
},

{
    id: 23,
    name: "Indoor Plant Gift Set",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home3.jpg",
        "../assets/images/products/housewarming/home3-2.jpg",
        "../assets/images/products/housewarming/home3-3.jpg",
        "../assets/images/products/housewarming/home3-4.jpg"
    ],
    image: "../assets/images/products/housewarming/home3.jpg",
    price: "₹549",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Eco-friendly indoor plant gift with decorative pot."
},

{
    id: 24,
    name: "Wooden Pooja Gift Box",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home4.jpg",
        "../assets/images/products/housewarming/home4-2.jpg",
        "../assets/images/products/housewarming/home4-3.jpg",
        "../assets/images/products/housewarming/home4-4.jpg"
    ],
    image: "../assets/images/products/housewarming/home4.jpg",
    price: "₹999",
    badge: "Best Seller",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Traditional pooja essentials packed in a premium wooden box."
},

{
    id: 25,
    name: "Luxury Home Decor Basket",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home5.jpg",
        "../assets/images/products/housewarming/home5-2.jpg",
        "../assets/images/products/housewarming/home5-3.jpg",
        "../assets/images/products/housewarming/home5-4.jpg"
    ],
    image: "../assets/images/products/housewarming/home5.jpg",
    price: "₹1299",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Luxury home décor basket perfect for housewarming occasions."
},
{
    id: 26,
    name: "Premium Corporate Gift Hamper",
    category: "corporate",
    images: [
        "../assets/images/products/corporate/corporate1.jpg",
        "../assets/images/products/corporate/corporate1-2.jpg",
        "../assets/images/products/corporate/corporate1-3.jpg",
        "../assets/images/products/corporate/corporate1-4.jpg"
    ],
    image: "../assets/images/products/corporate/corporate1.jpg",
    price: "₹999",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Premium executive corporate gift hamper."
},

{
    id: 27,
    name: "Executive Desk Organizer",
    category: "corporate",
    images: [
        "../assets/images/products/corporate/corporate2.jpg",
        "../assets/images/products/corporate/corporate2-2.jpg",
        "../assets/images/products/corporate/corporate2-3.jpg",
        "../assets/images/products/corporate/corporate2-4.jpg"
    ],
    image: "../assets/images/products/corporate/corporate2.jpg",
    price: "₹799",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Elegant wooden office desk organizer."
},

{
    id: 28,
    name: "Premium Diary & Pen Set",
    category: "corporate",
    images: [
        "../assets/images/products/corporate/corporate3.jpg",
        "../assets/images/products/corporate/corporate3-2.jpg",
        "../assets/images/products/corporate/corporate3-3.jpg",
        "../assets/images/products/corporate/corporate3-4.jpg"
    ],
    image: "../assets/images/products/corporate/corporate3.jpg",
    price: "₹699",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Luxury diary and pen combo for professionals."
},

{
    id: 29,
    name: "Personalized Office Mug",
    category: "corporate",
    images: [
        "../assets/images/products/corporate/corporate4.jpg",
        "../assets/images/products/corporate/corporate4-2.jpg",
        "../assets/images/products/corporate/corporate4-3.jpg",
        "../assets/images/products/corporate/corporate4-4.jpg"
    ],
    image: "../assets/images/products/corporate/corporate4.jpg",
    price: "₹499",
    badge: "Popular",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Customized ceramic mug with company branding."
},

{
    id: 30,
    name: "Luxury Executive Gift Box",
    category: "corporate",
    images: [
        "../assets/images/products/corporate/corporate5.jpg",
        "../assets/images/products/corporate/corporate5-2.jpg",
        "../assets/images/products/corporate/corporate5-3.jpg",
        "../assets/images/products/corporate/corporate5-4.jpg"
    ],
    image: "../assets/images/products/corporate/corporate5.jpg",
    price: "₹1499",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Luxury corporate gift collection for executives."
},

{
    id: 31,
    name: "Diwali Dry Fruit Hamper",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival1.jpg",
        "../assets/images/products/festival/festival1-2.jpg",
        "../assets/images/products/festival/festival1-3.jpg",
        "../assets/images/products/festival/festival1-4.jpg"
    ],
    image: "../assets/images/products/festival/festival1.jpg",
    price: "₹999",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Premium dry fruit hamper for festive celebrations."
},

{
    id: 32,
    name: "Decorative Brass Diya Set",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival2.jpg",
        "../assets/images/products/festival/festival2-2.jpg",
        "../assets/images/products/festival/festival2-3.jpg",
        "../assets/images/products/festival/festival2-4.jpg"
    ],
    image: "../assets/images/products/festival/festival2.jpg",
    price: "₹699",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Traditional brass diya set for festive gifting."
},

{
    id: 33,
    name: "Festival Sweet Box",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival3.jpg",
        "../assets/images/products/festival/festival3-2.jpg",
        "../assets/images/products/festival/festival3-3.jpg",
        "../assets/images/products/festival/festival3-4.jpg"
    ],
    image: "../assets/images/products/festival/festival3.jpg",
    price: "₹599",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Traditional sweets packed beautifully for gifting."
},

{
    id: 34,
    name: "Luxury Candle Hamper",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival4.jpg",
        "../assets/images/products/festival/festival4-2.jpg",
        "../assets/images/products/festival/festival4-3.jpg",
        "../assets/images/products/festival/festival4-4.jpg"
    ],
    image: "../assets/images/products/festival/festival4.jpg",
    price: "₹899",
    badge: "Popular",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Decorative scented candle gift hamper."
},

{
    id: 35,
    name: "Premium Festival Gift Basket",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival5.jpg",
        "../assets/images/products/festival/festival5-2.jpg",
        "../assets/images/products/festival/festival5-3.jpg",
        "../assets/images/products/festival/festival5-4.jpg"
    ],
    image: "../assets/images/products/festival/festival5.jpg",
    price: "₹1299",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Luxury festive hamper with premium gifts and sweets."
},
{
    id: 36,
    name: "Customized LED Photo Frame",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom1.jpg",
        "../assets/images/products/customized/custom1-2.jpg",
        "../assets/images/products/customized/custom1-3.jpg",
        "../assets/images/products/customized/custom1-4.jpg"
    ],
    image: "../assets/images/products/customized/custom1.jpg",
    price: "₹999",
    badge: "Best Seller",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Personalized LED photo frame with your favorite memories."
},

{
    id: 37,
    name: "Resin Photo Frame",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom2.jpg",
        "../assets/images/products/customized/custom2-2.jpg",
        "../assets/images/products/customized/custom2-3.jpg",
        "../assets/images/products/customized/custom2-4.jpg"
    ],
    image: "../assets/images/products/customized/custom2.jpg",
    price: "₹1299",
    badge: "Popular",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Premium handcrafted resin photo frame."
},

{
    id: 38,
    name: "Spotify Acrylic Plaque",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom3.jpg",
        "../assets/images/products/customized/custom3-2.jpg",
        "../assets/images/products/customized/custom3-3.jpg",
        "../assets/images/products/customized/custom3-4.jpg"
    ],
    image: "../assets/images/products/customized/custom3.jpg",
    price: "₹899",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Personalized Spotify acrylic music plaque."
},

{
    id: 39,
    name: "Customized Wooden Name Board",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom4.jpg",
        "../assets/images/products/customized/custom4-2.jpg",
        "../assets/images/products/customized/custom4-3.jpg",
        "../assets/images/products/customized/custom4-4.jpg"
    ],
    image: "../assets/images/products/customized/custom4.jpg",
    price: "₹799",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Personalized wooden name board for homes."
},

{
    id: 40,
    name: "Couple Photo Frame",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom5.jpg",
        "../assets/images/products/customized/custom5-2.jpg",
        "../assets/images/products/customized/custom5-3.jpg",
        "../assets/images/products/customized/custom5-4.jpg"
    ],
    image: "../assets/images/products/customized/custom5.jpg",
    price: "₹1099",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Romantic personalized couple photo frame."
},

{
    id: 41,
    name: "Customized Coffee Mug",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom6.jpg",
        "../assets/images/products/customized/custom6.jpg",
        "../assets/images/products/customized/custom6.jpg",
        "../assets/images/products/customized/custom6.jpg"
    ],
    image: "../assets/images/products/customized/custom6.jpg",
    price: "₹499",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Printed ceramic mug with your own design."
},

{
    id: 42,
    name: "Customized Wall Clock",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom7.jpg",
        "../assets/images/products/customized/custom7.jpg",
        "../assets/images/products/customized/custom7.jpg",
        "../assets/images/products/customized/custom7.jpg"
    ],
    image: "../assets/images/products/customized/custom7.jpg",
    price: "₹999",
    badge: "",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Personalized wall clock with family photos."
},

{
    id: 43,
    name: "Crystal Photo Gift",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom8.jpg",
        "../assets/images/products/customized/custom8.jpg",
        "../assets/images/products/customized/custom8.jpg",
        "../assets/images/products/customized/custom8.jpg"
    ],
    image: "../assets/images/products/customized/custom8.jpg",
    price: "₹1499",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Premium crystal engraved photo keepsake."
},

{
    id: 44,
    name: "Personalized Wooden Engraving",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom9.jpg",
        "../assets/images/products/customized/custom9.jpg",
        "../assets/images/products/customized/custom9.jpg",
        "../assets/images/products/customized/custom9.jpg"
    ],
    image: "../assets/images/products/customized/custom9.jpg",
    price: "₹899",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Laser engraved wooden keepsake with your message."
},

{
    id: 45,
    name: "Premium Personalized Gift Box",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom10.jpg",
        "../assets/images/products/customized/custom10.jpg",
        "../assets/images/products/customized/custom10.jpg",
        "../assets/images/products/customized/custom10.jpg"
    ],
    image: "../assets/images/products/customized/custom10.jpg",
    price: "₹1599",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Luxury customized gift box for every special occasion."
},
{
    id: 46,
    name: "Luxury Chocolate Hamper",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival6.jpg",
        "../assets/images/products/festival/festival6.jpg",
        "../assets/images/products/festival/festival6.jpg",
        "../assets/images/products/festival/festival6.jpg"
    ],
    image: "../assets/images/products/festival/festival6.jpg",
    price: "₹1499",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Premium chocolate hamper for festivals and celebrations."
},

{
    id: 47,
    name: "Decorative Dry Fruit Tray",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival7.jpg",
        "../assets/images/products/festival/festival7.jpg",
        "../assets/images/products/festival/festival7.jpg",
        "../assets/images/products/festival/festival7.jpg"
    ],
    image: "../assets/images/products/festival/festival7.jpg",
    price: "₹999",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Decorative dry fruit tray with premium packing."
},

{
    id: 48,
    name: "Brass Pooja Thali Set",
    category: "festival",
    images: [
        "../assets/images/products/festival/festival8.jpg",
        "../assets/images/products/festival/festival8.jpg",
        "../assets/images/products/festival/festival8.jpg",
        "../assets/images/products/festival/festival8.jpg"
    ],
    image: "../assets/images/products/festival/festival8.jpg",
    price: "₹1199",
    badge: "Popular",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Traditional brass pooja thali gift set."
},

{
    id: 49,
    name: "Ceramic Tea Cup Gift Set",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home6.jpg",
        "../assets/images/products/housewarming/home6.jpg",
        "../assets/images/products/housewarming/home6.jpg",
        "../assets/images/products/housewarming/home6.jpg"
    ],
    image: "../assets/images/products/housewarming/home6.jpg",
    price: "₹799",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Elegant ceramic tea cup gift set."
},

{
    id: 50,
    name: "Decorative Urli Bowl",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home7.jpg",
        "../assets/images/products/housewarming/home7.jpg",
        "../assets/images/products/housewarming/home7.jpg",
        "../assets/images/products/housewarming/home7.jpg"
    ],
    image: "../assets/images/products/housewarming/home7.jpg",
    price: "₹999",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Premium decorative urli bowl for home décor."
},

{
    id: 51,
    name: "German Silver Bowl Set",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding11.jpg",
        "../assets/images/products/wedding/wedding11.jpg",
        "../assets/images/products/wedding/wedding11.jpg",
        "../assets/images/products/wedding/wedding11.jpg"
    ],
    image: "../assets/images/products/wedding/wedding11.jpg",
    price: "₹1599",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Premium German silver bowl gift set."
},

{
    id: 52,
    name: "Decorative Glass Jar Set",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home8.jpg",
        "../assets/images/products/housewarming/home8.jpg",
        "../assets/images/products/housewarming/home8.jpg",
        "../assets/images/products/housewarming/home8.jpg"
    ],
    image: "../assets/images/products/housewarming/home8.jpg",
    price: "₹899",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Decorative airtight glass jar gift set."
},

{
    id: 53,
    name: "Luxury Wooden Jewelry Box",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding12.jpg",
        "../assets/images/products/wedding/wedding12.jpg",
        "../assets/images/products/wedding/wedding12.jpg",
        "../assets/images/products/wedding/wedding12.jpg"
    ],
    image: "../assets/images/products/wedding/wedding12.jpg",
    price: "₹1299",
    badge: "Best Seller",
    rating: 5,
    newArrival: false,
    bestSeller: true,
    description: "Handcrafted wooden jewelry organizer box."
},

{
    id: 54,
    name: "Tulsi Pot Gift",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home9.jpg",
        "../assets/images/products/housewarming/home9.jpg",
        "../assets/images/products/housewarming/home9.jpg",
        "../assets/images/products/housewarming/home9.jpg"
    ],
    image: "../assets/images/products/housewarming/home9.jpg",
    price: "₹699",
    badge: "",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Traditional tulsi planter for housewarming."
},

{
    id: 55,
    name: "Resin Name Plate",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom11.jpg",
        "../assets/images/products/customized/custom11.jpg",
        "../assets/images/products/customized/custom11.jpg",
        "../assets/images/products/customized/custom11.jpg"
    ],
    image: "../assets/images/products/customized/custom11.jpg",
    price: "₹999",
    badge: "New",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Premium customized resin name plate."
},

{
    id: 56,
    name: "Personalized Calendar",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom12.jpg",
        "../assets/images/products/customized/custom12.jpg",
        "../assets/images/products/customized/custom12.jpg",
        "../assets/images/products/customized/custom12.jpg"
    ],
    image: "../assets/images/products/customized/custom12.jpg",
    price: "₹599",
    badge: "",
    rating: 5,
    newArrival: false,
    bestSeller: false,
    description: "Desk calendar printed with your favorite photos."
},

{
    id: 57,
    name: "Customized Key Holder",
    category: "customized",
    images: [
        "../assets/images/products/customized/custom13.jpg",
        "../assets/images/products/customized/custom13.jpg",
        "../assets/images/products/customized/custom13.jpg",
        "../assets/images/products/customized/custom13.jpg"
    ],
    image: "../assets/images/products/customized/custom13.jpg",
    price: "₹699",
    badge: "",
    rating: 5,
    newArrival: true,
    bestSeller: false,
    description: "Wooden personalized key holder for homes."
},

{
    id: 58,
    name: "Acrylic Temple",
    category: "housewarming",
    images: [
        "../assets/images/products/housewarming/home10.jpg",
        "../assets/images/products/housewarming/home10.jpg",
        "../assets/images/products/housewarming/home10.jpg",
        "../assets/images/products/housewarming/home10.jpg"
    ],
    image: "../assets/images/products/housewarming/home10.jpg",
    price: "₹1699",
    badge: "Luxury",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Modern acrylic temple for home décor."
},

{
    id: 59,
    name: "Luxury Gift Combo",
    category: "corporate",
    images: [
        "../assets/images/products/corporate/corporate6.jpg",
        "../assets/images/products/corporate/corporate6.jpg",
        "../assets/images/products/corporate/corporate6.jpg",
        "../assets/images/products/corporate/corporate6.jpg"
    ],
    image: "../assets/images/products/corporate/corporate6.jpg",
    price: "₹1999",
    badge: "Premium",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Luxury executive combo with premium accessories."
},

{
    id: 60,
    name: "Premium Return Gift Collection",
    category: "wedding",
    images: [
        "../assets/images/products/wedding/wedding13.jpg",
        "../assets/images/products/wedding/wedding13.jpg",
        "../assets/images/products/wedding/wedding13.jpg",
        "../assets/images/products/wedding/wedding13.jpg"
    ],
    image: "../assets/images/products/wedding/wedding13.jpg",
    price: "₹2499",
    badge: "Premium",
    rating: 5,
    newArrival: true,
    bestSeller: true,
    description: "Exclusive premium return gift collection for grand celebrations."
}

];
window.products = products;