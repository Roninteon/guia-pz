const categories = [
  ['Todos', '✳'], ['Guardados', '♡'],
];
const guideCategories = [
  ['Comercio', '🛍️', 'commerce'], ['Salud y bienestar', '🌿', 'wellness'], ['Automotriz', '🚗', 'automotive'],
  ['Veterinaria', '🐾', 'veterinary'], ['Servicios', '🤝', 'services'], ['Tecnología', '💻', 'technology'],
  ['Turismo', '🧭', 'tourism'], ['Hospedaje', '🛏️', 'lodging'], ['Restaurantes', '🍽️', 'restaurants'],
  ['Servicios financieros', '💳', 'finance'], ['Construcción', '🦺', 'construction'], ['Agroindustria', '🌱', 'agribusiness'],
  ['Industria', '🏭', 'industry'], ['Educación', '📚', 'education'], ['Jardinería', '🪴', 'gardening'],
];

// El contenido editable vive aparte para que las fichas no queden mezcladas con la interfaz.
const places = window.GUIAPZ_PLACES || [];
const districts = [
  'San Isidro de El General', 'El General', 'Daniel Flores', 'Rivas', 'San Pedro',
  'Platanares', 'Pejibaye', 'Cajón', 'Barú', 'Río Nuevo', 'Páramo', 'La Amistad'
];

const categoryRow = document.querySelector('#categories');
const placesList = document.querySelector('#placesList');
const guideCategoryGrid = document.querySelector('#guideCategories');
const searchInput = document.querySelector('#searchInput');
const clearSearch = document.querySelector('#clearSearch');
const searchSuggestionsBox = document.querySelector('#searchSuggestions');
const searchShortcutHint = document.querySelector('#searchShortcutHint');
const clearFilters = document.querySelector('#clearFilters');
const sortSelect = document.querySelector('#sortSelect');
const districtFilter = document.querySelector('#districtFilter');
const clearMapDistrict = document.querySelector('#clearMapDistrict');
let activeCategory = 'Todos';
let activeGuideCategory = 'Todos';
let showUpcomingGuideCategories = false;
let activeDistrict = 'Todos';
let query = '';
let selectedId = null;
let toastTimer;
let mapZoom = 1;
let activeGalleryPhotos = [];
let activeGalleryIndex = 0;
let searchSuggestions = [];
let selectedSuggestionIndex = -1;

function categoryCount(name) {
  if (name === 'Todos') return places.length;
  if (name === 'Guardados') return places.filter(place => favorites.has(place.id)).length;
  return places.filter(place => place.categories.includes(name)).length;
}

function guideCategoryCount(name) {
  return places.filter(place => (place.sections || []).includes(name)).length;
}

function readSaved(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch { return fallback; }
}

let favorites = new Set(readSaved('guiapz-favorites', []));
function saveFavorites() {
  try { localStorage.setItem('guiapz-favorites', JSON.stringify([...favorites])); } catch { /* Guardados temporales si el navegador bloquea el almacenamiento. */ }
}

function normalize(value) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHTML(value) {
  const entities = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const rawValue = value.trim();
  try {
    const url = new URL(rawValue, window.location.href);
    const isHttp = ['http:', 'https:'].includes(url.protocol);
    const isRelativeLocalFile = window.location.protocol === 'file:' && url.protocol === 'file:' &&
      !/^[a-z][a-z\d+.-]*:/i.test(rawValue) && !rawValue.startsWith('//');
    return isHttp || isRelativeLocalFile ? url.href : '';
  } catch {
    return '';
  }
}

function closeSearchSuggestions() {
  searchSuggestionsBox.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.removeAttribute('aria-activedescendant');
  selectedSuggestionIndex = -1;
}

