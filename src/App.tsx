import { useCallback, useEffect, useState } from 'react'
import { Backdrop } from './components/Backdrop'
import { Celebration } from './components/Celebration'
import { Favourites } from './components/Favourites'
import { GamePanel } from './components/GamePanel'
import { Header } from './components/Header'
import { HoverPill } from './components/HoverPill'
import { InfoCard } from './components/InfoCard'
import { LearningBar } from './components/LearningBar'
import { LoadingVeil } from './components/LoadingVeil'
import { GlobeScene } from './components/globe/GlobeScene'
import { useAtlas } from './store'

export default function App() {
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])

  useKeyboardShortcuts()

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden select-none">
      <Backdrop />

      <div className="absolute inset-0">
        <GlobeScene onReady={onReady} />
      </div>

      <Header />
      <GamePanel />
      <Favourites />
      <InfoCard />
      <HoverPill />
      <LearningBar />
      <Celebration />
      <LoadingVeil show={!ready} />
    </main>
  )
}

/** Escape closes the card — handy for grown-ups, invisible to children. */
function useKeyboardShortcuts() {
  const select = useAtlas((s) => s.select)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])
}
