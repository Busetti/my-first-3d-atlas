import { useMemo } from 'react'

/**
 * Everything behind the globe: a deep space gradient, slow aurora blobs and a
 * scattering of twinkling dots. All CSS, so it costs the 3D scene nothing.
 */
export function Backdrop() {
  const twinkles = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.5 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 2.4 + Math.random() * 3.4,
      })),
    [],
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#2b1a6b_0%,#1a1150_45%,#0d0730_100%)]" />

      <div className="animate-drift absolute -top-[18%] -left-[12%] size-[62vmax] rounded-full bg-[#5b3cff]/35 blur-[110px]" />
      <div
        className="animate-drift absolute -right-[16%] -bottom-[22%] size-[58vmax] rounded-full bg-[#ff3d8f]/28 blur-[120px]"
        style={{ animationDelay: '-9s' }}
      />
      <div
        className="animate-drift absolute top-[24%] right-[8%] size-[38vmax] rounded-full bg-[#00d4ff]/22 blur-[100px]"
        style={{ animationDelay: '-16s' }}
      />

      {twinkles.map((t) => (
        <span
          key={t.id}
          className="animate-twinkle absolute rounded-full bg-white"
          style={{
            left: `${t.left}%`,
            top: `${t.top}%`,
            width: t.size,
            height: t.size,
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.duration}s`,
            boxShadow: '0 0 6px rgba(255,255,255,0.9)',
          }}
        />
      ))}
    </div>
  )
}
