(() => {
  const galleryGrid = document.getElementById('galleryGrid');
  const galleryForm = document.getElementById('galleryForm');

  const DEFAULT_GALLERY = [];

  function getGallery() {
    const stored = JSON.parse(localStorage.getItem('leather-store-gallery') || 'null');
    if (Array.isArray(stored) && stored.length) return stored;
    return [];
  }

  function saveGallery(items) {
    localStorage.setItem('leather-store-gallery', JSON.stringify(items));
  }

  function render() {
    if (!galleryGrid) return;
    const items = getGallery();
    galleryGrid.innerHTML = items.map((it) => `
      <figure>
        <img src="${it.image}" alt="${it.caption}" loading="lazy">
        <figcaption>${it.caption}</figcaption>
      </figure>
    `).join('');
  }

  if (galleryForm) {
    galleryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(galleryForm);
      const image = String(fd.get('image') || '').trim();
      const caption = String(fd.get('caption') || '').trim();

      if (!image || !caption) return;

      const items = getGallery();
      items.unshift({ image, caption });
      saveGallery(items);

      galleryForm.reset();
      render();

      // refresh main gallery too
    });
  }

  render();
})();