function renderSearchSuggestions(rawValue) {
  const term = normalize(rawValue.trim());
  if (!term) {
    searchSuggestions = [];
    closeSearchSuggestions();
    return;
  }

  const suggestions = [
    ...places.filter(place => normalize(place.name).includes(term)).map(place => ({
      type: 'place', value: place.name, label: place.name,
      detail: place.categories.join(' · '), icon: '⌕'
    })),
    ...categories.filter(([name]) => !['Todos', 'Guardados'].includes(name) && !guideCategories.some(([guideName]) => guideName === name) && normalize(name).includes(term)).map(([name, icon]) => ({
      type: 'category', value: name, label: name, detail: 'Categoría', icon
    })),
    ...guideCategories.filter(([name]) => guideCategoryCount(name) > 0 && normalize(name).includes(term)).map(([name, icon]) => ({
      type: 'guideCategory', value: name, label: name, detail: 'Rubro', icon
    })),
    ...districts.filter(name => normalize(name).includes(term)).map(name => ({
      type: 'district', value: name, label: name, detail: 'Distrito', icon: '⌖'
    }))
  ];

  searchSuggestions = suggestions
    .sort((a, b) => Number(!normalize(a.label).startsWith(term)) - Number(!normalize(b.label).startsWith(term)))
    .slice(0, 7);
  selectedSuggestionIndex = -1;
  searchInput.removeAttribute('aria-activedescendant');
  searchSuggestionsBox.replaceChildren();
  searchSuggestions.forEach((suggestion, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'search-suggestion';
    option.id = `searchSuggestion-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.suggestionIndex = String(index);
    const icon = document.createElement('span');
    icon.className = 'search-suggestion-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = suggestion.icon;
    const copy = document.createElement('span');
    copy.className = 'search-suggestion-copy';
    const label = document.createElement('strong');
    label.textContent = suggestion.label;
    const detail = document.createElement('small');
    detail.textContent = suggestion.detail;
    copy.append(label, detail);
    option.append(icon, copy);
    searchSuggestionsBox.append(option);
  });

  searchSuggestionsBox.hidden = searchSuggestions.length === 0;
  searchInput.setAttribute('aria-expanded', String(searchSuggestions.length > 0));
}

function selectSearchSuggestion(index) {
  const suggestion = searchSuggestions[index];
  if (!suggestion) return;

  if (suggestion.type === 'category') {
    activeCategory = suggestion.value;
    activeGuideCategory = 'Todos';
    activeDistrict = 'Todos';
    searchInput.value = '';
    query = '';
  } else if (suggestion.type === 'guideCategory') {
    activeGuideCategory = suggestion.value;
    activeCategory = 'Todos';
    activeDistrict = 'Todos';
    searchInput.value = '';
    query = '';
  } else if (suggestion.type === 'district') {
    activeCategory = 'Todos';
    activeGuideCategory = 'Todos';
    activeDistrict = suggestion.value;
    searchInput.value = '';
    query = '';
  } else {
    activeCategory = 'Todos';
    activeGuideCategory = 'Todos';
    activeDistrict = 'Todos';
    searchInput.value = suggestion.value;
    query = normalize(suggestion.value);
  }

  render();
  closeSearchSuggestions();
  searchInput.focus();
}

function setSelectedSuggestion(index) {
  selectedSuggestionIndex = (index + searchSuggestions.length) % searchSuggestions.length;
  searchSuggestionsBox.querySelectorAll('.search-suggestion').forEach((option, optionIndex) => {
    const selected = optionIndex === selectedSuggestionIndex;
    option.classList.toggle('is-selected', selected);
    option.setAttribute('aria-selected', String(selected));
  });
  searchInput.setAttribute('aria-activedescendant', `searchSuggestion-${selectedSuggestionIndex}`);
  searchSuggestionsBox.querySelector('.is-selected')?.scrollIntoView({block: 'nearest'});
}

function hasVerifiedCoordinates(place) {
  return place.locationConfirmed === true && Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
}

function verifiedContacts(place) {
  return place.contactsConfirmed === true ? place.contacts || {} : {};
}

function renderCategories() {
  categoryRow.innerHTML = categories.map(([name]) => {
    const count = categoryCount(name);
    const unavailable = count === 0 && !['Todos', 'Guardados'].includes(name);
    return `<button class="category-chip ${activeCategory === name ? 'selected' : ''} ${unavailable ? 'is-empty' : ''}" data-category="${name}" aria-pressed="${activeCategory === name}" ${unavailable ? 'disabled title="Todavía no hay lugares en esta categoría"' : ''}><span class="category-icon" aria-hidden="true">${categoryChipIcon(name)}</span>${name}<span class="category-count">${count}</span></button>`;
  }).join('');
  categoryRow.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    activeGuideCategory = 'Todos';
    render();
  }));
  categoryRow.querySelectorAll('button').forEach((button, index, buttons) => button.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const enabledButtons = [...buttons].filter(item => !item.disabled);
    const enabledIndex = enabledButtons.indexOf(button);
    enabledButtons[enabledIndex + (event.key === 'ArrowRight' ? 1 : -1)]?.focus();
  }));
}

const guideCategoryIconShapes = {
  all: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  saved: '<path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8a4.3 4.3 0 0 1 8.8-1 4.3 4.3 0 0 1 8.8 1Z"/>',
  coffee: '<path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"/><path d="M17 10h1a3 3 0 1 1 0 6h-2M8 4v2m4-2v2"/>',
  fitness: '<path d="M4 9v6m3-9v12m10-12v12m3-9v6M7 12h10"/>',
  commerce: '<path d="M4 8h16l-1 12H5L4 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  wellness: '<path d="M12 21v-9"/><path d="M12 13C7 13 4 10 4 5c5 0 8 3 8 8Z"/><path d="M12 16c0-5 3-8 8-8 0 5-3 8-8 8Z"/>',
  automotive: '<path d="m5 11 1.5-4h11L19 11l2 2v5h-2m-14 0H3v-5l2-2Z"/><circle cx="5.5" cy="16.5" r="1.5"/><circle cx="18.5" cy="16.5" r="1.5"/><path d="M6 11h12"/>',
  veterinary: '<circle cx="7" cy="7" r="1.7"/><circle cx="12" cy="5.5" r="1.7"/><circle cx="17" cy="7" r="1.7"/><circle cx="19" cy="11" r="1.5"/><path d="M12 11c-2.4 0-5.5 3.6-5.5 5.8a2.2 2.2 0 0 0 3.7 1.6l1.8-1.4 1.8 1.4a2.2 2.2 0 0 0 3.7-1.6c0-2.2-3.1-5.8-5.5-5.8Z"/>',
  services: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M8 8V5h8v3M3 13h18M10 13v2h4v-2"/>',
  technology: '<rect x="4" y="4" width="16" height="12" rx="1.5"/><path d="M2 20h20l-2-4H4l-2 4Z"/>',
  tourism: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 5-4.8 2 2-4.8 5-2.2Z"/>',
  lodging: '<path d="M3 19v-8m0 4h18v4M3 13h5a3 3 0 0 1 3 3v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3"/><path d="M6 11V7h5a3 3 0 0 1 3 3v3"/>',
  restaurants: '<path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v18M17 3v18M17 3c-2 2-3 5-3 8h3"/>',
  finance: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  construction: '<path d="M3 14h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z"/><path d="M5 14a7 7 0 0 1 14 0M12 7V4m-7 6-2-2m16 2 2-2"/>',
  agribusiness: '<path d="M12 21v-8"/><path d="M12 15C6 15 4 11 4 7c5 0 8 3 8 8Z"/><path d="M12 18c0-5 3-8 8-8 0 5-3 8-8 8Z"/><path d="M5 21h14"/>',
  industry: '<path d="M3 21V9l6 4V9l6 4V5h6v16H3Z"/><path d="M7 17h2m3 0h2m3-8h2m-2 4h2m-2 4h2"/>',
  education: '<path d="M12 7C9 5 6 5 3 6v13c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1Z"/><path d="M12 7v13"/>',
  gardening: '<path d="M12 13V5m0 5C8 10 6 8 6 5c4 0 6 2 6 5Zm0-1c0-4 2-6 6-6 0 4-2 6-6 6Z"/><path d="m5 13 1 8h12l1-8H5Z"/>'
};

function guideCategoryIcon(theme) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${guideCategoryIconShapes[theme] || ''}</svg>`;
}

function categoryChipIcon(name) {
  const themes = {
    Todos: 'all', Guardados: 'saved', Restaurantes: 'restaurants', Cafés: 'coffee',
    Supermercados: 'commerce', Tiendas: 'commerce', 'Centros comerciales': 'industry',
    Gimnasios: 'fitness', Hospedaje: 'lodging'
  };
  return guideCategoryIcon(themes[name] || 'commerce');
}

function renderGuideCategories() {
  if (!guideCategoryGrid) return;
  const available = guideCategories.filter(([name]) => guideCategoryCount(name) > 0);
  const upcoming = guideCategories.filter(([name]) => guideCategoryCount(name) === 0);
  const renderTile = ([name, , theme]) => {
    const count = guideCategoryCount(name);
    const unavailable = count === 0;
    return `<button class="guide-category-tile category-${theme} ${activeGuideCategory === name ? 'selected' : ''}" type="button" data-guide-category="${name}" aria-pressed="${activeGuideCategory === name}" ${unavailable ? 'disabled title="Próximamente: estamos agregando lugares de esta categoría"' : ''}><span class="guide-category-icon" aria-hidden="true">${guideCategoryIcon(theme)}</span><span class="guide-category-name">${name}</span><span class="guide-category-count">${unavailable ? 'Próximamente' : `${count} ${count === 1 ? 'lugar' : 'lugares'}`}</span></button>`;
  };
  guideCategoryGrid.innerHTML = `${available.map(renderTile).join('')}${upcoming.length ? `<button class="guide-category-more" type="button" aria-expanded="${showUpcomingGuideCategories}" aria-controls="upcomingGuideCategories"><span><strong>${showUpcomingGuideCategories ? 'Ocultar categorías próximas' : 'Ver más categorías'}</strong><small>Hay ${upcoming.length} rubros que se irán sumando a la guía.</small></span><span class="guide-category-more-icon" aria-hidden="true">${showUpcomingGuideCategories ? '−' : '+'}</span></button><div class="upcoming-guide-grid" id="upcomingGuideCategories" ${showUpcomingGuideCategories ? '' : 'hidden'}>${upcoming.map(renderTile).join('')}</div>` : ''}`;
  guideCategoryGrid.querySelector('.guide-category-more')?.addEventListener('click', () => {
    showUpcomingGuideCategories = !showUpcomingGuideCategories;
    renderGuideCategories();
    guideCategoryGrid.querySelector('.guide-category-more')?.focus();
  });
  guideCategoryGrid.querySelectorAll('[data-guide-category]').forEach(button => button.addEventListener('click', () => {
    activeGuideCategory = button.dataset.guideCategory;
    activeCategory = 'Todos';
    render();
    document.querySelector('.results-line')?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }));
}

function renderDistricts() {
  if (activeDistrict !== 'Todos' && !districts.includes(activeDistrict)) activeDistrict = 'Todos';
  districtFilter.innerHTML = `<option value="Todos">Todos los distritos (${places.length})</option>${districts.map(district => {
    const count = places.filter(place => place.districtConfirmed && place.district === district).length;
    return `<option value="${district}">${district} (${count})</option>`;
  }).join('')}`;
  districtFilter.value = activeDistrict;
}

function visiblePlaces() {
  const matches = places.filter(place => {
    const categoryMatches = activeCategory === 'Todos' ||
      (activeCategory === 'Guardados' ? favorites.has(place.id) : place.categories.includes(activeCategory));
    const guideCategoryMatches = activeGuideCategory === 'Todos' || (place.sections || []).includes(activeGuideCategory);
    const districtMatches = activeDistrict === 'Todos' || (place.districtConfirmed && place.district === activeDistrict);
    const searchable = normalize(`${place.name} ${place.categories.join(' ')} ${(place.sections || []).join(' ')} ${place.district || ''} ${place.area || ''} ${place.address || ''} ${place.description}`);
    return categoryMatches && guideCategoryMatches && districtMatches && (!query || searchable.includes(query));
  });
  if (sortSelect.value === 'name') matches.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return matches;
}

function render() {
  renderGuideCategories();
  renderCategories();
  renderDistricts();
  const shown = visiblePlaces();
  renderDistrictMap();
  document.querySelector('.discovery-layout')?.classList.toggle('has-district-filter', activeDistrict !== 'Todos');
  const resultsLine = document.querySelector('.results-line');
  resultsLine?.classList.toggle('has-district-filter', activeDistrict !== 'Todos');
  resultsLine?.classList.toggle('has-category-filter', activeGuideCategory !== 'Todos');
  const resultContext = [activeGuideCategory !== 'Todos' ? activeGuideCategory : '', activeDistrict !== 'Todos' ? activeDistrict : ''].filter(Boolean);
  document.querySelector('#resultCount').textContent = resultContext.length
    ? `${shown.length} LUGAR${shown.length === 1 ? '' : 'ES'} · ${resultContext.join(' · ').toLocaleUpperCase('es')}`
    : `${shown.length} LUGAR${shown.length === 1 ? '' : 'ES'} PARA VOS`;
  document.querySelector('#mapCount').textContent = activeDistrict === 'Todos'
    ? 'Elegí un distrito'
    : `${shown.length} ${shown.length === 1 ? 'lugar' : 'lugares'} en ${activeDistrict}`;
  if (clearMapDistrict) clearMapDistrict.hidden = activeDistrict === 'Todos';
  clearSearch.hidden = !searchInput.value;
  clearFilters.hidden = !(query || activeCategory !== 'Todos' || activeGuideCategory !== 'Todos' || activeDistrict !== 'Todos');

  placesList.innerHTML = shown.length ? shown.map(place => {
    const area = place.districtConfirmed ? `${place.district}${place.area ? ` · ${place.area}` : ''}` : 'Distrito pendiente de verificación';
    return `<article class="place-card ${escapeHTML(selectedId === place.id ? 'active' : '')}" data-id="${escapeHTML(place.id)}" tabindex="0" aria-label="Ver ficha de ${escapeHTML(place.name)}">
      <div class="place-thumb ${escapeHTML(place.type)}">${escapeHTML(place.emoji)}</div>
      <div class="place-content"><div class="place-title-row"><span class="place-title">${escapeHTML(place.name)}</span><span class="curated-tag" title="Ficha seleccionada por el creador de GUIAPZ; los datos pendientes se indican aparte" aria-label="Ficha seleccionada por GUIAPZ">Selección</span></div>
      <div class="place-meta">${escapeHTML(place.categories.join(' · '))}</div>
      <div class="place-distance"><span class="place-area">${escapeHTML(area)}</span><span class="location-status ${hasVerifiedCoordinates(place) ? 'is-confirmed' : 'is-pending'}"><span aria-hidden="true">${hasVerifiedCoordinates(place) ? '✓' : '!'}</span>${hasVerifiedCoordinates(place) ? 'Ubicación confirmada' : 'Ubicación pendiente'}</span></div></div>
      <button class="favorite-button ${favorites.has(place.id) ? 'is-favorite' : ''}" type="button" data-favorite="${place.id}" aria-label="${favorites.has(place.id) ? 'Quitar de' : 'Agregar a'} guardados" aria-pressed="${favorites.has(place.id)}">${favorites.has(place.id) ? '♥' : '♡'}</button>
    </article>`;
  }).join('') : renderEmptyState();

  placesList.querySelectorAll('.place-card').forEach(card => {
    card.addEventListener('click', event => {
      if (!event.target.closest('.favorite-button')) openDetails(Number(card.dataset.id));
    });
    card.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
        event.preventDefault(); openDetails(Number(card.dataset.id));
      } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && event.target === card) {
        event.preventDefault();
        const cards = [...placesList.querySelectorAll('.place-card')];
        const nextIndex = cards.indexOf(card) + (event.key === 'ArrowDown' ? 1 : -1);
        cards[nextIndex]?.focus();
      }
    });
  });
  placesList.querySelectorAll('.favorite-button').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation(); toggleFavorite(Number(button.dataset.favorite));
  }));
  placesList.querySelector('#emptyReset')?.addEventListener('click', resetFilters);
}

