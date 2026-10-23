"use client"

import { Flame, Gem, Moon, Sparkles, Swords, Trophy } from "lucide-react"
import type { MotionValue } from "motion/react"

import { ChogShader } from "@/components/landing/chog-shader"
import { Floating, IconSticker } from "@/components/onboarding/stickers"

// Edge stickers live in the gutters around the content on wide screens only.
const edge = [
  { x: "4.5%", y: "22%", depth: 20, rotate: -10, delay: 0.3, bob: 3.8, icon: Moon, fill: "bg-main" },
  { x: "7%", y: "58%", depth: 30, rotate: 8, delay: 0.38, bob: 4.3, icon: Flame, fill: "bg-red" },
  { x: "4%", y: "86%", depth: 16, rotate: -14, delay: 0.46, bob: 3.6, icon: Swords, fill: "bg-main" },
  { x: "95.5%", y: "18%", depth: 26, rotate: 9, delay: 0.34, bob: 4.0, icon: Gem, fill: "bg-violet" },
  { x: "93%", y: "52%", depth: 18, rotate: -6, delay: 0.42, bob: 3.5, icon: Sparkles, fill: "bg-green" },
  { x: "96%", y: "84%", depth: 34, rotate: 12, delay: 0.5, bob: 4.4, icon: Trophy, fill: "bg-main" },
] as const

export function Backdrop({ mx, my }: { mx: MotionValue<number>; my: MotionValue<number> }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-main/30 via-main/10 to-transparent" />
      <ChogShader className="absolute inset-0" />
      <div className="pointer-events-auto hidden xl:block">
        {edge.map((s) => (
          <Floating
            key={s.x + s.y}
            x={s.x}
            y={s.y}
            depth={s.depth}
            rotate={s.rotate}
            delay={s.delay}
            bob={s.bob}
            mx={mx}
            my={my}
          >
            <IconSticker icon={s.icon} fill={s.fill} className="size-16" />
          </Floating>
        ))}
      </div>
    </div>
  )
}
