(() => {
  const productForm = document.getElementById('productForm');
  const statusMessage = document.getElementById('statusMessage') || null;
  const existingProductsList = document.getElementById('existingProductsList');
  const productIdInput = document.getElementById('productId');
  const resetFormBtn = document.getElementById('resetProductForm');
  const reloadProductsBtn = document.getElementById('reloadProductsBtn');
  const mainImageInput = document.getElementById('mainImageUrl');
  const imageInputsContainer = document.getElementById('imageInputs');
  const addImageFieldBtn = document.getElementById('addImageFieldBtn');
  const colorInputsContainer = document.getElementById('colorInputs');
  const addColorFieldBtn = document.getElementById('addColorFieldBtn');

  let editingProductId = null;

  const seedDefaults = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('leather-store-products') || 'null');
      if (Array.isArray(stored) && stored.length) return;

      const scriptDefaults = [
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
          ],
          options: [
            {
              name: 'color',
              label: 'Kleur',
              choices: [
                { value: 'black', label: 'Zwart', price: 0 },
                { value: 'tan', label: 'Tan', price: 10 }
              ]
            }
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
          ],
          options: [
            {
              name: 'color',
              label: 'Kleur',
              choices: [
                { value: 'black', label: 'Zwart', price: 0 },
                { value: 'brown', label: 'Bruin', price: 5 }
              ]
            }
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
          ],
          options: [
            {
              name: 'color',
              label: 'Kleur',
              choices: [
                { value: 'black', label: 'Zwart', price: 0 },
                { value: 'brown', label: 'Bruin', price: 3 }
              ]
            }
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

      localStorage.setItem('leather-store-products', JSON.stringify(scriptDefaults));
    } catch (e) {
      // ignore
    }
  };

  seedDefaults();

  function showStatus(message, isError = false) {
    if (!statusMessage) return;
    statusMessage.innerHTML = `<p style="color:${isError ? '#b94a48' : '#2f7d32'}; margin:0;">${message}</p>`;
  }

  function getProductsForEditing() {
    const stored = JSON.parse(localStorage.getItem('leather-store-products') || 'null');
    if (Array.isArray(stored) && stored.length) return stored;
    return [];
  }

  function saveProducts(products) {
    localStorage.setItem('leather-store-products', JSON.stringify(products));
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number(value || 0));
  }

  function resetForm() {
    if (productForm) {
      productForm.reset();
    }
    if (productIdInput) {
      productIdInput.value = '';
    }
    if (mainImageInput) {
      mainImageInput.value = '';
    }
    editingProductId = null;
    setImageFields([]);
    setColorFields([]);

    const submitButton = productForm?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Product opslaan';
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function createImageField(value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-input-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'image-url-input';
    input.placeholder = 'https://example.com/image.svg';
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

  function createColorField(choice = { label: '', price: 0, image: '' }) {
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

    const imageInput = document.createElement('input');
    imageInput.type = 'text';
    imageInput.className = 'color-image-input';
    imageInput.placeholder = 'https://example.com/color-image.jpg';
    imageInput.value = choice.image || '';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button button-secondary remove-image-btn';
    removeButton.textContent = 'Verwijderen';
    removeButton.addEventListener('click', () => {
      wrapper.remove();
      if (colorInputsContainer && colorInputsContainer.children.length === 0) {
        addColorField({ label: '', price: 0, image: '' });
      }
      updateColorButtonState();
    });

    wrapper.append(labelInput, priceInput, imageInput, removeButton);
    return wrapper;
  }

  function updateAddButtonState() {
    if (!addImageFieldBtn || !imageInputsContainer) return;
    addImageFieldBtn.disabled = imageInputsContainer.children.length >= 5;
  }

  function updateColorButtonState() {
    if (!addColorFieldBtn || !colorInputsContainer) return;
    addColorFieldBtn.disabled = colorInputsContainer.children.length >= 10;
  }

  function addImageField(value = '') {
    if (!imageInputsContainer || imageInputsContainer.children.length >= 5) return;
    imageInputsContainer.appendChild(createImageField(value));
    updateAddButtonState();
  }

  function addColorField(choice = { label: '', price: 0 }) {
    if (!colorInputsContainer || colorInputsContainer.children.length >= 10) return;
    colorInputsContainer.appendChild(createColorField(choice));
    updateColorButtonState();
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

  function getImageUrls() {
    if (!imageInputsContainer) return [];
    return Array.from(imageInputsContainer.querySelectorAll('.image-url-input'))
      .map((input) => String(input.value || '').trim())
      .filter(Boolean);
  }

  function getColorChoices() {
    if (!colorInputsContainer) return [];
    return Array.from(colorInputsContainer.querySelectorAll('.color-input-row'))
      .map((row) => {
        const labelInput = row.querySelector('.color-label-input');
        const priceInput = row.querySelector('.color-price-input');
        const imageInput = row.querySelector('.color-image-input');
        const label = String(labelInput?.value || '').trim();
        const price = Number(priceInput?.value || 0);
        const image = String(imageInput?.value || '').trim();
        if (!label) return null;
        return {
          value: slugify(label),
          label,
          price: Number.isNaN(price) ? 0 : price,
          image: image || ''
        };
      })
      .filter(Boolean);
  }

  function populateForm(product) {
    if (!productForm || !product) return;

    if (productIdInput) {
      productIdInput.value = product.id;
    }

    const fields = {
      name: product.name || '',
      price: product.price || 0,
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      material: product.material || 'Leder'
    };

    Object.entries(fields).forEach(([name, value]) => {
      const field = productForm.elements.namedItem(name);
      if (field) {
        field.value = value;
      }
    });

    if (mainImageInput) {
      mainImageInput.value = Array.isArray(product.images) && product.images.length ? product.images[0] : '';
    }

    setImageFields(Array.isArray(product.images) ? product.images.slice(1) : []);

    const colorOption = Array.isArray(product.options) ? product.options.find((opt) => opt.name === 'color') : null;
    setColorFields(colorOption ? colorOption.choices : []);

    editingProductId = product.id;
    const submitButton = productForm?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Product bijwerken';
    }

    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderExistingProducts() {
    if (!existingProductsList) return;

    const products = getProductsForEditing();
    if (!products.length) {
      existingProductsList.innerHTML = '<p>Er zijn nog geen producten.</p>';
      return;
    }

    existingProductsList.innerHTML = `
      <div class="admin-product-list">
        ${products.map((product) => `
          <article class="admin-product-card">
            <div class="admin-product-main">
              <div class="admin-product-thumb">
                <img src="${Array.isArray(product.images) && product.images[0] ? product.images[0] : 'assets/products/keychain.svg'}" alt="${product.name}">
              </div>
              <div>
                <h3>${product.name}</h3>
                <p>${product.shortDescription}</p>
                <div class="admin-product-meta">
                  <span>${formatCurrency(product.price)}</span>
                  <span>${product.material || 'Leder'}</span>
                </div>
              </div>
            </div>
            <div class="admin-product-actions">
              <button class="button button-secondary" type="button" data-action="duplicate" data-product-id="${product.id}">Dupliceren</button>
              <button class="button button-secondary" type="button" data-action="edit" data-product-id="${product.id}">Bewerken</button>
              <button class="button button-secondary" type="button" data-action="delete" data-product-id="${product.id}">Verwijderen</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  if (!productForm) return;

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

  if (reloadProductsBtn) {
    reloadProductsBtn.addEventListener('click', () => {
      try { window.location.reload(); } catch (e) {}
    });
  }

  if (resetFormBtn) {
    resetFormBtn.addEventListener('click', () => {
      resetForm();
      showStatus('Nieuw product formulier hersteld.');
    });
  }

  if (existingProductsList) {
    existingProductsList.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const productId = Number(button.getAttribute('data-product-id'));
      const action = button.getAttribute('data-action');
      const products = getProductsForEditing();
      const product = products.find((item) => item.id === productId);

      if (action === 'edit' && product) {
        populateForm(product);
        return;
      }

      if (action === 'duplicate' && product) {
        const duplicatedProduct = {
          ...product,
          id: Date.now(),
          name: `${product.name} (kopie)`
        };
        products.push(duplicatedProduct);
        saveProducts(products);
        renderExistingProducts();
        showStatus(`Product gedupliceerd: ${duplicatedProduct.name}`);
        if (typeof window.renderProducts === 'function') {
          try { window.renderProducts(); } catch (e) {}
        }
        try { window.location.reload(); } catch (e) {}
        return;
      }

      if (action === 'delete' && product) {
        const updatedProducts = products.filter((item) => item.id !== productId);
        saveProducts(updatedProducts);
        resetForm();
        renderExistingProducts();
        showStatus(`Product verwijderd: ${product.name}`);
        if (typeof window.renderProducts === 'function') {
          try { window.renderProducts(); } catch (e) {}
        }
        try { window.location.reload(); } catch (e) {}
      }
    });
  }

  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(productForm);
    const productId = Number(formData.get('productId') || 0);
    const name = String(formData.get('name') || '').trim();
    const price = Number(formData.get('price') || 0);
    const shortDescription = String(formData.get('shortDescription') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const material = String(formData.get('material') || '').trim();
    const mainImage = String(formData.get('mainImageUrl') || '').trim();
    const extraImages = getImageUrls();
    const colorChoices = getColorChoices();
    const images = [mainImage, ...extraImages].filter(Boolean);

    if (!name || !shortDescription || !price || !mainImage) {
      showStatus('Vul alle verplichte velden in, inclusief de hoofdafbeelding.', true);
      return;
    }

    const finalImages = images.length ? images : ['assets/products/keychain.svg'];
    const colorOptions = colorChoices.length ? [{ name: 'color', label: 'Kleur', choices: colorChoices }] : [];

    const products = getProductsForEditing();
    if (productId) {
      const existingProduct = products.find((item) => item.id === productId);
      if (existingProduct) {
        existingProduct.name = name;
        existingProduct.price = price;
        existingProduct.shortDescription = shortDescription;
        existingProduct.description = description || shortDescription;
        existingProduct.material = material;
        existingProduct.images = finalImages;
        const otherOptions = Array.isArray(existingProduct.options)
          ? existingProduct.options.filter((opt) => opt.name !== 'color')
          : [];
        existingProduct.options = [...otherOptions, ...colorOptions];
        saveProducts(products);
        showStatus(`Product bijgewerkt: ${name}`);
      }
    } else {
      const newProduct = {
        id: Date.now(),
        name,
        price,
        shortDescription,
        description: description || shortDescription,
        material,
        images: finalImages,
        options: colorOptions
      };
      products.push(newProduct);
      saveProducts(products);
      showStatus(`Product toegevoegd: ${name}`);
    }

    renderExistingProducts();
    resetForm();
    if (typeof window.renderProducts === 'function') {
      try { window.renderProducts(); } catch (e) {}
    }
    try { window.location.reload(); } catch (e) {}
  });

  renderExistingProducts();
})();