function renderDistrictMap() {
  document.querySelectorAll('.district-region').forEach(region => {
    const district = region.dataset.district;
    const selected = activeDistrict === district;
    region.classList.toggle('is-selected', selected);
    region.closest('.district-shape')?.classList.toggle('is-dimmed', activeDistrict !== 'Todos' && !selected);
    region.setAttribute('aria-pressed', String(selected));
  });
}

function selectDistrict(district) {
  activeDistrict = activeDistrict === district ? 'Todos' : district;
  render();
}

function renderEmptyState() {
  let message;
  let hint;
  if (activeCategory === 'Guardados') {
    message = 'Todavía no guardaste lugares.';
    hint = 'Tocá el corazón de un lugar para guardarlo.';
  } else if (activeDistrict !== 'Todos' && activeGuideCategory !== 'Todos') {
    message = `Todavía no hay lugares de ${activeGuideCategory} en ${activeDistrict}.`;
    hint = 'Probá con otro distrito o rubro.';
  } else if (activeDistrict !== 'Todos' && activeCategory !== 'Todos') {
    message = `Todavía no hay lugares de ${activeCategory} en ${activeDistrict}.`;
    hint = 'Probá con otro distrito o categoría.';
  } else if (activeDistrict !== 'Todos') {
    message = `Todavía no hay fichas en ${activeDistrict}.`;
    hint = 'Los lugares aparecerán cuando se agreguen y verifiquen.';
  } else if (activeGuideCategory !== 'Todos') {
    message = `Todavía no hay fichas de ${activeGuideCategory}.`;
    hint = 'Estamos agregando lugares de este rubro.';
  } else if (activeCategory !== 'Todos') {
    message = `Todavía no hay fichas de ${activeCategory}.`;
    hint = 'Probá con otra categoría o búsqueda.';
  } else {
    message = 'No encontramos lugares con esa búsqueda.';
    hint = 'Probá con otro nombre, distrito o categoría.';
  }
  const showReset = query || activeCategory !== 'Todos' || activeGuideCategory !== 'Todos' || activeDistrict !== 'Todos';
  return `<div class="empty-state"><div><span>${activeCategory === 'Guardados' ? '♡' : '⌕'}</span><br>${message}<br>${hint}${showReset ? '<button class="empty-reset" id="emptyReset" type="button">Limpiar filtros</button>' : ''}</div></div>`;
}

