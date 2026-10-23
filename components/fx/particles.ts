/**
 * Tiny canvas particle engine shared by the fx components.
 *
 * - One fixed, full-viewport, pointer-events:none canvas per engine.
 * - requestAnimationFrame runs only while particles are alive.
 * - Device pixel ratio capped at 2, particle count capped per engine.
 * - Browser-only: never construct during SSR.
 */

export type ParticleShape = "star" | "confetti" | "dot"

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  /** px / s^2, positive = down */
  gravity: number
  /** velocity multiplier per second (0..1), e.g. 0.2 keeps 20% after one second */
  drag: number
  size: number
  /** final size multiplier at end of life (shrink) */
  endScale: number
  rotation: number
  spin: number
  color: string
  shape: ParticleShape
  /** seconds */
  life: number
  age: number
  /** gold shimmer: alpha flicker over time */
  shimmer: boolean
}

export const FX_COLORS = {
  yellow: "#FFB800",
  violet: "#8B6CFF",
  green: "#34C77B",
  gold: "#FFD54A",
  cream: "#FFF4D6",
} as const

export class ParticleEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private raf = 0
  private last = 0
  private dpr = 1
  private readonly max: number

  constructor(max = 300, zIndex = 60) {
    this.max = max
    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: String(zIndex),
    } satisfies Partial<CSSStyleDeclaration>)
    document.body.appendChild(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("2d canvas unavailable")
    this.canvas = canvas
    this.ctx = ctx
    this.resize()
    window.addEventListener("resize", this.resize)
  }

  get count() {
    return this.particles.length
  }

  add(p: Particle) {
    if (this.particles.length >= this.max) this.particles.shift()
    this.particles.push(p)
    if (!this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.particles = []
    window.removeEventListener("resize", this.resize)
    this.canvas.remove()
  }

  private resize = () => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(window.innerWidth * this.dpr)
    this.canvas.height = Math.round(window.innerHeight * this.dpr)
  }

  private tick = (now: number) => {
    // Clamp dt so a backgrounded tab does not teleport particles.
    const dt = Math.min((now - this.last) / 1000, 1 / 20)
    this.last = now
    const { ctx, dpr } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const alive: Particle[] = []
    for (const p of this.particles) {
      p.age += dt
      if (p.age >= p.life) continue
      if (p.age < 0) {
        // Negative age = delayed start; keep it alive but invisible.
        alive.push(p)
        continue
      }
      const dragK = Math.pow(p.drag, dt)
      p.vx *= dragK
      p.vy = p.vy * dragK + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.spin * dt
      draw(ctx, p, now)
      alive.push(p)
    }
    this.particles = alive

    if (alive.length > 0) {
      this.raf = requestAnimationFrame(this.tick)
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.raf = 0
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle, now: number) {
  const t = p.age / p.life
  // Ease-out fade over the last 40% of life.
  let alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
  if (p.shimmer) alpha *= 0.65 + 0.35 * Math.sin(now / 45 + p.x)
  const scale = 1 + (p.endScale - 1) * t
  const s = p.size * scale
  if (s <= 0.1 || alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.fillStyle = p.color

  if (p.shape === "star") {
    drawStar(ctx, s)
  } else if (p.shape === "confetti") {
    // Rounded confetti strip; scaleY flutter fakes a 3D flip.
    const flip = Math.cos(p.rotation * 2.2)
    ctx.scale(1, Math.max(0.15, Math.abs(flip)))
    roundRect(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.45)
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Four-point sparkle with concave sides. `r` is the tip radius. */
function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  const k = r * 0.22
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.quadraticCurveTo(k, -k, r, 0)
  ctx.quadraticCurveTo(k, k, 0, r)
  ctx.quadraticCurveTo(-k, k, -r, 0)
  ctx.quadraticCurveTo(-k, -k, 0, -r)
  ctx.closePath()
  ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export const rand = (min: number, max: number) => min + Math.random() * (max - min)
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
