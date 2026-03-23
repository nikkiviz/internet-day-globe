const width = 900, height = 500

const globeCanvas = d3.select("#globeCanvas").attr("width", width).attr("height", height)
const mapCanvas   = d3.select("#mapCanvas").attr("width", width).attr("height", height)
const finalCanvas = d3.select("#finalCanvas").attr("width", width).attr("height", height)

const gCtx = globeCanvas.node().getContext("2d")
const mCtx = mapCanvas.node().getContext("2d")
const fCtx = finalCanvas.node().getContext("2d")

const vizSticky    = document.getElementById("vizSticky")
const finalSection = document.getElementById("finalSection")

let world, points, colorScale
let rotation = [0, 0], finalHour = 0

const projG = d3.geoOrthographic().scale(240).translate([width/2, height/2])
const projM = d3.geoNaturalEarth1().scale(170).translate([width/2, height/2])

Promise.all([
  d3.json("data/populated places/world.geojson"),
  d3.csv("data/carna/hostprobes_processed/carna_combined_final.csv", d => ({
    lat: +d.lat, lon: +d.lon, hour: +d.hour, ping: +d.ping_count
  }))
]).then(([w, data]) => {
  world = w
  const max = d3.max(data, d => d.ping)
  points = data.map(d => ({
    ...d,
    intensity: Math.log10(d.ping + 1) / Math.log10(max + 1)
  }))
  colorScale = d3.scaleLinear()
    .domain([0, 0.05, 0.15, 0.3, 0.6, 1])
    .range(["#001a6b", "#0066ff", "#00cc66", "#ffee00", "#ff8800", "#ff0000"])
  start()
})

function drawMap(ctx, hour) {
  const h = Math.min(23, Math.floor(hour))
  ctx.clearRect(0, 0, width, height)
  const path = d3.geoPath(projM, ctx)
  ctx.beginPath(); path({type: "Sphere"}); ctx.fillStyle = "#081e2e"; ctx.fill()
  ctx.beginPath(); path(world); ctx.fillStyle = "#102c3e"; ctx.fill()
  points.forEach(d => {
    if (d.hour !== h) return
    const p = projM([d.lon, d.lat])
    ctx.fillStyle = colorScale(d.intensity)
    ctx.fillRect(p[0], p[1], 2, 2)
  })
  // Night shadow overlay drawn after data points
  ctx.beginPath()
  path(getNightCircle(hour))
  ctx.fillStyle = 'rgba(0, 5, 20, 0.42)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(120, 160, 255, 0.25)'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawGlobe() {
  gCtx.clearRect(0, 0, width, height)
  projG.rotate(rotation)
  const path = d3.geoPath(projG, gCtx)
  gCtx.beginPath(); path({type: "Sphere"}); gCtx.fillStyle = "#081e2e"; gCtx.fill()
  gCtx.beginPath(); path(world); gCtx.fillStyle = "#102c3e"; gCtx.fill()
  points.forEach(d => {
    const p = projG([d.lon, d.lat])
    if (!p) return
    if (d3.geoDistance([d.lon, d.lat], [-rotation[0], -rotation[1]]) > Math.PI / 2) return
    gCtx.fillStyle = colorScale(d.intensity)
    gCtx.fillRect(p[0], p[1], 2, 2)
  })
  // Night shadow overlay — globe is fixed at 00:00 UTC
  gCtx.beginPath()
  path(getNightCircle(0))
  gCtx.fillStyle = 'rgba(0, 5, 20, 0.42)'
  gCtx.fill()
  gCtx.strokeStyle = 'rgba(120, 160, 255, 0.25)'
  gCtx.lineWidth = 1
  gCtx.stroke()
}

let isDragging = false
globeCanvas.call(d3.drag()
  .on("start", () => { isDragging = true })
  .on("drag", e => {
    rotation[0] += e.dx * 0.5
    rotation[1] -= e.dy * 0.5
  })
  .on("end", () => { isDragging = false })
)

function updateClock(id, h) {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  d3.select("#" + id).text(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} UTC`)
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Smoothstep easing: smooth acceleration and deceleration at both ends
function ease(t) { return t * t * (3 - 2 * t) }

// Returns a GeoJSON polygon covering the night hemisphere at a given UTC hour.
// Sun position: at UTC 12:00 the sun is over 0° lon; each hour = 15° of longitude.
// Approximate declination of ~10° for the 2012 census period (April–May).
function getNightCircle(hour) {
  const sunLon = 180 - hour * 15
  const sunLat = 10
  const nightLon = sunLon > 0 ? sunLon - 180 : sunLon + 180
  return d3.geoCircle().center([nightLon, -sunLat]).radius(90)()
}

function start() {
  const globeNarrativeEl = document.querySelector(".globe-narrative")
  const mapSteps = document.querySelectorAll(".map-narrative [data-hour]")

  function frame() {
    const gnRect = globeNarrativeEl.getBoundingClientRect()
    const fsRect = finalSection.getBoundingClientRect()

    // Globe → Map: fade starts when globe narrative bottom exits viewport top,
    // completes 50px of scroll later (fast crossfade so map appears before
    // the first step paragraph overshoots the 50vh trigger)
    const globeMapT = clamp(-gnRect.bottom / 50, 0, 1)

    // Map → Final: fade as final section scrolls into viewport
    const mapFinalT = clamp((window.innerHeight - fsRect.top) / (window.innerHeight * 0.5), 0, 1)

    // Apply smoothstep easing so transitions accelerate/decelerate naturally
    const globeMapE  = ease(globeMapT)
    const mapFinalE  = ease(mapFinalT)

    globeCanvas.style("opacity", 1 - globeMapE)
    mapCanvas.style("opacity", globeMapE)
    vizSticky.style.opacity = 1 - mapFinalE
    finalSection.style.opacity = mapFinalE

    // Auto-rotate globe when not being dragged, stop once map takes over
    if (!isDragging && globeMapT < 1) rotation[0] += 0.18

    drawGlobe()

    // Scroll-driven map hour — only computed once globe→map is fully done.
    // During the crossfade the map holds at 00:00 so there's no jump.
    // Clock timing: trigger when the paragraph body of each callout reaches
    // the vertical midpoint of the screen (same height as the map center).
    // This ensures the text being read matches the data being shown.
    let mapHour = 0
    if (globeMapT >= 1) {
      mapSteps.forEach((s, i) => {
        const ref     = s.querySelector('p') || s
        const r       = ref.getBoundingClientRect()
        const trigger = window.innerHeight * 0.5
        if (r.top < trigger) {
          const next = mapSteps[i + 1]
          const stepStart = +s.dataset.hour
          if (next) {
            const nextRef = next.querySelector('p') || next
            const nr      = nextRef.getBoundingClientRect()
            const p = clamp((trigger - r.top) / (nr.top - r.top), 0, 1)
            mapHour = stepStart + (+next.dataset.hour - stepStart) * p
          } else {
            mapHour = 23.99
          }
        }
      })
    }

    if (globeMapT > 0) drawMap(mCtx, mapHour)
    updateClock("mainClock", globeMapT > 0 ? mapHour : 0)

    // Final autoplay
    if (mapFinalT > 0) {
      finalHour = (finalHour + 0.12) % 24
      drawMap(fCtx, finalHour)
      updateClock("finalClock", finalHour)
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
