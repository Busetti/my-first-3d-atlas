/**
 * Flags are drawn with the system emoji font. The explicit stack keeps them
 * colourful on every platform instead of falling back to plain letters.
 */
export function Flag({ emoji, className = '' }: { emoji: string; className?: string }) {
  return (
    <span
      role="img"
      aria-hidden
      className={`shrink-0 leading-none select-none ${className}`}
      style={{
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "Android Emoji", sans-serif',
      }}
    >
      {emoji}
    </span>
  )
}
