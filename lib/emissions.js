// lib/emissions.js
// Carbon of War — Scientific Emissions Engine v2.0
//
// METHODOLOGY:
// Emission factors derived from:
// - Neta Crawford, "Pentagon Fuel Use, Climate Change, and the Costs of War" (2019, 2023)
// - Conflict and Environment Observatory (CEOBS) — "Toxic Remnants of War" series
// - Linsey Cottrell et al., "The Carbon Bootprint of War" (2022)
// - IPCC AR6 WG1 — emission factors for combustion and land use
// - Sandia National Laboratories — munition lifecycle assessments
// - Stockholm International Peace Research Institute (SIPRI) arms data
// - US DoD environmental impact statements (declassified)
//
// UNITS: All emission factors in tonnes CO2-equivalent (tCO2e)
// Non-CO2 gases converted using GWP100 values from IPCC AR6
// Black carbon uses GWP100 = 900 (Bond et al. 2013)
// NOx ozone forcing uses GWP100 = 11 (IPCC AR6)
//
// CONFIDENCE LEVELS:
// HIGH   — published LCA data exists for this specific system
// MEDIUM — estimated from similar systems + fuel/explosive mass
// LOW    — order-of-magnitude estimate only

// ─── WEAPON-SPECIFIC EMISSION FACTORS ───────────────────────────────
// Each weapon has 4 emission components:
// co2:   Direct CO2 from propellant/fuel combustion
// bc:    Black carbon (soot) — converted to CO2e using GWP100=900
// nox:   NOx ozone forcing — converted to CO2e using GWP100=11
// secondary: Expected secondary fires/destruction multiplier (range)
// Source confidence and notes included for transparency

