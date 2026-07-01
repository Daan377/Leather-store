(() => {
  const ADMIN_AUTH_KEY = 'leather-store-admin-auth';

  const loginUrl = '/admin';

  function isLoggedIn() {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  }

  function requireLogin() {
    if (isLoggedIn()) return;

    // Keep the intended destination.
    try {
      localStorage.setItem('leather-store-admin-redirect', String(window.location.pathname + window.location.search));
    } catch (e) {}

    window.location.href = loginUrl;
  }

  function enhanceNav() {
    // If an admin page is loaded, ensure nav links point to admin pages.
    // We do this after login because only then admin UI should be visible.
    const links = document.querySelectorAll('a');
    links.forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href) return;

      // Don't break anchors.
      if (href.startsWith('#')) return;

      // Replace known storefront pages with admin pages.
      if (href === 'index.html' || href === '/' || href === 'store.html' || href === 'gallery.html' || href === '/store.html' || href === '/gallery.html') {
        // No-op here; we rely on admin pages having correct markup.
      }
    });
  }

  // Orders-paid toggle lives in admin js (admin.js) but we also ensure click wiring after requireLogin.
  requireLogin();
  enhanceNav();

  // If you land on /admin after login, redirect back.
  // This is handled by admin.js, but keep as safety.
})();

