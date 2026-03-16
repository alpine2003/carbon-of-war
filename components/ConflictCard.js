// components/ConflictCard.js
// Detailed carbon breakdown card shown when user clicks a conflict event
'use client'
import { formatTons, getEquivalences } from '../lib/emissions'

const CATEGORY_COLORS = {
  direct: '#ff4444',
  infrastructure: '#ff8800',
  ecosystem: '#44bb88',
  indirect: '#8888ff',
}

export default function ConflictCard({ data, onClose }) {
  if (!data) return null
  const { event, emissions } = data
  const equivalences = getEquivalences(emissions.mid)

  const breakdown = [
    { label: 'Direct military operations', value: Math.round(emissions.mid * 0.45), category: 'direct', description: 'Fuel combustion, weapons, vehicles' },
    { label: 'Infrastructure destruction', value: Math.round(emissions.mid * 0.30), category: 'infrastructure', description: 'Embodied carbon in destroyed structures' },
    { label: 'Ecosystem & land damage', value: Math.round(emissions.mid * 0.15), category: 'ecosystem', description: 'Fires, soil disruption, vegetation loss' },
    { label: 'Indirect & long-term', value: Math.round(emissions.mid * 0.10), category: 'indirect', description: 'Displacement, supply chains, reconstruction' },
  ]

  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid #1e1e1e',
      borderRadius: '12px',
      padding: '20px',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
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

      {/* Total estimate */}
      <div style={{
        background: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.15em', marginBottom: '6px' }}>
          ESTIMATED CO₂-EQUIVALENT
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
            {formatTons(emissions.mid)}
          </span>
          <span style={{ fontSize: '14px', color: '#555' }}>tonnes</span>
        </div>
        <div style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>
          Range: {formatTons(emissions.low)} – {formatTons(emissions.high)} tonnes (low–high estimate)
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.15em', marginBottom: '10px' }}>
          EMISSIONS BREAKDOWN
        </div>
        {breakdown.map(item => (
          <div key={item.label} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{item.label}</span>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: CATEGORY_COLORS[item.category] }}>
                {item.value.toLocaleString()} t
              </span>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: '2px', height: '4px' }}>
              <div style={{
                width: `${(item.value / emissions.mid) * 100}%`,
                height: '100%',
                background: CATEGORY_COLORS[item.category],
                borderRadius: '2px',
                transition: 'width 0.8s ease',
              }} />
            </div>
            <div style={{ fontSize: '10px', color: '#444', marginTop: '3px' }}>{item.description}</div>
          </div>
        ))}
      </div>

      {/* Equivalences */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.15em', marginBottom: '10px' }}>
          THIS IS EQUIVALENT TO
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {equivalences.map(eq => (
            <div key={eq.label} style={{
              background: '#111', border: '1px solid #1e1e1e',
              borderRadius: '8px', padding: '10px',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace', color: '#e8e8e8' }}>
                {eq.value.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>
                {eq.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology note */}
      <div style={{
        borderTop: '1px solid #1a1a1a',
        paddingTop: '12px',
        fontSize: '10px',
        color: '#444',
        lineHeight: '1.6',
      }}>
        <strong style={{ color: '#555' }}>Methodology:</strong> Estimates based on ACLED event classification × 
        emission factors from Crawford (2019), CEOBS, and IPCC AR6. Mid-point shown. 
        Uncertainty reflects lack of official military emissions reporting.
      </div>
    </div>
  )
}