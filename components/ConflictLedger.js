// components/ConflictLedger.js
// Scrollable list of all conflict events with per-event carbon estimates
// This is the "audit log" — every event as a line item, like a financial ledger
'use client'
import { useState } from 'react'
import { estimateEventEmissions, aggregateEmissions, formatTons } from '../lib/emissions'

const EVENT_COLORS = {
  'Air strike': '#ff4444',
  'Missile strike': '#ff6600',
  'Shelling': '#ffaa00',
  'Drone strike': '#ff88ff',
  'Armed clash': '#88aaff',
  'default': '#888888',
}

export default function ConflictLedger({ events, onSelectConflict }) {
  const [sortBy, setSortBy] = useState('date') // 'date' | 'emissions' | 'country'
  const [filterCountry, setFilterCountry] = useState('ALL')

  if (!events?.length) {
    return (
      <div style={{ padding: '24px', color: '#555', fontSize: '14px', textAlign: 'center' }}>
        Loading conflict events...
      </div>
    )
  }

  // Get unique countries for filter
  const countries = ['ALL', ...new Set(events.map(e => e.country).filter(Boolean)).values()].sort()

  // Filter and sort
  let filtered = events.filter(e => filterCountry === 'ALL' || e.country === filterCountry)

  const withEmissions = filtered.map(event => ({
    event,
    emissions: estimateEventEmissions(event),
  }))

  if (sortBy === 'emissions') withEmissions.sort((a, b) => b.emissions.mid - a.emissions.mid)
  else if (sortBy === 'date') withEmissions.sort((a, b) => new Date(b.event.event_date) - new Date(a.event.event_date))
  else if (sortBy === 'country') withEmissions.sort((a, b) => (a.event.country || '').localeCompare(b.event.country || ''))

  const totals = aggregateEmissions(filtered)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Totals bar */}
      <div style={{
        padding: '14px 16px',
        background: '#0d0d0d',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>TOTAL EVENTS</div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: '#e8e8e8' }}>
            {filtered.length.toLocaleString()}
          </div>
        </div>
        <div style={{ width: '1px', height: '32px', background: '#1e1e1e' }} />
        <div>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>TOTAL CO₂-EQ (MID)</div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
            {formatTons(totals.mid)} t
          </div>
        </div>
        <div style={{ width: '1px', height: '32px', background: '#1e1e1e' }} />
        <div>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>RANGE</div>
          <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#888' }}>
            {formatTons(totals.low)} – {formatTons(totals.high)} t
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexShrink: 0,
        background: '#0a0a0a',
      }}>
        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          style={{
            background: '#111', border: '1px solid #222', color: '#aaa',
            borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer',
          }}
        >
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['date', 'emissions', 'country'].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                background: sortBy === s ? '#1e1e1e' : 'none',
                border: `1px solid ${sortBy === s ? '#333' : '#1a1a1a'}`,
                color: sortBy === s ? '#e8e8e8' : '#555',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Event rows */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {withEmissions.map(({ event, emissions }, i) => {
          const color = EVENT_COLORS[event.sub_event_type] || EVENT_COLORS.default
          return (
            <div
              key={event.event_id_cnty || i}
              onClick={() => onSelectConflict && onSelectConflict({ event, emissions })}
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #111',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: '8px 1fr auto',
                gap: '12px',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#0f0f0f'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Color dot */}
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />

              {/* Event info */}
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', color: '#e8e8e8', fontWeight: '500' }}>
                    {event.sub_event_type || event.event_type}
                  </span>
                  <span style={{ fontSize: '10px', color: '#444' }}>·</span>
                  <span style={{ fontSize: '11px', color: '#666' }}>{event.location}, {event.country}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#444' }}>{event.event_date}</div>
              </div>

              {/* Emissions */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', color: '#c8f064' }}>
                  {formatTons(emissions.mid)}t
                </div>
                <div style={{ fontSize: '10px', color: '#444' }}>CO₂-eq</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}