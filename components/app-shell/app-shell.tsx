"use client"

import { TabBar } from "@/components/game/tab-bar"
import { MotionRoot } from "@/components/landing/motion-root"

import { AmbientBackdrop, AmbientStyles } from "./ambient-backdrop"
import { AppHeader } from "./app-header"
import { PageTransition } from "./page-transition"
import { SideStickers } from "./side-stickers"

/**
 * Frame shared by every /app screen: ambient backdrop, the phone-width column
 * (a frosted sheet on wide screens, with the sticker pile in the gutters),
 * header, animated page body and the floating tab bar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionRoot>
      <AmbientStyles />
      <div className="relative isolate flex min-h-dvh w-full flex-1 flex-col items-center">
        <AmbientBackdrop />
        <SideStickers />
        <div className="relative z-10 flex min-h-dvh w-full max-w-[440px] flex-col text-base leading-snug lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:rounded-[44px] lg:bg-cream/80 lg:shadow-[0_40px_90px_-40px_rgb(26_18_0/0.45),0_0_0_1px_rgb(255_255_255/0.9)_inset] lg:backdrop-blur-xl">
          <AppHeader />
          <PageTransition>{children}</PageTransition>
          <TabBar />
        </div>
      </div>
    </MotionRoot>
  )
}
