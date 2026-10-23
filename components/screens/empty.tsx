import { cn } from "@/lib/utils"

/** Honest, friendly empty state: an icon sticker, a line of copy, optional action. */
export function EmptyCard({
  icon,
  title,
  body,
  tone = "light",
  children,
  className,
}: {
  icon: React.ReactNode
  title: string
  body: string
  tone?: "light" | "night"
  children?: React.ReactNode
  className?: string
}) {
  const night = tone === "night"
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[32px] border-2 border-dashed px-6 py-8 text-center",
        night ? "border-white/15 bg-white/5 text-white" : "border-ink/12 bg-white/60",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="sticker flex size-16 -rotate-6 items-center justify-center rounded-[22px] border-[4px] border-white bg-main [&_svg]:size-7 [&_svg]:text-ink"
      >
        {icon}
      </div>
      <p className="text-lg font-black">{title}</p>
      <p className={cn("max-w-[30ch] text-[15px] font-bold", night ? "text-white/75" : "text-ink/70")}>{body}</p>
      {children}
    </div>
  )
}
