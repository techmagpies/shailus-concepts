(function(global){
  'use strict';

  const STORAGE_KEY = 'shailusCart';
  function getProducts(){
    return Array.isArray(global.products) ? global.products : [];
  }

  function findProduct(id){
    return getProducts().find(function(product){ return String(product.id) === String(id); }) || null;
  }

  function getPrice(product){
    if(!product || product.price === null || product.price === undefined || product.price === '') return null;
    const price = typeof product.price === 'number'
      ? product.price
      : Number(String(product.price).replace(/[^\d.]/g, ''));
    return Number.isFinite(price) && price >= 0 ? price : null;
  }

  function getMinimumQuantity(product){
    return 1;
  }

  function roundMoney(amount){
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  function getPricing(product, quantity, items){
    const originalUnitPrice = getPrice(product);
    if(originalUnitPrice === null || !Number.isSafeInteger(quantity) || quantity < 1) return null;
    const combinedQuantity = items === undefined ? quantity : count(items);
    const discountPercentage = combinedQuantity >= 1 && combinedQuantity <= 30
      ? 20
      : (combinedQuantity > 50 ? 30 : 0);
    const discountedUnitPrice = roundMoney(originalUnitPrice * (1 - discountPercentage / 100));
    return {
      originalUnitPrice: originalUnitPrice,
      quantity: quantity,
      combinedQuantity: combinedQuantity,
      discountPercentage: discountPercentage,
      discountedUnitPrice: discountedUnitPrice,
      lineTotal: roundMoney(discountedUnitPrice * quantity)
    };
  }

  function resolveImage(value){
    if(typeof value !== 'string' || !value.trim()) return '';
    const path = value.trim().replace(/\\/g, '/');
    if(/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('/')) return path;
    return path.replace(/^(?:\.\.\/)+assets\//i, 'assets/');
  }

  function productImage(product, preferredImage){
    if((!Array.isArray(product.localImages) || product.localImages.length === 0) &&
       typeof global.ensureProductImages === 'function'){
      global.ensureProductImages(product, false);
    }
    const localImages = Array.isArray(product.localImages) ? product.localImages : [];
    const assetImages = [];
    if(Array.isArray(product.images)) assetImages.push(...product.images);
    if(product.image) assetImages.push(product.image);
    const resolvedImages = Array.from(new Set(localImages.concat(assetImages)
      .map(resolveImage)
      .filter(function(path){ return path && !path.startsWith('/uploads/products/'); })));
    const suppliedImage = resolveImage(preferredImage);
    if(suppliedImage && resolvedImages.includes(suppliedImage)) return suppliedImage;
    return resolvedImages[0] || '';
  }

  function makeItem(id, quantity, preferredImage){
    const product = findProduct(id);
    const price = getPrice(product);
    if(!product || price === null) return null;
    if(!Number.isSafeInteger(quantity) || quantity < 1) return null;
    return {
      id: String(product.id),
      name: product.name,
      price: price,
      img: productImage(product, preferredImage),
      qty: quantity
    };
  }

  function normalize(items){
    if(!Array.isArray(items)) return [];
    const normalized = [];
    items.forEach(function(item){
      if(!item || typeof item !== 'object') return;
      const quantity = Number(item.qty);
      const canonical = makeItem(item.id, quantity, item.img);
      if(!canonical) return;
      const existing = normalized.find(function(entry){ return entry.id === canonical.id; });
      if(existing){
        if(Number.isSafeInteger(existing.qty + canonical.qty)) existing.qty += canonical.qty;
        return;
      }
      normalized.push(canonical);
    });
    return normalized;
  }

  function load(){
    try{
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) throw new TypeError('Cart data must be an array.');
      if(global.productsLoaded !== true) return parsed;
      const cart = normalize(parsed);
      if(JSON.stringify(cart) !== JSON.stringify(parsed)) save(cart);
      return cart;
    } catch(error){
      console.error('Unable to load the guest cart from this browser profile.', error);
      return [];
    }
  }

  function save(items){
    if(global.productsLoaded !== true){
      const error = new Error('The product catalog is still loading.');
      console.error('Unable to save the guest cart before the catalog is ready.', error);
      return {ok: false, cart: load(), error: error};
    }
    const cart = normalize(items);
    try{
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      global.dispatchEvent(new CustomEvent('cart:updated', {detail: {cart: cart}}));
      return {ok: true, cart: cart};
    } catch(error){
      console.error('Unable to save the guest cart in this browser profile.', error);
      return {ok: false, cart: cart, error: error};
    }
  }

  function add(id, quantity, preferredImage){
    if(global.productsLoaded !== true) return {ok: false, reason: 'catalog-loading'};
    const product = findProduct(id);
    if(!product || getPrice(product) === null || !Number.isSafeInteger(quantity) || quantity < 1) {
      return {ok: false, reason: 'unavailable'};
    }
    const cart = load();
    const existing = cart.find(function(entry){ return entry.id === String(product.id); });
    if(existing && !Number.isSafeInteger(existing.qty + quantity)) {
      return {ok: false, reason: 'invalid-quantity', cart: cart};
    }
    if(existing) existing.qty += quantity;
    else {
      const item = makeItem(product.id, quantity, preferredImage);
      if(!item) return {ok: false, reason: 'unavailable'};
      cart.push(item);
    }
    return save(cart);
  }

  function setQuantity(id, quantity){
    if(global.productsLoaded !== true) return {ok: false, reason: 'catalog-loading'};
    if(!Number.isSafeInteger(quantity) || quantity < 1) return {ok: false, reason: 'invalid-quantity'};
    const cart = load();
    const item = cart.find(function(entry){ return entry.id === String(id); });
    const product = findProduct(id);
    if(!item || !product) return {ok: false, reason: 'unavailable'};
    item.qty = quantity;
    return save(cart);
  }

  function adjust(id, delta){
    if(global.productsLoaded !== true) return {ok: false, reason: 'catalog-loading'};
    if(!Number.isSafeInteger(delta)) return {ok: false, reason: 'invalid-quantity'};
    const cart = load();
    const item = cart.find(function(entry){ return entry.id === String(id); });
    if(!item) return {ok: false, reason: 'unavailable'};
    const product = findProduct(id);
    const nextQuantity = item.qty + delta;
    if(!Number.isSafeInteger(nextQuantity)) return {ok: false, reason: 'invalid-quantity', cart: cart};
    const minimum = getMinimumQuantity(product);
    if(nextQuantity < minimum){
      if(minimum === 1) return save(cart.filter(function(entry){ return entry.id !== item.id; }));
      return {ok: false, reason: 'minimum'};
    }
    item.qty = nextQuantity;
    return save(cart);
  }

  function remove(id){
    if(global.productsLoaded !== true) return {ok: false, reason: 'catalog-loading'};
    return save(load().filter(function(item){ return item.id !== String(id); }));
  }

  function lineTotal(item, items){
    const product = item && findProduct(item.id);
    const quantity = Number(item && item.qty);
    const cartItems = items === undefined ? load() : items;
    const pricing = getPricing(product, quantity, cartItems);
    return pricing ? pricing.lineTotal : 0;
  }

  function total(items){
    const cartItems = items || load();
    return cartItems.reduce(function(sum, item){ return sum + lineTotal(item, cartItems); }, 0);
  }

  function count(items){
    return (items || load()).reduce(function(sum, item){
      const quantity = Number(item.qty);
      return sum + (Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0);
    }, 0);
  }

  global.ShailusCart = Object.freeze({
    storageKey: STORAGE_KEY,
    isReady: function(){ return global.productsLoaded === true; },
    findProduct: findProduct,
    getPrice: getPrice,
    getPricing: getPricing,
    getMinimumQuantity: getMinimumQuantity,
    makeItem: makeItem,
    load: load,
    save: save,
    add: add,
    setQuantity: setQuantity,
    adjust: adjust,
    remove: remove,
    lineTotal: lineTotal,
    total: total,
    count: count
  });
})(window);
