import { CursorTrail } from "@/components/fx/cursor-trail"
import { Hero } from "@/components/landing/hero"
import { MotionRoot } from "@/components/landing/motion-root"
import { Nav } from "@/components/landing/nav"
import { FinalCta, Footer, HowYouPlay, TheNight } from "@/components/landing/sections"

export default function Landing() {
  return (
    <MotionRoot>
    <div className="bg-cream text-ink">
      <Nav />
      <main>
        <Hero />
        <HowYouPlay />
        <TheNight />
        <FinalCta />
      </main>
      <Footer />
      <CursorTrail />
    </div>
    </MotionRoot>
  )
}
