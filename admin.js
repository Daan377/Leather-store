const authPanel = document.getElementById('authPanel');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const productForm = document.getElementById('productForm');
const mainImageInput = document.getElementById('mainImageUrl');
const imageInputsContainer = document.getElementById('imageInputs');
const addImageFieldBtn = document.getElementById('addImageFieldBtn');
const colorInputsContainer = document.getElementById('colorInputs');
const addColorFieldBtn = document.getElementById('addColorFieldBtn');
const ordersList = document.getElementById('ordersList');
const statusMessage = document.getElementById('statusMessage');

const adminCredentials = {
  email: 'store.leather.orders@gmail.com',
  password: 'kingdaan_2011'
};

function isLoggedIn() {
  return localStorage.getItem('leather-store-admin-auth') === 'true';
}

function showStatus(message, isError = false) {
  statusMessage.innerHTML = `<p style="color:${isError ? '#b94a48' : '#2f7d32'}; margin:0;">${message}</p>`;
}

function getOrders() {
  return JSON.parse(localStorage.getItem('leather-store-orders') || '[]');
}

function saveOrders(orders) {
  localStorage.setItem('leather-store-orders', JSON.stringify(orders));
}

function markCompleted(orderNumber, completed) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => String(o.orderNumber) === String(orderNumber));
  if (idx === -1) return;

  orders[idx].completed = completed;
  saveOrders(orders);
  fetch('/api/orders/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, completed })
  }).catch(() => {
    console.warn('Kon orderstatus niet op de server bijwerken');
  });
  loadOrders();
}

function loadOrders() {
  const orders = getOrders();
  if (!ordersList) {
    return;
  }

  if (!orders.length) {
    ordersList.innerHTML = '<p>Er zijn nog geen bestellingen.</p>';
    return;
  }

  ordersList.innerHTML = orders.map((order) => {
    const completed = Boolean(order.completed || order.paid);
    const itemsHtml = Array.isArray(order.items)
      ? order.items.map((item) => `<li>${item.quantity}x ${item.name}${item.options && item.options.length ? ' (' + item.options.join('; ') + ')' : ''}</li>`).join('')
      : `<li>${String(order.items || 'Geen producten')}</li>`;
    return `
      <div style="border:1px solid var(--border); border-radius:18px; padding:1rem; margin-bottom:1rem;">
        <p><strong>Order #${order.orderNumber}</strong></p>
        <p><strong>Klant e-mail:</strong> ${order.email}</p>
        <p><strong>Adres:</strong> ${order.address}</p>
        <p><strong>Telefoon:</strong> ${order.phone}</p>
        <p><strong>Bestelling:</strong></p>
        <ul style="margin:0 0 0.75rem 1.1rem; padding:0;">${itemsHtml}</ul>
        <p><strong>Totaal:</strong> ${order.total}</p>
        <p><strong>Datum:</strong> ${order.createdAt}</p>

        <div style="display:flex; gap:0.75rem; align-items:center; margin-top:0.75rem; flex-wrap:wrap;">
          <button type="button" class="button ${completed ? 'button-secondary' : 'button-primary'}"
            data-action="set-completed"
            data-order-number="${order.orderNumber}"
            data-completed="${completed ? 'false' : 'true'}">
            ${completed ? 'Markeer als openstaand' : 'Markeer als afgerond'}
          </button>
          <span style="font-weight:700; color:${completed ? '#2f7d32' : '#b94a48'};">
            ${completed ? 'Afgerond' : 'Openstaand'}
          </span>
        </div>
      </div>
    `;
  }).join('');
}


function openDashboard() {
  if (!authPanel || !dashboard) {
    return;
  }

  authPanel.hidden = true;
  dashboard.hidden = false;
  loadOrders();
}

window.addEventListener('storage', () => {
  if (isLoggedIn()) {
    loadOrders();
  }
});

window.addEventListener('focus', () => {
  if (isLoggedIn()) {
    loadOrders();
  }
});

window.addEventListener('pageshow', () => {
  if (isLoggedIn()) {
    loadOrders();
  }
});

function updateAddButtonState() {
  if (!addImageFieldBtn || !imageInputsContainer) return;
  addImageFieldBtn.disabled = imageInputsContainer.children.length >= 5;
}

function updateColorButtonState() {
  if (!addColorFieldBtn || !colorInputsContainer) return;
  addColorFieldBtn.disabled = colorInputsContainer.children.length >= 10;
}

