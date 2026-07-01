const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const cartButton = document.getElementById('cartButton');
const cartCount = document.getElementById('cartCount');
const cartSummary = document.getElementById('cartSummary');
const productGrid = document.getElementById('productGrid');
const productModal = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
const closeModalButton = document.getElementById('closeModal');
const checkoutSection = document.getElementById('checkoutSection');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutConfirmation = document.getElementById('checkoutConfirmation');
const checkoutSummary = document.getElementById('checkoutSummary');
const cancelCheckoutButton = document.getElementById('cancelCheckout');
const backToCartButton = document.getElementById('backToCart');
const sendPaymentMailButton = document.getElementById('sendPaymentMail');
const storeEmailAddress = 'store.leather.orders';
const consentCookieName = 'leather-store-cookie-consent';
const authTokenKey = 'leather-store-token';
let authToken = localStorage.getItem(authTokenKey) || '';
let currentUser = null;

function saveAuthToken(token) {
  authToken = token || '';
  if (token) localStorage.setItem(authTokenKey, token);
  else localStorage.removeItem(authTokenKey);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

async function fetchMe() {
  if (!authToken) return null;
  try {
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${authToken}` } });
    const json = await res.json();
    if (json.success) {
      currentUser = json.user;
      updateAuthUi();
      return currentUser;
    }
  } catch (e) {
    // ignore
  }
  saveAuthToken('');
  currentUser = null;
  updateAuthUi();
  return null;
}

function updateAuthUi() {
  const loginBtn = document.getElementById('loginButton');
  if (!loginBtn) return;
  if (currentUser) {
    const displayName = currentUser.firstName ? `${currentUser.firstName}${currentUser.lastName ? ' ' + currentUser.lastName : ''}` : (currentUser.name || '');
    loginBtn.textContent = displayName ? `Hallo, ${displayName}` : 'Profiel';
    loginBtn.classList.remove('button-secondary');
    loginBtn.classList.add('button-primary');
  } else {
    loginBtn.textContent = 'Aanmelden';
    loginBtn.classList.remove('button-primary');
    loginBtn.classList.add('button-secondary');
  }
}

async function openAuthDialog(mode) {
  // open dedicated auth modal (separate from product modal)
  const authModal = document.getElementById('authModal');
  const authModalContent = document.getElementById('authModalContent');
  activeProduct = null;
  if (!authModalContent || !authModal) return;
  const rememberedEmail = localStorage.getItem('leather-store-remember-email') || '';
  authModalContent.innerHTML = `
    <div class="auth-forms">
      <h2 id="authTitle"><span id="authModeLabel">Inloggen</span></h2>
      <div class="auth-tabs">
        <button type="button" class="tab tab-login" data-mode="login">Inloggen</button>
        <button type="button" class="tab tab-register" data-mode="register">Registreren</button>
      </div>
      <form id="loginForm">
        <label>E-mail<input name="email" type="email" required value="${rememberedEmail}"></label>
        <label>Wachtwoord<input name="password" type="password" required></label>
        <div class="remember-row">
          <input id="rememberMe" type="checkbox" ${rememberedEmail ? 'checked' : ''}>
          <label for="rememberMe">Gegevens onthouden</label>
        </div>
        <div class="form-actions">
          <button class="button button-primary" type="submit">Inloggen</button>
        </div>
      </form>
      <form id="registerForm" hidden>
        <label>Voornaam<input name="firstName" type="text" required></label>
        <label>Achternaam<input name="lastName" type="text" required></label>
        <label>E-mail<input name="email" type="email" required ${rememberedEmail ? `value="${rememberedEmail}"` : ''}></label>
        <label>Wachtwoord<input name="password" type="password" required></label>
        <div class="form-actions">
          <button class="button button-primary" type="submit">Account maken</button>
        </div>
      </form>
    </div>
  `;

  // mode switcher
  function setAuthMode(m) {
    const loginFormEl = document.getElementById('loginForm');
    const registerFormEl = document.getElementById('registerForm');
    const modeLabel = document.getElementById('authModeLabel');
    const formsRoot = authModalContent.querySelector('.auth-forms');
    if (m === 'register') {
      loginFormEl.hidden = true;
      registerFormEl.hidden = false;
      modeLabel.textContent = 'Registreren';
      if (formsRoot) formsRoot.classList.add('register-mode');
    } else {
      loginFormEl.hidden = false;
      registerFormEl.hidden = true;
      modeLabel.textContent = 'Inloggen';
      if (formsRoot) formsRoot.classList.remove('register-mode');
    }
  }
  authModalContent.querySelectorAll('.auth-tabs .tab').forEach((t) => t.addEventListener('click', (ev) => setAuthMode(ev.currentTarget.getAttribute('data-mode'))));
  setAuthMode(mode === 'register' ? 'register' : 'login');
  authModal.hidden = false;
  // ensure tab buttons reflect active mode
  function updateTabVisuals(m) {
    const tabs = authModalContent.querySelectorAll('.auth-tabs .tab');
    tabs.forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-mode') === m);
    });
  }
  authModalContent.querySelectorAll('.auth-tabs .tab').forEach((t) => t.addEventListener('click', (ev) => { setAuthMode(ev.currentTarget.getAttribute('data-mode')); updateTabVisuals(ev.currentTarget.getAttribute('data-mode')); }));
  updateTabVisuals(mode === 'register' ? 'register' : 'login');

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const remember = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;
    const body = { email, password };
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        saveAuthToken(json.token);
        await fetchMe();
        // remember email when requested
        if (remember) localStorage.setItem('leather-store-remember-email', email); else localStorage.removeItem('leather-store-remember-email');
        closeAuthModal();
        alert('Inloggen gelukt.');
      } else {
        alert(json.message || 'Kon niet inloggen.');
      }
    } catch (err) {
      alert('Netwerkfout bij inloggen.');
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const firstName = String(fd.get('firstName') || '').trim();
    const lastName = String(fd.get('lastName') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    if (!isValidEmail(email)) {
      alert('Voer een geldig e-mailadres in.');
      return;
    }
    const body = { firstName, lastName, email, password };
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        saveAuthToken(json.token);
        await fetchMe();
        closeAuthModal();
        alert('Account gemaakt en ingelogd. Welkom!');
      } else {
        alert(json.message || 'Kon account niet maken.');
      }
    } catch (err) {
      alert('Netwerkfout bij registreren.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => fetchMe());
// render frontpage reviews (call after fetchMe)
async function renderFrontReviews() {
  const reviewsContainer = document.getElementById('frontReviews');
  const writeContainer = document.getElementById('frontWriteReview');
  if (!reviewsContainer) return;
  try {
    const res = await fetch('/api/reviews');
    const json = await res.json();
    if (!json.success) return;
    // filter frontpage reviews (no productId)
    const front = (json.reviews || []).filter((r) => !r.productId).slice(0, 10);
    if (front.length === 0) {
      reviewsContainer.innerHTML = '<p>Er zijn nog geen recensies. Wees de eerste!</p>';
    } else {
      reviewsContainer.innerHTML = front.map((rv) => {
        const stars = '★'.repeat(Number(rv.rating || 0)) + '☆'.repeat(5 - Number(rv.rating || 0));
        return `<blockquote><div class="stars">${stars}</div><p class="text">${rv.text || ''}</p><footer>— ${rv.authorFirstName ? rv.authorFirstName : 'Anoniem'}${rv.authorLastName ? ' ' + rv.authorLastName : ''} <small>${new Date(rv.createdAt).toLocaleDateString()}</small></footer></blockquote>`
      }).join('');
    }
    // write form
    if (writeContainer) {
      if (currentUser) {
        const eligible = await canWriteReview();
        if (eligible) {
          writeContainer.innerHTML = `
            <h3>Schrijf een recensie</h3>
            <form id="frontReviewForm">
              <label>Score<select name="rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label>
              <label>Bericht<textarea name="text" required></textarea></label>
              <div class="form-actions"><button class="button button-primary" type="submit">Verstuur recensie</button></div>
            </form>
          `;
          const frm = document.getElementById('frontReviewForm');
          if (frm) {
            frm.addEventListener('submit', async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const body = { rating: Number(fd.get('rating')), text: String(fd.get('text') || '') };
              try {
                const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify(body) });
                const j = await r.json();
                if (j.success) {
                  alert('Recensie opgeslagen');
                  renderFrontReviews();
                } else alert(j.message || 'Kon recensie niet opslaan.');
              } catch (err) { alert('Netwerkfout bij recensie.'); }
            });
          }
        } else {
          writeContainer.innerHTML = `<p>Je kunt alleen een recensie schrijven nadat je een bestelling hebt afgerond.</p>`;
        }
      } else {
        writeContainer.innerHTML = `<p>Je moet <button class="button button-secondary" id="loginToReviewFront">inloggen</button> om een recensie te schrijven.</p>`;
        const btn = document.getElementById('loginToReviewFront');
        if (btn) btn.addEventListener('click', () => openAuthDialog('login'));
      }
    }
  } catch (e) {
    // ignore
  }
}

// ensure front reviews render after auth state is known
document.addEventListener('DOMContentLoaded', () => {
  fetchMe().then(() => renderFrontReviews());
});

// attach login button(s) on any page
const loginButtonEls = document.querySelectorAll('#loginButton');
if (loginButtonEls && loginButtonEls.length) {
  loginButtonEls.forEach((el) => {
    el.addEventListener('click', (e) => {
      if (currentUser) {
        openAccountModal();
      } else {
        openAuthDialog('login');
      }
    });
  });
}

function openAccountModal() {
  // remove existing if present
  const existing = document.getElementById('accountModal');
  if (existing) return;
  const modal = document.createElement('div');
  modal.id = 'accountModal';
  modal.className = 'auth-modal-overlay';
  const name = currentUser ? ((currentUser.firstName || '') + (currentUser.lastName ? ' ' + currentUser.lastName : '')) : '';
  const email = currentUser ? (currentUser.email || '') : '';
  modal.innerHTML = `
    <div class="auth-modal">
      <div class="auth-modal-content">
        <h2>Account</h2>
        <p><strong>Naam:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <div class="form-actions">
          <button id="accountLogout" class="button button-primary">Uitloggen</button>
          <button id="accountClose" class="button button-secondary">Sluiten</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  function close() {
    const el = document.getElementById('accountModal');
    if (el) el.remove();
    document.body.classList.remove('modal-open');
  }

  modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });
  document.getElementById('accountClose').addEventListener('click', close);
  document.getElementById('accountLogout').addEventListener('click', () => {
    saveAuthToken('');
    currentUser = null;
    updateAuthUi();
    close();
    alert('Uitgelogd.');
  });
}

