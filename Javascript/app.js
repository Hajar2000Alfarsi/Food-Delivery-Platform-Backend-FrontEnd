/* =========================================================
   app.js — Restaurant Browse page (Page 1)

   Loads /api/restaurants,
   supports search + cuisine filter,
   renders loading / ready / error states.
   ========================================================= */
const grid = document.getElementById('restaurant-grid');
const searchInput = document.getElementById('search-input');
const chipRow = document.getElementById('chip-row');
let currentCuisine = 'All';
let currentSearch = '';
let lastLoadedList = [];
let debounceTimer = null;

/* ---------- State ---------- */

function setState(status, payload) {
  if (status === 'loading') {
    renderSkeletons();
  }
  else if (status === 'ready') {
    renderCards(payload);
  }
  else if (status === 'error') {
    renderError(payload);
  }
}
/* ---------- Renderers ---------- */
function renderSkeletons(count = 6) {
  grid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="card skeleton-card" aria-hidden="true">
      <div class="card__media skeleton" style="height:140px;"></div>
      <div class="card__body">
        <div class="skeleton skeleton-line skeleton-line--lg"></div>
        <div class="skeleton skeleton-line skeleton-line--sm"></div>
        <div class="skeleton skeleton-line skeleton-line--sm"></div>
      </div>
    </div>
  `).join('');
}

function renderCards(restaurants) {
  if (!restaurants || restaurants.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🍽️</div>
        <p>No restaurants match your search.</p>
      </div>`;
    return;
  }
  grid.innerHTML = restaurants
    .map(cardTemplate)
    .join('');

}
function renderError(message) {
  grid.innerHTML = `
    <div class="banner banner--error" role="alert">
      <span>
        ${escapeHtml(message || "Couldn't load restaurants.")}
      </span>
      <button class="btn btn--primary" id="retry-btn" type="button">
        Retry
      </button>
    </div>`;

  document
    .getElementById('retry-btn')
    .addEventListener('click', loadRestaurants);
}

/* ---------- Card Template ---------- */

function cardTemplate(r) {

  const isOpen = r.acceptingOrders;

  const badgeClass = isOpen
    ? 'badge--open'
    : 'badge--paused';

  const badgeText = isOpen
    ? 'Open'
    : 'Paused';

    return `<article class="card">
    <div class="card__media">
      <span class="badge ${badgeClass}">
        ${badgeText}
      </span>
    </div>
    <div class="card__body">
      <div class="card__title-row">
        <h3 class="card__title">
          ${escapeHtml(r.name)}
        </h3>
      </div>
      <span class="badge badge--cuisine">
        ${escapeHtml(r.cuisineType)}
      </span>
      <div class="card__meta">
        <div>
          Delivery
          <strong>
            ${formatOmr(r.deliveryFee)}
          </strong>
        </div>
        <div>
          Min
          <strong>
            ${formatOmr(r.minOrderAmount)}
          </strong>
        </div>
      </div>
      <div class="card__footer">
        <a
        class="btn btn--primary btn--block"
        href="menu.html?restaurantId=${r.id}"
        ${isOpen ? '' :
        'aria-disabled="true" tabindex="-1" style="pointer-events:none;background:#b9c4cf;"'}
        >
          View Menu
        </a>
      </div>
    </div>
  </article>
  `;
}
/* ---------- Helpers ---------- */
function formatOmr(value) {
  return Number(value ?? 0)
    .toFixed(3);
}

function escapeHtml(str) {

  const div = document.createElement('div');

  div.textContent = str ?? '';

  return div.innerHTML;

}

/* ---------- Data Loading ---------- */
async function loadRestaurants() {
  setState('loading');
  try {
    let data;

    if (currentCuisine === 'All') {
      data = await api('/restaurants');
    }
    else {
      data = await api(
        `/restaurants/cuisine/${encodeURIComponent(currentCuisine)}`
      );
    }
    lastLoadedList = data || [];
    applySearchFilter();
  }
  catch (err) {
    setState('error', err.message);
  }
}

function applySearchFilter() {
  const term = currentSearch
    .trim()
    .toLowerCase();

  const filtered = term
    ?
    lastLoadedList.filter(r =>
      r.name.toLowerCase().includes(term)
    )
    :
    lastLoadedList;
  setState('ready', filtered);
}

/* ---------- Events ---------- */
chipRow.addEventListener('click', (e) => {

  const chip = e.target.closest('.chip');
  if (!chip) return;

  chipRow
    .querySelectorAll('.chip')
    .forEach(c =>
      c.classList.remove('chip--active')
    );

  chip.classList.add('chip--active');

  currentCuisine = chip.dataset.cuisine;

  loadRestaurants();
});

searchInput.addEventListener('input', (e) => {

  currentSearch = e.target.value;

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(
    applySearchFilter,
    300
  );
});

/* ---------- Init ---------- */
loadRestaurants();
