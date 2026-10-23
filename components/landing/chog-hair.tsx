"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

/*
 * Abstract "hair field": springy tapered quills that grow from the bottom edge of the
 * parent panel, sway in a soft wind and part around the pointer.
 *
 * Physics: every strand has two point masses (mid, tip) driven by damped springs toward
 * their rest pose. The tip spring targets its rest point shifted by the mid offset, so it
 * lags and whips. After each step both points are projected back onto their rest lengths
 * from the root, which turns sideways pushes into real bending instead of stretching.
 */

type Strand = {
  rx: number // root x
  ry: number // root y
  len: number
  ang: number // rest lean, radians from vertical
  width: number
  curl: number // extra bend of the outer half
  chord: number // rest root-to-tip distance
  layer: number // 0 back, 1 mid, 2 front, 3 highlight
  phase: number
  stiff: number
  // mid offset + velocity
  mx: number
  my: number
  mvx: number
  mvy: number
  // tip offset + velocity
  tx: number
  ty: number
  tvx: number
  tvy: number
}

const LAYER_STOPS: [string, string, string][] = [
  ["#140d2b", "#2f1d68", "#4B2A9E"],
  ["#1d1342", "#4B2A9E", "#7a52e6"],
  ["#2a1966", "#6B3FD6", "#b5a0ff"],
  ["#3a2186", "#9a6cf0", "#FFB800"],
]
const HIGHLIGHT = ["rgba(139,108,255,0.16)", "rgba(170,146,255,0.26)", "rgba(228,218,255,0.38)", "rgba(255,226,150,0.6)"]

