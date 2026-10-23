"use client"

import Link from "next/link"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { api, connectWallet, errorMessage, signIn, signMessage } from "@/lib/client"
import { cn } from "@/lib/utils"

// Reached from the Telegram bot after /start CODE. The wallet signs a message
// that includes the Telegram ID before the link is stored.
export default function LinkTelegram() {
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setStatus("busy")
    setError(null)
    try {
      const code = new URLSearchParams(window.location.search).get("code") ?? ""
      let pending: { message: string }
      try {
        pending = await api(`/api/telegram/link?code=${encodeURIComponent(code)}`)
      } catch {
        await signIn()
        pending = await api(`/api/telegram/link?code=${encodeURIComponent(code)}`)
      }
      const account = await connectWallet()
      const signature = await signMessage(account, pending.message)
      await api("/api/telegram/link", { body: { code, signature } })
      setStatus("done")
    } catch (err) {
      setError(errorMessage(err))
      setStatus("idle")
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-4 px-4 py-8">
      <h1 className="font-pixel text-[28px] leading-tight font-bold">LINK TELEGRAM</h1>
      {status === "done" ? (
        <>
          <p>Linked. Head back to Telegram and send /night.</p>
          <Link href="/app" className={cn(buttonVariants({ size: "lg" }), "min-h-13")}>
            OPEN TODAY
          </Link>
        </>
      ) : (
        <>
          <p>Confirm with the wallet that holds your Chog. This signature costs nothing.</p>
          <Button size="lg" className="min-h-13" onClick={confirm} disabled={status === "busy"}>
            {status === "busy" ? "CHECK YOUR WALLET..." : "CONFIRM WITH WALLET"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="rounded-base border-2 border-border bg-red px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}
    </main>
  )
}
