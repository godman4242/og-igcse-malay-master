import useStore from '../store/useStore'
import { getDictionaryIcon } from '../lib/dictionaryIcon'

export default function DictionaryIcon({ word, meaning, size = 56, className = '' }) {
  const enabled = useStore(s => s.showDictionaryImages ?? true)
  if (!enabled) return null

  const icon = getDictionaryIcon(word)
  if (icon.kind === 'none') return null

  const label = meaning ? `${word} — ${meaning}` : word

  if (icon.kind === 'emoji') {
    return (
      <span
        role="img"
        aria-label={label}
        className={`select-none leading-none ${className}`}
        style={{ fontSize: size, lineHeight: 1 }}
      >
        {icon.src}
      </span>
    )
  }

  return (
    <img
      src={icon.src}
      alt={label}
      loading="lazy"
      decoding="async"
      width={size}
      height={size}
      className={className}
    />
  )
}