const SAMPLES = 7

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function ChogHair({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    let reduce = reduceMq.matches

    let W = 0
    let H = 0
    let dpr = 1
    let strands: Strand[] = []
    let grads: CanvasGradient[] = []
    let glow: CanvasGradient | null = null
    let shade: CanvasGradient | null = null
    let raf = 0
    let running = false
    let visible = false
    let last = 0
    let acc = 0
    let time = 0

    // pointer state in canvas css px
    const ptr = { x: -9999, y: -9999, vx: 0, vy: 0, active: false }

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      W = Math.max(1, Math.round(rect.width))
      H = Math.max(1, Math.round(rect.height))
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)

      const mobile = W < 640
      const spacing = mobile ? 5.5 : 6.5
      const count = Math.min(320, Math.round(W / spacing))
      const maxLen = H - 8

      strands = []
      for (let i = 0; i < count; i++) {
        const u = (i + hash(i) * 0.9) / count
        const x = u * (W + 40) - 20
        // clumpy silhouette: a few overlapping tuft waves
        const tuft =
          0.55 +
          0.25 * Math.sin(u * 9.0 + 1.3) +
          0.15 * Math.sin(u * 23.0 + 0.4) +
          0.12 * Math.sin(u * 51.0 + 2.2)
        const r = hash(i + 17)
        const layerRoll = hash(i + 91)
        const layer = layerRoll < 0.34 ? 0 : layerRoll < 0.68 ? 1 : layerRoll < 0.94 ? 2 : 3
        const layerScale = [1.0, 0.84, 0.66, 0.8][layer]
        const len = Math.max(28, Math.min(maxLen, maxLen * layerScale * (0.45 + 0.55 * tuft) * (0.75 + 0.35 * r)))
        // clumps lean together, with per-strand jitter
        const lean = 0.28 * Math.sin(u * 14.0 + 0.7) + (hash(i + 3) - 0.5) * 0.36
        strands.push({
          rx: x,
          ry: H + 6,
          len,
          ang: lean,
          width: [mobile ? 30 : 44, mobile ? 22 : 32, mobile ? 15 : 22, mobile ? 12 : 16][layer] * (0.7 + hash(i + 7) * 0.6),
          curl: lean * 0.55 + (hash(i + 53) - 0.5) * 0.22,
          chord: 0,
          layer,
          phase: hash(i + 29) * Math.PI * 2,
          stiff: 0.8 + hash(i + 41) * 0.5,
          mx: 0,
          my: 0,
          mvx: 0,
          mvy: 0,
          tx: 0,
          ty: 0,
          tvx: 0,
          tvy: 0,
        })
      }
      for (const s of strands) {
        const [tx, ty] = restTip(s)
        s.chord = Math.hypot(tx - s.rx, ty - s.ry)
      }
      strands.sort((a, b) => a.layer - b.layer)

      const curStopMid = (i: number) => (i === 3 ? 0.4 : 0.55)
      grads = LAYER_STOPS.map(([a, b, c], i) => {
        const g = ctx.createLinearGradient(0, H, 0, H - maxLen)
        g.addColorStop(0, a)
        g.addColorStop(curStopMid(i), b)
        g.addColorStop(1, c)
        return g
      })
      glow = ctx.createLinearGradient(0, H, 0, 0)
      glow.addColorStop(0, "rgba(107,63,214,0.22)")
      glow.addColorStop(0.6, "rgba(107,63,214,0)")
      shade = ctx.createLinearGradient(0, H, 0, H * 0.55)
      shade.addColorStop(0, "rgba(18,11,38,0.75)")
      shade.addColorStop(1, "rgba(18,11,38,0)")
    }

    const restMid = (s: Strand) => {
      const half = s.len * 0.5
      return [s.rx + Math.sin(s.ang) * half, s.ry - Math.cos(s.ang) * half]
    }
    const restTip = (s: Strand) => {
      const half = s.len * 0.5
      const a2 = s.ang + s.curl
      return [s.rx + Math.sin(s.ang) * half + Math.sin(a2) * half, s.ry - Math.cos(s.ang) * half - Math.cos(a2) * half]
    }

    const R = () => (W < 640 ? 90 : 140)

    const step = (dt: number) => {
      time += dt
      const radius = R()
      const r2 = radius * radius
      const pvx = ptr.vx
      const pvy = ptr.vy
      ptr.vx *= Math.pow(0.002, dt)
      ptr.vy *= Math.pow(0.002, dt)

      const gust = 0.6 + 0.4 * Math.sin(time * 0.37) * Math.sin(time * 0.23 + 1.1)

      for (let i = 0; i < strands.length; i++) {
        const s = strands[i]
        const [rmx, rmy] = restMid(s)
        const [rtx, rty] = restTip(s)

        const wind =
          (Math.sin(s.rx * 0.006 + time * 1.1 + s.phase * 0.15) * 0.7 +
            Math.sin(s.rx * 0.017 - time * 1.9) * 0.3) *
          gust *
          (16 + s.len * 0.12)

        const k = 70 * s.stiff
        const c = 7.5
        let fmx = -k * s.mx - c * s.mvx + wind * 0.45
        let fmy = -k * s.my - c * s.mvy
        const kt = 46 * s.stiff
        const ct = 5.2
        let ftx = -kt * (s.tx - s.mx * 1.7) - ct * (s.tvx - s.mvx) + wind
        let fty = -kt * (s.ty - s.my * 1.7) - ct * (s.tvy - s.mvy)

        if (ptr.active) {
          // mid
          let px = rmx + s.mx
          let py = rmy + s.my
          let dx = px - ptr.x
          let dy = py - ptr.y
          let d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const d = Math.sqrt(d2) + 0.001
            const f = (1 - d / radius) ** 2
            fmx += (dx / d) * f * 3600 + pvx * f * 3.2
            fmy += (dy / d) * f * 1200 + pvy * f * 1.6
          }
          // tip
          px = rtx + s.tx
          py = rty + s.ty
          dx = px - ptr.x
          dy = py - ptr.y
          d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const d = Math.sqrt(d2) + 0.001
            const f = (1 - d / radius) ** 2
            ftx += (dx / d) * f * 6000 + pvx * f * 5
            fty += (dy / d) * f * 1800 + pvy * f * 2.5
          }
        }

        s.mvx += fmx * dt
        s.mvy += fmy * dt
        s.tvx += ftx * dt
        s.tvy += fty * dt
        s.mx += s.mvx * dt
        s.my += s.mvy * dt
        s.tx += s.tvx * dt
        s.ty += s.tvy * dt

        // keep segment lengths: project back onto rest radius from root
        let ax = rmx + s.mx - s.rx
        let ay = rmy + s.my - s.ry
        let al = Math.hypot(ax, ay) || 1
        const half = s.len * 0.5
        ax = (ax / al) * half
        ay = Math.min((ay / al) * half, -half * 0.25)
        s.mx = s.rx + ax - rmx
        s.my = s.ry + ay - rmy

        ax = rtx + s.tx - s.rx
        ay = rty + s.ty - s.ry
        al = Math.hypot(ax, ay) || 1
        ax = (ax / al) * s.chord
        ay = Math.min((ay / al) * s.chord, -s.chord * 0.15)
        s.tx = s.rx + ax - rtx
        s.ty = s.ry + ay - rty
      }
    }

    const left = new Float32Array(SAMPLES * 2)
    const right = new Float32Array(SAMPLES * 2)

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (glow) {
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, W, H)
      }
      ctx.lineCap = "round"

      let curLayer = -1
      for (let i = 0; i < strands.length; i++) {
        const s = strands[i]
        if (s.layer !== curLayer) {
          curLayer = s.layer
          ctx.fillStyle = grads[curLayer]
          ctx.strokeStyle = HIGHLIGHT[curLayer]
          ctx.lineWidth = curLayer === 0 ? 1 : 1.4
        }
        const [rmx, rmy] = restMid(s)
        const [rtx, rty] = restTip(s)
        const x0 = s.rx
        const y0 = s.ry
        const x1 = rmx + s.mx
        const y1 = rmy + s.my
        const x2 = rtx + s.tx
        const y2 = rty + s.ty
        // control point so the curve passes through the mid node
        const cx = 2 * x1 - (x0 + x2) * 0.5
        const cy = 2 * y1 - (y0 + y2) * 0.5

        for (let j = 0; j < SAMPLES; j++) {
          const t = j / (SAMPLES - 1)
          const it = 1 - t
          const px = it * it * x0 + 2 * it * t * cx + t * t * x2
          const py = it * it * y0 + 2 * it * t * cy + t * t * y2
          let dx = 2 * it * (cx - x0) + 2 * t * (x2 - cx)
          let dy = 2 * it * (cy - y0) + 2 * t * (y2 - cy)
          const dl = Math.hypot(dx, dy) || 1
          dx /= dl
          dy /= dl
          // quill taper: full at root, slight belly, needle tip
          const w = s.width * 0.5 * Math.pow(1 - t, 0.9) * (1 + 0.18 * Math.sin(t * Math.PI))
          left[j * 2] = px - dy * w
          left[j * 2 + 1] = py + dx * w
          right[j * 2] = px + dy * w
          right[j * 2 + 1] = py - dx * w
        }

        ctx.beginPath()
        ctx.moveTo(left[0], left[1])
        for (let j = 1; j < SAMPLES; j++) ctx.lineTo(left[j * 2], left[j * 2 + 1])
        for (let j = SAMPLES - 1; j >= 0; j--) ctx.lineTo(right[j * 2], right[j * 2 + 1])
        ctx.closePath()
        ctx.fill()

        // sheen line along the lit side
        ctx.beginPath()
        ctx.moveTo(left[2] * 0.6 + right[2] * 0.4, left[3] * 0.6 + right[3] * 0.4)
        for (let j = 2; j < SAMPLES - 1; j++) {
          ctx.lineTo(left[j * 2] * 0.62 + right[j * 2] * 0.38, left[j * 2 + 1] * 0.62 + right[j * 2 + 1] * 0.38)
        }
        ctx.stroke()
      }
      if (shade) {
        ctx.fillStyle = shade
        ctx.fillRect(0, H * 0.55, W, H * 0.45)
      }
    }

    const FIXED = 1 / 60
    const frame = (now: number) => {
      if (!running) return
      const dt = Math.min(0.05, last ? (now - last) / 1000 : FIXED)
      last = now
      acc += dt
      let n = 0
      while (acc >= FIXED && n < 4) {
        step(FIXED)
        acc -= FIXED
        n++
      }
      if (n === 4) acc = 0
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || reduce || !visible || document.hidden) return
      running = true
      last = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return [e.clientX - rect.left, e.clientY - rect.top] as const
    }
    const onMove = (e: PointerEvent) => {
      if (reduce) return
      const [x, y] = toLocal(e)
      if (ptr.active) {
        // smoothed pointer velocity in px/s, bounded
        const vx = Math.max(-2400, Math.min(2400, (x - ptr.x) * 60))
        const vy = Math.max(-2400, Math.min(2400, (y - ptr.y) * 60))
        ptr.vx = ptr.vx * 0.5 + vx * 0.5
        ptr.vy = ptr.vy * 0.5 + vy * 0.5
      }
      ptr.x = x
      ptr.y = y
      ptr.active = true
    }
    const onLeave = () => {
      ptr.active = false
      ptr.x = -9999
      ptr.y = -9999
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave()
    }

    const resize = () => {
      build()
      draw()
    }

    build()
    draw()

    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false
        if (visible) start()
        else stop()
      },
      { rootMargin: "80px" },
    )
    io.observe(canvas)

    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVis)

    const onReduce = () => {
      reduce = reduceMq.matches
      if (reduce) {
        stop()
        for (const s of strands) {
          s.mx = s.my = s.mvx = s.mvy = s.tx = s.ty = s.tvx = s.tvy = 0
        }
        draw()
      } else start()
    }
    reduceMq.addEventListener("change", onReduce)

    host.addEventListener("pointermove", onMove, { passive: true })
    host.addEventListener("pointerdown", onMove, { passive: true })
    host.addEventListener("pointerleave", onLeave)
    host.addEventListener("pointercancel", onLeave)
    host.addEventListener("pointerup", onUp)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      reduceMq.removeEventListener("change", onReduce)
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerdown", onMove)
      host.removeEventListener("pointerleave", onLeave)
      host.removeEventListener("pointercancel", onLeave)
      host.removeEventListener("pointerup", onUp)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none block", className)} />
}
