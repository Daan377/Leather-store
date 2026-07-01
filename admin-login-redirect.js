(() => {
  const redirectKey = 'leather-store-admin-redirect';
  const authKey = 'leather-store-admin-auth';

  function isLoggedIn() {
    return localStorage.getItem(authKey) === 'true';
  }

  // If already logged in on /admin, redirect.
  if (window.location.pathname.endsWith('/admin') && isLoggedIn()) {
    const redirect = localStorage.getItem(redirectKey);
    if (redirect) {
      localStorage.removeItem(redirectKey);
      window.location.href = redirect;
    }
  }
})();

