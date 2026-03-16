// app/api/fires/route.js
// Fetches active fire hotspots from NASA FIRMS
// These are cross-referenced with conflict zones to identify conflict-driven fires

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // NASA FIRMS — VIIRS satellite fire detections, last 7 days, global
    const response = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${process.env.NASA_FIRMS_KEY}/VIIRS_SNPP_NRT/world/7`,
      { next: { revalidate: 7200 } } // Cache 2 hours
    )

    if (!response.ok) throw new Error('NASA FIRMS fetch failed')

    const csv = await response.text()
    const lines = csv.trim().split('\n')
    const headers = lines[0].split(',')

    // Parse CSV into objects, keep only high-confidence fires
    const fires = lines.slice(1)
      .map(line => {
        const values = line.split(',')
        const obj = {}
        headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim())
        return obj
      })
      .filter(f => f.confidence === 'high' || f.confidence === 'n') // nominal = high for VIIRS
      .slice(0, 2000) // Cap at 2000 for performance

    return NextResponse.json({ success: true, fires, fetchedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Fires API error:', error)
    return NextResponse.json({ success: true, fires: [], demo: true })
  }
}