function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
    toast('Lugar quitado de tus guardados.');
  } else {
    favorites.add(id);
    toast('Lugar agregado a tus guardados.');
  }
  saveFavorites();
  render();
}

function renderContactActions(place) {
  const contacts = verifiedContacts(place);
  const actions = [];
  const whatsapp = String(contacts.whatsapp || '').replace(/\D/g, '');
  const phone = String(contacts.phone || '').replace(/[^+\d]/g, '');
  const instagram = String(contacts.instagram || '').trim().replace(/^@/, '');
  const facebook = safeUrl(contacts.facebook);
  const website = safeUrl(contacts.website);
  if (whatsapp) actions.push(`<a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp <span>↗</span></a>`);
  if (phone) actions.push(`<a href="tel:${escapeHTML(phone)}">Llamar <span>↗</span></a>`);
  if (instagram) actions.push(`<a href="https://instagram.com/${encodeURIComponent(instagram)}" target="_blank" rel="noopener noreferrer">Instagram <span>↗</span></a>`);
  if (facebook) actions.push(`<a href="${escapeHTML(facebook)}" target="_blank" rel="noopener noreferrer">Facebook <span>↗</span></a>`);
  if (website) actions.push(`<a href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Sitio web <span>↗</span></a>`);
  return actions.length ? `<div class="detail-actions">${actions.join('')}</div>` : '<p class="contact-pending">Los datos de contacto se mostrarán cuando estén confirmados.</p>';
}

