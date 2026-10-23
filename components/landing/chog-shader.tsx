"use client"

import { useEffect, useRef } from "react"

/*
 * Soft "Chog aurora" backdrop for the landing hero.
 * A domain-warped metaball field (violet + a hint of cheek pink) floats over a
 * cream base with a warm yellow glow at the top. The centre/bottom band where the
 * headline and buttons sit is kept close to pure cream so text contrast holds.
 * Raw WebGL1, no dependencies. Renders nothing if WebGL is unavailable.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;   // -0.5..0.5, y down
uniform float uScroll; // 0..1 as hero leaves
uniform float uAspect;

const vec3 CREAM  = vec3(1.0, 0.984, 0.945);   // #FFFBF1
const vec3 YELLOW = vec3(1.0, 0.722, 0.0);     // #FFB800
const vec3 VIOLET = vec3(0.545, 0.424, 1.0);   // #8B6CFF
const vec3 DEEP   = vec3(0.420, 0.247, 0.839); // #6B3FD6
const vec3 PINK   = vec3(1.0, 0.373, 0.635);   // #FF5FA2

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float blob(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return (r * r) / (dot(d, d) + 0.0015);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;              // 0..1, y up
  vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);
  float t = uTime * 0.045;

  // Parallax: the field drifts up a little faster than the page as you scroll.
  p.y -= uScroll * 0.35;

  // Organic domain warp so blobs breathe instead of sliding.
  vec2 w = vec2(fbm(p * 1.4 + vec2(t, -t * 0.7)), fbm(p * 1.4 + vec2(-t * 0.8, t) + 5.2));
  vec2 q = p + (w - 0.5) * 0.28;

  vec2 m = vec2(uMouse.x * uAspect, -uMouse.y);
  float sx = 0.5 * uAspect;

  // Blobs live mostly at the sides, where the stickers float.
  vec2 c1 = vec2(-sx * 0.78 + 0.06 * sin(t * 6.1), 0.12 + 0.07 * cos(t * 5.3));
  vec2 c2 = vec2( sx * 0.80 + 0.06 * cos(t * 4.7), 0.02 + 0.08 * sin(t * 6.7));
  vec2 c3 = vec2(-sx * 0.55 + 0.05 * sin(t * 3.9 + 2.0), -0.30 + 0.05 * cos(t * 4.4));
  vec2 c4 = vec2( sx * 0.58 + 0.05 * cos(t * 5.6 + 1.0), -0.34 + 0.06 * sin(t * 3.6));
  vec2 c5 = vec2( sx * 0.42 + 0.05 * sin(t * 2.8), -0.10 + 0.05 * cos(t * 3.1));
  vec2 c6 = vec2(-sx * 0.40 + 0.04 * cos(t * 3.3), -0.02 + 0.04 * sin(t * 2.6));

  // Pointer pull: each blob leans toward the cursor by its own amount.
  c1 += (m - c1) * 0.10;
  c2 += (m - c2) * 0.10;
  c3 += (m - c3) * 0.07;
  c4 += (m - c4) * 0.07;
  c5 += (m - c5) * 0.12;

  float fv = blob(q, c1, 0.20) + blob(q, c2, 0.22) + blob(q, c3, 0.15) + blob(q, c4, 0.16);
  float fp = blob(q, c5, 0.17) + blob(q, c6, 0.13);

  float violet = smoothstep(0.3, 4.0, fv);
  float pink = smoothstep(0.4, 3.2, fp);

  // Keep the reading band (headline, copy, CTAs) clear: centre, lower half.
  // Portrait screens: copy spans nearly the full width, so widen the band.
  float bw = mix(0.75, 0.36, smoothstep(0.6, 1.3, uAspect));
  vec2 band = vec2((uv.x - 0.5) / bw, (uv.y - 0.26) / 0.30);
  float clear = 1.0 - smoothstep(0.55, 1.15, length(band));

  vec3 col = CREAM;

  // Warm sun glow pouring from the top centre, with a faint wash across the top edge.
  vec2 g0 = vec2((uv.x - 0.5 - m.x * 0.08) * uAspect * 0.9, (1.04 - uv.y) * 1.5);
  float sun = exp(-dot(g0, g0) * 2.2) * (0.8 + 0.2 * fbm(q * 2.2 + t * 1.5));
  float wash = smoothstep(0.55, 1.0, uv.y) * 0.35;
  vec3 SUN = vec3(1.0, 0.87, 0.48);
  col = mix(col, SUN, clamp(sun * 0.62 + wash * 0.5, 0.0, 0.75));
  col = mix(col, mix(SUN, YELLOW, 0.35), sun * sun * 0.22);

  // Lavender aurora + a breath of cheek pink.
  vec3 lav = mix(vec3(0.84, 0.78, 1.0), mix(VIOLET, DEEP, 0.35), smoothstep(1.5, 7.0, fv));
  col = mix(col, lav, violet * 0.5 * (1.0 - clear * 0.9));
  col = mix(col, mix(CREAM, PINK, 0.32), pink * 0.38 * (1.0 - clear * 0.85));

  // Soft fade into the page at the bottom edge.
  col = mix(CREAM, col, smoothstep(0.0, 0.28, uv.y));

  // Film grain, very light.
  float g = hash(frag + fract(uTime * 0.37) * 517.0) - 0.5;
  col += g * 0.028;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("ChogShader compile error:", gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

export function ChogShader({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const host = wrap?.parentElement
    if (!wrap || !host) return

    // A fresh canvas per effect run: a context released in cleanup can never be
    // revived on the same element (matters under StrictMode double-mount).
    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    if (!prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("ChogShader link error:", gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)
    wrap.appendChild(canvas)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "uRes")
    const uTime = gl.getUniformLocation(prog, "uTime")
    const uMouse = gl.getUniformLocation(prog, "uMouse")
    const uScroll = gl.getUniformLocation(prog, "uScroll")
    const uAspect = gl.getUniformLocation(prog, "uAspect")

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Field is soft, so render below native resolution.
    const RENDER_SCALE = 0.6
    let cssW = 0
    let cssH = 0
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      cssW = Math.max(1, r.width)
      cssH = Math.max(1, r.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * RENDER_SCALE
      canvas.width = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      const r = host.getBoundingClientRect()
      mouse.tx = (e.clientX - r.left) / r.width - 0.5
      mouse.ty = (e.clientY - r.top) / r.height - 0.5
    }
    const onLeave = () => {
      mouse.tx = 0
      mouse.ty = 0
    }

    const scrollProgress = () => {
      const r = host.getBoundingClientRect()
      return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)))
    }

    let raf = 0
    let running = false
    let visible = true
    let lost = false
    let shown = false
    const start = performance.now()
    let last = start

    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const k = 1 - Math.exp(-dt * 2.2)
      mouse.x += (mouse.tx - mouse.x) * k
      mouse.y += (mouse.ty - mouse.y) * k
      const s = scrollProgress()

      gl.uniform2f(uRes, canvas.width, canvas.height)
      // Reduced motion: a fixed, pleasant moment in the loop.
      gl.uniform1f(uTime, reduce ? 18 : (now - start) / 1000 + 12)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform1f(uScroll, s)
      gl.uniform1f(uAspect, cssW / cssH)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      canvas.style.opacity = String(1 - Math.min(1, s * 1.35))
      if (!shown) {
        shown = true
        wrap.style.opacity = "1"
      }
    }

    const loop = (now: number) => {
      if (!running) return
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    const update = () => {
      const should = !reduce && visible && !lost && document.visibilityState === "visible"
      if (should && !running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(loop)
      } else if (!should && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    }

    const redrawStatic = () => {
      if (!lost && (reduce || !running)) draw(performance.now())
    }

    resize()
    redrawStatic()
    update()

    const ro = new ResizeObserver(() => {
      resize()
      redrawStatic()
    })
    ro.observe(wrap)

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        update()
      },
      { threshold: 0 },
    )
    io.observe(wrap)

    const onVisibility = () => update()
    const onScrollStatic = () => {
      if (reduce) canvas.style.opacity = String(1 - Math.min(1, scrollProgress() * 1.35))
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      lost = true
      update()
    }

    document.addEventListener("visibilitychange", onVisibility)
    canvas.addEventListener("webglcontextlost", onLost)
    if (!reduce) {
      host.addEventListener("pointermove", onPointer)
      host.addEventListener("pointerleave", onLeave)
    } else {
      window.addEventListener("scroll", onScrollStatic, { passive: true })
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      canvas.removeEventListener("webglcontextlost", onLost)
      host.removeEventListener("pointermove", onPointer)
      host.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("scroll", onScrollStatic)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
      wrap.style.opacity = "0"
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={className}
      style={{ opacity: 0, transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
    />
  )
}
