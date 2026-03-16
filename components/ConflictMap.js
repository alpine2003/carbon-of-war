'use client'
import { useEffect, useRef, useState } from 'react'
import { estimateEventEmissions } from '../lib/emissions'

export default function ConflictMap({ events, fires, onSelectConflict }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [tooltip, setTooltip] = useState(null)

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
      if (map.current) { map.current.remove(); map.current = null }
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !map.current || !events?.length) return

    const COLOR_MAP = {
      'Air strike':     '#ff3333',
      'Missile strike': '#ff6600',
      'Shelling':       '#ffcc00',
      'Drone strike':   '#cc44ff',
      'Naval attack':   '#4488ff',
      'Armed clash':    '#44aaff',
    }

    // Build GeoJSON from events
    const geojson = {
      type: 'FeatureCollection',
      features: events
        .filter(e => e.latitude && e.longitude)
        .map((event) => {
          const emissions = estimateEventEmissions(event)
          const color = COLOR_MAP[event.sub_event_type] || '#44aaff'
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [
                parseFloat(event.longitude),
                parseFloat(event.latitude),
              ],
            },
            properties: {
              ...event,
              emissionsMid: emissions.mid,
              emissionsLow: emissions.low,
              emissionsHigh: emissions.high,
              color,
              radius: Math.max(6, Math.min(20, emissions.mid / 10)),
            },
          }
        }),
    }

    // Remove old layers if they exist
    ['conflict-points', 'conflict-halos', 'conflict-pulse'].forEach(id => {
      if (map.current.getLayer(id)) map.current.removeLayer(id)
    })
    if (map.current.getSource('conflicts')) {
      map.current.removeSource('conflicts')
    }

    map.current.addSource('conflicts', { type: 'geojson', data: geojson })

    // Outer glow halo
    map.current.addLayer({
      id: 'conflict-halos',
      type: 'circle',
      source: 'conflicts',
      paint: {
        'circle-radius': ['*', ['get', 'radius'], 2.5],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.15,
        'circle-blur': 1,
      },
    })

    // Main dot
    map.current.addLayer({
      id: 'conflict-points',
      type: 'circle',
      source: 'conflicts',
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.3,
      },
    })

    // Click handler
    map.current.on('click', 'conflict-points', (e) => {
      const props = e.features[0].properties
      const event = {
        event_id_cnty: props.event_id_cnty,
        event_date: props.event_date,
        event_type: props.event_type,
        sub_event_type: props.sub_event_type,
        country: props.country,
        location: props.location,
        latitude: props.latitude,
        longitude: props.longitude,
        fatalities: props.fatalities,
        notes: props.notes,
      }
      const emissions = {
        mid: props.emissionsMid,
        low: props.emissionsLow,
        high: props.emissionsHigh,
        category: 'direct',
      }
      onSelectConflict && onSelectConflict({ event, emissions })
    })

    // Hover tooltip
    map.current.on('mouseenter', 'conflict-points', (e) => {
      map.current.getCanvas().style.cursor = 'pointer'
      const props = e.features[0].properties
      setTooltip({
        country: props.country,
        location: props.location,
        type: props.sub_event_type,
        date: props.event_date,
        emissions: props.emissionsMid,
        notes: props.notes,
      })
    })

    map.current.on('mouseleave', 'conflict-points', () => {
      map.current.getCanvas().style.cursor = ''
      setTooltip(null)
    })

    // Animate pulse effect
    let radius = 0
    let growing = true
    const animatePulse = () => {
      if (!map.current || !map.current.getLayer('conflict-halos')) return
      if (growing) {
        radius += 0.04
        if (radius >= 1) growing = false
      } else {
        radius -= 0.04
        if (radius <= 0) growing = true
      }
      map.current.setPaintProperty(
        'conflict-halos',
        'circle-opacity',
        0.08 + radius * 0.15
      )
      map.current.setPaintProperty(
        'conflict-halos',
        'circle-radius',
        ['*', ['get', 'radius'], 2 + radius * 1.5]
      )
      requestAnimationFrame(animatePulse)
    }
    animatePulse()

  }, [mapLoaded, events])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: '16px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(6,6,6,0.96)',
          border: '1px solid #222',
          borderRadius: '10px',
          padding: '12px 18px',
          pointerEvents: 'none',
          maxWidth: '320px',
          zIndex: 10,
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#e8e8e8', marginBottom: '3px' }}>
            {tooltip.type} — {tooltip.location}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
            {tooltip.country} · {tooltip.date}
          </div>
          <div style={{ fontSize: '13px', color: '#c8f064', fontFamily: 'monospace' }}>
            ~{tooltip.emissions} tonnes CO₂-eq
          </div>
          {tooltip.notes && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
              {String(tooltip.notes).slice(0, 80)}...
            </div>
          )}
        </div>
      )}

      {/* Active incidents counter */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px',
        background: 'rgba(6,6,6,0.92)',
        border: '1px solid #1a1a1a',
        borderRadius: '10px',
        padding: '12px 16px',
      }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>
          ACTIVE INCIDENTS
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {events?.length || 0}
        </div>
        <div style={{ fontSize: '10px', color: '#444' }}>
          last 30 days · click any dot
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '24px', right: '16px',
        background: 'rgba(6,6,6,0.92)',
        border: '1px solid #1a1a1a',
        borderRadius: '10px',
        padding: '14px 16px',
      }}>
        {[
          { color: '#ff3333', label: 'Air strike' },
          { color: '#ff6600', label: 'Missile strike' },
          { color: '#ffcc00', label: 'Shelling' },
          { color: '#cc44ff', label: 'Drone strike' },
          { color: '#4488ff', label: 'Naval attack' },
          { color: '#44aaff', label: 'Armed clash' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center',
            gap: '8px', marginBottom: '6px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: item.color,
              boxShadow: `0 0 6px ${item.color}`,
            }} />
            <span style={{ fontSize: '11px', color: '#888' }}>{item.label}</span>
          </div>
        ))}
        <div style={{
          borderTop: '1px solid #1a1a1a',
          marginTop: '8px', paddingTop: '8px',
          fontSize: '10px', color: '#444',
        }}>
          Dot size = estimated CO₂-eq
        </div>
      </div>
    </div>
  )
}
```

