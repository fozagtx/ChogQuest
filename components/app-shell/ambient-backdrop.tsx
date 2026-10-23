"use client"

import { ChogLetter } from "@/components/brand/chog-letter"
import { ChogShader } from "@/components/landing/chog-shader"

import { useMediaQuery } from "./use-media-query"

/*
 * The app's ambient layer, fixed behind every screen.
 * Phones get a CSS-only version (warm sun glow, two slow lavender/pink clouds,
 * a faint Chog head peeking from the corner): compositor-only, near-zero cost.
 * Wide screens, where the sides are visible, also mount the landing's WebGL
 * aurora, which pauses itself when the tab is hidden.
 */

const css = `
@keyframes qc-drift-a { 0%,100% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(40px,60px,0) scale(1.12) } }
@keyframes qc-drift-b { 0%,100% { transform: translate3d(0,0,0) scale(1.05) } 50% { transform: translate3d(-50px,-40px,0) scale(0.95) } }
@keyframes qc-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
@keyframes qc-shine { 0% { transform: translateX(-120%) skewX(-18deg) } 60%,100% { transform: translateX(320%) skewX(-18deg) } }
@keyframes qc-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
.qc-drift-a { animation: qc-drift-a 26s ease-in-out infinite; }
.qc-drift-b { animation: qc-drift-b 32s ease-in-out infinite; }
.qc-bob { animation: qc-bob var(--qc-bob, 4s) ease-in-out infinite; }
.qc-shine { animation: qc-shine 3.2s cubic-bezier(0.22, 1, 0.36, 1) infinite 1.2s; }
.qc-skeleton {
  background: linear-gradient(90deg, rgb(26 18 0 / 0.05) 0%, rgb(26 18 0 / 0.1) 50%, rgb(26 18 0 / 0.05) 100%);
  background-size: 200% 100%;
  animation: qc-shimmer 1.6s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .qc-drift-a, .qc-drift-b, .qc-bob, .qc-shine, .qc-skeleton { animation: none; }
}
`

export function AmbientStyles() {
  return (
    <style href="qc-app-ambient" precedence="default">
      {css}
    </style>
  )
}

export function AmbientBackdrop() {
  const wide = useMediaQuery("(min-width: 1024px)")

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden bg-cream">
      <div className="absolute inset-0 bg-[radial-gradient(120%_55%_at_50%_-8%,rgb(255_214_110/0.6),rgb(255_214_110/0.18)_45%,transparent_70%)]" />
      <div className="qc-drift-a absolute -top-10 -left-40 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(139_108_255/0.30),rgb(139_108_255/0.12)_55%,transparent)]" />
      <div className="qc-drift-b absolute top-[45%] -right-44 size-[460px] rounded-full bg-[radial-gradient(closest-side,rgb(255_95_162/0.16),rgb(139_108_255/0.12)_55%,transparent)]" />
      <div className="qc-drift-a absolute -bottom-40 left-[10%] size-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(255_184_0/0.18),transparent)] [animation-delay:-9s]" />
      <ChogLetter letter="O" color="#8B6CFF" className="absolute -right-16 bottom-28 size-56 -rotate-[24deg] opacity-[0.07]" />
      {wide && <ChogShader className="absolute inset-0" />}
    </div>
  )
}