function getCookie(name) {
  const cookieEntry = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return cookieEntry ? decodeURIComponent(cookieEntry.split('=').slice(1).join('=')) : '';
}

function writeConsentCookie(value) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${consentCookieName}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getConsentState() {
  const cookieValue = getCookie(consentCookieName);
  if (cookieValue === 'accepted') {
    return 'accepted';
  }
  if (cookieValue === 'declined') {
    return 'declined';
  }
  return 'pending';
}

function hasCookieConsent() {
  return getConsentState() === 'accepted';
}

function requireCookieConsent() {
  if (hasCookieConsent()) {
    return true;
  }
  showCookieConsentBanner();
  return false;
}

function showCookieConsentBanner() {
  if (!document.body || document.getElementById('cookieConsentBanner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'cookieConsentBanner';
  banner.className = 'cookie-consent-banner';
  banner.innerHTML = `
    <div class="cookie-consent-card">
      <div>
        <h2>Cookies nodig voor de winkel</h2>
        <p>We gebruiken cookies om je winkelmand, voorkeuren en bestelling te bewaren. Accepteer ze om alle functies van de winkel te gebruiken.</p>
      </div>
      <div class="cookie-consent-actions">
        <button class="button button-secondary cookie-consent-button" type="button" data-cookie-action="decline">Weigeren</button>
        <button class="button button-primary cookie-consent-button" type="button" data-cookie-action="accept">Accepteren</button>
      </div>
    </div>
  `;

  document.body.prepend(banner);

  banner.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-cookie-action]');
    if (!button) {
      return;
    }

    const action = button.getAttribute('data-cookie-action');
    writeConsentCookie(action === 'accept' ? 'accepted' : 'declined');
    banner.remove();
    renderProducts();
    renderCart();
  });
}

