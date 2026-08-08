/**
 * All the noises the atlas makes. Everything is generated in the browser, so
 * there are no audio files to download and nothing to wait for.
 */

let enabled = true
let ctx: AudioContext | null = null

export function setSoundEnabled(on: boolean) {
  enabled = on
  if (!on) window.speechSynthesis?.cancel()
}

function audio(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, length: number, gain: number, type: OscillatorType = 'sine') {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const vol = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + start)
  vol.gain.setValueAtTime(0.0001, ac.currentTime + start)
  vol.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02)
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + length)
  osc.connect(vol).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + length + 0.05)
}

export type Sfx = 'tap' | 'pop' | 'yay' | 'oops' | 'star' | 'whoosh'

export function sfx(kind: Sfx) {
  switch (kind) {
    case 'tap':
      tone(660, 0, 0.12, 0.09, 'triangle')
      break
    case 'pop':
      tone(880, 0, 0.09, 0.11, 'sine')
      tone(1320, 0.04, 0.09, 0.06, 'sine')
      break
    case 'yay':
      // A happy little major arpeggio.
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.28, 0.12, 'triangle'))
      break
    case 'oops':
      tone(320, 0, 0.16, 0.09, 'sine')
      tone(240, 0.12, 0.22, 0.08, 'sine')
      break
    case 'star':
      ;[1046.5, 1318.5, 1568].forEach((f, i) => tone(f, i * 0.06, 0.2, 0.08, 'sine'))
      break
    case 'whoosh':
      tone(300, 0, 0.3, 0.05, 'sine')
      tone(520, 0.06, 0.3, 0.04, 'sine')
      break
  }
}

/** Reads a sentence aloud in a warm, slightly slow voice. */
export function speak(text: string) {
  if (!enabled || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 0.88
  utter.pitch = 1.15
  utter.volume = 1

  const voices = window.speechSynthesis.getVoices()
  const nice =
    voices.find((v) => /samantha|karen|moira|tessa|google uk english female/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en') && /female/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en'))
  if (nice) {
    utter.voice = nice
    utter.lang = nice.lang
  }
  window.speechSynthesis.speak(utter)
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
}
