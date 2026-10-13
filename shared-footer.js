(function () {
  'use strict';

  var footerMarkup =
    '<div class="shared-footer-top">' +
      '<section class="shared-footer-brand">' +
        '<a href="index.html" aria-label="Shailu\'s Concepts home"><img src="assets/logo.jpeg" alt="Shailu\'s Concepts"></a>' +
        '<p>At Shailu\'s Concepts, we offer wholesale return gifts for weddings, birthdays, baby showers, housewarmings, corporate events, and festivals. Our theme-based and customised gifts make every occasion special.</p>' +
      '</section>' +
      '<section class="shared-footer-column">' +
        '<h2>Useful Links</h2>' +
        '<ul><li><a href="index.html">Home</a></li><li><a href="index.html#collections">New Collection</a></li>' +
        '<li><a href="gallery.html">Browse Products</a></li><li><a href="customized-order.html">Customized Orders</a></li>' +
        '<li><a href="contact.html">Contact Us</a></li><li><a href="login.html">Login</a></li></ul>' +
      '</section>' +
      '<section class="shared-footer-column">' +
        '<h2>Opening Hours</h2>' +
        '<p>Monday – Saturday:<br>10.00 am – 7.30 pm</p><p>Sunday: Opens 10 am</p>' +
        '<h3>Follow Us</h3>' +
        '<div class="shared-footer-social">' +
          '<a href="https://www.instagram.com" target="_blank" rel="noopener" aria-label="Instagram">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="18" cy="6" r="1"></circle></svg>' +
          '</a>' +
          '<a href="https://wa.me/919704123499" target="_blank" rel="noopener" aria-label="WhatsApp">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5Z"></path><path d="M9 9c.5 2 2 3.5 4 4l1-1 2 1c-.4 2-2 2-3 2-3-1-5-3-6-6 0-1 .5-2.5 2-3l1 2Z"></path></svg>' +
          '</a>' +
        '</div>' +
      '</section>' +
      '<section class="shared-footer-column shared-footer-contact">' +
        '<h2>Connect With Us</h2>' +
        '<p><span aria-hidden="true">⌖</span> Shop No : 39, Shivasankara Shopping Mall, Korrapadu Rd, YMR Colony, Proddatur, Andhra Pradesh – 516360</p>' +
        '<p><span aria-hidden="true">✉</span> <a href="mailto:shailusconcepts@gmail.com">shailusconcepts@gmail.com</a></p>' +
        '<p><span aria-hidden="true">☎</span> <a href="tel:+919704123499">+91 97041 23499</a></p>' +
      '</section>' +
    '</div>' +
    '<div class="shared-footer-bottom"><p>Copyright &copy; ' + new Date().getFullYear() + ' <strong>Shailu\'s Concepts</strong>. All rights reserved.</p></div>';

  var footer = document.createElement('footer');
  footer.className = 'shared-footer';
  footer.innerHTML = footerMarkup;

  var existingFooter = document.querySelector('footer.footer, #footer');
  if (existingFooter) {
    existingFooter.replaceWith(footer);
  } else {
    document.body.appendChild(footer);
  }

  if (!document.getElementById('floatingWhatsAppButton')) {
    var whatsappButton = document.createElement('a');
    whatsappButton.id = 'floatingWhatsAppButton';
    whatsappButton.className = 'floating-whatsapp-button';
    whatsappButton.href = 'https://wa.me/919704123499';
    whatsappButton.target = '_blank';
    whatsappButton.rel = 'noopener noreferrer';
    whatsappButton.setAttribute('aria-label', 'Chat with us on WhatsApp');
    whatsappButton.innerHTML =
      '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
        '<path d="M16.02 3.2A12.7 12.7 0 0 0 5.1 22.37L3.4 28.6l6.4-1.68A12.7 12.7 0 1 0 16.02 3.2Zm0 23.1c-2.03 0-4.03-.54-5.78-1.57l-.42-.25-3.8 1 1.02-3.7-.27-.44A10.36 10.36 0 1 1 16.02 26.3Zm5.69-7.76c-.31-.16-1.83-.9-2.12-1-.28-.1-.49-.16-.7.16-.2.31-.8 1-.98 1.2-.18.2-.36.23-.67.08-.31-.16-1.31-.49-2.5-1.54-.93-.83-1.56-1.85-1.74-2.16-.18-.31-.02-.48.13-.63.14-.13.31-.36.47-.54.15-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.5-.51-.7-.52h-.6c-.21 0-.54.08-.82.39-.28.31-1.08 1.05-1.08 2.56 0 1.52 1.1 2.98 1.26 3.18.15.21 2.16 3.3 5.23 4.63.73.32 1.3.51 1.75.65.73.23 1.4.2 1.92.12.59-.09 1.83-.75 2.09-1.47.26-.73.26-1.36.18-1.49-.08-.13-.28-.2-.59-.36Z"/>' +
      '</svg>';
    document.body.appendChild(whatsappButton);
  }
})();
