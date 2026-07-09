/* =========================================================
   admin.js — Admin / Reporting Dashboard (Page 4)

   Uses api() directly from api.js
   ========================================================= */


/* ---------- DOM References ---------- */

const datePicker =
  document.getElementById('date-picker');

const metricGrid =
  document.getElementById('metric-grid');

const busiestPanel =
  document.getElementById('busiest-hours-panel');

const loyaltyPanel =
  document.getElementById('loyalty-panel');

const driverPanel =
  document.getElementById('driver-panel');


let busiestHoursChart = null;


/* ---------- Default Date ---------- */

datePicker.value =
  new Date().toISOString().slice(0, 10);


datePicker.addEventListener(
  'change',
  () => loadDailySummary(datePicker.value)
);



/* =========================================================
   Init
   ========================================================= */


function init(){

  loadDailySummary(
    datePicker.value
  );

  loadBusiestHours();

  loadTopLoyalty();

  loadDriverLeaderboard();

}



/* =========================================================
   Daily Summary
   ========================================================= */


async function loadDailySummary(date){


  renderMetricSkeleton();


  try {


    const s = await api(
      `/reports/platform/daily-summary?date=${date}`
    );


    renderMetrics(s);


  }

  catch(err){


    renderMetricError(
      err.message
    );


  }


}



function renderMetricSkeleton(){


metricGrid.innerHTML =
Array.from({length:4})
.map(()=>`

<div class="metric-card">

<div class="skeleton skeleton-line skeleton-line--sm">
</div>


<div class="skeleton skeleton-line skeleton-line--lg"
style="height:26px;margin-top:8px;">
</div>


</div>

`)
.join('');


}




function renderMetricError(message){


metricGrid.innerHTML = `

<div class="banner banner--error"
style="grid-column:1/-1;">


<span>

${escapeHtml(
message || "Couldn't load today's summary."
)}

</span>


<button
class="btn btn--primary"
id="metric-retry-btn">

Retry

</button>


</div>

`;


document
.getElementById('metric-retry-btn')
.addEventListener(
'click',
()=>loadDailySummary(datePicker.value)
);


}




function renderMetrics(s){


metricGrid.innerHTML = `


<div class="metric-card">

<div class="metric-card__label">
Orders
</div>

<div class="metric-card__value">
${s.totalOrders ?? 0}
</div>

<div class="metric-card__sub">
today
</div>

</div>



<div class="metric-card metric-card--revenue">

<div class="metric-card__label">
Revenue
</div>

<div class="metric-card__value">

${formatOmr(s.totalRevenue)}

<span class="metric-card__unit">
OMR
</span>

</div>

</div>



<div class="metric-card metric-card--avg">

<div class="metric-card__label">
Avg Order
</div>

<div class="metric-card__value">

${formatOmr(s.averageOrderValue)}

<span class="metric-card__unit">
OMR
</span>

</div>

</div>



<div class="metric-card metric-card--cancel">

<div class="metric-card__label">
Cancel %
</div>

<div class="metric-card__value">

${(s.cancellationRate ?? 0).toFixed(1)}

<span class="metric-card__unit">
%
</span>

</div>

</div>


`;

}





/* =========================================================
   Busiest Hours
   ========================================================= */


async function loadBusiestHours(){


busiestPanel.innerHTML =
`
<div class="skeleton"
style="height:240px;">
</div>
`;



try{


const data = await api(
'/reports/platform/busiest-hours'
);


renderBusiestHours(
data || []
);


}

catch(err){


busiestPanel.innerHTML = `

<div class="banner banner--error">


<span>

${escapeHtml(
err.message ||
"Couldn't load busiest hours."
)}

</span>


<button
class="btn btn--primary"
id="busiest-retry-btn">

Retry

</button>


</div>

`;



document
.getElementById('busiest-retry-btn')
.addEventListener(
'click',
loadBusiestHours
);



}



}




function renderBusiestHours(data){


if(!data.length){


busiestPanel.innerHTML = `

<div class="empty">

<div class="empty__icon">
📊
</div>

<p>
No order data yet.
</p>

</div>

`;

return;

}



busiestPanel.innerHTML = `

<div class="chart-wrap">

<canvas id="busiest-hours-canvas">

</canvas>

</div>

`;



const ctx =
document
.getElementById(
'busiest-hours-canvas'
)
.getContext('2d');



const labels =
data.map(
d=>formatHourLabel(d.hour)
);



const values =
data.map(
d=>d.totalOrders  ?? d.count ?? 0
);



if(busiestHoursChart)
busiestHoursChart.destroy();



busiestHoursChart =
new Chart(ctx,{

type:'bar',


data:{


labels,


datasets:[{

data:values,

backgroundColor:'#2E75B6',

borderRadius:4,

maxBarThickness:40

}]


},


options:{


responsive:true,


maintainAspectRatio:false,


plugins:{

legend:{
display:false
}

},


scales:{


y:{
beginAtZero:true
},


x:{
grid:{
display:false
}
}


}



}


});


}





