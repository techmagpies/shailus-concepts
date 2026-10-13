(function(global){
  'use strict';

  var products = global.products = [];
  var categories = global.categories = [];
  var imageFiles = new Set([
    'id1.png', 'id10.png', 'id100.png', 'id100a.png', 'id101.png', 'id102.png',
    'id103.png', 'id104.jpeg', 'id105.png', 'id106.jpeg', 'id107.png', 'id108.jpeg',
    'id109.png', 'id11.png', 'id110.png', 'id111.png', 'id112.jpeg', 'id113.png',
    'id114.png', 'id115.png', 'id116.png', 'id117.png', 'id118.png', 'id119.png',
    'id11a.png', 'id12.png', 'id12a.png', 'id13.png', 'id13a.png', 'id14.jpg',
    'id14a.jpg', 'id15.png', 'id15a.png', 'id16.png', 'id17.png', 'id18.png',
    'id19.png', 'id19a.png', 'id2.png', 'id20.png', 'id21.png', 'id21a.png',
    'id21b.png', 'id22.jpg', 'id22a.png', 'id23.png', 'id24.png', 'id25.png',
    'id25a.png', 'id26.png', 'id27.png', 'id27a.png', 'id28.png', 'id29.png',
    'id3.png', 'id30.png', 'id31.png', 'id31a.png', 'id32.png', 'id32a.png',
    'id33.png', 'id33a.png', 'id34.png', 'id34a.png', 'id35.png', 'id36.png',
    'id36a.png', 'id37.png', 'id37a.png', 'id38.png', 'id38a.png', 'id39.png',
    'id39a.png', 'id40.png', 'id40a.png', 'id41.png', 'id42.png',
    'id43.png', 'id43a.png', 'id44.png', 'id45.png', 'id46.png', 'id46a.png',
    'id4.png', 'id47.png', 'id47a.png', 'id48.png', 'id48a.png', 'id49.png', 'id49a.png',
    'id5.png', 'id50.png', 'id50a.png', 'id51.png', 'id51a.png', 'id52.png',
    'id52a.png', 'id53.png', 'id53a.png', 'id54.png', 'id54a.png', 'id55.png',
    'id55a.png', 'id55b.png', 'id56.png', 'id57.png', 'id58.png', 'id59.png',
    'id59a.png', 'id6.png', 'id60.png', 'id60a.png', 'id61.png', 'id62.png',
    'id62a.png', 'id63a.png', 'id64.png', 'id65.png', 'id65a.png', 'id66.png',
    'id66a.png', 'id67.png', 'id67a.png', 'id68.png', 'id68a.png', 'id69.png',
    'id69a.png', 'id7.png', 'id70.png', 'id71.png', 'id72.png', 'id73.png',
    'id74.png', 'id74a.png', 'id75.png', 'id75a.png', 'id78.png', 'id78a.png',
    'id79.png', 'id79a.png', 'id8.png', 'id80.png', 'id81.png', 'id81a.png',
    'id82.png', 'id82a.png', 'id83.png', 'id83a.jpeg', 'id84.jpeg', 'id84a.jpeg',
    'id86.jpeg', 'id87.png', 'id88.png', 'id89.jpeg', 'id9.png', 'id91.jpeg',
    'id92.jpeg', 'id93.jpeg', 'id94.jpeg', 'id95.png', 'id96.jpeg', 'id97.png',
    'id98.png', 'id99.jpeg', 'id9a.png'
  ]);

  function localImagePaths(productId){
    var paths = [];
    ['', 'a', 'b'].forEach(function(suffix){
      ['png', 'jpeg', 'jpg'].forEach(function(extension){
        var filename = 'id' + productId + suffix + '.' + extension;
        if(imageFiles.has(filename)) paths.push('assets/' + filename);
      });
    });
    return paths;
  }

  global.ensureProductImages = function(product, includeGallery){
    if(!product || product.id === undefined || product.id === null) return Promise.resolve([]);
    var paths = localImagePaths(product.id);
    product.localImages = includeGallery ? paths : paths.slice(0, 1);
    return Promise.resolve(product.localImages);
  };

  function categorySlug(name){
    return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  global.productsReady = fetch(new URL('giftcard.products.json', document.currentScript.src))
    .then(function(response){
      if(!response.ok) throw new Error('Product catalog request failed with HTTP ' + response.status);
      return response.json();
    })
    .then(function(records){
      if(!Array.isArray(records)) throw new TypeError('The product catalog must be a JSON array.');
      var seenIds = new Set();
      var categoryNames = Array.from(new Set(records.map(function(record){
        return record && record.category;
      }).filter(Boolean)));
      var catalog = records.map(function(record){
        if(!record || record.productId === undefined || record.productId === null){
          throw new TypeError('A product is missing its productId.');
        }
        var id = String(record.productId);
        if(seenIds.has(id)) throw new TypeError('Duplicate productId in catalog: ' + id);
        seenIds.add(id);
        return Object.assign({}, record, {
          id: record.productId,
          localImages: []
        });
      });
      products.splice.apply(products, [0, products.length].concat(catalog));
      categories.splice.apply(categories, [0, categories.length].concat(categoryNames.map(function(name){
        return {name: name, slug: categorySlug(name)};
      })));
      global.productsLoaded = true;
      global.dispatchEvent(new CustomEvent('products:ready', {detail: {products: products, categories: categories}}));
      return products;
    })
    .catch(function(error){
      global.dispatchEvent(new CustomEvent('products:error', {detail: error}));
      throw error;
    });

  global.productsReady.catch(function(error){
    console.error('Unable to load giftcard.products.json; product features are unavailable.', error);
  });
})(window);
