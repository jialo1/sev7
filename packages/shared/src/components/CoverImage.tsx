import { useState } from 'react'
import { visualVariant } from '../lib/eventVisual'

type Props = {
  src?: string | null
  seed: string
  alt?: string
  className?: string
  rounded?: boolean
}

/**
 * Image avec fallback dégradé stable basé sur l'id.
 * Utilisé pour events, billets, summary cards, etc.
 */
export function CoverImage({ src, seed, alt = '', className, rounded }: Props) {
  const [broken, setBroken] = useState(false)
  const v = visualVariant(seed, 3)
  const base = `cover-image${rounded ? ' cover-image--rounded' : ''}${className ? ` ${className}` : ''}`

  if (!src || broken) {
    return <div className={`${base} cover-placeholder ph-${v}`} aria-hidden />
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={base}
      onError={() => setBroken(true)}
    />
  )
}