function galleryPhotos(place) {
  return (Array.isArray(place.photos) ? place.photos : [])
    .filter(photo => photo && photo.src)
    .map(photo => ({...photo, safeSrc: safeUrl(photo.src)}))
    .filter(photo => photo.safeSrc);
}

function renderGallery(place) {
  const photos = galleryPhotos(place);
  if (!photos.length) {
    return `<div class="detail-cover ${escapeHTML(place.type)}"><span>${escapeHTML(place.emoji)}</span>${place.isDemo ? '<span class="demo-tag">FICHA DE DEMOSTRACIÓN</span>' : ''}<span class="gallery-placeholder-label">Fotos pendientes de verificación</span></div>`;
  }

  return `<div class="detail-gallery"><div class="gallery-stage"><img id="galleryMain" src="${escapeHTML(photos[0].safeSrc)}" alt="${escapeHTML(photos[0].alt || place.name)}"><span class="gallery-counter" id="galleryCounter">1 / ${photos.length}</span></div>${photos.length > 1 ? `<div class="gallery-thumbnails" aria-label="Fotos de ${escapeHTML(place.name)}">${photos.map((photo, index) => `<button class="gallery-thumbnail ${index === 0 ? 'selected' : ''}" type="button" data-photo-index="${index}" aria-label="Ver foto ${index + 1} de ${photos.length}" aria-pressed="${index === 0}"><img src="${escapeHTML(photo.safeSrc)}" alt=""></button>`).join('')}</div>` : ''}</div>`;
}

