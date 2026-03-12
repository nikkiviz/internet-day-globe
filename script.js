const width = 900
const height = 900

const canvas = d3.select("#globe")
  .append("canvas")
  .attr("width", width)
  .attr("height", height)
  .style("width","100%")

const context = canvas.node().getContext("2d")

const projection = d3.geoOrthographic()
  .scale(420)
  .translate([width/2, height/2])

const path = d3.geoPath(projection, context)

let points = []
let world
let colorScale

const cx = width/2
const cy = height/2
const radius = projection.scale()
const radiusSq = radius * radius


Promise.all([
  d3.json("data/populated places/world.geojson"),
  d3.csv("data/carna/hostprobes_processed/carna_batch_1.csv", d => ({
      lat:+d.lat,
      lon:+d.lon,
      ping:+d.ping_count
  }))
]).then(([worldData, cityData]) => {

  world = worldData

  colorScale = d3.scaleSqrt()
    .domain([0, d3.max(cityData,d=>d.ping)])
    .range([0.2,1])
const DEG2RAD = Math.PI / 180

points = cityData.map(d => ({
  lon: d.lon,
  lat: d.lat,
  lonRad: d.lon * DEG2RAD,
  latRad: d.lat * DEG2RAD,
  ping: d.ping
}))

  startAnimation()

})


function drawGlobe(){

  context.clearRect(0,0,width,height)

  /* ocean */

  context.beginPath()
  path({type:"Sphere"})
  context.fillStyle="#082032"
  context.fill()

  /* land */

  context.beginPath()
  path(world)
  context.fillStyle="#12344a"
  context.fill()

}


function drawCities(hour){

  const rotation = projection.rotate()[0]

  for(const d of points){

    /* ---------- FIX 1: skip far side before projection ---------- */

    let lonDiff = d.lon + rotation

    if(lonDiff > 180) lonDiff -= 360
    if(lonDiff < -180) lonDiff += 360

    if(Math.abs(lonDiff) > 90) continue


    const coords = projection([d.lon,d.lat])
    if(!coords) continue

    const x = coords[0]
    const y = coords[1]

    const dx = x - cx
    const dy = y - cy

    const distSq = dx*dx + dy*dy

    if(distSq > radiusSq) continue


    /* ---------- FIX 2: remove sqrt ---------- */

    const horizonFade = 1 - (distSq / radiusSq)


    /* local time */

    const local = (hour + d.lon/15 + 24) % 24

    const distFromPeak = Math.abs(local - 21)


    /* ---------- FIX 3: quantized activity ---------- */

    let activity = Math.max(0, 1 - distFromPeak/8)
    activity = Math.round(activity * 5) / 5


    const intensity = colorScale(d.ping)

    const alpha = activity * intensity * horizonFade

    if(alpha < 0.03) continue

    context.fillStyle = `rgba(69,215,255,${alpha})`

    context.fillRect(x,y,1,1)

  }

}


function rotateGlobe(hour){

  const centerLon = (21 - hour) * 15

  projection.rotate([-centerLon,-15])

  drawGlobe()

  drawCities(hour)

}


function updateClock(hour){

  const h = Math.floor(hour)
  const m = Math.floor((hour-h)*60)

  const hh = String(h).padStart(2,"0")
  const mm = String(m).padStart(2,"0")

  d3.select("#clock").text(`${hh}:${mm} UTC`)

}


let targetHour = 0
let currentHour = 0


function startAnimation(){

  function frame(){

    const scroll = window.scrollY
    const maxScroll = document.body.scrollHeight - window.innerHeight

    const progress = scroll / maxScroll

    targetHour = progress * 24

    currentHour += (targetHour-currentHour) * 0.06

    rotateGlobe(currentHour)

    updateClock(currentHour)

    requestAnimationFrame(frame)

  }

  requestAnimationFrame(frame)

}