const defaultProducts = [
  {
    id: 1,
    name: 'Handgemaakte schoudertas',
    price: 129,
    shortDescription: 'Ruime tas van volnerfleer met verstevigde naden en verstelbare band.',
    description: 'Deze handgemaakte schoudertas combineert een tijdloze look met praktische opslag. Het volnerfleer is sterk en mooi verouderd, terwijl de verstelbare band en extra binnenvakjes het ideaal maken voor dagelijks gebruik.',
    material: 'Volnerfleer · handgesneden details',
    images: [
      'assets/products/shoulder-bag.svg',
      'assets/products/shoulder-bag.svg',
      'assets/products/shoulder-bag.svg'
    ]
    ,
    options: [
      { name: 'color', label: 'Kleur leer', choices: [
        { value: 'black', label: 'Zwart', price: 0 },
        { value: 'tan', label: 'Tan', price: 10 },
        { value: 'dark-brown', label: 'Donkerbruin', price: 15 }
      ] },
      { name: 'stitch', label: 'Stiksels', choices: [
        { value: 'standard', label: 'Standaard', price: 0 },
        { value: 'contrast', label: 'Contrast', price: 8 }
      ] }
    ]
  },
  {
    id: 2,
    name: 'Compacte portemonnee',
    price: 49,
    shortDescription: 'Smalle leren portemonnee met ruimte voor kaarten en muntvak.',
    description: 'Deze compacte portemonnee is ontworpen voor wie weinig maar juist moet meenemen. De zachte voering beschermt je kaarten en de gesloten flap geeft een luxe uitstraling.',
    material: 'Leder · gepolijste afwerking',
    images: [
      'assets/products/wallet.svg',
      'assets/products/wallet.svg',
      'assets/products/wallet.svg'
    ]
    ,
    options: [
      { name: 'color', label: 'Kleur leer', choices: [
        { value: 'black', label: 'Zwart', price: 0 },
        { value: 'brown', label: 'Bruin', price: 5 }
      ] }
    ]
  },
  {
    id: 3,
    name: 'Leren riem',
    price: 39,
    shortDescription: 'Strakke gepolijste gesp en duurzaam leer, perfect voor kantoor of vrijetijd.',
    description: 'De riem is gemaakt van stevig leer met een subtiele, gepolijste gesp. Hij is comfortabel, duurzaam en past bij zowel formele als casual outfits.',
    material: 'Leder · gepolijste metalen gesp',
    images: [
      'assets/products/belt.svg',
      'assets/products/belt.svg',
      'assets/products/belt.svg'
    ]
    ,
    options: [
      { name: 'color', label: 'Kleur leer', choices: [
        { value: 'black', label: 'Zwart', price: 0 },
        { value: 'brown', label: 'Bruin', price: 3 }
      ] }
    ]
  },
  {
    id: 4,
    name: 'Precision etui',
    price: 34,
    shortDescription: 'Praktische etui voor pennen, kaarten of kleine accessoires.',
    description: 'Een stijlvolle etui met een zachte binnenvoering en meerdere compartimenten. Perfect voor je dagelijkse essentials of als persoonlijk cadeau.',
    material: 'Leder · zachte voering',
    images: [
      'assets/products/etui.svg',
      'assets/products/etui.svg',
      'assets/products/etui.svg'
    ]
  },
  {
    id: 5,
    name: 'Laptophoes',
    price: 89,
    shortDescription: 'Beschermende hoes met zachte voering, geschikt voor laptops tot 15 inch.',
    description: 'Deze laptophoes beschermt je apparaat met een stevige buitenkant en een zachte binnenvoering. De minimalistische look past perfect in een moderne dagelijkse routine.',
    material: 'Leder · zachte binnenvoering',
    images: [
      'assets/products/laptop-sleeve.svg',
      'assets/products/laptop-sleeve.svg',
      'assets/products/laptop-sleeve.svg'
    ]
  },
  {
    id: 6,
    name: 'Sleutelhanger',
    price: 19,
    shortDescription: 'Eenvoudige leren sleutelhanger met metalen ring en handgesneden afwerking.',
    description: 'Deze sleutelhanger is compact, stijlvol en gemaakt om dagelijks mee te nemen. De handgesneden afwerking geeft elk exemplaar een unieke charme.',
    material: 'Leder · metalen ring',
    images: [
      'assets/products/keychain.svg',
      'assets/products/keychain.svg',
      'assets/products/keychain.svg'
    ]
  }
];

