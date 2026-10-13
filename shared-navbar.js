(function () {
  'use strict';

  var mount = document.getElementById('shared-navbar-mount');
  if (!mount) return;

  var categories = [
    ['Brass return gifts', 'brass-return-gifts'],
    ['Kids Gifts', 'kids-gifts'],
    ['Wooden Trays & Boxes', 'wooden-trays-boxes'],
    ['Home Decor & Gifts', 'home-decor-gifts'],
    ['Crockery Return Gifts', 'crockery-return-gifts'],
    ['German Silver', 'german-silver'],
    ['Kondapalli Bommalu', 'kondapalli-bommalu'],
    ['Traditional Gifts', 'traditional-gifts'],
    ['Return Gifts', 'return-gifts'],
    ['Combos', 'combos'],
    ['Water Bottles', 'water-bottles']
  ];
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var categoryLinks = categories.map(function (category) {
    return '<a href="gallery.html?category=' + encodeURIComponent(category[1]) + '">' +
      category[0] + '</a>';
  }).join('');

  mount.innerHTML =
    '<header class="site-header shared-site-header" id="siteHeader">' +
      '<div class="top-bar">' +
        '<div class="top-left"><div class="search-wrap" id="searchWrap">' +
          '<button class="icon-btn" type="button" id="searchToggleBtn" aria-label="Open search" aria-expanded="false">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
              '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
            '</svg>' +
          '</button>' +
          '<input type="search" id="searchInput" class="search-input" placeholder="Search products..." aria-label="Search products">' +
        '</div></div>' +
        '<a class="brand-center" href="index.html" aria-label="Shailu\'s Concepts home">' +
          '<img src="assets/logo.jpeg" alt="Shailu\'s Concepts">' +
          '<span class="brand-name">Shailu\'s Concepts</span>' +
          '<span class="brand-tagline">ONE STOP DESTINATION FOR ALL UNIQUE RETURN GIFTS</span>' +
        '</a>' +
        '<div class="top-right">' +
          '<a class="icon-btn" aria-label="Login" href="login.html" title="Login">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>' +
            '</svg>' +
          '</a>' +
          '<button class="icon-btn" type="button" id="cartIconBtn" aria-label="Cart" title="Open cart">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>' +
              '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' +
            '</svg><span class="cart-badge" id="cartBadge" aria-live="polite">0</span>' +
          '</button>' +
          '<button class="hamburger" id="hamburgerBtn" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mainNavRow">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="navbar" id="mainNavBar" aria-label="Main navigation">' +
        '<div class="nav-row" id="mainNavRow">' +
          '<a href="index.html"' + (currentPage === 'index.html' ? ' aria-current="page"' : '') + '>Home</a>' +
          '<div class="dropdown" id="returnGiftsDropdown">' +
            '<button class="drop-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="sharedCategoryMenu">' +
              'Return Gifts <span class="arrow" aria-hidden="true">&#9662;</span>' +
            '</button>' +
            '<div class="dropdown-menu" id="sharedCategoryMenu">' + categoryLinks + '</div>' +
          '</div>' +
          '<a href="index.html#collections">New Collection</a>' +
          '<a href="gallery.html?category=combos">Combos</a>' +
          '<a href="gallery.html?category=corporate-gifts">Corporate Gifts</a>' +
          '<a href="#">Terms &amp; Conditions</a>' +
        '</div>' +
      '</nav>' +
    '</header>';

  var header = mount.querySelector('.site-header');
  var navRow = mount.querySelector('#mainNavRow');
  var dropdown = mount.querySelector('#returnGiftsDropdown');
  var dropdownButton = dropdown.querySelector('.drop-toggle');
  var searchWrap = mount.querySelector('#searchWrap');
  var searchInput = mount.querySelector('#searchInput');
  var searchButton = mount.querySelector('#searchToggleBtn');
  var hamburger = mount.querySelector('#hamburgerBtn');
  var cartBadge = mount.querySelector('#cartBadge');
  var cartButton = mount.querySelector('#cartIconBtn');
  var hoverOpenedDropdown = false;

  function closeDropdown() {
    dropdown.classList.remove('open');
    dropdownButton.setAttribute('aria-expanded', 'false');
  }

  function updateCartBadge() {
    if (window.ShailusCart && typeof window.ShailusCart.count === 'function') {
      cartBadge.textContent = String(window.ShailusCart.count());
    }
  }

  function submitSearch() {
    var query = searchInput.value.trim();
    if (!query) return;
    if (currentPage === 'index.html' && typeof window.filterProducts === 'function') {
      window.filterProducts(query);
      var collections = document.getElementById('collections');
      if (collections) collections.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (currentPage === 'gallery.html') {
      var gallerySearch = document.getElementById('gallerySearchInput');
      if (gallerySearch) {
        gallerySearch.value = query;
        gallerySearch.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }
    window.location.href = 'index.html?search=' + encodeURIComponent(query);
  }

  dropdownButton.addEventListener('click', function () {
    if (hoverOpenedDropdown) {
      hoverOpenedDropdown = false;
      return;
    }
    var isOpen = dropdown.classList.toggle('open');
    dropdownButton.setAttribute('aria-expanded', String(isOpen));
  });

  dropdown.addEventListener('mouseenter', function () {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hoverOpenedDropdown = true;
      dropdown.classList.add('open');
      dropdownButton.setAttribute('aria-expanded', 'true');
    }
  });
  dropdown.addEventListener('mouseleave', function () {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) closeDropdown();
    hoverOpenedDropdown = false;
  });

  searchButton.addEventListener('click', function () {
    var isExpanded = searchWrap.classList.toggle('expanded');
    searchButton.setAttribute('aria-expanded', String(isExpanded));
    if (isExpanded) searchInput.focus();
    else {
      searchInput.value = '';
      if (currentPage === 'index.html' && typeof window.filterProducts === 'function') {
        window.filterProducts('');
      }
    }
  });
  searchInput.addEventListener('input', function () {
    if (currentPage === 'index.html' && typeof window.filterProducts === 'function') {
      window.filterProducts(searchInput.value);
    }
    if (currentPage === 'gallery.html') {
      var gallerySearch = document.getElementById('gallerySearchInput');
      if (gallerySearch) {
        gallerySearch.value = searchInput.value;
        gallerySearch.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitSearch();
    }
  });

  hamburger.addEventListener('click', function () {
    var isOpen = navRow.classList.toggle('mobile-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  });
  cartButton.addEventListener('click', function () {
    if (typeof window.openCart === 'function') window.openCart();
    else window.location.href = 'index.html?cart=open';
  });

  document.addEventListener('click', function (event) {
    if (!dropdown.contains(event.target)) closeDropdown();
    if (!header.contains(event.target)) {
      navRow.classList.remove('mobile-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation menu');
      searchWrap.classList.remove('expanded');
      searchButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      var focusDropdown = dropdown.contains(document.activeElement);
      var mobileNavWasOpen = navRow.classList.contains('mobile-open');
      var wasOpen = dropdown.classList.contains('open') ||
        mobileNavWasOpen ||
        searchWrap.classList.contains('expanded');
      closeDropdown();
      navRow.classList.remove('mobile-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation menu');
      searchWrap.classList.remove('expanded');
      searchButton.setAttribute('aria-expanded', 'false');
      if (mobileNavWasOpen) hamburger.focus();
      else if (focusDropdown) dropdownButton.focus();
      else if (wasOpen) searchButton.focus();
    }
    if (event.key === 'ArrowDown' && document.activeElement === dropdownButton) {
      var firstLink = dropdown.querySelector('.dropdown-menu a');
      if (!dropdown.classList.contains('open')) {
        dropdown.classList.add('open');
        dropdownButton.setAttribute('aria-expanded', 'true');
      }
      if (firstLink) {
        event.preventDefault();
        firstLink.focus();
      }
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp' ||
        event.key === 'Home' || event.key === 'End') &&
        !event.defaultPrevented &&
        dropdown.classList.contains('open') &&
        dropdown.contains(document.activeElement) &&
        document.activeElement.matches('.dropdown-menu a')) {
      var links = Array.prototype.slice.call(dropdown.querySelectorAll('.dropdown-menu a'));
      var index = links.indexOf(document.activeElement);
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        links[event.key === 'Home' ? 0 : links.length - 1].focus();
      } else {
        var direction = event.key === 'ArrowDown' ? 1 : -1;
        event.preventDefault();
        links[(index + direction + links.length) % links.length].focus();
      }
    }
  });

  window.addEventListener('storage', updateCartBadge);
  window.addEventListener('cart:updated', updateCartBadge);
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('header.site-header:not(.shared-site-header), body > .top-bar, body > nav.nav-bar, body > nav.navbar')
      .forEach(function (legacyHeader) { legacyHeader.remove(); });
    if (currentPage === 'gallery.html') document.body.style.paddingTop = '0';
    updateCartBadge();
    if (currentPage === 'index.html') {
      var query = new URLSearchParams(window.location.search).get('search');
      if (query && typeof window.filterProducts === 'function') {
        searchInput.value = query;
        window.filterProducts(query);
      }
      if (new URLSearchParams(window.location.search).get('cart') === 'open' &&
          typeof window.openCart === 'function') {
        window.openCart();
      }
      if (window.location.hash === '#collections') {
        var collectionSection = document.getElementById('collections');
        if (collectionSection) {
          window.requestAnimationFrame(function () {
            collectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      }
    }
  });
  updateCartBadge();
})();
