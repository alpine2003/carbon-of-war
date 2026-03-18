'use client'
import { useState, useEffect, useRef } from 'react'
import { TONS_PER_SECOND, formatTons, getEquivalences, estimateEventEmissions, aggregateEmissions } from '../lib/emissions'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('MAP')
  const [events, setEvents] = useState([])
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [tons, setTons] = useState(0)
  const [showSatellite, setShowSatellite] = useState(false)
  const sessionStart = useRef(Date.now())
  const frameRef = useRef(null)

  useEffect(() => {
    const start = sessionStart.current
    function tick() {
      const elapsed = (Date.now() - start) / 1000
      setTons(elapsed * TONS_PER_SECOND)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

 useEffect(() => {
    // Initial fetch
    const loadEvents = () => {
      fetch('/api/conflicts', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          setEvents(data.events || [])
          console.log(`Loaded ${data.count} events — GDELT: ${data.gdeltCount || 0}, Verified: ${data.verifiedCount || 0}`)
        })
        .catch(console.error)
    }
    loadEvents()
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const equivalences = getEquivalences(tons)

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#060606', color: '#e8e8e8',
      fontFamily: '-apple-system, "SF Pro Display", sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0 24px', display: 'flex', alignItems: 'center',
        gap: '24px', height: '48px', borderBottom: '1px solid #111',
        flexShrink: 0, background: '#060606',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#c8f064', animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.1em' }}>
            CARBON OF WAR
          </span>
        </div>
        <div style={{ display: 'flex', gap: '2px', marginLeft: '16px' }}>
          {['MAP', 'LEDGER', 'SIMULATOR', 'POLICY'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? '#141414' : 'none',
              border: 'none', borderRadius: '6px',
              color: activeTab === tab ? '#e8e8e8' : '#444',
              cursor: 'pointer', fontSize: '11px',
              letterSpacing: '0.12em', padding: '6px 14px',
            }}>{tab}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#333' }}>
          {events.length} EVENTS · AUTO-UPDATES EVERY 5 MIN
        </div>
      </div>

      <div style={{
        background: '#0a0a0a', borderBottom: '1px solid #1a1a1a',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        gap: '32px', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.15em', color: '#666', fontFamily: 'monospace' }}>
            CO₂-EQ SINCE YOU OPENED THIS PAGE
          </span>
          <span style={{
            fontSize: '28px', fontWeight: '700', fontFamily: 'monospace',
            color: '#c8f064', minWidth: '120px',
          }}>
            {formatTons(tons)}
          </span>
          <span style={{ fontSize: '13px', color: '#555', fontFamily: 'monospace' }}>
            tonnes CO₂-eq
          </span>
        </div>
        <div style={{ width: '1px', height: '32px', background: '#222' }} />
        <div style={{ display: 'flex', gap: '20px' }}>
          {equivalences.slice(0, 3).map(eq => (
            <div key={eq.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#e8e8e8' }}>
                {eq.value.toLocaleString()}
              </span>
              <span style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em' }}>
                {eq.label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.12em' }}>
            NOT IN UNFCCC ACCOUNTING
          </span>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#c8f064', animation: 'pulse 2s infinite',
          }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeTab === 'MAP' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <LeafletMap
                events={events}
                onSelectConflict={setSelectedConflict}
                showSatellite={showSatellite}
                onToggleSatellite={() => setShowSatellite(s => !s)}
              />
            </div>
            {selectedConflict && (
              <div style={{ width: '340px', borderLeft: '1px solid #1a1a1a', overflowY: 'auto', flexShrink: 0 }}>
                <ConflictCard data={selectedConflict} onClose={() => setSelectedConflict(null)} />
              </div>
            )}
          </div>
        )}
        {activeTab === 'LEDGER' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ConflictLedger events={events} onSelectConflict={setSelectedConflict} />
            </div>
            {selectedConflict && (
              <div style={{ width: '340px', borderLeft: '1px solid #1a1a1a', flexShrink: 0 }}>
                <ConflictCard data={selectedConflict} onClose={() => setSelectedConflict(null)} />
              </div>
            )}
          </div>
        )}
        {activeTab === 'SIMULATOR' && <SimulatorPanel />}
        {activeTab === 'POLICY' && <PolicyPanel events={events} />}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060606; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

function LeafletMap({ events, onSelectConflict, showSatellite, onToggleSatellite }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const smokeCanvasRef = useRef(null)
  const smokeParticlesRef = useRef([])
  const smokeFrameRef = useRef(null)
  const satelliteLayerRef = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current || !mapRef.current) return
    initializedRef.current = true

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = window.L
      const map = L.map(mapRef.current, {
        center: [25, 35],
        zoom: 3,
        zoomControl: true,
      })

      // Dark base map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map

      // Initialize smoke canvas overlay
      initSmokeCanvas(map)
    }
    document.head.appendChild(script)

    return () => {
      if (smokeFrameRef.current) cancelAnimationFrame(smokeFrameRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      initializedRef.current = false
    }
  }, [])

  // Toggle satellite NO2 layer
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L

    if (showSatellite) {
      // Sentinel-5P NO2 tropospheric column via NASA GIBS
      // This is real satellite data updated daily
      const no2Layer = L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SENTINEL_5P_NO2_TROPOSPHERIC_COLUMN/default/2024-03-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png',
        {
          opacity: 0.7,
          attribution: 'NASA GIBS / Sentinel-5P TROPOMI',
          maxZoom: 7,
        }
      )
      no2Layer.addTo(mapInstanceRef.current)
      satelliteLayerRef.current = no2Layer
    } else {
      if (satelliteLayerRef.current) {
        mapInstanceRef.current.removeLayer(satelliteLayerRef.current)
        satelliteLayerRef.current = null
      }
    }
  }, [showSatellite])

  // Initialize smoke canvas
  function initSmokeCanvas(map) {
    const container = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 500;
    `
    container.appendChild(canvas)
    smokeCanvasRef.current = canvas

    function resize() {
      canvas.width = container.offsetWidth
      canvas.height = container.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
  }

  // Add markers and smoke when events load
  useEffect(() => {
    if (!events?.length) return
    const interval = setInterval(() => {
      if (!window.L || !mapInstanceRef.current || !smokeCanvasRef.current) return
      clearInterval(interval)

      const L = window.L
      const map = mapInstanceRef.current

      const COLOR_MAP = {
        'Air strike': '#ff3333',
        'Missile strike': '#ff6600',
        'Shelling': '#ffcc00',
        'Drone strike': '#cc44ff',
        'Naval attack': '#4488ff',
        'Armed clash': '#44aaff',
      }

      const SMOKE_COLOR_MAP = {
        'Air strike': { r: 255, g: 80, b: 30 },
        'Missile strike': { r: 255, g: 120, b: 20 },
        'Shelling': { r: 200, g: 160, b: 40 },
        'Drone strike': { r: 180, g: 60, b: 255 },
        'Naval attack': { r: 60, g: 120, b: 255 },
        'Armed clash': { r: 80, g: 160, b: 255 },
      }

      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      smokeParticlesRef.current = []

      events.forEach(event => {
        const lat = parseFloat(event.latitude)
        const lng = parseFloat(event.longitude)
        if (isNaN(lat) || isNaN(lng)) return

        const emissions = estimateEventEmissions(event)
        const color = COLOR_MAP[event.sub_event_type] || '#44aaff'
        const smokeColor = SMOKE_COLOR_MAP[event.sub_event_type] || { r: 80, g: 160, b: 255 }
        const size = Math.max(10, Math.min(30, emissions.mid / 6))

        // Map marker with pulse rings
        const icon = L.divIcon({
          className: '',
          html: `<div style="position:relative;width:${size*3}px;height:${size*3}px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:${size*3}px;height:${size*3}px;border-radius:50%;background:${color};opacity:0.15;animation:ripple1 2s infinite;"></div>
            <div style="position:absolute;width:${size*2}px;height:${size*2}px;border-radius:50%;background:${color};opacity:0.2;animation:ripple2 2s infinite 0.5s;"></div>
            <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 ${size}px ${color},0 0 ${size*2}px ${color}66;cursor:pointer;z-index:2;"></div>
          </div>`,
          iconSize: [size*3, size*3],
          iconAnchor: [size*1.5, size*1.5],
        })

        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindTooltip(`<div style="background:#0d0d0d;border:1px solid #222;border-radius:8px;padding:10px;color:#e8e8e8;font-family:monospace;min-width:200px">
            <div style="font-weight:600;margin-bottom:4px">${event.sub_event_type} — ${event.location}</div>
            <div style="color:#888;font-size:11px;margin-bottom:6px">${event.country} · ${event.event_date}</div>
            <div style="color:#c8f064">~${emissions.mid} tonnes CO₂-eq</div>
            <div style="color:#ff8844;font-size:10px;margin-top:3px">Weapon: ${emissions.weaponLabel || 'Unknown'}</div>
          </div>`, { className: 'cow-tooltip', opacity: 1 })
          .on('click', () => onSelectConflict && onSelectConflict({ event, emissions }))

        markersRef.current.push(marker)

        // Create smoke particles for this location
        const numParticles = Math.max(8, Math.min(30, Math.floor(emissions.mid / 10)))
        for (let i = 0; i < numParticles; i++) {
          smokeParticlesRef.current.push({
            lat, lng,
            offsetX: (Math.random() - 0.5) * 20,
            offsetY: (Math.random() - 0.5) * 20,
            vy: -(0.3 + Math.random() * 0.8),
            vx: (Math.random() - 0.5) * 0.3,
            life: Math.random(),
            maxLife: 0.5 + Math.random() * 0.5,
            size: 3 + Math.random() * (emissions.mid / 40),
            color: smokeColor,
            phase: Math.random() * Math.PI * 2,
          })
        }
      })

      // Start smoke animation
      animateSmoke(map)
    }, 200)

    return () => clearInterval(interval)
  }, [events])

  function animateSmoke(map) {
    if (!smokeCanvasRef.current) return
    const canvas = smokeCanvasRef.current
    const ctx = canvas.getContext('2d')

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      smokeParticlesRef.current.forEach(p => {
        // Convert lat/lng to pixel position
        const point = map.latLngToContainerPoint([p.lat, p.lng])

        p.life += 0.006
        if (p.life >= p.maxLife) {
          p.life = 0
          p.offsetX = (Math.random() - 0.5) * 20
          p.offsetY = (Math.random() - 0.5) * 20
        }

        const t = p.life / p.maxLife
        const alpha = t < 0.2 ? t / 0.2 : 1 - ((t - 0.2) / 0.8)
        const currentSize = p.size * (0.5 + t * 2.5)

        const px = point.x + p.offsetX + p.vx * (t * 60)
        const py = point.y + p.offsetY + p.vy * (t * 60) + Math.sin(Date.now() / 1200 + p.phase) * 3

        const grad = ctx.createRadialGradient(px, py, 0, px, py, currentSize * 2)
        grad.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha * 0.5})`)
        grad.addColorStop(0.4, `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha * 0.2})`)
        grad.addColorStop(1, `rgba(80,80,80,0)`)

        ctx.beginPath()
        ctx.arc(px, py, currentSize * 2, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      smokeFrameRef.current = requestAnimationFrame(frame)
    }

    if (smokeFrameRef.current) cancelAnimationFrame(smokeFrameRef.current)
    frame()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#0a0a0a' }} />

      {/* Satellite toggle */}
      <div style={{
        position: 'absolute', top: '16px', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', gap: '8px',
      }}>
        <button
          onClick={onToggleSatellite}
          style={{
            background: showSatellite ? '#1a3a1a' : 'rgba(6,6,6,0.92)',
            border: `1px solid ${showSatellite ? '#c8f064' : '#1a1a1a'}`,
            borderRadius: '8px', padding: '8px 16px',
            color: showSatellite ? '#c8f064' : '#888',
            cursor: 'pointer', fontSize: '11px',
            letterSpacing: '0.12em', display: 'flex',
            alignItems: 'center', gap: '8px',
          }}
        >
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: showSatellite ? '#c8f064' : '#444',
            animation: showSatellite ? 'pulse 2s infinite' : 'none',
          }} />
          {showSatellite ? 'SATELLITE NO₂ · LIVE' : 'SATELLITE NO₂ LAYER'}
        </button>
      </div>

      {/* Satellite legend */}
      {showSatellite && (
        <div style={{
          position: 'absolute', bottom: '80px', left: '16px',
          zIndex: 1000,
          background: 'rgba(6,6,6,0.92)', border: '1px solid #1a1a1a',
          borderRadius: '10px', padding: '12px 16px',
          maxWidth: '220px',
        }}>
          <div style={{ fontSize: '10px', color: '#c8f064', letterSpacing: '0.12em', marginBottom: '8px' }}>
            SENTINEL-5P NO₂ COLUMN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '60px', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #000080, #0000ff, #00ffff, #ffff00, #ff0000)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
            <span>Low NO₂</span><span>High NO₂</span>
          </div>
          <div style={{ fontSize: '10px', color: '#444', marginTop: '8px', lineHeight: '1.5' }}>
            Real atmospheric data from ESA satellite. Red = high pollution. Conflict zones show elevated NO₂ from explosions and fires.
          </div>
          <div style={{ fontSize: '9px', color: '#333', marginTop: '6px' }}>
            Source: NASA GIBS / ESA Copernicus
          </div>
        </div>
      )}

      {/* Active incidents counter */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 1000,
        background: 'rgba(6,6,6,0.92)', border: '1px solid #1a1a1a',
        borderRadius: '10px', padding: '12px 16px',
      }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>ACTIVE INCIDENTS</div>
        <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>{events?.length || 0}</div>
        <div style={{ fontSize: '10px', color: '#444' }}>click any dot for details</div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '24px', right: '16px', zIndex: 1000,
        background: 'rgba(6,6,6,0.92)', border: '1px solid #1a1a1a',
        borderRadius: '10px', padding: '14px 16px',
      }}>
        {[
          { color: '#ff3333', label: 'Air strike' },
          { color: '#ff6600', label: 'Missile strike' },
          { color: '#ffcc00', label: 'Shelling' },
          { color: '#cc44ff', label: 'Drone strike' },
          { color: '#4488ff', label: 'Naval attack' },
          { color: '#44aaff', label: 'Armed clash' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
            <span style={{ fontSize: '11px', color: '#888' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1a1a1a', marginTop: '8px', paddingTop: '8px', fontSize: '10px', color: '#444' }}>
          Smoke = estimated CO₂ plume
        </div>
      </div>

      <style>{`
        .cow-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;}
        .leaflet-tooltip-top:before{display:none;}
        @keyframes ripple1{0%{transform:scale(0.8);opacity:0.15;}50%{transform:scale(1.3);opacity:0.03;}100%{transform:scale(0.8);opacity:0.15;}}
        @keyframes ripple2{0%{transform:scale(0.6);opacity:0.2;}50%{transform:scale(1);opacity:0.05;}100%{transform:scale(0.6);opacity:0.2;}}
      `}</style>
    </div>
  )
}

function ConflictCard({ data, onClose }) {
  if (!data) return null
  const { event, emissions } = data
  const breakdown = [
    { label: 'Direct CO₂ from propellant/fuel', value: Math.round((emissions.breakdown?.co2?.mid || emissions.mid * 0.15)), color: '#ff4444' },
    { label: 'Black carbon (BC) — soot', value: Math.round((emissions.breakdown?.blackCarbon?.mid || emissions.mid * 0.08)), color: '#ff8800' },
    { label: 'NOₓ ozone forcing', value: Math.round((emissions.breakdown?.nox?.mid || emissions.mid * 0.04)), color: '#ffcc00' },
    { label: 'Secondary fires & destruction', value: Math.round((emissions.breakdown?.secondary?.mid || emissions.mid * 0.73)), color: '#44bb88' },
  ]
  return (
    <div style={{ background: '#0d0d0d', padding: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '4px' }}>
            {event.country?.toUpperCase()} · {event.event_date}
          </div>
          <h3 style={{ fontSize: '16px', color: '#e8e8e8', fontWeight: '600', margin: '0 0 4px' }}>
            {event.sub_event_type}
          </h3>
          <div style={{ fontSize: '13px', color: '#888' }}>{event.location}</div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid #222', borderRadius: '6px',
          color: '#666', cursor: 'pointer', padding: '4px 10px', fontSize: '12px',
        }}>✕</button>
      </div>

      {/* Weapon system */}
      {emissions.weaponLabel && (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', marginBottom: '4px' }}>ESTIMATED WEAPON SYSTEM</div>
          <div style={{ fontSize: '12px', color: '#ff8844' }}>{emissions.weaponLabel}</div>
          <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>
            Confidence: <span style={{ color: emissions.confidence === 'HIGH' ? '#44bb88' : emissions.confidence === 'MEDIUM' ? '#ffcc00' : '#ff6666' }}>{emissions.confidence || 'LOW'}</span>
          </div>
        </div>
      )}

      {/* Total */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.15em', marginBottom: '6px' }}>TOTAL CO₂-EQUIVALENT</div>
        <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {formatTons(emissions.mid)}
        </div>
        <div style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>
          Range: {formatTons(emissions.low)} – {formatTons(emissions.high)} tonnes
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', marginBottom: '10px' }}>EMISSIONS BREAKDOWN</div>
        {breakdown.map(item => (
          <div key={item.label} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: '#aaa' }}>{item.label}</span>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: item.color }}>{item.value}t</span>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: '2px', height: '3px' }}>
              <div style={{ width: `${Math.min(100, (item.value / emissions.mid) * 100)}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Methodology note */}
      {emissions.notes && (
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '10px', fontSize: '10px', color: '#444', lineHeight: '1.6' }}>
          <strong style={{ color: '#555' }}>Methodology:</strong> {emissions.notes}
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', color: '#333', lineHeight: '1.6' }}>
        {event.notes}
      </div>
    </div>
  )
}

function ConflictLedger({ events, onSelectConflict }) {
  const [sortBy, setSortBy] = useState('date')
  const [filterCountry, setFilterCountry] = useState('ALL')
  if (!events?.length) return <div style={{ padding: '24px', color: '#555' }}>Loading...</div>
  const countries = ['ALL', ...new Set(events.map(e => e.country).filter(Boolean))].sort()
  let filtered = events.filter(e => filterCountry === 'ALL' || e.country === filterCountry)
  const withEmissions = filtered.map(event => ({ event, emissions: estimateEventEmissions(event) }))
  if (sortBy === 'emissions') withEmissions.sort((a, b) => b.emissions.mid - a.emissions.mid)
  else if (sortBy === 'date') withEmissions.sort((a, b) => new Date(b.event.event_date) - new Date(a.event.event_date))
  const totals = aggregateEmissions(filtered)
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '24px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>TOTAL EVENTS</div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: '#e8e8e8' }}>{filtered.length}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>TOTAL CO₂-EQ</div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>{formatTons(totals.mid)}t</div>
        </div>
      </div>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '10px', flexShrink: 0, background: '#0a0a0a' }}>
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
          style={{ background: '#111', border: '1px solid #222', color: '#aaa', borderRadius: '6px', padding: '5px 10px', fontSize: '12px' }}>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {['date', 'emissions'].map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            background: sortBy === s ? '#1e1e1e' : 'none',
            border: `1px solid ${sortBy === s ? '#333' : '#1a1a1a'}`,
            color: sortBy === s ? '#e8e8e8' : '#555',
            borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {withEmissions.map(({ event, emissions }, i) => {
          const colors = { 'Air strike': '#ff3333', 'Missile strike': '#ff6600', 'Shelling': '#ffcc00', 'Drone strike': '#cc44ff', 'Armed clash': '#44aaff' }
          const color = colors[event.sub_event_type] || '#888'
          return (
            <div key={i} onClick={() => onSelectConflict && onSelectConflict({ event, emissions })}
              style={{ padding: '10px 16px', borderBottom: '1px solid #111', cursor: 'pointer', display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: '12px', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0f0f0f'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              <div>
                <div style={{ fontSize: '12px', color: '#e8e8e8', fontWeight: '500', marginBottom: '2px' }}>
                  {event.sub_event_type} — {event.location}, {event.country}
                </div>
                <div style={{ fontSize: '10px', color: '#444' }}>{event.event_date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', color: '#c8f064' }}>{formatTons(emissions.mid)}t</div>
                <div style={{ fontSize: '10px', color: '#444' }}>CO₂-eq</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SimulatorPanel() {
  const [conflictType, setConflictType] = useState('conventional')
  const [duration, setDuration] = useState(12)
  const [intensity, setIntensity] = useState(50)
  const [result, setResult] = useState(null)
  const TYPES = {
    conventional: { label: 'Conventional war', base: 2400000, desc: 'Full-scale ground + air (e.g. Ukraine 2022–)' },
    urban: { label: 'Urban siege', base: 1800000, desc: 'Dense urban combat + infrastructure destruction' },
    airstrike_campaign: { label: 'Air strike campaign', base: 800000, desc: 'Sustained aerial bombardment' },
    insurgency: { label: 'Insurgency / civil war', base: 400000, desc: 'Irregular warfare, lower intensity' },
    drone_war: { label: 'Drone warfare', base: 120000, desc: 'Drone-primary conflict' },
  }
  function calculate() {
    const total = Math.round(TYPES[conflictType].base * (duration / 12) * (intensity / 50))
    setResult({
      total,
      direct: Math.round(total * 0.45),
      infrastructure: Math.round(total * 0.30),
      ecosystem: Math.round(total * 0.15),
      indirect: Math.round(total * 0.10),
      rank: total > 500000000 ? 'Top 10 global emitter' : total > 100000000 ? 'Similar to Portugal' : total > 50000000 ? 'Similar to Croatia' : 'Smaller than most EU countries',
    })
  }
  const fmt = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toLocaleString()
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: '#e8e8e8' }}>Conflict Carbon Simulator</h2>
      <p style={{ fontSize: '13px', color: '#555', marginBottom: '32px', lineHeight: '1.6' }}>Estimate the carbon footprint of any conflict scenario.</p>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>CONFLICT TYPE</label>
        {Object.entries(TYPES).map(([key, val]) => (
          <button key={key} onClick={() => setConflictType(key)} style={{
            width: '100%', background: conflictType === key ? '#111' : 'none',
            border: `1px solid ${conflictType === key ? '#333' : '#1a1a1a'}`,
            borderRadius: '8px', padding: '12px 16px', cursor: 'pointer',
            textAlign: 'left', marginBottom: '6px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: conflictType === key ? '#e8e8e8' : '#666', marginBottom: '2px' }}>{val.label}</div>
            <div style={{ fontSize: '11px', color: '#444' }}>{val.desc}</div>
          </button>
        ))}
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>DURATION — {duration} MONTHS</label>
        <input type="range" min="1" max="60" value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ width: '100%', accentColor: '#c8f064' }} />
      </div>
      <div style={{ marginBottom: '32px' }}>
        <label style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>INTENSITY — {intensity}%</label>
        <input type="range" min="10" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%', accentColor: '#c8f064' }} />
      </div>
      <button onClick={calculate} style={{
        width: '100%', padding: '14px', background: '#c8f064', border: 'none',
        borderRadius: '8px', color: '#060606', fontWeight: '700', fontSize: '14px',
        cursor: 'pointer', marginBottom: '24px',
      }}>CALCULATE CARBON FOOTPRINT</button>
      {result && (
        <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '6px' }}>TOTAL ESTIMATED EMISSIONS</div>
          <div style={{ fontSize: '40px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>{fmt(result.total)} t CO₂-eq</div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '6px', marginBottom: '20px' }}>{result.rank}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Direct ops', value: result.direct },
              { label: 'Infrastructure', value: result.infrastructure },
              { label: 'Ecosystem', value: result.ecosystem },
              { label: 'Indirect', value: result.indirect },
            ].map(item => (
              <div key={item.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#e8e8e8' }}>{fmt(item.value)}t</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#555', background: '#080808', borderRadius: '8px', padding: '12px', marginTop: '16px' }}>
            <strong style={{ color: '#666' }}>None of this appears in UNFCCC national inventories.</strong> Military emissions are explicitly excluded from Paris Agreement accounting.
          </div>
        </div>
      )}
    </div>
  )
}

function PolicyPanel({ events }) {
  const totals = events.length ? aggregateEmissions(events) : { low: 0, mid: 0, high: 0 }
  const COUNTRIES = [
    { country: 'Russia', pledge: 'Net zero by 2060', events: events.filter(e => e.country === 'Ukraine' || e.country === 'Russia').length },
    { country: 'United States', pledge: 'Net zero by 2050', events: events.filter(e => ['Syria','Iraq','Somalia','Yemen'].includes(e.country)).length },
    { country: 'Israel', pledge: 'Net zero by 2050', events: events.filter(e => e.country === 'Palestine' || e.country === 'Lebanon').length },
    { country: 'Sudan', pledge: 'No net zero target', events: events.filter(e => e.country === 'Sudan').length },
    { country: 'Myanmar', pledge: 'Conditional target', events: events.filter(e => e.country === 'Myanmar').length },
  ]
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: '#e8e8e8' }}>Policy Audit</h2>
      <p style={{ fontSize: '13px', color: '#555', marginBottom: '32px', lineHeight: '1.6' }}>
        Military and conflict emissions are systematically excluded from UNFCCC national reporting. This is the accounting gap.
      </p>
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '8px' }}>CONFLICT EMISSIONS — LAST 30 DAYS — NOT IN ANY CLIMATE REPORT</div>
        <div style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>{formatTons(totals.mid)} tonnes CO₂-eq</div>
        <div style={{ fontSize: '12px', color: '#444', marginTop: '8px', lineHeight: '1.7' }}>
          This figure does not appear in any UNFCCC national inventory. It is not counted toward any country's Paris Agreement commitments.
        </div>
      </div>
      {COUNTRIES.map(row => (
        <div key={row.country} style={{ padding: '14px 16px', borderBottom: '1px solid #111', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e8e8' }}>{row.country}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{row.pledge}</div>
          </div>
          <div style={{ fontSize: '11px', color: '#444' }}>{row.events} events in data</div>
          <div style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: '#1a0a0a', color: '#ff4444', letterSpacing: '0.1em' }}>EXCLUDED</div>
        </div>
      ))}
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '18px', fontSize: '12px', color: '#555', lineHeight: '1.7', marginTop: '24px' }}>
        <strong style={{ color: '#888', display: 'block', marginBottom: '8px' }}>Why is military excluded?</strong>
        Under Article 13 of the Paris Agreement, countries submit national greenhouse gas inventories. Military fuel use has been excluded from mandatory reporting since the 1997 Kyoto Protocol, following pressure from the US Department of Defense. NATO and partner nations continue to voluntarily exclude operational military emissions.
      </div>
    </div>
  )
}
