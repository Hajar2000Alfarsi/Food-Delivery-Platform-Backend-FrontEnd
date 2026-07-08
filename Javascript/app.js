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


/* =========================================================
   menu.js — Menu & Cart page (Page 2)

   Loads menu + combos for one restaurant,
   runs an in-memory cart,
   and drives order placement.

   Uses api() directly from api.js
   ========================================================= */


/* Hard-coded for demo */
const CUSTOMER_ID = 1;


/* ---------- Get restaurant id from URL ---------- */

const params = new URLSearchParams(location.search);
const RESTAURANT_ID = params.get('restaurantId');


if (!RESTAURANT_ID) {

  document.body.innerHTML = `
    <div class="container" style="padding-top:48px;">
      <div class="banner banner--error">
        Missing restaurantId — go back and pick a restaurant.
      </div>
    </div>
  `;

  throw new Error('No restaurantId in URL');

}



/* ---------- DOM refs ---------- */

const restaurantNameEl =
  document.getElementById('restaurant-name');


const restaurantMetaEl =
  document.getElementById('restaurant-meta');


const menuMain =
  document.getElementById('menu-main');


const cartPanels =
  document.querySelectorAll('[data-cart-panel]');


const cartFab =
  document.getElementById('cart-fab');


const cartFabCount =
  document.getElementById('cart-fab-count');


const drawerBackdrop =
  document.getElementById('cart-drawer-backdrop');



/* ---------- State ---------- */


let restaurant = null;

let cart = [];

let placingOrder = false;


let lastMenuItems = [];

let lastCombos = [];



/* =========================================================
   Loading
   ========================================================= */


async function init() {


  renderMenuSkeleton();


  try {


    const rest = await api(
      `/restaurants/${RESTAURANT_ID}`
    );


    const menu = await api(
      `/restaurants/${RESTAURANT_ID}/menu`
    );


    const combos = await api(
      `/restaurants/${RESTAURANT_ID}/combos`
    );



    restaurant = rest;


    renderHeader(rest);


    renderMenu(
      menu || [],
      combos || []
    );


    renderCart();



  } catch (err) {


    renderMenuError(err.message);


  }

}




/* ---------- Header ---------- */


function renderHeader(r) {


  restaurantNameEl.textContent = r.name;


  const ratingHtml =
    (
      r.averageRating !== null &&
      r.averageRating !== undefined
    )

    ?

    `⭐ ${r.averageRating.toFixed(1)} ·`

    :

    '';



  restaurantMetaEl.innerHTML =
    `${escapeHtml(r.cuisineType)}
    · ${ratingHtml}
    Min ${formatOmr(r.minOrderAmount)} OMR`;

}



/* ---------- Skeleton ---------- */


function renderMenuSkeleton() {


  menuMain.innerHTML = `

    <section>

      <h2 class="section-label">
        Combos
      </h2>


      <div class="combo-grid">

        ${skeletonComboCard()}

        ${skeletonComboCard()}

      </div>

    </section>



    <section>

      <h2 class="section-label">
        Menu
      </h2>


      <div class="menu-list">

        ${skeletonMenuRow()}

        ${skeletonMenuRow()}

        ${skeletonMenuRow()}

        ${skeletonMenuRow()}

      </div>

    </section>

  `;

}




function skeletonComboCard() {


  return `

    <div class="combo-card"
         aria-hidden="true">


      <div class="skeleton combo-card__thumb">
      </div>


      <div class="combo-card__body">


        <div class="
          skeleton 
          skeleton-line 
          skeleton-line--lg">
        </div>


        <div class="
          skeleton 
          skeleton-line 
          skeleton-line--sm">
        </div>


      </div>


    </div>

  `;

}




function skeletonMenuRow() {


  return `

    <div class="menu-item"
         aria-hidden="true">


      <div class="
        skeleton 
        menu-item__thumb">
      </div>


      <div class="menu-item__body">


        <div class="
          skeleton 
          skeleton-line 
          skeleton-line--lg">
        </div>


        <div class="
          skeleton 
          skeleton-line 
          skeleton-line--sm">
        </div>


      </div>


    </div>

  `;

}




function renderMenuError(message) {


  menuMain.innerHTML = `

    <div class="banner banner--error"
         role="alert">


      <span>

        ${escapeHtml(
          message || "Couldn't load menu."
        )}

      </span>



      <button
        class="btn btn--primary"
        id="menu-retry-btn"
        type="button">

        Retry

      </button>


    </div>

  `;



  document
    .getElementById('menu-retry-btn')
    .addEventListener(
      'click',
      init
    );

}

