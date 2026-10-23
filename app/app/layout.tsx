import { AppStateProvider } from "@/components/game/app-state"
import { TabBar } from "@/components/game/tab-bar"

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <AppStateProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col text-base leading-snug">
        <main className="flex flex-1 flex-col gap-4 px-4 py-5">{children}</main>
        <TabBar />
      </div>
    </AppStateProvider>
  )
}
