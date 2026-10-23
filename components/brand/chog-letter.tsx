import { useId } from "react"

import { cn } from "@/lib/utils"

// Quest Chog lettermark: the Q (and the C in "Chog") is drawn as a round head
// wearing Chog's spiky hair. Abstract shapes only, no face, so it stays an
// original mark rather than a drawing of the character.

const HAIR =
  "M26.0 58.0Q9.39 44.17 5.23 27.8Q21.02 31.9 31.61 42.57Z M29.65 45.28Q19.67 20.28 22.95 -0.0Q38.43 15.55 43.38 34.93Z M40.24 36.07Q45.31 6.51 58.53 -11.48Q64.33 13.24 57.42 35.17Z M54.58 34.44Q73.58 15.1 91.78 8.21Q84.34 29.69 68.65 42.9Z M66.97 41.03Q86.53 36.57 98.79 37.29Q87.55 49.5 73.56 53.42Z"
const Q_TAIL = "M73.84 70.68L88.84 95.51L61.84 82.27Z"
const C_ARC = "M70.63 43.01A25.5 25.5 0 1 0 70.63 72.99"

export function ChogLetter({
  letter,
  className,
  tone = "purple",
}: {
  letter: "Q" | "C"
  className?: string
  /** purple on light backgrounds, ink on the yellow app icon */
  tone?: "purple" | "ink"
}) {
  const id = useId()
  const fill = tone === "ink" ? "#1A1200" : `url(#${id}-g)`

  return (
    <svg viewBox="0 -14 104 110" className={cn("inline-block", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B6CFF" />
          <stop offset="100%" stopColor="#4B2A9E" />
        </linearGradient>
      </defs>
      <path d={HAIR} fill={fill} />
      {letter === "Q" ? (
        <>
          <circle cx="50" cy="58" r="25.5" fill="none" stroke={fill} strokeWidth="17" />
          <path d={Q_TAIL} fill={fill} />
        </>
      ) : (
        <path d={C_ARC} fill="none" stroke={fill} strokeWidth="17" strokeLinecap="round" />
      )}
    </svg>
  )
}

/** The app icon: the Q head on a yellow rounded square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-main shadow-[inset_0_-3px_0_rgb(26_18_0/0.12)]",
        className,
      )}
    >
      <ChogLetter letter="Q" tone="ink" className="size-[84%] translate-y-[3%]" />
    </span>
  )
}

/** "Quest Chog" with the Q and C drawn as Chog heads. */
export function Wordmark({ className, glyphClassName }: { className?: string; glyphClassName?: string }) {
  // The ring spans cap height; the hair rises above it like an accent.
  const glyph = cn("h-[1.165em] w-[1.1em] -ml-[0.02em] -mr-[0.06em] translate-y-[0.042em]", glyphClassName)
  return (
    <span className={cn("inline-flex items-baseline whitespace-nowrap", className)} aria-label="Quest Chog" role="img">
      <ChogLetter letter="Q" className={glyph} />
      <span aria-hidden="true">uest&nbsp;</span>
      <ChogLetter letter="C" className={glyph} />
      <span aria-hidden="true">hog</span>
    </span>
  )
}