function connectGallery(place) {
  activeGalleryPhotos = galleryPhotos(place);
  activeGalleryIndex = 0;
  if (activeGalleryPhotos.length < 2) return;

  document.querySelectorAll('.gallery-thumbnail').forEach(button => button.addEventListener('click', () => {
    showGalleryPhoto(Number(button.dataset.photoIndex));
  }));
  const stage = document.querySelector('.gallery-stage');
  let touchStart = null;
  stage.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    touchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY};
  }, {passive:true});
  stage.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      showGalleryPhoto(activeGalleryIndex + (deltaX < 0 ? 1 : -1));
    }
  }, {passive:true});
}

function showGalleryPhoto(index) {
  if (activeGalleryPhotos.length < 2) return;
  activeGalleryIndex = (index + activeGalleryPhotos.length) % activeGalleryPhotos.length;
  const photo = activeGalleryPhotos[activeGalleryIndex];
  const mainImage = document.querySelector('#galleryMain');
  if (!mainImage) return;
  mainImage.src = photo.safeSrc;
  mainImage.alt = photo.alt || 'Foto del negocio';
  document.querySelector('#galleryCounter').textContent = `${activeGalleryIndex + 1} / ${activeGalleryPhotos.length}`;
  document.querySelectorAll('.gallery-thumbnail').forEach((thumbnail, thumbnailIndex) => {
    const selected = thumbnailIndex === activeGalleryIndex;
    thumbnail.classList.toggle('selected', selected);
    thumbnail.setAttribute('aria-pressed', String(selected));
  });
}

