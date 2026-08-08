/**
 * All the noises the atlas makes. Everything is generated in the browser, so
 * there are no audio files to download and nothing to wait for.
 */

let enabled = true
let ctx: AudioContext | null = null
let master: GainNode | null = null

export function setSoundEnabled(on: boolean) {
  enabled = on
  if (!on) stopSpeaking()
}

function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state !== 'running') void ctx.resume()
  return ctx
}

/**
 * Browsers park an AudioContext until the page has been interacted with, and a
 * backgrounded tab can park it again later. Waking it on every pointer press
 * costs nothing and means the first tap is never the silent one.
 */
if (typeof window !== 'undefined') {
  const wake = () => {
    if (enabled) ensureContext()
  }
  window.addEventListener('pointerdown', wake, { capture: true, passive: true })
  window.addEventListener('keydown', wake, { capture: true, passive: true })
}

function tone(freq: number, start: number, length: number, gain: number, type: OscillatorType = 'sine') {
  const ac = ensureContext()
  if (!ac || !master) return

  // A short lead-in: scheduling exactly at currentTime can land in the past by
  // the time the audio thread sees it, which drops the note.
  const at = ac.currentTime + 0.03 + start

  const osc = ac.createOscillator()
  const vol = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  vol.gain.setValueAtTime(0.0001, at)
  vol.gain.exponentialRampToValueAtTime(gain, at + 0.02)
  vol.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(vol).connect(master)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

export type Sfx = 'tap' | 'pop' | 'yay' | 'oops' | 'star' | 'whoosh'

export function sfx(kind: Sfx) {
  if (!enabled) return
  switch (kind) {
    case 'tap':
      tone(660, 0, 0.12, 0.18, 'triangle')
      break
    case 'pop':
      tone(880, 0, 0.09, 0.22, 'sine')
      tone(1320, 0.04, 0.09, 0.12, 'sine')
      break
    case 'yay':
      // A happy little major arpeggio.
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.28, 0.22, 'triangle'))
      break
    case 'oops':
      tone(320, 0, 0.16, 0.18, 'sine')
      tone(240, 0.12, 0.22, 0.16, 'sine')
      break
    case 'star':
      ;[1046.5, 1318.5, 1568].forEach((f, i) => tone(f, i * 0.06, 0.2, 0.16, 'sine'))
      break
    case 'whoosh':
      tone(300, 0, 0.3, 0.1, 'sine')
      tone(520, 0.06, 0.3, 0.08, 'sine')
      break
  }
}

// ── Narration ─────────────────────────────────────────────────────────────

let voices: SpeechSynthesisVoice[] = []

function refreshVoices() {
  voices = window.speechSynthesis?.getVoices() ?? []
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) refreshVoices()
  return (
    voices.find((v) => /samantha|karen|moira|tessa|google uk english female/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en') && /female/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en'))
  )
}

/**
 * Chrome drops an utterance on the floor if the object is garbage collected
 * mid-sentence, so the one in flight is held here until it finishes.
 */
let speaking: SpeechSynthesisUtterance | null = null
let settleTimer = 0

/** Reads a sentence aloud in a warm, slightly slow voice. */
export function speak(text: string) {
  const synth = window.speechSynthesis
  if (!enabled || !synth) return

  window.clearTimeout(settleTimer)

  const utter = () => {
    const line = new SpeechSynthesisUtterance(text)
    line.rate = 0.88
    line.pitch = 1.15
    line.volume = 1
    const voice = pickVoice()
    if (voice) {
      line.voice = voice
      line.lang = voice.lang
    } else {
      line.lang = 'en-US'
    }
    line.onend = () => {
      if (speaking === line) speaking = null
    }
    line.onerror = () => {
      if (speaking === line) speaking = null
    }
    speaking = line
    synth.speak(line)
  }

  // Chrome wedges its speech queue if you cancel and speak in the same tick:
  // `speaking` stays true forever and nothing is heard again. Cancel, then wait
  // for the engine to actually settle before queueing the next line — and give
  // up waiting after a beat so a stuck engine cannot mute the app for good.
  if (synth.speaking || synth.pending) {
    synth.cancel()
    speaking = null
    let waited = 0
    const settle = () => {
      if ((!synth.speaking && !synth.pending) || waited > 600) {
        utter()
        return
      }
      waited += 50
      settleTimer = window.setTimeout(settle, 50)
    }
    settleTimer = window.setTimeout(settle, 50)
  } else {
    utter()
  }
}

export function stopSpeaking() {
  window.clearTimeout(settleTimer)
  speaking = null
  window.speechSynthesis?.cancel()
}
