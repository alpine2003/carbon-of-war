// components/DebtClock.js
// The live-ticking carbon counter — the emotional heart of the dashboard
'use client'
import { useState, useEffect, useRef } from 'react'
import { TONS_PER_SECOND, formatTons, getEquivalences } from '../lib/emissions'

export default function DebtClock({ sessionStartTime }) {
  const [tons, setTons] = useState(0)
  const [visible, setVisible] = useState(false)
  const frameRef = useRef(null)

  useEffect(() => {
    setVisible(true)
    const start = sessionStartTime || Date.now()

    function tick() {
      const elapsed = (Date.now() - start) / 1000 // seconds
      setTons(elapsed * TONS_PER_SECOND)
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [sessionStartTime])

  const equivalences = getEquivalences(tons)

  return (
    <div style={{
      background: '#0a0a0a',
      borderBottom: '1px solid #1a1a1a',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      flexWrap: 'wrap',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.8s ease',
    }}>
      {/* Main counter */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
        <span style={{
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: '#666',
          textTransform: 'uppercase',
          fontFamily: 'monospace',
        }}>
          CO₂-eq since you opened this page
        </span>
        <span style={{
          fontSize: '28px',
          fontWeight: '700',
          fontFamily: 'monospace',
          color: '#c8f064',
          letterSpacing: '0.05em',
          minWidth: '120px',
        }}>
          {formatTons(tons)}
        </span>
        <span style={{ fontSize: '13px', color: '#555', fontFamily: 'monospace' }}>
          tonnes CO₂-eq
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '32px', background: '#222', flexShrink: 0 }} />

      {/* Equivalences strip */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {equivalences.slice(0, 3).map((eq) => (
          <div key={eq.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: 'monospace',
              color: '#e8e8e8',
            }}>
              {eq.value.toLocaleString()}
            </span>
            <span style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em' }}>
              {eq.label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Invisibility toggle */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.12em' }}>
          NOT IN UNFCCC ACCOUNTING
        </span>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#c8f064',
          boxShadow: '0 0 6px #c8f064',
          animation: 'pulse 2s infinite',
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}