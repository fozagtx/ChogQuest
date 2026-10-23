"use client"

import { Gate } from "@/components/game/gate"
import { ChogSheetScreen } from "@/components/screens/chog-sheet"

export default function ChogSheet() {
  return <Gate>{(state) => <ChogSheetScreen state={state} />}</Gate>
}
