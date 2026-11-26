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
    const voice = getVoice()
    if (voice) utterance.voice = voice
    utterance.onstart = () => { if (currentRun === runId && index === 0) onStart?.() }
    utterance.onend = () => { if (currentRun !== runId) return; index += 1; speakNext(currentRun) }
    utterance.onerror = (event) => { if (currentRun === runId) onError?.(event.error || 'speech-error') }
    window.speechSynthesis.speak(utterance)
  }
  return {
    speak(text) { runId += 1; const currentRun = runId; stopped = false; queue = splitSpeech(text); index = 0; if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') { onError?.('unsupported'); return } window.clearTimeout(watchdog); watchdog = window.setTimeout(() => { if (currentRun === runId) { stopped = true; window.speechSynthesis.cancel(); onError?.('speech-timeout') } }, Math.max(12000, queue.join('').length * 220)); if (queue.length) speakNext(currentRun); else onEnd?.() },
    stop() { runId += 1; stopped = true; queue = []; index = 0; window.clearTimeout(watchdog); window.speechSynthesis?.cancel?.() },
  }
}

