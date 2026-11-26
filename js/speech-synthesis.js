export function cleanSpeechText(value) {
  return String(value || '').replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '').replace(/[*_#>`~]/g, '').replace(/\s+/g, ' ').trim()
}

export function splitSpeech(value, maxLength = 180) {
  const text = cleanSpeechText(value)
  if (!text) return []
  const sentences = text.match(/[^。！？!?；;，,]+[。！？!?；;，,]?/g) || [text]
  const chunks = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) { chunks.push(current.trim()); current = '' }
    current += sentence
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function speechSynthesisSupported() {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== 'undefined'
}

/**
 * iOS Safari may ignore the first speech request if it happens after an async
 * fetch. Calling this from a user gesture unlocks the speech queue. The
 * The zero-volume utterance is intentionally silent. It must remain in the
 * queue until the real response is queued; cancelling it removes Safari's
 * user-gesture unlock and makes the later response silently fail.
 */
export function primeSpeechSynthesis(lang = 'zh-TW') {
  if (!speechSynthesisSupported()) return false
  const synthesis = window.speechSynthesis
  try {
    synthesis.resume?.()
    const unlock = new SpeechSynthesisUtterance(' ')
    unlock.lang = lang
    unlock.volume = 0
    unlock.rate = 10
    synthesis.speak(unlock)
    return true
  } catch {
    return false
  }
}

export function createSpeaker({ getVoice, getRate, getLang, onStart, onEnd, onError }) {
  let stopped = false
  let queue = []
  let index = 0
  let runId = 0
  let watchdog = 0
  const speakNext = (currentRun) => {
    if (stopped || currentRun !== runId) return
    if (index >= queue.length) { window.clearTimeout(watchdog); onEnd?.(); return }
    const utterance = new SpeechSynthesisUtterance(queue[index])
    utterance.lang = getLang()
    utterance.rate = getRate()
    utterance.volume = 1
    const voice = getVoice()
    if (voice) utterance.voice = voice
    utterance.onstart = () => { if (currentRun === runId && index === 0) onStart?.() }
    utterance.onend = () => { if (currentRun !== runId) return; index += 1; speakNext(currentRun) }
    utterance.onerror = (event) => { if (currentRun === runId) onError?.(event.error || 'speech-error') }
    window.speechSynthesis.speak(utterance)
  }
  return {
    speak(text) { runId += 1; const currentRun = runId; stopped = false; queue = splitSpeech(text); index = 0; if (!speechSynthesisSupported()) { onError?.('unsupported'); return } window.speechSynthesis.resume?.(); window.clearTimeout(watchdog); watchdog = window.setTimeout(() => { if (currentRun === runId) { stopped = true; window.speechSynthesis.cancel(); onError?.('speech-timeout') } }, Math.max(12000, queue.join('').length * 220)); if (queue.length) speakNext(currentRun); else onEnd?.() },
    stop() { runId += 1; stopped = true; queue = []; index = 0; window.clearTimeout(watchdog); window.speechSynthesis?.cancel?.() },
  }
}