function loadProducts() {
  const storedProducts = JSON.parse(localStorage.getItem('leather-store-products') || 'null');
  return Array.isArray(storedProducts) && storedProducts.length ? storedProducts : defaultProducts;
}

let products = loadProducts();
let cart = JSON.parse(localStorage.getItem('leather-store-cart') || '[]');
let activeProduct = null;
let activeImageIndex = 0;

window.addEventListener('storage', () => {
  products = loadProducts();
  renderProducts();
});

function formatCurrency(value) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

function renderProducts() {
  if (!productGrid) {
    return;
  }

  const canUseFeatures = hasCookieConsent();
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card" data-product-id="${product.id}" tabindex="0">
      <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.shortDescription}</p>
        <span class="price">${formatCurrency(product.price)}</span>
        <div class="product-actions">
          <button class="button button-secondary" type="button" data-action="details" data-product-id="${product.id}" ${canUseFeatures ? '' : 'disabled aria-disabled="true"'}>Bekijk details</button>
          <button class="button button-primary" type="button" data-action="add" data-product-id="${product.id}" ${canUseFeatures ? '' : 'disabled aria-disabled="true"'}>Toevoegen</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderCart() {
  if (!cartSummary) {
    return;
  }

  const canUseFeatures = hasCookieConsent();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (cartCount) {
    cartCount.textContent = totalItems;
  }

  if (!cart.length) {
    cartSummary.innerHTML = `
      <div class="cart-empty">
        <h2>Je winkelmandje is leeg</h2>
        <p>Kies een product om het toe te voegen aan je mandje.</p>
      </div>
    `;
    return;
  }

  cartSummary.innerHTML = `
    <div class="cart-summary-content">
      <div class="cart-summary-header">
        <h2>Winkelmandje</h2>
        <p>${totalItems} item${totalItems > 1 ? 's' : ''}</p>
      </div>
      <ul class="cart-items">
        ${cart.map((item) => `
          <li class="cart-item">
            <div class="cart-item-info">
              <strong>${item.name}</strong>
              <span>${formatCurrency(item.price)} per stuk</span>
              ${Array.isArray(item.options) && item.options.length ? `<small class="cart-item-options">${item.options.join(', ')}</small>` : ''}
            </div>
            <div class="quantity-controls">
              <button class="quantity-btn" type="button" data-cart-action="decrease" data-product-id="${item.id}" ${canUseFeatures ? '' : 'disabled aria-disabled="true"'}>−</button>
              <span>${item.quantity}</span>
              <button class="quantity-btn" type="button" data-cart-action="increase" data-product-id="${item.id}" ${canUseFeatures ? '' : 'disabled aria-disabled="true"'}>+</button>
              <button class="remove-btn" type="button" data-cart-action="remove" data-product-id="${item.id}" ${canUseFeatures ? '' : 'disabled aria-disabled="true"'}>Verwijderen</button>
            </div>
          </li>
        `).join('')}
      </ul>
      <div class="cart-footer">
        <div class="cart-total">
          <span>Totaal</span>
          <strong>${formatCurrency(totalPrice)}</strong>
        </div>
        <button class="button button-primary" type="button" data-action="checkout" ${canUseFeatures ? '' : 'disabled aria-disabled="true"'}>Afrekenen</button>
      </div>
    </div>
  `;
}

