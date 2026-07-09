
/* =====================================
Read Order ID From URL
Example:
track.html?orderId=5
===================================== */

const params = new URLSearchParams(window.location.search);

const ORDER_ID = params.get("orderId");

let pollInterval = null;
let countdownInterval = null;
let remainingSeconds = 15 * 60;

/* =====================================
Start
===================================== */

document.addEventListener("DOMContentLoaded", () => {

if (!ORDER_ID) {

showError("No order id found in URL.");

return;

}

loadOrder();

pollInterval = setInterval(loadOrder, 5000);

});

/* =====================================
Load Order
===================================== */

async function loadOrder() {

showLoading();

try {

const order = await api(`/orders/${ORDER_ID}`);

renderOrder(order);

const history = await api(`/orders/${ORDER_ID}/timeline`);

let eta = null;

try {

    eta = await api(`/orders/${ORDER_ID}/eta`);

}
catch(error){

    console.log("ETA error:", error.message);

}

renderTimelineHistory(history);

hideLoading();

if (!countdownInterval && eta) {

startCountdown(eta.estimatedMinutes);

}

if (
order.status === "DELIVERED" ||
order.status === "CANCELLED"
) {

clearInterval(pollInterval);

clearInterval(countdownInterval);

}

}

catch (error) {

showError(error.message || "Unable to load order.");

}

}

/* =====================================
Render Order
===================================== */

function renderOrder(order) {

document
.getElementById("trackingPage")
.classList.remove("hidden");


document.getElementById("orderCode").textContent =
`ORDER ${order.orderCode}`;


document.getElementById("restaurantName").textContent =
order.restaurant?.name || "Restaurant";


document.getElementById("customer").textContent =
`${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`;


document.getElementById("restaurant").textContent =
`${order.restaurant?.name || ""} (${order.restaurant?.cuisineType || ""})`;



document.getElementById("total").textContent =
`${Number(order.totalAmount ?? 0).toFixed(3)} OMR`;



renderItems(order.items || []);

renderDriver(null);


updateProgress(order.status);

}
/* =====================================
Order Items
===================================== */

function renderItems(items) {

const container =
document.getElementById("items");


container.innerHTML = "";


items.forEach(item => {


container.innerHTML += `

<div class="item">

<span class="item__name">

${item.menuItem?.name || "Item"} × ${item.quantity}

</span>


<span class="item__price">

${Number(item.totalPrice ?? 0).toFixed(3)} OMR

</span>


</div>

`;


});


}

/* =====================================
Driver
===================================== */

function renderDriver(driver) {

const driverName =
document.getElementById("driverName");


const driverCode =
document.getElementById("driverCode");


const driverStatus =
document.getElementById("driverStatus");



driverName.textContent =
"Driver will be assigned";


driverCode.textContent =
"Waiting...";


driverStatus.textContent =
"Pending";


}
/* =====================================
Progress
===================================== */

function updateProgress(status) {

const steps = [

"PENDING",
"PREPARING",
"READY",
"DELIVERED"

];

steps.forEach(step => {

document
.getElementById(step)
.classList.remove("active", "done");

});

const current = steps.indexOf(status);

steps.forEach((step, index) => {

const element = document.getElementById(step);

if (index < current) {

element.classList.add("done");

}

else if (index === current) {

element.classList.add("active");

}

});

}

/* =====================================
Timeline History
===================================== */

function renderTimelineHistory(history) {

const list = document.getElementById("history");

list.innerHTML = "";

history.forEach(event => {

list.innerHTML += `<li>${event}</li>`;

});

}

/* =====================================
Countdown
===================================== */
function startCountdown(minutes) {

  remainingSeconds = minutes * 60;


  countdownInterval = setInterval(() => {


    if (remainingSeconds <= 0) {

      document.getElementById("eta").textContent =
      "Any minute now";

      clearInterval(countdownInterval);

      return;

    }


    remainingSeconds--;


    const mins =
      Math.floor(remainingSeconds / 60);


    const seconds =
      remainingSeconds % 60;


    document.getElementById("eta").textContent =
      `${mins}:${String(seconds).padStart(2,"0")}`;


  },1000);

}

/* =====================================
Loading
===================================== */

function showLoading() {

document
.getElementById("loading")
.classList.remove("hidden");

document
.getElementById("trackingPage")
.classList.add("hidden");

document
.getElementById("error")
.classList.add("hidden");

}

function hideLoading() {

document
.getElementById("loading")
.classList.add("hidden");

}

/* =====================================
Error
===================================== */

function showError(message) {

document
.getElementById("loading")
.classList.add("hidden");

const banner = document.getElementById("error");

banner.textContent = message;

banner.classList.remove("hidden");

}