/* =========================================================
   Render Menu
   ========================================================= */


function renderMenu(menuItems, combos) {


  lastMenuItems = menuItems;

  lastCombos = combos;



  const comboSection = combos.length

    ?

    `

    <section>

      <h2 class="section-label">
        Combos
      </h2>


      <div class="combo-grid">

        ${combos
          .map(comboCardTemplate)
          .join('')}

      </div>


    </section>

    `

    :

    '';





  const menuSection = `


    <section>


      <h2 class="section-label">
        Menu
      </h2>



      ${
        menuItems.length

        ?

        `

        <div class="menu-list">

          ${
            menuItems
            .map(menuItemTemplate)
            .join('')
          }

        </div>

        `

        :

        `

        <div class="empty">

          <div class="empty__icon">
            🍽️
          </div>


          <p>
            This restaurant has no menu items yet.
          </p>


        </div>

        `

      }



    </section>


  `;



  menuMain.innerHTML =
    comboSection + menuSection;




  menuMain
    .querySelectorAll('[data-add]')
    .forEach(btn =>
      btn.addEventListener(
        'click',
        onAddClick
      )
    );



  menuMain
    .querySelectorAll('[data-inc]')
    .forEach(btn =>
      btn.addEventListener(
        'click',
        onIncClick
      )
    );



  menuMain
    .querySelectorAll('[data-dec]')
    .forEach(btn =>
      btn.addEventListener(
        'click',
        onDecClick
      )
    );

}




/* =========================================================
   Templates
   ========================================================= */


function comboCardTemplate(c) {


  const qty =
    qtyInCart(c.id, true);



  return `


  <div class="combo-card">


    <div class="combo-card__thumb">
    </div>



    <div class="combo-card__body">


      <p class="combo-card__name">

        ${escapeHtml(c.comboName)}

      </p>



      <p class="combo-card__desc">

        ${escapeHtml(c.description || '')}

      </p>



      <span class="combo-card__price">

        ${formatOmr(c.totalPrice)}

        <span>
          OMR
        </span>

      </span>



    </div>



    ${
      cartControlTemplate(
        c.id,
        c.comboName,
        c.totalPrice,
        qty,
        true,
        c.isAvailable !== false
      )
    }



  </div>


  `;

}





function menuItemTemplate(item) {


  const qty =
    qtyInCart(item.id, false);



  const leaf =
    item.isVegetarian

    ?

    `<span class="menu-item__leaf">
      🌿
     </span>`

    :

    '';



  const calories =
    item.calories !== null &&
    item.calories !== undefined

    ?

    `${item.calories} kcal`

    :

    '';




  return `


  <div class="menu-item
      ${item.isAvailable ? '' : 'menu-item--unavailable'}">



    <div class="menu-item__thumb">
    </div>



    <div class="menu-item__body">


      <p class="menu-item__name">


        ${escapeHtml(item.name)}

        ${leaf}


      </p>



      <p class="menu-item__meta">

        ${escapeHtml(calories)}

      </p>


    </div>




    <div class="menu-item__price">

      ${formatOmr(item.price)}

    </div>




    ${
      item.isAvailable

      ?

      cartControlTemplate(
        item.id,
        item.name,
        item.price,
        qty,
        false,
        true
      )

      :

      `<button class="btn--add" disabled>
        Out of stock
       </button>`

    }



  </div>


  `;


}





function cartControlTemplate(
  id,
  name,
  price,
  qty,
  isCombo,
  available
) {



  if (!available) {

    return `

    <button class="btn--add" disabled>

      Out of stock

    </button>

    `;

  }



  if (qty > 0) {


    return `


    <div class="stepper">


      <button
        type="button"
        data-dec
        data-id="${id}"
        data-combo="${isCombo}">

        −

      </button>



      <span class="stepper__qty">

        ${qty}

      </span>



      <button
        type="button"
        data-inc
        data-id="${id}"
        data-combo="${isCombo}">

        +

      </button>



    </div>


    `;


  }



  return `


  <button

    type="button"

    class="btn--add
    ${isCombo ? 'btn--add--combo' : ''}"

    data-add

    data-id="${id}"

    data-name="${escapeAttr(name)}"

    data-price="${price}"

    data-combo="${isCombo}">


    + Add


  </button>


  `;


}



/* =========================================================
   Cart Logic
   ========================================================= */


function qtyInCart(id, isCombo) {


  const item = cart.find(
    x =>
    String(x.menuItemId) === String(id)
    &&
    x.isCombo === isCombo
  );


  return item ? item.qty : 0;

}




