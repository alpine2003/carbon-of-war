// app/api/conflicts/route.js
// Uses GDELT Project — no API key required, fully open, updates every 15 minutes
// GDELT monitors news media worldwide and extracts conflict events in real time

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // GDELT GKG (Global Knowledge Graph) — fetch latest conflict-related events
    // This query searches for war/conflict/military themes in last 24 hours
    const queries = [
      'https://api.gdeltproject.org/api/v2/doc/doc?query=war%20OR%20airstrike%20OR%20bombing%20OR%20shelling%20OR%20missile&mode=artlist&maxrecords=50&format=json&timespan=24h',
      'https://api.gdeltproject.org/api/v2/doc/doc?query=Ukraine%20Russia%20attack&mode=artlist&maxrecords=25&format=json&timespan=24h',
      'https://api.gdeltproject.org/api/v2/doc/doc?query=Gaza%20Israel%20strike&mode=artlist&maxrecords=25&format=json&timespan=24h',
    ]

    // Fetch all queries in parallel
    const responses = await Promise.allSettled(
      queries.map(url => fetch(url, { next: { revalidate: 900 } }))
    )

    const articles = []
    for (const result of responses) {
      if (result.status === 'fulfilled' && result.value.ok) {
        const data = await result.value.json()
        if (data.articles) articles.push(...data.articles)
      }
    }

    // Convert GDELT articles into conflict event format
    // We extract location and event type from the article metadata
    const events = articles
      .filter(a => a.sourcecountry && a.url)
      .map((article, i) => {
        const location = extractLocation(article)
        const eventType = extractEventType(article.title || '')
        return {
          event_id_cnty: `GDELT_${i}_${Date.now()}`,
          event_date: article.seendate
            ? article.seendate.substring(0, 10)
            : new Date().toISOString().split('T')[0],
          event_type: 'Explosions/Remote violence',
          sub_event_type: eventType,
          country: location.country,
          location: location.city,
          latitude: location.lat,
          longitude: location.lng,
          fatalities: 0,
          notes: article.title || '',
          source_url: article.url,
        }
      })
      .filter(e => e.latitude && e.longitude)

    // If GDELT returns enough events use them, otherwise merge with demo data
    const allEvents = events.length >= 5
      ? [...events, ...getDemoEvents()]
      : getDemoEvents()

    // Deduplicate by rough location
    const seen = new Set()
    const deduped = allEvents.filter(e => {
      const key = `${Math.round(e.latitude)}_${Math.round(e.longitude)}_${e.sub_event_type}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      success: true,
      count: deduped.length,
      events: deduped,
      source: events.length >= 5 ? 'gdelt+demo' : 'demo',
      fetchedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Conflicts API error:', error)
    return NextResponse.json({
      success: true,
      demo: true,
      count: 12,
      events: getDemoEvents(),
      fetchedAt: new Date().toISOString(),
    })
  }
}

// Extract country and coordinates from GDELT article metadata
function extractLocation(article) {
  // GDELT includes source country — map to conflict zone coordinates
  const countryMap = {
    'Ukraine': { country: 'Ukraine', city: 'Kharkiv', lat: 49.9935, lng: 36.2304 },
    'Russia': { country: 'Russia', city: 'Moscow region', lat: 55.7558, lng: 37.6173 },
    'Israel': { country: 'Israel', city: 'Tel Aviv', lat: 32.0853, lng: 34.7818 },
    'Palestine': { country: 'Palestine', city: 'Gaza', lat: 31.5017, lng: 34.4668 },
    'Sudan': { country: 'Sudan', city: 'Khartoum', lat: 15.5007, lng: 32.5599 },
    'Myanmar': { country: 'Myanmar', city: 'Mandalay', lat: 21.9162, lng: 95.9560 },
    'Yemen': { country: 'Yemen', city: "Sana'a", lat: 15.3694, lng: 44.1910 },
    'Somalia': { country: 'Somalia', city: 'Mogadishu', lat: 2.0469, lng: 45.3182 },
    'Syria': { country: 'Syria', city: 'Damascus', lat: 33.5138, lng: 36.2765 },
    'Iraq': { country: 'Iraq', city: 'Baghdad', lat: 33.3152, lng: 44.3661 },
    'Afghanistan': { country: 'Afghanistan', city: 'Kabul', lat: 34.5553, lng: 69.2075 },
    'Ethiopia': { country: 'Ethiopia', city: 'Addis Ababa', lat: 9.1450, lng: 40.4897 },
    'Mali': { country: 'Mali', city: 'Bamako', lat: 12.6392, lng: -8.0029 },
    'Niger': { country: 'Niger', city: 'Niamey', lat: 13.5137, lng: 2.1098 },
    'Congo': { country: 'DRC', city: 'Goma', lat: -1.6596, lng: 29.2216 },
    'Lebanon': { country: 'Lebanon', city: 'Beirut', lat: 33.8938, lng: 35.5018 },
    'Iran': { country: 'Iran', city: 'Tehran', lat: 35.6892, lng: 51.3890 },
    'Pakistan': { country: 'Pakistan', city: 'Peshawar', lat: 34.0151, lng: 71.5249 },
    'Libya': { country: 'Libya', city: 'Tripoli', lat: 32.8872, lng: 13.1913 },
    'Nigeria': { country: 'Nigeria', city: 'Maiduguri', lat: 11.8333, lng: 13.1500 },
  }

  // Try to match article source country or title keywords
  const title = (article.title || '').toLowerCase()
  const sourceCountry = article.sourcecountry || ''

  for (const [key, val] of Object.entries(countryMap)) {
    if (
      title.includes(key.toLowerCase()) ||
      sourceCountry.toLowerCase().includes(key.toLowerCase())
    ) {
      // Add small random offset so markers don't all stack exactly
      return {
        ...val,
        lat: val.lat + (Math.random() - 0.5) * 1.5,
        lng: val.lng + (Math.random() - 0.5) * 1.5,
      }
    }
  }

  // Default fallback if no country matched
  return { country: sourceCountry || 'Unknown', city: 'Unknown', lat: null, lng: null }
}

// Guess event type from article headline keywords
function extractEventType(title) {
  const t = title.toLowerCase()
  if (t.includes('airstrike') || t.includes('air strike') || t.includes('bombing'))
    return 'Air strike'
  if (t.includes('missile') || t.includes('rocket'))
    return 'Missile strike'
  if (t.includes('drone'))
    return 'Drone strike'
  if (t.includes('shell') || t.includes('artillery') || t.includes('mortar'))
    return 'Shelling'
  if (t.includes('naval') || t.includes('ship') || t.includes('sea'))
    return 'Naval attack'
  return 'Armed clash'
}

// Hardcoded demo events — all major active conflicts as of 2025
// These always show on the map regardless of API status
function getDemoEvents() {
  return [
    { event_id_cnty: 'UKR001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Ukraine', location: 'Kharkiv', latitude: 49.9935, longitude: 36.2304, fatalities: 3, notes: 'Russian air strike on residential area' },
    { event_id_cnty: 'UKR002', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Shelling', country: 'Ukraine', location: 'Zaporizhzhia', latitude: 47.8388, longitude: 35.1396, fatalities: 1, notes: 'Artillery exchange on front line' },
    { event_id_cnty: 'UKR003', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Missile strike', country: 'Ukraine', location: 'Kyiv', latitude: 50.4501, longitude: 30.5234, fatalities: 0, notes: 'Overnight missile attack on capital' },
    { event_id_cnty: 'UKR004', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Drone strike', country: 'Ukraine', location: 'Odessa', latitude: 46.4825, longitude: 30.7233, fatalities: 2, notes: 'Shahed drone attack on port infrastructure' },
    { event_id_cnty: 'PSE001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Palestine', location: 'Gaza City', latitude: 31.5017, longitude: 34.4668, fatalities: 12, notes: 'Strikes on northern Gaza' },
    { event_id_cnty: 'PSE002', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Missile strike', country: 'Palestine', location: 'Rafah', latitude: 31.2968, longitude: 34.2644, fatalities: 5, notes: 'Ground operation continues in south' },
    { event_id_cnty: 'PSE003', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Palestine', location: 'Khan Younis', latitude: 31.3469, longitude: 34.3063, fatalities: 8, notes: 'Strikes on Khan Younis' },
    { event_id_cnty: 'LBN001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Lebanon', location: 'Beirut', latitude: 33.8938, longitude: 35.5018, fatalities: 2, notes: 'Strike on southern Beirut suburb' },
    { event_id_cnty: 'IRN001', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Missile strike', country: 'Iran', location: 'Isfahan', latitude: 32.6539, longitude: 51.6660, fatalities: 0, notes: 'Regional escalation incident' },
    { event_id_cnty: 'SDN001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Shelling', country: 'Sudan', location: 'Khartoum', latitude: 15.5007, longitude: 32.5599, fatalities: 8, notes: 'RSF vs SAF fighting in capital' },
    { event_id_cnty: 'SDN002', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Sudan', location: 'El Fasher', latitude: 13.6272, longitude: 25.3498, fatalities: 15, notes: 'Aerial bombardment of Darfur city' },
    { event_id_cnty: 'MMR001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Myanmar', location: 'Sagaing', latitude: 21.8782, longitude: 95.9792, fatalities: 6, notes: 'Junta airstrike on village' },
    { event_id_cnty: 'MMR002', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Shelling', country: 'Myanmar', location: 'Karen State', latitude: 17.1500, longitude: 97.7833, fatalities: 4, notes: 'Fighting near Thai border' },
    { event_id_cnty: 'YEM001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Air strike', country: 'Yemen', location: "Sana'a", latitude: 15.3694, longitude: 44.1910, fatalities: 4, notes: 'US strike on Houthi position' },
    { event_id_cnty: 'YEM002', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Missile strike', country: 'Yemen', location: 'Hodeidah', latitude: 14.7978, longitude: 42.9450, fatalities: 3, notes: 'Houthi missile launch toward Red Sea' },
    { event_id_cnty: 'SOM001', event_date: '2025-03-15', event_type: 'Explosions/Remote violence', sub_event_type: 'Drone strike', country: 'Somalia', location: 'Mogadishu', latitude: 2.0469, longitude: 45.3182, fatalities: 2, notes: 'US drone strike targeting al-Shabaab' },
    { event_id_cnty: 'COD001', event_date: '2025-03-15', event_type: 'Battles', sub_event_type: 'Armed clash', country: 'Democratic Republic of Congo', location: 'Goma', latitude: -1.6596, longitude: 29.2216, fatalities: 15, notes: 'M23 fighting on city outskirts' },
    { event_id_cnty: 'COD002', event_date: '2025-03-14', event_type: 'Battles', sub_event_type: 'Armed clash', country: 'Democratic Republic of Congo', location: 'Bukavu', latitude: -2.4900, longitude: 28.8600, fatalities: 7, notes: 'Clashes in South Kivu' },
    { event_id_cnty: 'ETH001', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Shelling', country: 'Ethiopia', location: 'Amhara', latitude: 11.3000, longitude: 37.5000, fatalities: 7, notes: 'Fighting in Amhara region' },
    { event_id_cnty: 'IRQ001', event_date: '2025-03-14', event_type: 'Explosions/Remote violence', sub_event_type: 'Drone strike', country: 'Iraq', location: 'Baghdad', latitude: 33.3152, longitude: 44.3661, fatalities: 0, notes: 'Drone attack on military base' },
    { event_id_cnty: 'SYR001', event_date: '2025-03-13', event_type: 'Battles', sub_event_type: 'Armed clash', country: 'Syria', location: 'Deir ez-Zor', latitude: 35.3359, longitude: 40.1407, fatalities: 3, notes: 'ISIS-linked clash in eastern Syria' },
    { event_id_cnty: 'MLI001', event_date: '2025-03-13', event_type: 'Battles', sub_event_type: 'Armed clash', country: 'Mali', location: 'Timbuktu', latitude: 16.7666, longitude: -3.0026, fatalities: 9, notes: 'Jihadist attack on village' },
    { event_id_cnty: 'NIG001', event_date: '2025-03-12', event_type: 'Battles', sub_event_type: 'Armed clash', country: 'Niger', location: 'Tillabéri', latitude: 14.2072, longitude: 1.4528, fatalities: 11, notes: 'Attack on military convoy' },
    { event_id_cnty: 'NGA001', event_date: '2025-03-12', event_type: 'Battles', sub_event_type: 'Armed clash', country: 'Nigeria', location: 'Borno State', latitude: 11.8333, longitude: 13.1500, fatalities: 6, notes: 'Boko Haram attack on village' },
    { event_id_cnty: 'PAK001', event_date: '2025-03-11', event_type: 'Explosions/Remote violence', sub_event_type: 'Drone strike', country: 'Pakistan', location: 'North Waziristan', latitude: 33.0000, longitude: 70.0000, fatalities: 3, notes: 'Strike on militant compound' },
  ]
}