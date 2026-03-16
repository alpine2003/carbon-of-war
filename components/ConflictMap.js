// components/ConflictMap.js
'use client'
import { useEffect, useRef, useState } from 'react'
import { estimateEventEmissions } from '../lib/emissions'

export default function ConflictMap({ events, fires, onSelectConflict }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const plumeAnimationsRef = useRef([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    import('mapbox-gl').then((mapboxgl) => {
      const mb = mapboxgl.default
      mb.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      map.current = new mb.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [35, 25],
        zoom: 2.5,
        projection: 'globe',
        antialias: true,
      })

      map.current.on('load', () => {
        // Atmosphere
        map.current.setFog({
          color: 'rgb(8, 8, 18)',
          'high-color': 'rgb(15, 15, 35)',
          'horizon-blend': 0.03,
          'space-color': 'rgb(4, 4, 12)',
          'star-intensity': 0.9,
        })
        setMapLoaded(true)
      })
    })

    return () => {
      plumeAnimationsRef.current.forEach(id => cancelAnimationFrame(id))
      markersRef.current.forEach(m => m.remove())
      if (map.current) { map.current.remove(); map.current = null }
    }
  }, [])

  // Add markers + plumes when map loads and events arrive
  useEffect(() => {
    if (!mapLoaded || !map.current || !events?.length) return

    import('mapbox-gl').then((mapboxgl) => {
      const mb = mapboxgl.default

      // Clear old markers and animations
      plumeAnimationsRef.current.forEach(id => cancelAnimationFrame(id))
      plumeAnimationsRef.current = []
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      events.forEach((event, idx) => {
        const lat = parseFloat(event.latitude)
        const lng = parseFloat(event.longitude)
        if (isNaN(lat) || isNaN(lng)) return

        const emissions = estimateEventEmissions(event)
        const type = event.sub_event_type || 'Armed clash'

        // Color per event type
        const colorMap = {
          'Air strike':     { ring: '#ff3333', plume: '#ff4444', core: '#ff8888' },
          'Missile strike': { ring: '#ff6600', plume: '#ff7700', core: '#ffaa44' },
          'Shelling':       { ring: '#ffcc00', plume: '#ffdd00', core: '#ffee88' },
          'Drone strike':   { ring: '#cc44ff', plume: '#dd55ff', core: '#ee99ff' },
          'Naval attack':   { ring: '#4488ff', plume: '#5599ff', core: '#88bbff' },
          'Armed clash':    { ring: '#44aaff', plume: '#55bbff', core: '#88ddff' },
        }
        const colors = colorMap[type] || colorMap['Armed clash']

        // Plume canvas — animated rising CO2 particles
        const canvas = document.createElement('canvas')
        const size = Math.max(60, Math.min(140, emissions.mid / 2))
        canvas.width = size
        canvas.height = size
        canvas.style.width = size + 'px'
        canvas.style.height = size + 'px'
        canvas.style.cursor = 'pointer'
        canvas.style.pointerEvents = 'auto'

        const ctx = canvas.getContext('2d')

        // Particle system for the plume
        const particles = Array.from({ length: 18 }, (_, i) => ({
          x: size / 2 + (Math.random() - 0.5) * 8,
          y: size * 0.75,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(0.4 + Math.random() * 0.8),
          life: Math.random(),
          maxLife: 0.6 + Math.random() * 0.4,
          r: 2 + Math.random() * (emissions.mid / 60),
          phase: Math.random() * Math.PI * 2,
        }))

        let frameId
        const animate = () => {
          ctx.clearRect(0, 0, size, size)

          // Impact ring pulse
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 600)
          ctx.beginPath()
          ctx.arc(size / 2, size * 0.78, (6 + pulse * 4), 0, Math.PI * 2)
          ctx.strokeStyle = colors.ring
          ctx.lineWidth = 1.5
          ctx.globalAlpha = 0.8 - pulse * 0.3
          ctx.stroke()

          // Core dot
          ctx.beginPath()
          ctx.arc(size / 2, size * 0.78, 4, 0, Math.PI * 2)
          ctx.fillStyle = colors.core
          ctx.globalAlpha = 1
          ctx.fill()

          // Outer expanding ring
          const expand = (Date.now() % 2000) / 2000
          ctx.beginPath()
          ctx.arc(size / 2, size * 0.78, 6 + expand * 18, 0, Math.PI * 2)
          ctx.strokeStyle = colors.ring
          ctx.lineWidth = 1
          ctx.globalAlpha = (1 - expand) * 0.5
          ctx.stroke()

          // Plume particles
          particles.forEach(p => {
            p.life += 0.008
            if (p.life >= p.maxLife) {
              p.life = 0
              p.x = size / 2 + (Math.random() - 0.5) * 8
              p.y = size * 0.75
              p.vx = (Math.random() - 0.5) * 0.6
              p.vy = -(0.4 + Math.random() * 0.8)
            }
            p.x += p.vx + Math.sin(Date.now() / 800 + p.phase) * 0.15
            p.y += p.vy

            const t = p.life / p.maxLife
            const alpha = t < 0.3 ? t / 0.3 : 1 - ((t - 0.3) / 0.7)
            const radius = p.r * (0.5 + t * 1.2)

            // Gradient per particle
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2)
            grad.addColorStop(0, colors.plume)
            grad.addColorStop(1, 'transparent')
            ctx.beginPath()
            ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2)
            ctx.fillStyle = grad
            ctx.globalAlpha = alpha * 0.55
            ctx.fill()
          })

          frameId = requestAnimationFrame(animate)
        }

        animate()
        plumeAnimationsRef.current.push(frameId)

        canvas.addEventListener('click', () => {
          onSelectConflict && onSelectConflict({ event, emissions })
        })

        const marker = new mb.Marker({ element: canvas, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map.current)

        markersRef.current.push(marker)
      })
    })
  }, [mapLoaded, events])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '24px', right: '16px',
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
              background: item.color,
              boxShadow: `0 0 6px ${item.color}`,
            }} />
            <span style={{ fontSize: '11px', color: '#888' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1a1a1a', marginTop: '8px', paddingTop: '8px', fontSize: '10px', color: '#444' }}>
          Plume size = estimated CO₂-eq
        </div>
      </div>

      {/* Active conflict counter */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px',
        background: 'rgba(6,6,6,0.92)', border: '1px solid #1a1a1a',
        borderRadius: '10px', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>
          ACTIVE INCIDENTS
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {events?.length || 0}
        </div>
        <div style={{ fontSize: '10px', color: '#444' }}>last 30 days · click any plume</div>
      </div>
    </div>
  )
}