"use client"

import { Gate } from "@/components/game/gate"
import { QuestsScreen } from "@/components/screens/quests"

export default function Quests() {
  return <Gate>{(state) => <QuestsScreen state={state} />}</Gate>
}