function saveCart() {
  localStorage.setItem('leather-store-cart', JSON.stringify(cart));
  renderCart();
}

function generateOrderNumber() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

function saveOrder(email, address, phone, items, total) {
  const orderNumber = generateOrderNumber();
  const order = {
    orderNumber,
    email,
    address,
    phone,
    items,
    total,
    createdAt: new Date().toLocaleString('nl-NL')
    // completed will be managed by admin in the backend/admin UI
  };

  const orders = JSON.parse(localStorage.getItem('leather-store-orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('leather-store-orders', JSON.stringify(orders));
  return orderNumber;
}

async function canWriteReview(productId = null) {
  if (!authToken) return false;
  try {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    const res = await fetch(`/api/orders/eligible${query}`, { headers: { Authorization: `Bearer ${authToken}` } });
    const json = await res.json();
    return json.success && json.eligible;
  } catch (e) {
    return false;
  }
}

function showCheckout() {
  if (!requireCookieConsent()) {
    return;
  }

  if (!cart.length || !checkoutSection) {
    return;
  }

  // prefill email if user logged in or remembered
  try {
    const remembered = localStorage.getItem('leather-store-remember-email');
    if (checkoutForm) {
      const emailInput = checkoutForm.querySelector('input[name="email"]');
      if (emailInput) {
        if (currentUser && currentUser.email) emailInput.value = currentUser.email;
        else if (remembered) emailInput.value = remembered;
      }
    }
  } catch (e) {}

  checkoutSection.hidden = false;
  checkoutForm.hidden = false;
  checkoutConfirmation.hidden = true;
  checkoutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideCheckout() {
  if (!checkoutSection) {
    return;
  }

  checkoutSection.hidden = true;
  checkoutForm.hidden = false;
  checkoutConfirmation.hidden = true;
  if (checkoutForm) {
    checkoutForm.reset();
  }
}

async function sendPaymentInstructions(email, address, phone, orderNumber) {
  const items = cart.map((item) => {
    const optionText = Array.isArray(item.options) && item.options.length ? ` (${item.options.join('; ')})` : '';
    return `${item.quantity}x ${item.name}${optionText}`;
  }).join(', ');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const apiUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port === '8000' ? '3000' : window.location.port}/api/send-order-email`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        address,
        phone,
        items,
        total: formatCurrency(total),
        orderNumber
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Kon de e-mail niet verzenden.');
    }

    alert('De betalingsinstructies zijn succesvol verzonden naar je e-mailadres. Controleer ook je spammap als de mail niet direct zichtbaar is.');
  } catch (error) {
    console.error(error);
    alert(`Er ging iets mis bij het verzenden van de e-mail: ${error.message}`);
  }
}

function openModal(productId) {
  if (!requireCookieConsent()) {
    return;
  }

  activeProduct = products.find((product) => product.id === Number(productId));
  if (!activeProduct) {
    return;
  }
  activeImageIndex = 0;
  renderModal();
  if (productModal) {
    productModal.hidden = false;
    document.body.classList.add('modal-open');
    productModal.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

function closeModal() {
  if (productModal) {
    productModal.hidden = true;
    modalContent.innerHTML = '';
  }
  document.body.classList.remove('modal-open');
}

function closeAuthModal() {
  const authModal = document.getElementById('authModal');
  const authModalContent = document.getElementById('authModalContent');
  if (authModal) {
    authModal.hidden = true;
  }
  if (authModalContent) authModalContent.innerHTML = '';
  document.body.classList.remove('modal-open');
}



async function renderModal() {
  if (!activeProduct || !modalContent) {
    return;
  }
  const options = activeProduct.options || [];
  const optionsHtml = options.map((opt) => `
    <label class="option-group">
      <span>${opt.label}</span>
      <select data-option-name="${opt.name}">
        ${opt.choices.map((c) => `<option value="${c.value}" data-price="${c.price || 0}" data-image="${c.image ? c.image.replace(/"/g, '&quot;') : ''}">${c.label}${c.price ? ' (+' + formatCurrency(c.price) + ')' : ''}</option>`).join('')}
      </select>
    </label>
  `).join('');

  modalContent.innerHTML = `
    <div class="modal-gallery">
      <div class="main-image">
        <img src="${activeProduct.images[activeImageIndex]}" alt="${activeProduct.name}" loading="eager" decoding="auto">
      </div>
      <div class="gallery-thumbs">
        ${activeProduct.images.map((image, index) => `
          <button class="gallery-thumb ${index === activeImageIndex ? 'active' : ''}" type="button" data-image-index="${index}">
            <img src="${image}" alt="Extra foto ${index + 1} van ${activeProduct.name}">
          </button>
        `).join('')}
      </div>
    </div>
    <div class="modal-info">
      <h2 id="modalTitle">${activeProduct.name}</h2>
      <span class="price" id="modalPrice">${formatCurrency(activeProduct.price)}</span>
      <p>${activeProduct.description}</p>
      <p class="modal-meta">Materiaal: ${activeProduct.material}</p>
      <div class="product-options">
        ${optionsHtml}
      </div>
      <div class="product-actions">
        <button class="button button-primary" type="button" id="modalAddBtn">Toevoegen aan winkelmand</button>
      </div>
      <div class="product-reviews" id="productReviews"></div>
      <div class="write-review" id="writeReview"></div>
    </div>
  `;

  // update price when options change
  const modalPriceEl = document.getElementById('modalPrice');
  function updateModalPrice() {
    let price = Number(activeProduct.price || 0);
    const selects = modalContent.querySelectorAll('select[data-option-name]');
    selects.forEach((sel) => {
      const opt = sel.options[sel.selectedIndex];
      const p = Number(opt.getAttribute('data-price') || 0);
      price += p;
    });
    if (modalPriceEl) modalPriceEl.textContent = formatCurrency(price);
  }

  function updateModalImageOnColorChange() {
    const selects = modalContent.querySelectorAll('select[data-option-name]');
    let imageUrl = activeProduct.images[activeImageIndex] || '';
    selects.forEach((sel) => {
      const opt = sel.options[sel.selectedIndex];
      const image = opt.getAttribute('data-image');
      if (image) {
        imageUrl = image;
      }
    });
    const mainImageEl = modalContent.querySelector('.main-image img');
    if (mainImageEl && imageUrl) {
      mainImageEl.src = imageUrl;
    }
  }

  modalContent.querySelectorAll('select[data-option-name]').forEach((sel) => {
    sel.addEventListener('change', () => {
      updateModalPrice();
      updateModalImageOnColorChange();
    });
  });
  updateModalPrice();
  updateModalImageOnColorChange();

  // modal add button should collect selected options
  const modalAddBtn = document.getElementById('modalAddBtn');
  if (modalAddBtn) {
    modalAddBtn.addEventListener('click', () => {
      const selects = modalContent.querySelectorAll('select[data-option-name]');
      const selected = {};
      selects.forEach((sel) => selected[sel.getAttribute('data-option-name')] = sel.value);
      addToCart(activeProduct.id, selected);
      closeModal();
    });
  }

  // load reviews
  fetch(`/api/reviews?productId=${activeProduct.id}`).then((r) => r.json()).then((json) => {
    if (json.success) {
      const reviewsEl = document.getElementById('productReviews');
      if (reviewsEl) {
        reviewsEl.innerHTML = `
          <h3>Recensies</h3>
          ${json.reviews.slice(0,10).map((rv) => {
            const stars = '★'.repeat(Number(rv.rating || 0)) + '☆'.repeat(5 - Number(rv.rating || 0));
            return `<article class="review"><div class="meta"><div class="stars">${stars}</div><small>${new Date(rv.createdAt).toLocaleDateString()}</small></div><p class="text">${rv.text || ''}</p><div class="author"><small>${rv.authorFirstName ? rv.authorFirstName : 'Anoniem'}${rv.authorLastName ? ' ' + rv.authorLastName : ''}</small></div></article>`
          }).join('')}
        `;
      }
    }
  }).catch(() => {});

  // write review area
  const writeReviewEl = document.getElementById('writeReview');
  if (writeReviewEl) {
    if (!currentUser) {
      writeReviewEl.innerHTML = `<p>Je moet <button class="button button-secondary" id="loginToReview">inloggen</button> om een recensie te schrijven.</p>`;
      const loginToReviewBtn = document.getElementById('loginToReview');
      if (loginToReviewBtn) loginToReviewBtn.addEventListener('click', openAuthDialog);
    } else {
      const eligible = await canWriteReview(activeProduct.id);
      if (eligible) {
        writeReviewEl.innerHTML = `
          <h4>Schrijf een recensie</h4>
          <form id="reviewForm">
            <label>Score<select name="rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label>
            <label>Bericht<textarea name="text"></textarea></label>
            <div class="form-actions"><button class="button button-primary" type="submit">Verstuur recensie</button></div>
          </form>
        `;
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
          reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const body = { productId: activeProduct.id, rating: Number(fd.get('rating')), text: String(fd.get('text') || '') };
            try {
              const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify(body) });
              const json = await res.json();
              if (json.success) {
                alert('Recensie opgeslagen');
                renderModal();
              } else alert(json.message || 'Kon recensie niet opslaan.');
            } catch (err) { alert('Netwerkfout bij recensie.'); }
          });
        }
      } else {
        writeReviewEl.innerHTML = `<p>Je kunt alleen een recensie schrijven nadat je bestelling voor dit product is afgerond.</p>`;
      }
    }
  }
}

function addToCart(productId, selectedOptions = {}) {
  if (!requireCookieConsent()) {
    return;
  }

  const product = products.find((item) => item.id === Number(productId));
  if (!product) {
    return;
  }

  // compute price including options
  let basePrice = product.price || 0;
  let optionSummary = [];
  Object.keys(selectedOptions || {}).forEach((key) => {
    const val = selectedOptions[key];
    const opt = (product.options || []).find((o) => o.name === key);
    if (!opt) return;
    const choice = opt.choices.find((c) => String(c.value) === String(val));
    if (!choice) return;
    basePrice += Number(choice.price || 0);
    optionSummary.push(`${opt.label}: ${choice.label}`);
  });

  const cartItem = { id: product.id, name: product.name, price: basePrice, quantity: 1, options: optionSummary };

  const existingItem = cart.find((item) => item.id === cartItem.id && JSON.stringify(item.options) === JSON.stringify(cartItem.options));
  if (existingItem) existingItem.quantity += 1; else cart.push(cartItem);

  saveCart();
}

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });
}

if (cartButton) {
  cartButton.addEventListener('click', () => {
    cartSummary?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

if (productGrid) {
  productGrid.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (actionButton) {
      event.stopPropagation();
      const productId = actionButton.getAttribute('data-product-id');
      if (!hasCookieConsent()) {
        showCookieConsentBanner();
        return;
      }
      if (actionButton.dataset.action === 'add') {
        addToCart(productId);
        return;
      }
      openModal(productId);
      return;
    }

    const card = event.target.closest('[data-product-id]');
    if (card) {
      if (!hasCookieConsent()) {
        showCookieConsentBanner();
        return;
      }
      openModal(card.getAttribute('data-product-id'));
    }
  });

  productGrid.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const card = event.target.closest('[data-product-id]');
      if (card) {
        event.preventDefault();
        if (!hasCookieConsent()) {
          showCookieConsentBanner();
          return;
        }
        openModal(card.getAttribute('data-product-id'));
      }
    }
  });
}

if (modalContent) {
  modalContent.addEventListener('click', (event) => {
    const thumbButton = event.target.closest('button[data-image-index]');
    if (thumbButton) {
      activeImageIndex = Number(thumbButton.getAttribute('data-image-index'));
      renderModal();
      return;
    }

    const addButton = event.target.closest('button[data-action="modal-add"]');
    if (addButton && activeProduct) {
      addToCart(activeProduct.id);
      closeModal();
    }
  });
}

if (closeModalButton) {
  closeModalButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeModal();
  });
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.modal-close')) {
    event.preventDefault();
    event.stopPropagation();
    closeModal();
    closeAuthModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

if (cartSummary) {
  cartSummary.addEventListener('click', (event) => {
    const cartActionButton = event.target.closest('button[data-cart-action]');
    const checkoutButton = event.target.closest('button[data-action="checkout"]');

    if (checkoutButton && !hasCookieConsent()) {
      showCookieConsentBanner();
      return;
    }

    if (checkoutButton) {
      showCheckout();
      return;
    }

    if (!cartActionButton) {
      return;
    }

    if (!hasCookieConsent()) {
      showCookieConsentBanner();
      return;
    }

    const productId = Number(cartActionButton.getAttribute('data-product-id'));
    const action = cartActionButton.getAttribute('data-cart-action');

    if (action === 'increase') {
      const item = cart.find((entry) => entry.id === productId);
      if (item) {
        item.quantity += 1;
      }
    } else if (action === 'decrease') {
      const item = cart.find((entry) => entry.id === productId);
      if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) {
          cart = cart.filter((entry) => entry.id !== productId);
        }
      }
    } else if (action === 'remove') {
      cart = cart.filter((entry) => entry.id !== productId);
    }

    saveCart();
  });
}

if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!requireCookieConsent()) {
      return;
    }

    const formData = new FormData(checkoutForm);
    const email = String(formData.get('email') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const phone = String(formData.get('phone') || '').trim();

    if (!email || !address || !phone) {
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = saveOrder(email, address, phone, cart.map((item) => `${item.quantity}x ${item.name}${item.options ? ' (' + item.options.join('; ') + ')' : ''}`).join(', ') || 'Geen producten', formatCurrency(subtotal));

    if (checkoutSummary) {
      checkoutSummary.innerHTML = `
        <p><strong>Ordernummer:</strong> ${orderNumber}</p>
        <p><strong>E-mailadres:</strong> ${email}</p>
        <p><strong>Adres:</strong> ${address}</p>
        <p><strong>Telefoon:</strong> ${phone}</p>
        <p><strong>Bestelling:</strong> ${cart.map((item) => `${item.quantity}x ${item.name}`).join(', ') || 'Geen producten'}</p>
        <p><strong>Totaal:</strong> ${formatCurrency(subtotal)}</p>
      `;
    }

    // Keep customer's email for the order record.
    // Also send the payment instructions to the admin mailbox so the admin workflow works.
    const adminEmail = 'store.leather.orders@gmail.com';

    // persist order on server (include token when available)
    try {
      await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authToken ? `Bearer ${authToken}` : '' }, body: JSON.stringify({ email, address, phone, items: cart, total: formatCurrency(subtotal), orderNumber }) });
    } catch (e) {
      console.warn('Failed to persist order to server', e);
    }

    try {
      await sendPaymentInstructions(email, address, phone, orderNumber);
      await sendPaymentInstructions(adminEmail, address, phone, orderNumber);
    } catch (e) {
      console.warn('Failed to send payment instructions', e);
    } finally {
      cart = [];
      saveCart();
      if (checkoutForm) checkoutForm.hidden = true;
      if (checkoutConfirmation) checkoutConfirmation.hidden = false;
    }
  });
}

if (cancelCheckoutButton) {
  cancelCheckoutButton.addEventListener('click', hideCheckout);
}

if (backToCartButton) {
  backToCartButton.addEventListener('click', () => {
    hideCheckout();
    cartSummary?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

if (sendPaymentMailButton) {
  sendPaymentMailButton.addEventListener('click', () => {
    const email = checkoutForm ? String(new FormData(checkoutForm).get('email') || '').trim() : '';
    const address = checkoutForm ? String(new FormData(checkoutForm).get('address') || '').trim() : '';
    const phone = checkoutForm ? String(new FormData(checkoutForm).get('phone') || '').trim() : '';
    const orderNumber = generateOrderNumber();
    sendPaymentInstructions(email, address, phone, orderNumber);
  });
}

if (!hasCookieConsent()) {
  showCookieConsentBanner();
}

renderProducts();
renderCart();
