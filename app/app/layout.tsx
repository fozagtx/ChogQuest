import { AppShell } from "@/components/app-shell/app-shell"
import { AppStateProvider } from "@/components/game/app-state"

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <AppStateProvider>
      <AppShell>{children}</AppShell>
    </AppStateProvider>
  )
}
