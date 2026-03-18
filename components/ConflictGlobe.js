'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { estimateEventEmissions } from '../lib/emissions'

export default function ConflictGlobe({ events, onSelectConflict, showSatellite, onToggleSatellite }) {
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const animFrameRef = useRef(null)
  const interactingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const rotationRef = useRef({ x: 0.3, y: 0.8 })
  const targetRotRef = useRef({ x: 0.3, y: 0.8 })
  const zoomRef = useRef(1.8)
  const eventsRef = useRef([])
  const particlesRef = useRef([])
  const arcsRef = useRef([])
  const flashesRef = useRef([])
  const prevEventIdsRef = useRef(new Set())
  const [tooltip, setTooltip] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    eventsRef.current = events || []
    // Detect new events and trigger animations
    const newIds = new Set((events || []).map(e => e.event_id_cnty))
    const prev = prevEventIdsRef.current
    ;(events || []).forEach(event => {
      if (!prev.has(event.event_id_cnty)) {
        triggerEventAnimation(event)
      }
    })
    prevEventIdsRef.current = newIds
  }, [events])

  function latLngToXYZ(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    return {
      x: -(radius * Math.sin(phi) * Math.cos(theta)),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    }
  }

  function rotatePoint(point, rx, ry) {
    // Rotate around Y axis
    let x = point.x * Math.cos(ry) + point.z * Math.sin(ry)
    let z = -point.x * Math.sin(ry) + point.z * Math.cos(ry)
    let y = point.y
    // Rotate around X axis
    const y2 = y * Math.cos(rx) - z * Math.sin(rx)
    const z2 = y * Math.sin(rx) + z * Math.cos(rx)
    return { x, y: y2, z: z2 }
  }

  function project(point3d, width, height, zoom) {
    const fov = 800 * zoom
    const z = point3d.z + fov
    if (z <= 0) return null
    return {
      x: (point3d.x * fov) / z + width / 2,
      y: (-point3d.y * fov) / z + height / 2,
      scale: fov / z,
      visible: point3d.z > -0.1,
    }
  }

  function triggerEventAnimation(event) {
    const lat = parseFloat(event.latitude)
    const lng = parseFloat(event.longitude)
    if (isNaN(lat) || isNaN(lng)) return

    const type = event.sub_event_type || 'Armed clash'

    // Add explosion flash
    flashesRef.current.push({
      lat, lng, life: 0, maxLife: 1.2,
      type,
    })

    // Add arc for missile/air strikes
    if (['Missile strike', 'Air strike', 'Drone strike'].includes(type)) {
      const launchOffset = 8 + Math.random() * 15
      arcsRef.current.push({
        fromLat: lat + (Math.random() - 0.5) * launchOffset,
        fromLng: lng + (Math.random() - 0.5) * launchOffset,
        toLat: lat,
        toLng: lng,
        progress: 0,
        speed: 0.008 + Math.random() * 0.006,
        type,
        trail: [],
      })
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const RADIUS = 200
    const TACTICAL_GREEN = '#00ff88'
    const DIM_GREEN = '#003322'
    const GRID_GREEN = '#004422'
    const GLOW_GREEN = '#00ff4455'

    // Color per event type
    const TYPE_COLORS = {
      'Air strike': { main: '#ff3333', glow: '#ff333388' },
      'Missile strike': { main: '#ff6600', glow: '#ff660088' },
      'Shelling': { main: '#ffcc00', glow: '#ffcc0088' },
      'Drone strike': { main: '#cc44ff', glow: '#cc44ff88' },
      'Naval attack': { main: '#4488ff', glow: '#4488ff88' },
      'Armed clash': { main: '#44aaff', glow: '#44aaff88' },
    }

    function getColor(type) {
      return TYPE_COLORS[type] || TYPE_COLORS['Armed clash']
    }

    // Initialize particles for all current events
    function initParticles() {
      particlesRef.current = []
      eventsRef.current.forEach(event => {
        const lat = parseFloat(event.latitude)
        const lng = parseFloat(event.longitude)
        if (isNaN(lat) || isNaN(lng)) return
        const emissions = estimateEventEmissions(event)
        const count = Math.max(5, Math.min(20, Math.floor(emissions.mid / 15)))
        const color = getColor(event.sub_event_type)
        for (let i = 0; i < count; i++) {
          particlesRef.current.push({
            lat: lat + (Math.random() - 0.5) * 0.3,
            lng: lng + (Math.random() - 0.5) * 0.3,
            heightOffset: Math.random() * 20 + 5,
            life: Math.random(),
            maxLife: 0.6 + Math.random() * 0.4,
            speed: 0.003 + Math.random() * 0.004,
            size: 1.5 + Math.random() * 2.5,
            color: color.main,
            phase: Math.random() * Math.PI * 2,
          })
        }
      })
    }
    initParticles()

    function drawFrame() {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      // Space background
      ctx.fillStyle = '#020a06'
      ctx.fillRect(0, 0, W, H)

      // Stars
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 200; i++) {
        const sx = ((i * 137.508 + 50) % W)
        const sy = ((i * 97.3 + 30) % H)
        const ss = i % 3 === 0 ? 1.2 : 0.6
        ctx.globalAlpha = 0.3 + (i % 5) * 0.1
        ctx.beginPath()
        ctx.arc(sx, sy, ss, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Auto-rotate when not interacting
      if (!interactingRef.current) {
        targetRotRef.current.y -= 0.0008
      }

      // Smooth rotation
      rotationRef.current.x += (targetRotRef.current.x - rotationRef.current.x) * 0.08
      rotationRef.current.y += (targetRotRef.current.y - rotationRef.current.y) * 0.08

      const rx = rotationRef.current.x
      const ry = rotationRef.current.y
      const zoom = zoomRef.current
      const cx = W / 2
      const cy = H / 2
      const projRadius = RADIUS * zoom * (H / 500)
      const r = projRadius

      // Globe base — dark tactical
      const globeGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r)
      globeGrad.addColorStop(0, '#071a0e')
      globeGrad.addColorStop(0.6, '#040e07')
      globeGrad.addColorStop(1, '#020605')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = globeGrad
      ctx.fill()

      // Tactical grid lines
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()

      // Latitude lines
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath()
        let first = true
        for (let lng = -180; lng <= 180; lng += 3) {
          const p3 = latLngToXYZ(lat, lng, RADIUS)
          const rot = rotatePoint(p3, rx, ry)
          const proj = project(rot, W, H, zoom * (H / 500))
          if (!proj) continue
          if (first) { ctx.moveTo(proj.x, proj.y); first = false }
          else ctx.lineTo(proj.x, proj.y)
        }
        ctx.strokeStyle = lat === 0 ? '#006633' : GRID_GREEN
        ctx.lineWidth = lat === 0 ? 0.8 : 0.4
        ctx.globalAlpha = 0.6
        ctx.stroke()
      }

      // Longitude lines
      for (let lng = -180; lng < 180; lng += 20) {
        ctx.beginPath()
        let first = true
        for (let lat = -90; lat <= 90; lat += 3) {
          const p3 = latLngToXYZ(lat, lng, RADIUS)
          const rot = rotatePoint(p3, rx, ry)
          const proj = project(rot, W, H, zoom * (H / 500))
          if (!proj) continue
          if (first) { ctx.moveTo(proj.x, proj.y); first = false }
          else ctx.lineTo(proj.x, proj.y)
        }
        ctx.strokeStyle = GRID_GREEN
        ctx.lineWidth = 0.4
        ctx.globalAlpha = 0.6
        ctx.stroke()
      }

      ctx.globalAlpha = 1

      // Continent outlines — approximate key coastlines
      const continentPoints = getContinentOutlines()
      continentPoints.forEach(continent => {
        ctx.beginPath()
        let first = true
        continent.forEach(([lat, lng]) => {
          const p3 = latLngToXYZ(lat, lng, RADIUS + 0.5)
          const rot = rotatePoint(p3, rx, ry)
          const proj = project(rot, W, H, zoom * (H / 500))
          if (!proj || !proj.visible) { first = true; return }
          if (first) { ctx.moveTo(proj.x, proj.y); first = false }
          else ctx.lineTo(proj.x, proj.y)
        })
        ctx.strokeStyle = '#008844'
        ctx.lineWidth = 0.8
        ctx.globalAlpha = 0.5
        ctx.stroke()
      })
      ctx.globalAlpha = 1
      ctx.restore()

      // Globe edge glow — tactical green
      const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.05)
      edgeGrad.addColorStop(0, 'transparent')
      edgeGrad.addColorStop(0.7, '#00ff4408')
      edgeGrad.addColorStop(1, '#00ff4422')
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2)
      ctx.fillStyle = edgeGrad
      ctx.fill()

      // Outer tactical ring
      ctx.beginPath()
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2)
      ctx.strokeStyle = '#00ff4433'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
      ctx.strokeStyle = '#00ff4411'
      ctx.lineWidth = 1
      ctx.stroke()

      // Collect visible events for hit testing
      const visibleEvents = []

      // Draw smoke particles
      particlesRef.current.forEach(p => {
        p.life += p.speed
        if (p.life >= p.maxLife) {
          p.life = 0
        }
        const t = p.life / p.maxLife
        const h = p.heightOffset * t
        const surfaceRadius = RADIUS + 0.5
        const particleRadius = surfaceRadius + h

        const p3 = latLngToXYZ(p.lat, p.lng, particleRadius)
        const rot = rotatePoint(p3, rx, ry)
        if (rot.z < 0) return
        const proj = project(rot, W, H, zoom * (H / 500))
        if (!proj) return

        const alpha = t < 0.3 ? t / 0.3 : 1 - ((t - 0.3) / 0.7)
        const size = p.size * (0.5 + t * 2)

        const r255 = parseInt(p.color.slice(1, 3), 16)
        const g255 = parseInt(p.color.slice(3, 5), 16)
        const b255 = parseInt(p.color.slice(5, 7), 16)

        const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size * 2)
        grad.addColorStop(0, `rgba(${r255},${g255},${b255},${alpha * 0.6})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, size * 2, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      // Draw arc animations (missile trails)
      arcsRef.current = arcsRef.current.filter(arc => arc.progress <= 1)
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed
        const t = arc.progress

        // Bezier arc from launch to impact
        const from = latLngToXYZ(arc.fromLat, arc.fromLng, RADIUS + 0.5)
        const to = latLngToXYZ(arc.toLat, arc.toLng, RADIUS + 0.5)

        // Control point — lift arc above surface
        const mid = {
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2 + RADIUS * 0.4,
          z: (from.z + to.z) / 2,
        }

        // Sample arc points up to current progress
        const color = getColor(arc.type)
        ctx.beginPath()
        let firstPoint = true

        for (let i = 0; i <= t; i += 0.02) {
          const it = i / 1
          const bx = (1-it)*(1-it)*from.x + 2*(1-it)*it*mid.x + it*it*to.x
          const by = (1-it)*(1-it)*from.y + 2*(1-it)*it*mid.y + it*it*to.y
          const bz = (1-it)*(1-it)*from.z + 2*(1-it)*it*mid.z + it*it*to.z

          const rot = rotatePoint({ x: bx, y: by, z: bz }, rx, ry)
          const proj = project(rot, W, H, zoom * (H / 500))
          if (!proj) continue

          if (firstPoint) { ctx.moveTo(proj.x, proj.y); firstPoint = false }
          else ctx.lineTo(proj.x, proj.y)
        }

        ctx.strokeStyle = color.main
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.8
        ctx.shadowColor = color.main
        ctx.shadowBlur = 6
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1

        // Missile head dot
        const headT = Math.min(t, 1)
        const hx = (1-headT)*(1-headT)*from.x + 2*(1-headT)*headT*mid.x + headT*headT*to.x
        const hy = (1-headT)*(1-headT)*from.y + 2*(1-headT)*headT*mid.y + headT*headT*to.y
        const hz = (1-headT)*(1-headT)*from.z + 2*(1-headT)*headT*mid.z + headT*headT*to.z
        const headRot = rotatePoint({ x: hx, y: hy, z: hz }, rx, ry)
        const headProj = project(headRot, W, H, zoom * (H / 500))
        if (headProj) {
          ctx.beginPath()
          ctx.arc(headProj.x, headProj.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = color.main
          ctx.shadowColor = color.main
          ctx.shadowBlur = 10
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      // Draw explosion flashes
      flashesRef.current = flashesRef.current.filter(f => f.life < f.maxLife)
      flashesRef.current.forEach(flash => {
        flash.life += 0.025
        const t = flash.life / flash.maxLife
        const color = getColor(flash.type)

        const p3 = latLngToXYZ(flash.lat, flash.lng, RADIUS + 1)
        const rot = rotatePoint(p3, rx, ry)
        if (rot.z < 0) return
        const proj = project(rot, W, H, zoom * (H / 500))
        if (!proj) return

        const alpha = t < 0.2 ? t / 0.2 : 1 - ((t - 0.2) / 0.8)
        const size = t * 30 * proj.scale * 80

        const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size)
        grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`)
        grad.addColorStop(0.2, color.main + Math.round(alpha * 200).toString(16).padStart(2, '0'))
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      // Draw conflict event markers
      const sortedEvents = [...eventsRef.current].sort((a, b) => {
        const pa = latLngToXYZ(parseFloat(a.latitude), parseFloat(a.longitude), RADIUS)
        const pb = latLngToXYZ(parseFloat(b.latitude), parseFloat(b.longitude), RADIUS)
        const ra = rotatePoint(pa, rx, ry)
        const rb = rotatePoint(pb, rx, ry)
        return ra.z - rb.z
      })

      sortedEvents.forEach(event => {
        const lat = parseFloat(event.latitude)
        const lng = parseFloat(event.longitude)
        if (isNaN(lat) || isNaN(lng)) return

        const p3 = latLngToXYZ(lat, lng, RADIUS + 1)
        const rot = rotatePoint(p3, rx, ry)
        if (rot.z < -5) return
        const proj = project(rot, W, H, zoom * (H / 500))
        if (!proj) return

        const emissions = estimateEventEmissions(event)
        const color = getColor(event.sub_event_type)
        const dotSize = Math.max(3, Math.min(10, emissions.mid / 20)) * proj.scale * 80
        const time = Date.now() / 1000

        // Outer pulse ring
        const pulseScale = 1 + 0.4 * Math.sin(time * 2 + lat)
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, dotSize * 2.5 * pulseScale, 0, Math.PI * 2)
        ctx.strokeStyle = color.main
        ctx.lineWidth = 0.8
        ctx.globalAlpha = 0.2 * (1 - (pulseScale - 1) / 0.4)
        ctx.stroke()

        // Second ring — sonar style
        const pulse2 = 1 + 0.6 * Math.abs(Math.sin(time * 1.5 + lng))
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, dotSize * 4 * pulse2, 0, Math.PI * 2)
        ctx.strokeStyle = color.main
        ctx.lineWidth = 0.5
        ctx.globalAlpha = 0.1 * (1 - (pulse2 - 1) / 0.6)
        ctx.stroke()

        // Core dot with glow
        ctx.globalAlpha = 1
        ctx.shadowColor = color.main
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, dotSize, 0, Math.PI * 2)
        ctx.fillStyle = color.main
        ctx.fill()
        ctx.shadowBlur = 0

        // Center bright point
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, dotSize * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.8
        ctx.fill()
        ctx.globalAlpha = 1

        visibleEvents.push({ event, emissions, x: proj.x, y: proj.y, size: dotSize * 3 })
      })

      // Tactical HUD elements
      // Corner brackets
      const bSize = 20
      const bOffset = 15
      ctx.strokeStyle = '#00ff4444'
      ctx.lineWidth = 1
      ;[[bOffset, bOffset], [W - bOffset, bOffset], [bOffset, H - bOffset], [W - bOffset, H - bOffset]].forEach(([bx, by], i) => {
        const xDir = i % 2 === 0 ? 1 : -1
        const yDir = i < 2 ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(bx, by + yDir * bSize)
        ctx.lineTo(bx, by)
        ctx.lineTo(bx + xDir * bSize, by)
        ctx.stroke()
      })

      // Radar sweep
      const sweepAngle = (Date.now() / 3000) % (Math.PI * 2)
      const sweepGrad = ctx.createConicalGradient
        ? ctx.createConicalGradient(cx, cy, sweepAngle)
        : null

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(sweepAngle)
      const sweepG = ctx.createLinearGradient(0, 0, r * 1.1, 0)
      sweepG.addColorStop(0, '#00ff4400')
      sweepG.addColorStop(0.7, '#00ff4415')
      sweepG.addColorStop(1, '#00ff4408')
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r * 1.1, -0.3, 0)
      ctx.fillStyle = sweepG
      ctx.globalAlpha = 0.4
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.restore()

      // Store visible events for mouse interaction
      rendererRef.current = { visibleEvents, W, H, r, cx, cy }

      animFrameRef.current = requestAnimationFrame(drawFrame)
    }

    drawFrame()

    // Mouse interaction
    function onMouseDown(e) {
      interactingRef.current = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    function onMouseMove(e) {
      if (interactingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x
        const dy = e.clientY - lastMouseRef.current.y
        targetRotRef.current.y += dx * 0.005
        targetRotRef.current.x += dy * 0.005
        targetRotRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotRef.current.x))
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }

      // Hover detection
      if (rendererRef.current) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const { visibleEvents } = rendererRef.current
        let found = null
        for (const ve of visibleEvents) {
          const dx = ve.x - mx
          const dy = ve.y - my
          if (Math.sqrt(dx * dx + dy * dy) < ve.size + 8) {
            found = ve
            break
          }
        }
        if (found) {
          setTooltip({ event: found.event, emissions: found.emissions })
          setTooltipPos({ x: e.clientX, y: e.clientY })
          canvas.style.cursor = 'pointer'
        } else {
          setTooltip(null)
          canvas.style.cursor = 'grab'
        }
      }
    }

    function onMouseUp(e) {
      // Check for click on event
      if (rendererRef.current) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const { visibleEvents } = rendererRef.current
        for (const ve of visibleEvents) {
          const dx = ve.x - mx
          const dy = ve.y - my
          if (Math.sqrt(dx * dx + dy * dy) < ve.size + 8) {
            onSelectConflict && onSelectConflict({ event: ve.event, emissions: ve.emissions })
            break
          }
        }
      }
      interactingRef.current = false
    }

    function onWheel(e) {
      e.preventDefault()
      zoomRef.current = Math.max(1.2, Math.min(4, zoomRef.current - e.deltaY * 0.001))
    }

    // Touch support
    let lastTouchDist = null
    function onTouchStart(e) {
      if (e.touches.length === 1) {
        interactingRef.current = true
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDist = Math.sqrt(dx * dx + dy * dy)
      }
    }
    function onTouchMove(e) {
      e.preventDefault()
      if (e.touches.length === 1 && interactingRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x
        const dy = e.touches[0].clientY - lastMouseRef.current.y
        targetRotRef.current.y += dx * 0.005
        targetRotRef.current.x += dy * 0.005
        targetRotRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotRef.current.x))
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      if (e.touches.length === 2 && lastTouchDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        zoomRef.current = Math.max(1.2, Math.min(4, zoomRef.current + (dist - lastTouchDist) * 0.005))
        lastTouchDist = dist
      }
    }
    function onTouchEnd() {
      interactingRef.current = false
      lastTouchDist = null
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    // Center on Middle East + Ukraine hotspot
    targetRotRef.current = { x: 0.25, y: 0.7 }
    rotationRef.current = { x: 0.25, y: 0.7 }

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#020a06' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltipPos.x + 16,
          top: tooltipPos.y - 40,
          background: 'rgba(2,10,6,0.97)',
          border: '1px solid #00ff4444',
          borderRadius: '6px',
          padding: '10px 14px',
          pointerEvents: 'none',
          zIndex: 9999,
          maxWidth: '260px',
          boxShadow: '0 0 20px #00ff4422',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#00ff88', marginBottom: '3px', fontFamily: 'monospace' }}>
            {tooltip.event.sub_event_type} — {tooltip.event.location}
          </div>
          <div style={{ fontSize: '10px', color: '#006633', marginBottom: '5px', fontFamily: 'monospace' }}>
            {tooltip.event.country} · {tooltip.event.event_date}
          </div>
          <div style={{ fontSize: '13px', color: '#c8f064', fontFamily: 'monospace' }}>
            ~{tooltip.emissions.mid}t CO₂-eq
          </div>
          <div style={{ fontSize: '10px', color: '#004422', marginTop: '3px', fontFamily: 'monospace' }}>
            CLICK FOR FULL ANALYSIS
          </div>
        </div>
      )}

      {/* Satellite toggle */}
      <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
        <button onClick={onToggleSatellite} style={{
          background: showSatellite ? 'rgba(0,40,20,0.9)' : 'rgba(2,10,6,0.9)',
          border: `1px solid ${showSatellite ? '#00ff88' : '#003322'}`,
          borderRadius: '6px', padding: '8px 16px',
          color: showSatellite ? '#00ff88' : '#006633',
          cursor: 'pointer', fontSize: '11px',
          letterSpacing: '0.15em', fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: showSatellite ? '0 0 15px #00ff4433' : 'none',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: showSatellite ? '#00ff88' : '#003322',
            animation: showSatellite ? 'pulse 2s infinite' : 'none',
          }} />
          {showSatellite ? 'SENTINEL-5P NO₂ · LIVE' : 'SATELLITE LAYER · OFF'}
        </button>
      </div>

      {/* Active incidents */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 100,
        background: 'rgba(2,10,6,0.9)', border: '1px solid #003322',
        borderRadius: '6px', padding: '12px 16px',
        boxShadow: '0 0 20px #00ff4411',
        fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: '9px', color: '#004422', letterSpacing: '0.2em', marginBottom: '4px' }}>ACTIVE INCIDENTS</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#00ff88', lineHeight: 1 }}>{events?.length || 0}</div>
        <div style={{ fontSize: '9px', color: '#003322', marginTop: '4px' }}>DRAG · SCROLL TO ZOOM</div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '24px', right: '16px', zIndex: 100,
        background: 'rgba(2,10,6,0.9)', border: '1px solid #003322',
        borderRadius: '6px', padding: '12px 16px',
        fontFamily: 'monospace',
      }}>
        {[
          { color: '#ff3333', label: 'AIR STRIKE' },
          { color: '#ff6600', label: 'MISSILE' },
          { color: '#ffcc00', label: 'SHELLING' },
          { color: '#cc44ff', label: 'DRONE' },
          { color: '#4488ff', label: 'NAVAL' },
          { color: '#44aaff', label: 'CLASH' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, boxShadow: `0 0 4px ${item.color}` }} />
            <span style={{ fontSize: '9px', color: '#006633', letterSpacing: '0.1em' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #003322', marginTop: '6px', paddingTop: '6px', fontSize: '9px', color: '#003322' }}>
          DOT SIZE = CO₂-EQ
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
}

// Simplified continent outlines for tactical globe
function getContinentOutlines() {
  return [
    // Europe
    [[71,28],[70,25],[69,18],[68,15],[65,14],[63,10],[60,5],[58,5],[56,8],[55,10],[54,10],[53,14],[54,18],[55,21],[56,24],[57,22],[58,25],[60,25],[63,28],[65,25],[68,18],[70,20],[71,28]],
    // Africa
    [[37,10],[36,5],[34,0],[32,-5],[30,0],[28,-17],[26,-17],[22,-17],[18,-13],[15,-17],[10,-17],[5,-5],[2,10],[0,5],[-5,10],[-10,13],[-14,17],[-16,12],[-14,7],[-10,0],[-5,-5],[0,-10],[5,-5],[10,0],[15,5],[20,0],[25,10],[30,5],[35,0],[37,10]],
    // Asia outline (simplified)
    [[70,30],[72,50],[73,70],[72,100],[68,140],[65,150],[60,140],[55,130],[50,140],[45,130],[40,130],[35,140],[30,120],[25,110],[20,100],[15,75],[10,77],[8,77],[10,80],[15,80],[20,85],[25,87],[30,90],[35,75],[40,60],[45,50],[50,40],[55,35],[60,30],[65,30],[70,30]],
    // North America
    [[72,-80],[70,-95],[68,-120],[65,-140],[60,-145],[55,-130],[50,-125],[45,-122],[40,-120],[35,-117],[30,-110],[25,-105],[20,-100],[15,-90],[10,-83],[15,-85],[20,-87],[25,-90],[30,-88],[35,-76],[40,-74],[45,-73],[50,-66],[55,-60],[60,-65],[65,-68],[70,-70],[72,-80]],
    // South America
    [[10,-75],[5,-77],[0,-80],[-5,-80],[-10,-75],[-15,-75],[-20,-70],[-25,-65],[-30,-65],[-35,-60],[-40,-63],[-45,-65],[-50,-68],[-55,-67],[-55,-65],[-50,-55],[-45,-50],[-40,-50],[-35,-53],[-30,-50],[-25,-48],[-20,-40],[-15,-38],[-10,-37],[-5,-35],[0,-50],[5,-55],[5,-60],[10,-65],[10,-75]],
    // Australia
    [[-15,130],[-20,120],[-25,114],[-30,115],[-35,117],[-38,140],[-38,147],[-35,150],[-30,153],[-25,153],[-20,148],[-17,140],[-15,136],[-13,130],[-15,130]],
  ]
}