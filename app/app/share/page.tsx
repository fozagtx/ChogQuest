"use client"

import { AnimatePresence, motion } from "motion/react"
import { BarChart3, BookOpen, Download, Send, Trophy, Users } from "lucide-react"
import { toPng } from "html-to-image"
import { useRef, useState } from "react"

import { CheckboxMark } from "@/components/game/checkbox-mark"
import { Gate } from "@/components/game/gate"
import { PillTabs, Rise, Screen, ScreenHeader, Tilt, spring } from "@/components/screens/kit"
import { CardBody, cardReady, cards, shareText, type CardKind } from "@/components/screens/share-cards"
import { buttonVariants } from "@/components/ui/button"
import { errorMessage } from "@/lib/client"
import { cn } from "@/lib/utils"

function initialCard(): CardKind {
  if (typeof window === "undefined") return "PARTY"
  const c = new URLSearchParams(window.location.search).get("card")
  return cards.includes(c as CardKind) ? (c as CardKind) : "PARTY"
}

const tabMeta: Record<CardKind, { label: string; icon: React.ReactNode }> = {
  PARTY: { label: "Party", icon: <Users strokeWidth={3} /> },
  QUEST: { label: "Quest", icon: <Trophy strokeWidth={3} /> },
  XP: { label: "XP", icon: <BarChart3 strokeWidth={3} /> },
  DIARY: { label: "Diary", icon: <BookOpen strokeWidth={3} /> },
}

export default function ShareStudio() {
  const [card, setCard] = useState<CardKind>(initialCard)
  // Goal names are hidden on share cards by default.
  const [hideNames, setHideNames] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  async function saveImage() {
    if (!cardRef.current) return
    setError(null)
    setSaving(true)
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#FFFBF1" })
      const a = document.createElement("a")
      a.href = url
      a.download = `quest-chog-${card.toLowerCase()}.png`
      a.click()
    } catch (err) {
      // Usually an NFT image host without CORS headers.
      setError(`Could not save the image. ${errorMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Gate>
      {(state) => {
        const ready = cardReady(card, state)
        return (
          <Screen>
            <ScreenHeader title="Share studio" kicker="Cards worth posting." headColor="#34C77B" />

            <Rise>
              <PillTabs
                idPrefix="share"
                label="Card style"
                value={card}
                onChange={(v) => {
                  setError(null)
                  setCard(v)
                }}
                options={cards.map((c) => ({ value: c, label: tabMeta[c].label, icon: tabMeta[c].icon }))}
              />
            </Rise>

            <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @2xl:items-start">
              <Rise>
                <div role="tabpanel" id="share-panel" aria-labelledby={`share-tab-${card}`} aria-live="polite">
                  <Tilt className="mx-auto w-full max-w-[380px] rounded-[40px]" max={6}>
                    {/* Exported as the image. Keep transforms outside this node. */}
                    <div ref={cardRef} className="rounded-[40px] p-2">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={card}
                          initial={{ opacity: 0, scale: 0.9, rotate: -3, y: 16 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                          exit={{ opacity: 0, scale: 0.94, rotate: 3, y: -8, transition: { duration: 0.14 } }}
                          transition={spring}
                        >
                          <CardBody card={card} state={state} hideNames={hideNames} />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </Tilt>
                </div>
              </Rise>

              <div className="flex flex-col gap-4">
                <Rise>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={hideNames}
                    onClick={() => setHideNames(!hideNames)}
                    className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 rounded-[26px] bg-white px-5 text-left shadow-shadow focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span>
                      <span className="block text-[15px] font-black">Hide goal names on the card</span>
                      <span className="block text-[13px] font-bold text-ink/70">
                        {hideNames ? "Shows \"a big goal\" instead." : "Your goal name is visible."}
                      </span>
                    </span>
                    <CheckboxMark checked={hideNames} pop />
                  </button>
                </Rise>

                {error && (
                  <p role="alert" className="rounded-[18px] bg-red/15 px-4 py-3 text-sm font-bold text-[#9A2416]">
                    {error}
                  </p>
                )}

                <Rise className="flex gap-3">
                  <button
                    type="button"
                    onClick={saveImage}
                    disabled={!ready || saving}
                    className={cn(buttonVariants({ size: "lg" }), "min-h-14 flex-1 text-[15px]")}
                  >
                    <Download strokeWidth={3} /> {saving ? "Saving..." : "Save image"}
                  </button>
                  <a
                    href={`https://x.com/intent/post?text=${encodeURIComponent(shareText(card, state, hideNames))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full bg-ink font-pixel text-[15px] font-extrabold text-white transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] [&_svg]:size-4"
                  >
                    <Send strokeWidth={3} /> Post to X
                  </a>
                </Rise>
                {!ready && (
                  <p className="text-center text-[13px] font-bold text-ink/70">
                    Nothing to save on this card yet. Post to X still works.
                  </p>
                )}
              </div>
            </div>
          </Screen>
        )
      }}
    </Gate>
  )
}