function formatHourLabel(hour){


const h =
Number(hour);


if(h===0)
return '12a';


if(h===12)
return '12p';


return h < 12
? `${h}a`
: `${h-12}p`;


}




/* =========================================================
   Top Loyalty Customers
   ========================================================= */


async function loadTopLoyalty(){


loyaltyPanel.innerHTML =
skeletonList(5);



try{


const data = await api(
'/reports/customers/top-loyalty'
);



renderLoyaltyList(
data || []
);


}

catch(err){


loyaltyPanel.innerHTML = `

<div class="banner banner--error">


${escapeHtml(err.message)}

<button
class="btn btn--primary"
id="loyalty-retry-btn">

Retry

</button>


</div>

`;



document
.getElementById('loyalty-retry-btn')
.addEventListener(
'click',
loadTopLoyalty
);


}



}





function renderLoyaltyList(customers){


if(!customers.length){


loyaltyPanel.innerHTML = `

<div class="empty">

<div class="empty__icon">
🏆
</div>

<p>
No loyalty data yet.
</p>

</div>

`;


return;

}



loyaltyPanel.innerHTML = `


<ul class="rank-list">


${customers.map((c,i)=>`


<li>


<span class="rank-badge">
${i+1}
</span>



<span class="rank-name">

${escapeHtml(
`${c.firstName || ''} ${c.lastName || ''}`
)}

</span>



<span class="rank-points">

${c.loyaltyPoints ?? 0}

pts

</span>


</li>


`).join('')}


</ul>


`;



}





/* =========================================================
   Driver Leaderboard
   ========================================================= */


async function loadDriverLeaderboard(){


driverPanel.innerHTML =
skeletonList(3);



try{


const data = await api(
'/reports/drivers/leaderboard'
);



loadDriversWithRatings(data || []);
async function loadDriversWithRatings(drivers) {

    const driversWithRatings = await Promise.all(

        drivers.map(async (driver) => {


            try {

                const reviews = await api(
                    `/reviews/driver/${driver.driverId}`
                );


                let averageRating = 0;


                if(reviews.length > 0){

                    const total = reviews.reduce(
                        (sum, review) => sum + review.rating,
                        0
                    );


                    averageRating =
                        total / reviews.length;

                }



                return {

                    ...driver,

                    averageRating

                };


            } catch(error){


                return {

                    ...driver,

                    averageRating:0

                };


            }


        })

    );


    renderDriverTable(
        driversWithRatings
    );


}


}

catch(err){


driverPanel.innerHTML =
`

<div class="banner banner--error">

${escapeHtml(err.message)}


<button
class="btn btn--primary"
id="driver-retry-btn">

Retry

</button>


</div>

`;



document
.getElementById('driver-retry-btn')
.addEventListener(
'click',
loadDriverLeaderboard
);



}



}





function renderDriverTable(drivers){


if(!drivers.length){


driverPanel.innerHTML = `

<div class="empty">

<div class="empty__icon">
🛵
</div>


<p>
No completed deliveries yet.
</p>


</div>

`;

return;

}




driverPanel.innerHTML = `


<table class="data-table">


<thead>

<tr>

<th>
Driver
</th>

<th>
Completed
</th>

<th>
Rating
</th>

</tr>

</thead>



<tbody>


${drivers.map(d=>`


<tr>


<td>

${escapeHtml(
d.driverName || 'Unknown'
)}

</td>



<td>

${d.completedDeliveries ?? 0}

</td>



<td>

★ ${(d.averageRating ?? 0).toFixed(1)}

</td>


</tr>


`).join('')}


</tbody>


</table>


`;



}



/* =========================================================
   Helpers
   ========================================================= */


function skeletonList(rows){


return Array.from({length:rows})
.map(()=>`

<div class="skeleton skeleton-line skeleton-line--lg"
style="margin-bottom:12px;">

</div>

`)
.join('');


}




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




/* ---------- Start ---------- */

init();