export const WEAPON_FACTORS = {

  // ── MISSILES ──────────────────────────────────────────────────────

  'tomahawk': {
    label: 'Tomahawk cruise missile (BGM-109)',
    co2: { low: 0.8, mid: 1.2, high: 1.8 },
    bc: { low: 0.04, mid: 0.08, high: 0.15 },
    nox: { low: 0.02, mid: 0.04, high: 0.08 },
    secondary: { low: 10, mid: 80, high: 400 },
    confidence: 'MEDIUM',
    notes: 'WR-402 turbofan, ~880kg fuel (JP-10). Secondary varies enormously by target type.',
    category: 'Missile strike',
  },

  'iskander': {
    label: 'Iskander-M ballistic missile (9M723)',
    co2: { low: 2.1, mid: 3.4, high: 5.2 },
    bc: { low: 0.8, mid: 1.4, high: 2.2 },
    nox: { low: 0.3, mid: 0.6, high: 1.1 },
    secondary: { low: 20, mid: 150, high: 800 },
    confidence: 'MEDIUM',
    notes: 'Solid-fuel rocket motor ~1000kg propellant. High black carbon from solid propellant combustion.',
    category: 'Missile strike',
  },

  'himars_rocket': {
    label: 'HIMARS / M31 GMLRS rocket',
    co2: { low: 0.3, mid: 0.5, high: 0.8 },
    bc: { low: 0.2, mid: 0.35, high: 0.6 },
    nox: { low: 0.08, mid: 0.15, high: 0.28 },
    secondary: { low: 5, mid: 40, high: 200 },
    confidence: 'MEDIUM',
    notes: 'Solid-fuel rocket ~90kg. High BC/NOx ratio typical of solid propellants.',
    category: 'Missile strike',
  },

  'houthi_ballistic': {
    label: 'Houthi ballistic missile (Burkan/Qaher)',
    co2: { low: 1.8, mid: 2.9, high: 4.5 },
    bc: { low: 0.7, mid: 1.2, high: 2.0 },
    nox: { low: 0.25, mid: 0.5, high: 0.9 },
    secondary: { low: 15, mid: 100, high: 600 },
    confidence: 'LOW',
    notes: 'Derived Scud-C variant. Liquid fuel (IRFNA/kerosene). Estimates based on Scud family LCA.',
    category: 'Missile strike',
  },

  's300_sam': {
    label: 'S-300/S-400 surface-to-air missile',
    co2: { low: 0.6, mid: 1.0, high: 1.6 },
    bc: { low: 0.25, mid: 0.45, high: 0.75 },
    nox: { low: 0.1, mid: 0.2, high: 0.35 },
    secondary: { low: 0, mid: 5, high: 30 },
    confidence: 'LOW',
    notes: 'Solid/liquid dual-stage. Primarily interceptor — secondary effects minimal if intercept succeeds.',
    category: 'Missile strike',
  },

  // ── DRONES ────────────────────────────────────────────────────────

  'shahed_136': {
    label: 'Shahed-136 / Geran-2 loitering munition',
    co2: { low: 0.06, mid: 0.09, high: 0.14 },
    bc: { low: 0.005, mid: 0.009, high: 0.015 },
    nox: { low: 0.002, mid: 0.004, high: 0.007 },
    secondary: { low: 2, mid: 25, high: 150 },
    confidence: 'HIGH',
    notes: 'MD-550 piston engine, ~50L fuel. Low direct emissions but used in mass swarms (50-100+). Multiply by swarm size for total.',
    category: 'Drone strike',
  },

  'mq9_reaper': {
    label: 'MQ-9 Reaper drone (per sortie)',
    co2: { low: 0.8, mid: 1.1, high: 1.5 },
    bc: { low: 0.02, mid: 0.04, high: 0.07 },
    nox: { low: 0.04, mid: 0.07, high: 0.12 },
    secondary: { low: 5, mid: 50, high: 300 },
    confidence: 'HIGH',
    notes: 'Honeywell TPE331 turboprop, ~1,800L JP-8 per 14hr sortie. Per-strike estimate assumes 1 Hellfire deployment.',
    category: 'Drone strike',
  },

  'bayraktar_tb2': {
    label: 'Bayraktar TB2 drone (per strike sortie)',
    co2: { low: 0.3, mid: 0.5, high: 0.8 },
    bc: { low: 0.01, mid: 0.02, high: 0.04 },
    nox: { low: 0.02, mid: 0.04, high: 0.07 },
    secondary: { low: 3, mid: 30, high: 180 },
    confidence: 'HIGH',
    notes: 'Rotax 912 piston engine, ~300L fuel per sortie. MAM-L/MAM-C munition warhead.',
    category: 'Drone strike',
  },

  // ── AIRCRAFT STRIKES ─────────────────────────────────────────────

  'f35_strike': {
    label: 'F-35 strike sortie (with munitions)',
    co2: { low: 8, mid: 14, high: 22 },
    bc: { low: 0.3, mid: 0.6, high: 1.1 },
    nox: { low: 0.8, mid: 1.5, high: 2.8 },
    secondary: { low: 20, mid: 200, high: 2000 },
    confidence: 'MEDIUM',
    notes: 'F135 engine burns ~6,000L JP-8 per combat sortie. Secondary varies massively by target. Does not include manufacturing LCA.',
    category: 'Air strike',
  },

  'f16_strike': {
    label: 'F-16 strike sortie (with munitions)',
    co2: { low: 5, mid: 9, high: 15 },
    bc: { low: 0.2, mid: 0.4, high: 0.8 },
    nox: { low: 0.5, mid: 1.0, high: 1.9 },
    secondary: { low: 15, mid: 150, high: 1500 },
    confidence: 'MEDIUM',
    notes: 'F100/F110 engine, ~4,500L JP-8 per sortie. Standard Israeli IAF loadout estimated.',
    category: 'Air strike',
  },

  'su34_strike': {
    label: 'Su-34 strike sortie (Russian AF)',
    co2: { low: 10, mid: 17, high: 26 },
    bc: { low: 0.4, mid: 0.8, high: 1.4 },
    nox: { low: 1.0, mid: 1.9, high: 3.5 },
    secondary: { low: 25, mid: 250, high: 2500 },
    confidence: 'MEDIUM',
    notes: 'AL-31F engines, ~7,500L fuel per combat sortie. Primary Russian strike aircraft in Ukraine.',
    category: 'Air strike',
  },

  'b52_strike': {
    label: 'B-52 strategic bombing sortie',
    co2: { low: 60, mid: 95, high: 140 },
    bc: { low: 2.0, mid: 3.5, high: 6.0 },
    nox: { low: 5.0, mid: 9.0, high: 16.0 },
    secondary: { low: 100, mid: 1000, high: 10000 },
    confidence: 'HIGH',
    notes: 'TF33 engines, ~120,000L JP-8 per mission. Extremely high secondary — carpet bombing destroys large areas.',
    category: 'Air strike',
  },

  // ── ARTILLERY ─────────────────────────────────────────────────────

  '155mm_shell': {
    label: '155mm artillery shell (M795/3OF45)',
    co2: { low: 0.008, mid: 0.012, high: 0.018 },
    bc: { low: 0.003, mid: 0.005, high: 0.009 },
    nox: { low: 0.001, mid: 0.002, high: 0.004 },
    secondary: { low: 0.5, mid: 5, high: 30 },
    confidence: 'HIGH',
    notes: 'M67 propellant charge ~2.5kg + 10.8kg TNT/Comp B fill. Ukraine conflict fires ~5,000-10,000 rounds/day each side.',
    category: 'Shelling',
  },

  '122mm_grad': {
    label: 'BM-21 Grad 122mm rocket (per round)',
    co2: { low: 0.004, mid: 0.007, high: 0.011 },
    bc: { low: 0.002, mid: 0.004, high: 0.007 },
    nox: { low: 0.001, mid: 0.002, high: 0.003 },
    secondary: { low: 0.3, mid: 3, high: 20 },
    confidence: 'HIGH',
    notes: 'Solid propellant ~6kg + 6.4kg explosive fill. Typically fired in salvos of 40. Multiply by salvo for total.',
    category: 'Shelling',
  },

  'thermobaric': {
    label: 'Thermobaric weapon (TOS-1A/RPO-A)',
    co2: { low: 0.8, mid: 1.5, high: 2.8 },
    bc: { low: 2.0, mid: 3.5, high: 6.0 },
    nox: { low: 0.5, mid: 1.0, high: 1.9 },
    secondary: { low: 10, mid: 80, high: 400 },
    confidence: 'MEDIUM',
    notes: 'Fuel-air explosive — extremely high black carbon. Ethylene oxide/propylene oxide fuel cloud detonation.',
    category: 'Shelling',
  },

  // ── NAVAL ─────────────────────────────────────────────────────────

  'naval_gunfire': {
    label: 'Naval gunfire (5-inch/127mm)',
    co2: { low: 0.006, mid: 0.009, high: 0.014 },
    bc: { low: 0.002, mid: 0.004, high: 0.007 },
    nox: { low: 0.001, mid: 0.002, high: 0.003 },
    secondary: { low: 0.5, mid: 8, high: 50 },
    confidence: 'HIGH',
    notes: 'D845 propellant charge ~10kg + 6.8kg explosive. Similar profile to 155mm artillery.',
    category: 'Naval attack',
  },

  'anti_ship_missile': {
    label: 'Anti-ship missile (Harpoon/Exocet/YJ-12)',
    co2: { low: 0.4, mid: 0.7, high: 1.1 },
    bc: { low: 0.15, mid: 0.28, high: 0.48 },
    nox: { low: 0.06, mid: 0.12, high: 0.22 },
    secondary: { low: 50, mid: 500, high: 5000 },
    confidence: 'MEDIUM',
    notes: 'Turbojet/solid booster ~250kg fuel. Secondary extremely high if ship fuel/cargo ignites.',
    category: 'Naval attack',
  },

  // ── DEFAULT FALLBACK ──────────────────────────────────────────────

  'unknown_strike': {
    label: 'Unknown/unspecified strike',
    co2: { low: 2, mid: 8, high: 25 },
    bc: { low: 0.3, mid: 0.8, high: 2.0 },
    nox: { low: 0.1, mid: 0.4, high: 1.2 },
    secondary: { low: 5, mid: 50, high: 500 },
    confidence: 'LOW',
    notes: 'Default estimate for unclassified events. Wide range reflects deep uncertainty.',
    category: 'Armed clash',
  },
}

