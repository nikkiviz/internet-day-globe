// ======================
// SIZE + SVG SETUP
// ======================

const width = 600;
const height = 600;

let currentUTC = 0;

const svg = d3
  .select("#globe")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// ======================
// PROJECTION
// ======================

const projection = d3
  .geoOrthographic()
  .scale(280)
  .translate([width / 2, height / 2])
  .clipAngle(90);

const path = d3.geoPath().projection(projection);

// ======================
// OCEAN BACKGROUND
// ======================

svg
  .append("circle")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("r", projection.scale())
  .attr("fill", "#0b1d3a");

// main drawing group
const g = svg.append("g");

// ======================
// GRATICULE (LAT/LON GRID)
// ======================

const graticule = d3.geoGraticule();

g.append("path")
  .datum(graticule())
  .attr("d", path)
  .attr("fill", "none")
  .attr("stroke", "#333")
  .attr("stroke-width", 0.5);

// ======================
// INTERNET ACTIVITY MODEL
// ======================

// convert longitude to local time
function localTime(utc, lon) {
  let offset = lon / 15;
  let time = utc + offset;

  if (time < 0) time += 24;
  if (time >= 24) time -= 24;

  return time;
}

// simulate activity levels by time of day
function activityIntensity(time) {
  if (time < 5) return 0.2;
  if (time < 9) return 0.5;
  if (time < 17) return 0.6;
  if (time < 22) return 1.0; // evening peak
  return 0.5;
}

// ======================
// CREATE ACTIVITY GRID
// ======================

let points = [];

for (let lat = -60; lat <= 60; lat += 10) {
  for (let lon = -180; lon <= 180; lon += 10) {
    points.push({ lat, lon });
  }
}

// activity layer (drawn later)
let activityLayer;

// ======================
// DRAW ACTIVITY DOTS
// ======================

function drawActivity() {

  const circles = activityLayer
    .selectAll("circle")
    .data(points);

  circles
    .enter()
    .append("circle")
    .merge(circles)
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", d => {
      const lt = localTime(currentUTC, d.lon);
      return activityIntensity(lt) * 4;
    })
    .attr("fill", "#00ffff")
    .attr("opacity", d => {
      const lt = localTime(currentUTC, d.lon);
      return activityIntensity(lt) * 0.6;
    });

  circles.exit().remove();
}

// ======================
// LOAD WORLD MAP
// ======================

d3.json("data/world.geojson").then(world => {

  // draw countries
  g.selectAll(".country")
    .data(world.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#1f1f1f")
    .attr("stroke", "#555")
    .attr("stroke-width", 0.5);

  // create activity layer ABOVE countries
  activityLayer = g.append("g");

  drawActivity();

});

// ======================
// UPDATE GLOBE POSITION
// ======================

function updateGlobe(utc) {

  currentUTC = utc;

  const rotation = -utc * 15;

  projection.rotate([rotation, 0]);

  g.selectAll("path").attr("d", path);

  drawActivity();

  d3.select("#clock")
    .text(`UTC ${String(Math.round(utc)).padStart(2,"0")}:00`);
}

// ======================
// SMOOTH ROTATION
// ======================

function animateToTime(targetUTC) {

  const startUTC = currentUTC;

  d3.transition()
    .duration(1200)
    .tween("rotate", () => {

      const interpolate = d3.interpolate(startUTC, targetUTC);

      return function(t) {
        updateGlobe(interpolate(t));
      };

    });
}

// ======================
// SCROLLAMA
// ======================

const scroller = scrollama();

scroller
  .setup({
    step: ".step",
    offset: 0.6
  })
  .onStepEnter(response => {

    const utc = +response.element.dataset.time;

    animateToTime(utc);

  });

// ======================
// INITIAL RENDER
// ======================

updateGlobe(0);