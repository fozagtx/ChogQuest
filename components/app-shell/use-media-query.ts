"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Live media query match. The server and the first client render both return
 * false, so anything gated on it mounts after hydration without a mismatch.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