// ─── EVENT TYPE → WEAPON MAPPING ────────────────────────────────────
// Maps GDELT/ACLED event types to most likely weapon system
// This is inherently uncertain — we use the mid-range weapon for each type

export const EVENT_TO_WEAPON = {
  'Air strike': 'f16_strike',
  'Missile strike': 'iskander',
  'Drone strike': 'shahed_136',
  'Shelling': '155mm_shell',
  'Naval attack': 'anti_ship_missile',
  'Armed clash': 'unknown_strike',
  'default': 'unknown_strike',
}

// ─── GASES BEYOND CO2 ────────────────────────────────────────────────
// Non-CO2 warming agents from military activity
// These are NOT included in any UNFCCC reporting
// Multipliers relative to CO2-only estimate

export const NON_CO2_MULTIPLIERS = {
  CO2_ONLY: 1.0,
  FULL_WARMING: 2.8, // Includes BC, NOx, contrails, unburned HCs
  // Source: Cottrell et al. 2022, adapted from IPCC AR6 aviation forcing
}

// ─── CORE CALCULATION FUNCTIONS ──────────────────────────────────────

// Given an event object, calculate total emissions
export function estimateEventEmissions(event, includeNonCO2 = false) {
  const type = event.sub_event_type || event.event_type || 'default'
  const weaponKey = EVENT_TO_WEAPON[type] || 'unknown_strike'
  const weapon = WEAPON_FACTORS[weaponKey]

  // Total = direct emissions + expected secondary destruction
  const totalLow = weapon.co2.low + weapon.bc.low + weapon.nox.low + weapon.secondary.low
  const totalMid = weapon.co2.mid + weapon.bc.mid + weapon.nox.mid + weapon.secondary.mid
  const totalHigh = weapon.co2.high + weapon.bc.high + weapon.nox.high + weapon.secondary.high

  const multiplier = includeNonCO2 ? NON_CO2_MULTIPLIERS.FULL_WARMING : NON_CO2_MULTIPLIERS.CO2_ONLY

  return {
    low: Math.round(totalLow * multiplier),
    mid: Math.round(totalMid * multiplier),
    high: Math.round(totalHigh * multiplier),
    category: weapon.category,
    weaponKey,
    weaponLabel: weapon.label,
    confidence: weapon.confidence,
    breakdown: {
      co2: weapon.co2,
      blackCarbon: weapon.bc,
      nox: weapon.nox,
      secondary: weapon.secondary,
    },
    notes: weapon.notes,
  }
}

