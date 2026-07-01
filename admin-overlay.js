(() => {
  const SECRET_CLICK_COUNT_KEY = 'leather-store-secret-click-count';
  const SECRET_CLICK_THRESHOLD = 5;
  const ADMIN_AUTH_KEY = 'leather-store-admin-auth';
  const adminCredentials = {
    email: 'store.leather.orders@gmail.com',
    password: 'kingdaan_2011'
  };

  const loginUrl = '/admin';

  function incrementClicks() {
    const raw = localStorage.getItem(SECRET_CLICK_COUNT_KEY);
    const current = raw ? Number(raw) : 0;
    const next = current + 1;
    localStorage.setItem(SECRET_CLICK_COUNT_KEY, String(next));
    return next;
  }

  function resetClicks() {
    localStorage.setItem(SECRET_CLICK_COUNT_KEY, '0');
  }

  function showAdminLoginPrompt() {
    if (document.getElementById('secretAdminLoginOverlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'secretAdminLoginOverlay';
    overlay.className = 'admin-login-overlay';
    overlay.innerHTML = `
      <div class="admin-login-card">
        <h2>Admin toegang</h2>
        <p>Voer je e-mailadres en wachtwoord in om de adminpagina te openen.</p>
        <form id="secretAdminLoginForm" class="checkout-form">
          <label>
            <span>E-mailadres</span>
            <input type="email" name="email" required>
          </label>
          <label>
            <span>Wachtwoord</span>
            <input type="password" name="password" required>
          </label>
          <p id="secretAdminLoginError" class="admin-login-error" hidden></p>
          <div class="form-actions">
            <button class="button button-secondary" type="button" id="secretAdminCancel">Annuleren</button>
            <button class="button button-primary" type="submit">Inloggen</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const form = overlay.querySelector('#secretAdminLoginForm');
    const error = overlay.querySelector('#secretAdminLoginError');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const password = String(formData.get('password') || '').trim();

      if (email === adminCredentials.email.toLowerCase() && password === adminCredentials.password) {
        localStorage.setItem(ADMIN_AUTH_KEY, 'true');
        resetClicks();
        window.location.href = loginUrl;
        return;
      }

      error.hidden = false;
      error.textContent = 'Onjuiste inloggegevens.';
    });

    overlay.querySelector('#secretAdminCancel').addEventListener('click', () => {
      resetClicks();
      overlay.remove();
    });
  }

  function wire() {
    const trigger = document.getElementById('secretAdminTrigger');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const next = incrementClicks();
      if (next >= SECRET_CLICK_THRESHOLD) {
        showAdminLoginPrompt();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', wire);
})();

