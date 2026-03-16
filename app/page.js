'use client'
import { useState, useEffect, useRef } from 'react'
import { TONS_PER_SECOND, formatTons, getEquivalences, estimateEventEmissions, aggregateEmissions } from '../lib/emissions'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('MAP')
  const [events, setEvents] = useState([])
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [tons, setTons] = useState(0)
  const sessionStart = useRef(Date.now())
  const frameRef = useRef(null)

  // Live carbon clock
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

  // Fetch conflict data
  useEffect(() => {
    fetch('/api/conflicts')
      .then(r => r.json())
      .then(data => setEvents(data.events || []))
      .catch(console.error)
  }, [])

  const equivalences = getEquivalences(tons)

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#060606', color: '#e8e8e8',
      fontFamily: '-apple-system, "SF Pro Display", sans-serif',
      overflow: 'hidden',
    }}>

      {/* Header */}
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
          {events.length} EVENTS · LAST 30 DAYS
        </div>
      </div>

      {/* Carbon clock */}
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

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeTab === 'MAP' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <LeafletMap events={events} onSelectConflict={setSelectedConflict} />
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

// ─── LEAFLET MAP ─────────────────────────────────────────────────────
function LeafletMap({ events, onSelectConflict }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    // Dynamically load Leaflet
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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
    }
    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Add markers when events load
  useEffect(() => {
    if (!mapInstanceRef.current || !events?.length) return

    const checkLeaflet = setInterval(() => {
      if (!window.L) return
      clearInterval(checkLeaflet)

      const L = window.L
      const COLOR_MAP = {
        'Air strike': '#ff3333',
        'Missile strike': '#ff6600',
        'Shelling': '#ffcc00',
        'Drone strike': '#cc44ff',
        'Naval attack': '#4488ff',
        'Armed clash': '#44aaff',
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      events.forEach(event => {
        const lat = parseFloat(event.latitude)
        const lng = parseFloat(event.longitude)
        if (isNaN(lat) || isNaN(lng)) return

        const emissions = estimateEventEmissions(event)
        const color = COLOR_MAP[event.sub_event_type] || '#44aaff'
        const size = Math.max(10, Math.min(30, emissions.mid / 6))

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background: ${color};
              border: 2px solid rgba(255,255,255,0.4);
              box-shadow: 0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}44;
              animation: markerPulse 2s infinite;
              cursor: pointer;
            "></div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindTooltip(`
            <div style="background:#0d0d0d;border:1px solid #222;border-radius:8px;padding:10px;color:#e8e8e8;font-family:monospace;min-width:200px">
              <div style="font-weight:600;margin-bottom:4px">${event.sub_event_type} — ${event.location}</div>
              <div style="color:#888;font-size:11px;margin-bottom:6px">${event.country} · ${event.event_date}</div>
              <div style="color:#c8f064">~${emissions.mid} tonnes CO₂-eq</div>
            </div>
          `, { className: 'custom-tooltip', opacity: 1 })
          .on('click', () => onSelectConflict && onSelectConflict({ event, emissions }))

        markersRef.current.push(marker)
      })
    }, 100)

    return () => clearInterval(checkLeaflet)
  }, [events])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#0a0a0a' }} />

      {/* Active incidents */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 1000,
        background: 'rgba(6,6,6,0.92)', border: '1px solid #1a1a1a',
        borderRadius: '10px', padding: '12px 16px',
      }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>ACTIVE INCIDENTS</div>
        <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {events?.length || 0}
        </div>
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
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: item.color, boxShadow: `0 0 6px ${item.color}`,
            }} />
            <span style={{ fontSize: '11px', color: '#888' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1a1a1a', marginTop: '8px', paddingTop: '8px', fontSize: '10px', color: '#444' }}>
          Dot size = estimated CO₂-eq
        </div>
      </div>

      <style>{`
        .custom-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
        .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before { display: none; }
        @keyframes markerPulse { 0%,100%{transform:scale(1);opacity:0.9} 50%{transform:scale(1.2);opacity:1} }
      `}</style>
    </div>
  )
}

// ─── CONFLICT CARD ────────────────────────────────────────────────────
function ConflictCard({ data, onClose }) {
  if (!data) return null
  const { event, emissions } = data
  const breakdown = [
    { label: 'Direct military ops', value: Math.round(emissions.mid * 0.45), color: '#ff4444' },
    { label: 'Infrastructure destruction', value: Math.round(emissions.mid * 0.30), color: '#ff8800' },
    { label: 'Ecosystem damage', value: Math.round(emissions.mid * 0.15), color: '#44bb88' },
    { label: 'Indirect & long-term', value: Math.round(emissions.mid * 0.10), color: '#8888ff' },
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
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.15em', marginBottom: '6px' }}>ESTIMATED CO₂-EQUIVALENT</div>
        <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {formatTons(emissions.mid)}
        </div>
        <div style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>
          Range: {formatTons(emissions.low)} – {formatTons(emissions.high)} tonnes
        </div>
      </div>
      {breakdown.map(item => (
        <div key={item.label} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>{item.label}</span>
            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: item.color }}>{item.value}t</span>
          </div>
          <div style={{ background: '#1a1a1a', borderRadius: '2px', height: '4px' }}>
            <div style={{ width: `${(item.value / emissions.mid) * 100}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '12px', fontSize: '10px', color: '#444', lineHeight: '1.6', marginTop: '8px' }}>
        {event.notes}
      </div>
    </div>
  )
}

// ─── CONFLICT LEDGER ──────────────────────────────────────────────────
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

// ─── SIMULATOR ────────────────────────────────────────────────────────
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
      <p style={{ fontSize: '13px', color: '#555', marginBottom: '32px', lineHeight: '1.6' }}>
        Estimate the carbon footprint of any conflict scenario.
      </p>
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

// ─── POLICY PANEL ─────────────────────────────────────────────────────
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
        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '8px' }}>
          CONFLICT EMISSIONS — LAST 30 DAYS — NOT IN ANY CLIMATE REPORT
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {formatTons(totals.mid)} tonnes CO₂-eq
        </div>
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
          <div style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: '#1a0a0a', color: '#ff4444', letterSpacing: '0.1em' }}>
            EXCLUDED
          </div>
        </div>
      ))}
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '18px', fontSize: '12px', color: '#555', lineHeight: '1.7', marginTop: '24px' }}>
        <strong style={{ color: '#888', display: 'block', marginBottom: '8px' }}>Why is military excluded?</strong>
        Under Article 13 of the Paris Agreement, countries submit national greenhouse gas inventories. Military fuel use has been excluded from mandatory reporting since the 1997 Kyoto Protocol, following pressure from the US Department of Defense. NATO and partner nations continue to voluntarily exclude operational military emissions.
      </div>
    </div>
  )
}
```

Save with **Command + S**, then:
```
git add .
```
```
git commit -m "Switch to Leaflet for reliable map markers"
```
```
git push