function onAddClick(e) {


  const btn = e.currentTarget;


  cart.push({

    menuItemId: btn.dataset.id,

    name: btn.dataset.name,

    unitPrice:
      Number(btn.dataset.price),

    qty:1,

    isCombo:
      btn.dataset.combo === 'true'

  });



  refreshAfterCartChange();

}




function onIncClick(e) {


  const btn = e.currentTarget;


  const item = cart.find(
    x =>
    String(x.menuItemId)
    ===
    btn.dataset.id
    &&
    String(x.isCombo)
    ===
    btn.dataset.combo
  );



  if(item)
    item.qty++;



  refreshAfterCartChange();

}




function onDecClick(e) {


  const btn = e.currentTarget;


  const item = cart.find(
    x =>
    String(x.menuItemId)
    ===
    btn.dataset.id
    &&
    String(x.isCombo)
    ===
    btn.dataset.combo
  );



  if(!item)
    return;



  item.qty--;



  if(item.qty <= 0){

    cart =
      cart.filter(
        x=>x!==item
      );

  }



  refreshAfterCartChange();

}




function refreshAfterCartChange(){


  renderMenu(
    lastMenuItems,
    lastCombos
  );


  renderCart();

}





/* =========================================================
   Cart UI
   ========================================================= */


function renderCart(){

  const count =
    cart.reduce(
      (sum,item)=>sum + item.qty,
      0
    );


  // حساب المجموع الفرعي
  const subtotal = cart.reduce(
    (sum,item)=> sum + (item.unitPrice * item.qty),
    0
  );


  // رسوم التوصيل من بيانات المطعم
  const deliveryFee = restaurant
    ? Number(restaurant.deliveryFee)
    : 0;


  // الحد الأدنى للطلب
  const minOrder = restaurant
    ? Number(restaurant.minOrderAmount)
    : 0;


  // المجموع النهائي
  const total = subtotal + (cart.length ? deliveryFee : 0);


  // هل وصلنا للحد الأدنى؟
  const minimumReached = subtotal >= minOrder;



  cartPanels.forEach(panel=>{

    panel.innerHTML = `


    <div class="cart-panel__header">

      🛒 Your Cart

      <span class="cart-panel__count">

        ${count}

      </span>

    </div>




    ${
      cart.length

      ?

      cart.map(item=>`

      <div class="cart-line">


        <div>

          <div class="cart-line__name">

            ${escapeHtml(item.name)}
            x ${item.qty}

          </div>


          <div class="cart-line__unit">

            ${formatOmr(item.unitPrice)} OMR each

          </div>


        </div>



        <div class="cart-line__amount">

          ${formatOmr(item.unitPrice * item.qty)}

        </div>


      </div>


      `).join('')



      :


      `

      <div class="cart-empty">

        Your cart is empty

      </div>

      `

    }





    <!-- Total Section -->

    <div class="cart-totals">


      <div class="cart-totals__row">

        <span>
          Subtotal
        </span>

        <span>
          ${formatOmr(subtotal)} OMR
        </span>

      </div>




      <div class="cart-totals__row">

        <span>
          Delivery fee
        </span>

        <span>
          ${formatOmr(cart.length ? deliveryFee : 0)} OMR
        </span>


      </div>





      <div class="cart-totals__row cart-totals__row--total">


        <span>
          Total
        </span>


        <span>
          ${formatOmr(total)} OMR
        </span>


      </div>


    </div>






    <!-- Place Order Button -->


    <button

      class="btn btn--primary btn--block"

      id="place-order-btn"


      ${
        cart.length === 0 || !minimumReached

        ?

        'disabled'

        :

        ''

      }


    >

      Place Order

    </button>





    <!-- Minimum Order Message -->


    <p class="cart-note
      ${
        minimumReached

        ?

        'cart-note--ok'

        :

        'cart-note--pending'

      }
    ">


    ${
      cart.length === 0

      ?

      `Minimum order ${formatOmr(minOrder)} OMR`


      :


      minimumReached


      ?

      `Minimum order reached ✓`


      :


      `Add ${formatOmr(minOrder - subtotal)} OMR more to reach minimum order`

    }


    </p>



    `;


  });



  cartFabCount.textContent = count;


}



/* =========================================================
   Helpers
   ========================================================= */


function formatOmr(value){

 return Number(value ?? 0)
 .toFixed(3);

}




function escapeHtml(str){

 const div =
 document.createElement('div');

 div.textContent =
 str ?? '';

 return div.innerHTML;

}




function escapeAttr(str){

 return escapeHtml(str)
 .replace(/"/g,'&quot;');

}



/* ---------- Init ---------- */

init();