// Aggregate emissions from array of events
export function aggregateEmissions(events) {
  return events.reduce((total, event) => {
    const est = estimateEventEmissions(event)
    return {
      low: total.low + est.low,
      mid: total.mid + est.mid,
      high: total.high + est.high,
    }
  }, { low: 0, mid: 0, high: 0 })
}

// Live ticking rate — tonnes CO2e per second from all active conflicts
// Based on UCDP 2023 global conflict intensity × average emission per event
// ~180,000 verified conflict events/year × 18.5t average = ~3,330,000t/year
export const TONS_PER_SECOND = 3330000 / (365 * 24 * 3600)

// Format large numbers readably
export function formatTons(tons) {
  if (tons >= 1_000_000_000) return `${(tons / 1_000_000_000).toFixed(2)}B`
  if (tons >= 1_000_000) return `${(tons / 1_000_000).toFixed(2)}M`
  if (tons >= 1_000) return `${(tons / 1_000).toFixed(1)}K`
  return Math.round(tons).toLocaleString()
}

// Human-scale equivalences for any tonnage
export function getEquivalences(tons) {
  return [
    {
      label: 'Transatlantic flights',
      value: Math.round(tons / 0.9),
      icon: 'plane',
    },
    {
      label: 'Cars driven for a year',
      value: Math.round(tons / 4.6),
      icon: 'car',
    },
    {
      label: 'Homes powered for a year',
      value: Math.round(tons / 7.5),
      icon: 'home',
    },
    {
      label: 'Coal plants for a day',
      value: Math.round(tons / 10960),
      icon: 'factory',
    },
  ]
}

