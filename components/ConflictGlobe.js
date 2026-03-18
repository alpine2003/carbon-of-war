'use client'
import { useEffect, useRef } from 'react'
import { estimateEventEmissions } from '../lib/emissions'

export default function ConflictGlobe({ events, onSelectConflict }) {
  const mountRef = useRef(null)
  const globeRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current || globeRef.current) return

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/globe.gl@2.27.2/dist/globe.gl.min.js'
    script.onload = () => {
      if (!mountRef.current) return

      const COLOR_MAP = {
        'Air strike': '#ff3333',
        'Missile strike': '#ff6600',
        'Shelling': '#ffcc00',
        'Drone strike': '#cc44ff',
        'Naval attack': '#4488ff',
        'Armed clash': '#44aaff',
      }

      const validEvents = (events || []).filter(e =>
        e.latitude && e.longitude &&
        !isNaN(parseFloat(e.latitude)) &&
        !isNaN(parseFloat(e.longitude))
      )

      const points = validEvents.map(event => {
        const emissions = estimateEventEmissions(event)
        const color = COLOR_MAP[event.sub_event_type] || '#44aaff'
        return {
          lat: parseFloat(event.latitude),
          lng: parseFloat(event.longitude),
          size: Math.max(0.3, Math.min(1.5, emissions.mid / 100)),
          color,
          event,
          emissions,
        }
      })

      const arcs = validEvents
        .filter(e => ['Air strike', 'Missile strike', 'Drone strike'].includes(e.sub_event_type))
        .map(event => {
          const color = COLOR_MAP[event.sub_event_type] || '#ff6600'
          const offset = 8 + Math.random() * 12
          return {
            startLat: parseFloat(event.latitude) + (Math.random() - 0.5) * offset,
            startLng: parseFloat(event.longitude) + (Math.random() - 0.5) * offset,
            endLat: parseFloat(event.latitude),
            endLng: parseFloat(event.longitude),
            color: [color + '88', color],
            event,
          }
        })

      const globe = window.Globe({ animateIn: true })(mountRef.current)
        .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
        .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
        .pointsData(points)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointAltitude('size')
        .pointRadius(0.4)
        .pointsMerge(false)
        .arcsData(arcs)
        .arcStartLat('startLat')
        .arcStartLng('startLng')
        .arcEndLat('endLat')
        .arcEndLng('endLng')
        .arcColor('color')
        .arcAltitude(0.15)
        .arcStroke(0.5)
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2000)
        .onPointClick(point => {
          onSelectConflict && onSelectConflict({
            event: point.event,
            emissions: point.emissions,
          })
        })
        .onPointHover(point => {
          mountRef.current.style.cursor = point ? 'pointer' : 'default'
        })
        .pointLabel(point => `
          <div style="background:rgba(0,0,0,0.9);border:1px solid ${point.color};border-radius:8px;padding:10px;font-family:monospace;min-width:200px">
            <div style="font-weight:600;color:${point.color};margin-bottom:4px">${point.event.sub_event_type} — ${point.event.location}</div>
            <div style="color:#888;font-size:11px;margin-bottom:6px">${point.event.country} · ${point.event.event_date}</div>
            <div style="color:#c8f064">~${point.emissions.mid} tonnes CO₂-eq</div>
            <div style="color:#444;font-size:10px;margin-top:3px">Click for full analysis</div>
          </div>
        `)

      // Center on Middle East + Ukraine
      globe.pointOfView({ lat: 32, lng: 38, altitude: 2.2 }, 1000)

      // Auto-rotate
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.4
      globe.controls().enableZoom = true

      // Stop rotation on interaction
      globe.controls().addEventListener('start', () => {
        globe.controls().autoRotate = false
      })

      globeRef.current = globe

      // Handle resize
      const resize = () => {
        if (mountRef.current && globe) {
          globe.width(mountRef.current.offsetWidth)
          globe.height(mountRef.current.offsetHeight)
        }
      }
      window.addEventListener('resize', resize)
      resize()
    }
    document.head.appendChild(script)

    return () => {
      if (globeRef.current) {
        globeRef.current._destructor && globeRef.current._destructor()
        globeRef.current = null
      }
    }
  }, [])

  // Update points when events change
  useEffect(() => {
    if (!globeRef.current || !events?.length) return

    const COLOR_MAP = {
      'Air strike': '#ff3333',
      'Missile strike': '#ff6600',
      'Shelling': '#ffcc00',
      'Drone strike': '#cc44ff',
      'Naval attack': '#4488ff',
      'Armed clash': '#44aaff',
    }

    const validEvents = events.filter(e =>
      e.latitude && e.longitude &&
      !isNaN(parseFloat(e.latitude)) &&
      !isNaN(parseFloat(e.longitude))
    )

    const points = validEvents.map(event => {
      const emissions = estimateEventEmissions(event)
      const color = COLOR_MAP[event.sub_event_type] || '#44aaff'
      return {
        lat: parseFloat(event.latitude),
        lng: parseFloat(event.longitude),
        size: Math.max(0.3, Math.min(1.5, emissions.mid / 100)),
        color,
        event,
        emissions,
      }
    })

    const arcs = validEvents
      .filter(e => ['Air strike', 'Missile strike', 'Drone strike'].includes(e.sub_event_type))
      .map(event => {
        const color = COLOR_MAP[event.sub_event_type] || '#ff6600'
        const offset = 8 + Math.random() * 12
        return {
          startLat: parseFloat(event.latitude) + (Math.random() - 0.5) * offset,
          startLng: parseFloat(event.longitude) + (Math.random() - 0.5) * offset,
          endLat: parseFloat(event.latitude),
          endLng: parseFloat(event.longitude),
          color: [color + '88', color],
          event,
        }
      })

    globeRef.current.pointsData(points)
    globeRef.current.arcsData(arcs)
  }, [events])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', background: '#000005' }}
    />
  )
}