function createImageField(value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'image-input-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'image-url-input';
  input.placeholder = 'https://example.com/image.jpg';
  input.value = value;

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'button button-secondary remove-image-btn';
  removeButton.textContent = 'Verwijderen';
  removeButton.addEventListener('click', () => {
    wrapper.remove();
    if (imageInputsContainer && imageInputsContainer.children.length === 0) {
      addImageField('');
    }
    updateAddButtonState();
  });

  wrapper.append(input, removeButton);
  return wrapper;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createColorField(choice = { label: '', price: 0 }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'color-input-row';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'color-label-input';
  labelInput.placeholder = 'Zwart, cognac, donkerbruin';
  labelInput.value = choice.label || '';

  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.className = 'color-price-input';
  priceInput.placeholder = 'Extra prijs';
  priceInput.min = '0';
  priceInput.step = '0.01';
  priceInput.value = choice.price ? String(choice.price) : '';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'button button-secondary remove-image-btn';
  removeButton.textContent = 'Verwijderen';
  removeButton.addEventListener('click', () => {
    wrapper.remove();
    if (colorInputsContainer && colorInputsContainer.children.length === 0) {
      addColorField({ label: '', price: 0 });
    }
    updateColorButtonState();
  });

  wrapper.append(labelInput, priceInput, removeButton);
  return wrapper;
}

function addColorField(choice = { label: '', price: 0 }) {
  if (!colorInputsContainer || colorInputsContainer.children.length >= 10) return;
  colorInputsContainer.appendChild(createColorField(choice));
  updateColorButtonState();
}

function setColorFields(choices = []) {
  if (!colorInputsContainer) return;
  colorInputsContainer.innerHTML = '';
  if (!Array.isArray(choices)) choices = [];
  if (choices.length === 0) {
    choices.push({ label: '', price: 0 });
  }
  choices.forEach((choice) => addColorField(choice));
  updateColorButtonState();
}

function getColorChoices() {
  if (!colorInputsContainer) return [];
  return Array.from(colorInputsContainer.querySelectorAll('.color-input-row'))
    .map((row) => {
      const labelInput = row.querySelector('.color-label-input');
      const priceInput = row.querySelector('.color-price-input');
      const label = String(labelInput?.value || '').trim();
      const price = Number(priceInput?.value || 0);
      if (!label) return null;
      return {
        value: slugify(label),
        label,
        price: Number.isNaN(price) ? 0 : price
      };
    })
    .filter(Boolean);
}

function addImageField(value = '') {
  if (!imageInputsContainer || imageInputsContainer.children.length >= 5) return;
  imageInputsContainer.appendChild(createImageField(value));
  updateAddButtonState();
}

function setImageFields(values = []) {
  if (!imageInputsContainer) return;
  imageInputsContainer.innerHTML = '';
  if (!Array.isArray(values)) values = [];
  values = values.slice(0, 5);
  while (values.length < 5) {
    values.push('');
  }
  values.forEach((value) => addImageField(value));
  updateAddButtonState();
}

function getImageUrls() {
  if (!imageInputsContainer) return [];
  return Array.from(imageInputsContainer.querySelectorAll('.image-url-input'))
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);
}

  if (isLoggedIn()) {
    openDashboard();
  }

if (imageInputsContainer) {
  setImageFields(['']);
}

if (colorInputsContainer) {
  setColorFields([]);
}

if (addImageFieldBtn) {
  addImageFieldBtn.addEventListener('click', () => {
    addImageField('');
  });
}

if (addColorFieldBtn) {
  addColorFieldBtn.addEventListener('click', () => {
    addColorField({ label: '', price: 0 });
  });
}

if (ordersList) {
  ordersList.addEventListener('click', (event) => {

    const btn = event.target.closest('button[data-action="set-completed"]');
    if (!btn) return;

    const orderNumber = btn.getAttribute('data-order-number');
    const completedStr = btn.getAttribute('data-completed');
    const completed = completedStr === 'true';
    markCompleted(orderNumber, completed);
  });
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '').trim();

  // Allow login even if the user types different casing.
  const expectedEmail = String(adminCredentials.email).trim().toLowerCase();

  if (email === expectedEmail && password === adminCredentials.password) {
    localStorage.setItem('leather-store-admin-auth', 'true');
    openDashboard();
    showStatus('Je bent ingelogd als admin.');
  } else {
    showStatus('Ongeldige inloggegevens.', true);
  }
});

productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(productForm);
  const name = String(formData.get('name') || '').trim();
  const price = Number(formData.get('price') || 0);
  const shortDescription = String(formData.get('shortDescription') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const material = String(formData.get('material') || '').trim();
  const mainImage = String(formData.get('mainImageUrl') || '').trim();
  const extraImages = getImageUrls();
  const colorChoices = getColorChoices();

  if (!name || !shortDescription || !price || !mainImage) {
    showStatus('Vul alle verplichte velden in, inclusief de hoofdafbeelding.', true);
    return;
  }

  const images = [mainImage, ...extraImages].filter(Boolean);
  const colorOptions = colorChoices.length ? [{ name: 'color', label: 'Kleur', choices: colorChoices }] : [];

  const products = JSON.parse(localStorage.getItem('leather-store-products') || '[]');
  const newProduct = {
    id: Date.now(),
    name,
    price,
    shortDescription,
    description: description || shortDescription,
    material,
    images,
    options: colorOptions
  };

  products.push(newProduct);
  localStorage.setItem('leather-store-products', JSON.stringify(products));
  productForm.reset();
  setImageFields(['']);
  setColorFields([]);
  showStatus(`Product toegevoegd: ${name}`);
});
