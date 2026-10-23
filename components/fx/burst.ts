"use client"

import { useCallback, useEffect, useRef } from "react"

import { FX_COLORS, ParticleEngine, pick, prefersReducedMotion, rand, type ParticleShape } from "./particles"

type BurstKind = "celebrate" | "epic" | "check"

const CONFIG: Record<
  BurstKind,
  { count: number; speed: [number, number]; size: [number, number]; life: [number, number]; colors: readonly string[] }
> = {
  check: {
    count: 8,
    speed: [110, 220],
    size: [3, 5],
    life: [0.45, 0.7],
    colors: [FX_COLORS.green, FX_COLORS.yellow, FX_COLORS.violet],
  },
  celebrate: {
    count: 46,
    speed: [260, 560],
    size: [4, 7],
    life: [1.1, 1.7],
    colors: [FX_COLORS.yellow, FX_COLORS.violet, FX_COLORS.green],
  },
  epic: {
    count: 90,
    speed: [320, 760],
    size: [4.5, 8.5],
    life: [1.4, 2.2],
    colors: [FX_COLORS.yellow, FX_COLORS.gold, FX_COLORS.violet, FX_COLORS.green, FX_COLORS.gold],
  },
}

function centerOf(el: Element | DOMRect) {
  const r = el instanceof Element ? el.getBoundingClientRect() : el
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }
}

/**
 * Returns a `burst(target, kind)` function that fires a particle burst from the
 * centre of an element (or rect). Owns a single canvas, created on first use and
 * removed on unmount. Skipped entirely under prefers-reduced-motion.
 */
export function useBurst() {
  const engine = useRef<ParticleEngine | null>(null)

  useEffect(
    () => () => {
      engine.current?.destroy()
      engine.current = null
    },
    [],
  )

  return useCallback((target: Element | DOMRect | null | undefined, kind: BurstKind = "celebrate") => {
    if (!target || prefersReducedMotion()) return
    engine.current ??= new ParticleEngine(260, 70)
    const e = engine.current
    const cfg = CONFIG[kind]
    const { x, y, w } = centerOf(target)
    const isCheck = kind === "check"

    for (let i = 0; i < cfg.count; i++) {
      // Celebrations spray upward in a fan; check bursts are a full ring.
      const angle = isCheck
        ? (i / cfg.count) * Math.PI * 2 + rand(-0.25, 0.25)
        : -Math.PI / 2 + rand(-1.15, 1.15)
      const speed = rand(cfg.speed[0], cfg.speed[1])
      const shape: ParticleShape = isCheck ? (i % 3 === 0 ? "star" : "dot") : i % 4 === 0 ? "star" : "confetti"
      const color = pick(cfg.colors)
      e.add({
        x: isCheck ? x : x + rand(-w / 4, w / 4),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: isCheck ? 120 : 900,
        drag: isCheck ? 0.02 : 0.35,
        size: rand(cfg.size[0], cfg.size[1]) * (shape === "star" ? 1.5 : 1),
        endScale: isCheck ? 0.2 : 0.6,
        rotation: rand(0, Math.PI * 2),
        spin: rand(-9, 9),
        color,
        shape,
        life: rand(cfg.life[0], cfg.life[1]),
        age: 0,
        shimmer: kind === "epic" && (color === FX_COLORS.gold || shape === "star"),
      })
    }

    if (kind === "epic") {
      // Gold shimmer: a slow halo of sparkles that hang around the button.
      for (let i = 0; i < 24; i++) {
        const a = rand(0, Math.PI * 2)
        const d = rand(w * 0.3, w * 0.75)
        e.add({
          x: x + Math.cos(a) * d,
          y: y + Math.sin(a) * d * 0.45,
          vx: rand(-20, 20),
          vy: rand(-60, -20),
          gravity: 0,
          drag: 0.5,
          size: rand(4, 8),
          endScale: 0,
          rotation: 0,
          spin: rand(-1.5, 1.5),
          color: FX_COLORS.gold,
          shape: "star",
          life: rand(1.2, 2),
          age: -rand(0, 0.5),
          shimmer: true,
        })
      }
    }
  }, [])
}
