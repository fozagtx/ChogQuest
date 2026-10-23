"use client"

import { useEffect } from "react"

import { FX_COLORS, ParticleEngine, rand } from "./particles"

/**
 * Subtle sparkle trail that follows the mouse. Renders nothing in React; it
 * mounts a single pointer-events:none canvas only on fine-pointer, hover-capable
 * devices without prefers-reduced-motion, and tears it down on unmount or when
 * those media conditions stop matching.
 */
export function CursorTrail() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    let engine: ParticleEngine | null = null
    let lastX = 0
    let lastY = 0
    let lastT = 0
    let n = 0

    function onMove(e: PointerEvent) {
      if (!engine || e.pointerType !== "mouse") return
      const now = performance.now()
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      const dist = Math.hypot(dx, dy)
      // Spawn by distance travelled, at most ~1 sparkle per 16ms.
      if (dist < 14 || now - lastT < 16) return
      lastX = e.clientX
      lastY = e.clientY
      lastT = now
      n++
      engine.add({
        x: e.clientX + rand(-4, 4),
        y: e.clientY + rand(-4, 4),
        vx: -dx * 0.6 + rand(-18, 18),
        vy: -dy * 0.6 + rand(-30, 4),
        gravity: -14,
        drag: 0.08,
        size: rand(3, 6),
        endScale: 0.1,
        rotation: rand(-0.4, 0.4),
        spin: rand(-2, 2),
        color: n % 3 === 0 ? FX_COLORS.violet : FX_COLORS.yellow,
        shape: n % 5 === 0 ? "dot" : "star",
        life: rand(0.55, 0.9),
        age: 0,
        shimmer: false,
      })
    }

    function sync() {
      const on = fine.matches && !reduced.matches
      if (on && !engine) {
        engine = new ParticleEngine(60, 55)
        window.addEventListener("pointermove", onMove, { passive: true })
      } else if (!on && engine) {
        window.removeEventListener("pointermove", onMove)
        engine.destroy()
        engine = null
      }
    }

    sync()
    fine.addEventListener("change", sync)
    reduced.addEventListener("change", sync)
    return () => {
      fine.removeEventListener("change", sync)
      reduced.removeEventListener("change", sync)
      window.removeEventListener("pointermove", onMove)
      engine?.destroy()
      engine = null
    }
  }, [])

  return null
}
