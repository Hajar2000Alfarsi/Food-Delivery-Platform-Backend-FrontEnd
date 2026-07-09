
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
    cart.reduce((sum,item)=>sum + item.qty,0);

  const subtotal = cart.reduce((sum,item)=> sum + (item.unitPrice * item.qty),0);


  const deliveryFee = restaurant? Number(restaurant.deliveryFee): 0;


  const minOrder = restaurant ? Number(restaurant.minOrderAmount): 0;

  const total = subtotal + (cart.length ? deliveryFee : 0);

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
      cart.length ? cart.map(item=>`
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
      </div>`).join('')
      : 
      `<div class="cart-empty">
        Your cart is empty
      </div>`}

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

    <button
      class="btn btn--primary btn--block"
      id="place-order-btn"
      ${cart.length === 0 || !minimumReached ? 'disabled' : ''}>
      Place Order
    </button>

    <p class="cart-note
      ${minimumReached ? 'cart-note--ok' : 'cart-note--pending'}">

      ${cart.length === 0 ? 
        `Minimum order ${formatOmr(minOrder)} OMR` : minimumReached
        ? `Minimum order reached ✓` :
        `Add ${formatOmr(minOrder - subtotal)} OMR more to reach minimum order`
      }
    </p>`;
  });
  cartFabCount.textContent = count;

  // ================================
  // Place Order Button Interaction
  // ================================

  const placeOrderBtn = document.getElementById(
    "place-order-btn"
  );


  if(placeOrderBtn){


    placeOrderBtn.addEventListener(
  "click",
  async ()=>{

    try {

      const orderItems = cart.map(item => ({
        menuItemId: Number(item.menuItemId),
        quantity: item.qty
      }));


      const order = await api(
        `/orders/customer/${CUSTOMER_ID}/restaurant/${RESTAURANT_ID}`,
        {
          method:"POST",
          body: orderItems
        }
      );


      console.log(order);


      window.location.href =
      `track.html?orderId=${order.id}`;


    }
    catch(error){

      console.log(error.message);

      alert("Order creation failed");

    }

  }
);


  }


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