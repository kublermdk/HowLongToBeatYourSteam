import { memo, useState } from 'react'

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215"><rect width="460" height="215" fill="#1e293b"/><text x="50%" y="50%" fill="#64748b" font-family="sans-serif" font-size="16" text-anchor="middle" dominant-baseline="middle">No image</text></svg>',
  )

interface GameCoverProps {
  src: string
  alt: string
  className?: string
}

export const GameCover = memo(function GameCover({ src, alt, className = '' }: GameCoverProps) {
  const [failed, setFailed] = useState(false)
  const displaySrc = failed ? PLACEHOLDER : src

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
})
