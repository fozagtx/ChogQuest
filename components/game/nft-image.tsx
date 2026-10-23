import { cn } from "@/lib/utils"

// Never draw Chog artwork. Show the NFT's own image from its metadata, or a
// striped placeholder until it loads.
export function NftImage({
  src,
  alt,
  label = "NFT IMAGE",
  className,
}: {
  src?: string | null
  alt: string
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "nft-stripes flex items-center justify-center overflow-hidden rounded-base border-2 border-border text-center font-pixel text-xs font-bold",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- NFT images come from arbitrary metadata hosts
        <img src={src} alt={alt} className="block size-full object-cover" />
      ) : (
        <span aria-label={alt}>{label}</span>
      )}
    </div>
  )
}