function openDetails(id) {
  const place = places.find(item => item.id === id);
  if (!place) return;
  selectedId = id;
  render();
  const safeMapsUrl = safeUrl(place.mapsUrl);
  const locationText = place.locationConfirmed && place.address
    ? place.address
    : `${place.districtConfirmed && place.district ? `Distrito de ${place.district}` : 'Distrito pendiente de verificación'}. Dirección exacta pendiente de verificación.`;
  const hoursText = place.hoursConfirmed && place.hours ? place.hours : 'Horario pendiente de verificación.';
  const mapCid = safeMapsUrl.match(/[?&]cid=(\d+)/)?.[1];
  const mapSrc = hasVerifiedCoordinates(place)
    ? `https://maps.google.com/maps?q=${place.latitude},${place.longitude}&z=16&output=embed`
    : mapCid ? `https://maps.google.com/maps?cid=${mapCid}&output=embed` : '';
  const mapContent = mapSrc
    ? `<iframe class="detail-map-frame" src="${mapSrc}" title="Mapa de ubicación de ${escapeHTML(place.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
    : '<span class="detail-map-note">Mapa de ubicación pendiente</span>';
  const directionsUrl = safeMapsUrl || (hasVerifiedCoordinates(place) ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}` : '');
  const directionsAction = directionsUrl
    ? `<a class="directions-action" href="${escapeHTML(directionsUrl)}" target="_blank" rel="noopener noreferrer">Cómo llegar <span>↗</span></a>`
    : '';
  document.querySelector('#detailContent').innerHTML = `
    ${renderGallery(place)}
    <div class="detail-heading"><div><div class="eyebrow muted">${escapeHTML(place.categories.join(' · ').toUpperCase())}</div><h2 id="detailTitle">${escapeHTML(place.name)}</h2></div></div>
    <p class="detail-description">${escapeHTML(place.description)}</p>
    <div class="verification-list" aria-label="Estado de verificación">
      ${hasVerifiedCoordinates(place) ? '<span class="verification-chip is-confirmed">✓ Ubicación confirmada</span>' : '<span class="verification-chip">Ubicación pendiente</span>'}
      ${place.contactsConfirmed ? '<span class="verification-chip is-confirmed">✓ Contacto confirmado</span>' : '<span class="verification-chip">Contacto pendiente</span>'}
      ${place.hoursConfirmed ? '<span class="verification-chip is-confirmed">✓ Horario confirmado</span>' : '<span class="verification-chip">Horario pendiente</span>'}
    </div>
    <div class="detail-info"><div><span class="detail-icon">⌖</span><span><strong>Ubicación</strong><small>${escapeHTML(locationText)}</small></span></div><div><span class="detail-icon">◷</span><span><strong>Horario</strong><small>${escapeHTML(hoursText)}</small></span></div></div>
    ${mapSrc ? `<div class="detail-map">${mapContent}</div>` : ''}
    ${directionsAction}
    ${renderContactActions(place)}
    ${place.isDemo ? '<p class="sample-note">Ficha de demostración. Los datos se completan y verifican antes de publicarse.</p>' : ''}`;
  connectGallery(place);
  const modal = document.querySelector('#detailModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.querySelector('#detailClose').focus();
}

function closeDetails() {
  const modal = document.querySelector('#detailModal');
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  activeGalleryPhotos = [];
  activeGalleryIndex = 0;
  const returnTarget = [...placesList.querySelectorAll('.place-card')].find(card => Number(card.dataset.id) === selectedId);
  (returnTarget || searchInput).focus();
}

searchInput.addEventListener('input', () => {
  query = normalize(searchInput.value.trim());
  render();
  renderSearchSuggestions(searchInput.value);
});
searchInput.addEventListener('focus', () => renderSearchSuggestions(searchInput.value));
searchInput.addEventListener('keydown', event => {
  if (searchSuggestionsBox.hidden) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setSelectedSuggestion(selectedSuggestionIndex + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setSelectedSuggestion(selectedSuggestionIndex < 0 ? searchSuggestions.length - 1 : selectedSuggestionIndex - 1);
  } else if (event.key === 'Enter' && selectedSuggestionIndex >= 0) {
    event.preventDefault();
    selectSearchSuggestion(selectedSuggestionIndex);
  } else if (event.key === 'Escape') {
    closeSearchSuggestions();
  }
});
searchSuggestionsBox.addEventListener('click', event => {
  const option = event.target.closest('.search-suggestion');
  if (option) selectSearchSuggestion(Number(option.dataset.suggestionIndex));
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.search-box')) closeSearchSuggestions();
});
clearSearch.addEventListener('click', () => { searchInput.value = ''; query = ''; render(); closeSearchSuggestions(); searchInput.focus(); });
function resetFilters() {
  activeCategory = 'Todos';
  activeGuideCategory = 'Todos';
  activeDistrict = 'Todos';
  query = '';
  searchInput.value = '';
  closeSearchSuggestions();
  sortSelect.value = 'recommended';
  render();
}
clearFilters.addEventListener('click', resetFilters);
sortSelect.addEventListener('change', render);
districtFilter.addEventListener('change', () => { activeDistrict = districtFilter.value; render(); });
clearMapDistrict?.addEventListener('click', () => { activeDistrict = 'Todos'; render(); });
document.querySelectorAll('.district-region').forEach(region => {
  region.addEventListener('click', () => selectDistrict(region.dataset.district));
  region.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDistrict(region.dataset.district);
    } else if (event.key === 'Escape' && activeDistrict !== 'Todos') {
      activeDistrict = 'Todos';
      render();
    }
  });
});
document.querySelector('#districtShortcut').addEventListener('click', () => {
  districtFilter.scrollIntoView({behavior: 'smooth', block: 'center'});
  districtFilter.focus({preventScroll: true});
});
const mapScalable = document.querySelector('#mapScalable');
const zoomButtons = document.querySelectorAll('[data-map-zoom]');
function setMapZoom(nextZoom) {
  mapZoom = Math.max(1, Math.min(1.8, Math.round(nextZoom * 100) / 100));
  mapScalable.style.transform = `scale(${mapZoom})`;
  zoomButtons.forEach(button => { button.disabled = (button.dataset.mapZoom === 'out' && mapZoom === 1) || (button.dataset.mapZoom === 'in' && mapZoom === 1.8); });
}
zoomButtons.forEach(button => button.addEventListener('click', () => setMapZoom(mapZoom + (button.dataset.mapZoom === 'in' ? .2 : -.2))));
document.querySelector('#detailClose').addEventListener('click', closeDetails);
const detailBackdrop = document.querySelector('#detailModal');
const detailSheet = document.querySelector('.detail-modal');
detailBackdrop.addEventListener('click', event => { if (event.target === detailBackdrop) closeDetails(); });
let sheetTouchStart = null;
detailSheet.addEventListener('touchstart', event => {
  const startedAtTop = detailSheet.scrollTop <= 1;
  const startedInHandle = event.target.closest('.sheet-handle, .detail-cover, .gallery-stage, .detail-heading');
  if (!startedAtTop || !startedInHandle || event.touches.length !== 1) { sheetTouchStart = null; return; }
  sheetTouchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY};
}, {passive:true});
detailSheet.addEventListener('touchend', event => {
  if (!sheetTouchStart || !event.changedTouches.length) return;
  const deltaX = event.changedTouches[0].clientX - sheetTouchStart.x;
  const deltaY = event.changedTouches[0].clientY - sheetTouchStart.y;
  sheetTouchStart = null;
  if (deltaY > 95 && Math.abs(deltaY) > Math.abs(deltaX) * 1.35 && detailSheet.scrollTop <= 1) closeDetails();
}, {passive:true});

