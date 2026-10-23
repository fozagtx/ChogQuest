"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

import { ApiError, api, errorMessage } from "@/lib/client"
import type { AppState } from "@/lib/state-types"

type Ctx = {
  state: AppState | null
  status: "loading" | "ready" | "signed-out" | "error"
  error: string | null
  refresh: () => Promise<void>
}

const AppStateContext = createContext<Ctx | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [status, setStatus] = useState<Ctx["status"]>("loading")
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await api<AppState>("/api/state"))
      setStatus("ready")
      setError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setStatus("signed-out")
      } else {
        setStatus("error")
        setError(errorMessage(err))
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    refresh()
  }, [refresh])

  return (
    <AppStateContext.Provider value={{ state, status, error, refresh }}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState outside AppStateProvider")
  return ctx
}
