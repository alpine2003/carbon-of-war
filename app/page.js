// app/page.js
// Main Carbon of War dashboard
'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import DebtClock from '../components/DebtClock'
import ConflictCard from '../components/ConflictCard'
import ConflictLedger from '../components/ConflictLedger'

// Map must be loaded client-side only (it uses browser APIs)
const ConflictMap = dynamic(() => import('../components/ConflictMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#333', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.1em' }}>
        LOADING CONFLICT DATA...
      </span>
    </div>
  ),
})

const TABS = ['MAP', 'LEDGER', 'SIMULATOR', 'POLICY']

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('MAP')
  const [events, setEvents] = useState([])
  const [fires, setFires] = useState([])
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [loading, setLoading] = useState(true)
  const sessionStart = useRef(Date.now())

  // Fetch live conflict data on load, then every hour
  useEffect(() => {
    async function fetchData() {
      try {
        const [conflictsRes, firesRes] = await Promise.all([
          fetch('/api/conflicts'),
          fetch('/api/fires'),
        ])
        const conflictsData = await conflictsRes.json()
        const firesData = await firesRes.json()
        setEvents(conflictsData.events || [])
        setFires(firesData.fires || [])
      } catch (err) {
        console.error('Data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60 * 60 * 1000) // Refresh hourly
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#060606',
      color: '#e8e8e8',
      fontFamily: '-apple-system, "SF Pro Display", sans-serif',
      overflow: 'hidden',
    }}>

      {/* Top header bar */}
      <div style={{
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        height: '48px',
        borderBottom: '1px solid #111',
        flexShrink: 0,
        background: '#060606',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c8f064', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.1em', color: '#e8e8e8' }}>
            CARBON OF WAR
          </span>
        </div>

        {/* Nav tabs */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: '16px' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? '#141414' : 'none',
                border: 'none',
                borderRadius: '6px',
                color: activeTab === tab ? '#e8e8e8' : '#444',
                cursor: 'pointer',
                fontSize: '11px',
                letterSpacing: '0.12em',
                padding: '6px 14px',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#333', letterSpacing: '0.08em' }}>
          {loading ? 'FETCHING LIVE DATA...' : `${events.length} EVENTS · LAST 30 DAYS`}
        </div>
      </div>

      {/* Carbon debt clock */}
      <DebtClock sessionStartTime={sessionStart.current} />

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* MAP TAB */}
        {activeTab === 'MAP' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <ConflictMap
                events={events}
                fires={fires}
                onSelectConflict={setSelectedConflict}
              />
            </div>
            {/* Side panel */}
            <div style={{
              width: selectedConflict ? '340px' : '0px',
              overflow: 'hidden',
              transition: 'width 0.3s ease',
              borderLeft: selectedConflict ? '1px solid #1a1a1a' : 'none',
              flexShrink: 0,
            }}>
              {selectedConflict && (
                <ConflictCard
                  data={selectedConflict}
                  onClose={() => setSelectedConflict(null)}
                />
              )}
            </div>
          </div>
        )}

        {/* LEDGER TAB */}
        {activeTab === 'LEDGER' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
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

        {/* SIMULATOR TAB */}
        {activeTab === 'SIMULATOR' && (
          <SimulatorPanel />
        )}

        {/* POLICY TAB */}
        {activeTab === 'POLICY' && (
          <PolicyPanel events={events} />
        )}
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

// ─── SIMULATOR PANEL ────────────────────────────────────────────────
function SimulatorPanel() {
  const [conflictType, setConflictType] = useState('conventional')
  const [duration, setDuration] = useState(12)
  const [intensity, setIntensity] = useState(50)
  const [calculated, setCalculated] = useState(null)

  const CONFLICT_TYPES = {
    conventional: { label: 'Conventional war', baseEmissions: 2400000, description: 'Full-scale ground + air operations (e.g. Ukraine 2022–)' },
    urban: { label: 'Urban siege', baseEmissions: 1800000, description: 'Dense urban combat + infrastructure destruction (e.g. Gaza, Mariupol)' },
    airstrike_campaign: { label: 'Air strike campaign', baseEmissions: 800000, description: 'Sustained aerial bombardment (e.g. Yemen, Syria)' },
    insurgency: { label: 'Insurgency / civil war', baseEmissions: 400000, description: 'Irregular warfare, lower-intensity (e.g. Sahel, Myanmar)' },
    drone_war: { label: 'Drone warfare', baseEmissions: 120000, description: 'Drone-primary conflict (e.g. Nagorno-Karabakh)' },
  }

  function calculate() {
    const base = CONFLICT_TYPES[conflictType].baseEmissions
    const total = base * (duration / 12) * (intensity / 50)
    setCalculated({
      total: Math.round(total),
      direct: Math.round(total * 0.45),
      infrastructure: Math.round(total * 0.30),
      ecosystem: Math.round(total * 0.15),
      indirect: Math.round(total * 0.10),
      flights: Math.round(total / 0.9),
      cars: Math.round(total / 4.6),
      countryRank: total > 500_000_000 ? 'Top 10 global emitter' :
                   total > 100_000_000 ? 'Similar to Portugal or Denmark' :
                   total > 50_000_000 ? 'Similar to Croatia or Slovenia' :
                   'Smaller than most EU countries',
    })
  }

  const fmt = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1000).toFixed(0)}K` : n.toLocaleString()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: '#e8e8e8' }}>Conflict Carbon Simulator</h2>
      <p style={{ fontSize: '13px', color: '#555', marginBottom: '32px', lineHeight: '1.6' }}>
        Estimate the carbon footprint of a hypothetical or real conflict scenario. 
        Adjust parameters and see what the climate accounting would look like if these emissions were officially tracked.
      </p>

      {/* Conflict type */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>
          CONFLICT TYPE
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(CONFLICT_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setConflictType(key)}
              style={{
                background: conflictType === key ? '#111' : 'none',
                border: `1px solid ${conflictType === key ? '#333' : '#1a1a1a'}`,
                borderRadius: '8px',
                padding: '12px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '500', color: conflictType === key ? '#e8e8e8' : '#666', marginBottom: '2px' }}>
                {val.label}
              </div>
              <div style={{ fontSize: '11px', color: '#444' }}>{val.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>
          DURATION — {duration} MONTHS
        </label>
        <input type="range" min="1" max="60" value={duration} onChange={e => setDuration(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#c8f064' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#333', marginTop: '4px' }}>
          <span>1 month</span><span>5 years</span>
        </div>
      </div>

      {/* Intensity slider */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>
          INTENSITY — {intensity}%
        </label>
        <input type="range" min="10" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#c8f064' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#333', marginTop: '4px' }}>
          <span>Low intensity</span><span>Full scale</span>
        </div>
      </div>

      <button
        onClick={calculate}
        style={{
          width: '100%', padding: '14px', background: '#c8f064', border: 'none',
          borderRadius: '8px', color: '#060606', fontWeight: '700', fontSize: '14px',
          cursor: 'pointer', letterSpacing: '0.08em', marginBottom: '24px',
        }}
      >
        CALCULATE CARBON FOOTPRINT
      </button>

      {calculated && (
        <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '6px' }}>TOTAL ESTIMATED EMISSIONS</div>
            <div style={{ fontSize: '40px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
              {fmt(calculated.total)} t CO₂-eq
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>{calculated.countryRank}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Direct ops', value: calculated.direct },
              { label: 'Infrastructure', value: calculated.infrastructure },
              { label: 'Ecosystem loss', value: calculated.ecosystem },
              { label: 'Indirect', value: calculated.indirect },
            ].map(item => (
              <div key={item.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#e8e8e8' }}>{fmt(item.value)}t</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#555', background: '#080808', borderRadius: '8px', padding: '12px' }}>
            <strong style={{ color: '#666' }}>None of this appears in UNFCCC national inventories.</strong> Military emissions are
            explicitly excluded from Paris Agreement accounting frameworks. This scenario's emissions would be
            invisible to global climate tracking.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── POLICY AUDIT PANEL ────────────────────────────────────────────
function PolicyPanel({ events }) {
  const { aggregateEmissions, formatTons } = require('../lib/emissions')
  const totals = events.length ? aggregateEmissions(events) : { low: 0, mid: 0, high: 0 }

  const COUNTRIES_DATA = [
    { country: 'Russia', pledge: 'Net zero by 2060', militaryExcluded: true, conflictEvents: events.filter(e => e.country === 'Ukraine' || e.country === 'Russia').length },
    { country: 'United States', pledge: 'Net zero by 2050', militaryExcluded: true, conflictEvents: events.filter(e => ['Syria', 'Iraq', 'Somalia'].includes(e.country)).length },
    { country: 'Israel', pledge: 'Net zero by 2050', militaryExcluded: true, conflictEvents: events.filter(e => e.country === 'Palestine').length },
    { country: 'Sudan', pledge: 'No net zero target', militaryExcluded: true, conflictEvents: events.filter(e => e.country === 'Sudan').length },
    { country: 'Myanmar', pledge: 'Conditional target', militaryExcluded: true, conflictEvents: events.filter(e => e.country === 'Myanmar').length },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: '#e8e8e8' }}>Policy Audit</h2>
      <p style={{ fontSize: '13px', color: '#555', marginBottom: '32px', lineHeight: '1.6' }}>
        Under the Paris Agreement and UNFCCC framework, military operations and conflict-related emissions 
        are systematically excluded from national reporting obligations. This is the gap.
      </p>

      {/* The gap number */}
      <div style={{
        background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px',
        padding: '24px', marginBottom: '24px',
      }}>
        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '8px' }}>
          EMISSIONS FROM ACTIVE CONFLICTS (LAST 30 DAYS) — NOT IN ANY COUNTRY'S CLIMATE REPORT
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'monospace', color: '#c8f064' }}>
          {formatTons(totals.mid)} tonnes CO₂-eq
        </div>
        <div style={{ fontSize: '12px', color: '#444', marginTop: '8px' }}>
          This figure does not appear in any UNFCCC national inventory submission.
          It is not counted toward any country's Paris Agreement commitments.
          It does not exist in the official accounting of the climate crisis.
        </div>
      </div>

      {/* Country table */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', marginBottom: '12px' }}>
          SELECTED CONFLICT PARTIES — CLIMATE PLEDGE STATUS
        </div>
        {COUNTRIES_DATA.map(row => (
          <div key={row.country} style={{
            padding: '14px 16px', borderBottom: '1px solid #111',
            display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e8e8' }}>{row.country}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{row.pledge}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#444' }}>
              {row.conflictEvents} events in data
            </div>
            <div style={{
              fontSize: '10px', padding: '4px 8px', borderRadius: '4px',
              background: '#1a0a0a', color: '#ff4444', letterSpacing: '0.1em',
            }}>
              MILITARY EXCLUDED
            </div>
          </div>
        ))}
      </div>

      {/* Article 13 note */}
      <div style={{
        background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px',
        padding: '18px', fontSize: '12px', color: '#555', lineHeight: '1.7',
      }}>
        <strong style={{ color: '#888', display: 'block', marginBottom: '8px' }}>
          Why is military excluded?
        </strong>
        Under Article 13 of the Paris Agreement, countries submit national greenhouse gas inventories. 
        However, military fuel use has historically been excluded from mandatory reporting since the 1997 
        Kyoto Protocol, following pressure from the US Department of Defense. 
        NATO and partner nations continue to voluntarily exclude operational military emissions. 
        The result: the world's largest institutional consumers of fossil fuel operate outside the 
        rules that govern everyone else.
      </div>
    </div>
  )
}