const donationModal = document.querySelector('#donationModal');
const customDonation = document.querySelector('#customDonation');
let donationReturnFocus = null;
function closeDonation() {
  if (!donationModal.classList.contains('open')) return;
  donationModal.classList.remove('open');
  donationModal.setAttribute('aria-hidden', 'true');
  if (donationReturnFocus?.isConnected) donationReturnFocus.focus();
  donationReturnFocus = null;
}
document.querySelector('#donateOpen').addEventListener('click', event => {
  donationReturnFocus = event.currentTarget;
  donationModal.classList.add('open');
  donationModal.setAttribute('aria-hidden', 'false');
  document.querySelector('#donateClose').focus();
});
document.querySelector('#donateClose').addEventListener('click', closeDonation);
donationModal.addEventListener('click', event => { if (event.target === donationModal) closeDonation(); });
document.querySelectorAll('[data-donation-amount]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-donation-amount]').forEach(option => {
    const selected = option === button;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-pressed', String(selected));
  });
  customDonation.value = '';
}));
customDonation.addEventListener('input', () => {
  document.querySelectorAll('[data-donation-amount]').forEach(option => {
    option.classList.remove('selected');
    option.setAttribute('aria-pressed', 'false');
  });
});

document.querySelector('#themeToggle').addEventListener('click', () => {
  const dark = document.body.dataset.theme !== 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('guiapz-theme', dark ? 'dark' : 'light'); } catch { /* Preferencia temporal. */ }
  const button = document.querySelector('#themeToggle');
  button.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
  button.querySelector('.theme-label').textContent = dark ? 'Modo claro' : 'Modo oscuro';
  button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#19231e' : '#f8f8f4';
});

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2600);
}

document.addEventListener('keydown', event => {
  const activeDialog = [detailBackdrop, donationModal].find(dialog => dialog.classList.contains('open'));
  if (event.key === 'Tab' && activeDialog) {
    const focusable = [...activeDialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),iframe:not([tabindex="-1"]),[tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      activeDialog.querySelector('button')?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!activeDialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.key === 'Escape') {
    if (detailBackdrop.classList.contains('open')) closeDetails();
    else if (donationModal.classList.contains('open')) closeDonation();
    return;
  }
  if (activeDialog && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); searchInput.focus();
    return;
  }
  const detailOpen = detailBackdrop.classList.contains('open');
  if (detailOpen && activeGalleryPhotos.length > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    showGalleryPhoto(activeGalleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  const targetTag = event.target?.tagName;
  const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || event.target?.isContentEditable;
  if (!activeDialog && !isEditing && (event.key === '+' || event.key === '=' || event.key === '-')) {
    event.preventDefault();
    setMapZoom(mapZoom + (event.key === '-' ? -.2 : .2));
  }
});

try {
  if (localStorage.getItem('guiapz-theme') === 'dark') document.querySelector('#themeToggle').click();
} catch { /* Usa el tema claro si el navegador bloquea el almacenamiento. */ }
const platformName = navigator.userAgentData?.platform || navigator.platform || '';
searchShortcutHint.textContent = /mac|iphone|ipad/i.test(platformName) ? '⌘ K' : 'Ctrl K';
document.querySelector('#currentYear').textContent = new Date().getFullYear();
setMapZoom(mapZoom);
render();
