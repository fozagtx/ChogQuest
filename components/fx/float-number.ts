"use client"

import { prefersReducedMotion } from "./particles"

/**
 * Floats a short label (e.g. "+40 XP") up and out of an element, then removes it.
 * Imperative on purpose: it lives outside React's tree so re-renders of the
 * source element (label change, refresh) cannot cut the animation short.
 * Under prefers-reduced-motion it fades in place without rising.
 */
export function floatText(target: Element | null | undefined, text: string, color = "#1A1200") {
  if (!target || typeof document === "undefined") return
  const r = target.getBoundingClientRect()
  const el = document.createElement("div")
  el.textContent = text
  el.setAttribute("aria-hidden", "true")
  Object.assign(el.style, {
    position: "fixed",
    left: `${r.left + r.width / 2}px`,
    top: `${r.top}px`,
    transform: "translate(-50%, -50%)",
    zIndex: "80",
    pointerEvents: "none",
    fontFamily: "inherit",
    fontWeight: "900",
    fontSize: "22px",
    letterSpacing: "-0.01em",
    color,
    padding: "4px 12px",
    borderRadius: "999px",
    background: "#FFFBF1",
    boxShadow: "0 10px 24px -10px rgb(26 18 0 / 0.35)",
    whiteSpace: "nowrap",
  } satisfies Partial<CSSStyleDeclaration>)
  document.body.appendChild(el)

  const reduced = prefersReducedMotion()
  const frames: Keyframe[] = reduced
    ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
    : [
        { opacity: 0, transform: "translate(-50%, -30%) scale(0.6)" },
        { opacity: 1, transform: "translate(-50%, -90%) scale(1.08)", offset: 0.18 },
        { opacity: 1, transform: "translate(-50%, -150%) scale(1)", offset: 0.6 },
        { opacity: 0, transform: "translate(-50%, -230%) scale(0.96)" },
      ]
  const anim = el.animate(frames, {
    duration: reduced ? 1400 : 1500,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "forwards",
  })
  const done = () => el.remove()
  anim.onfinish = done
  anim.oncancel = done
}
