export function createRecognition({ lang, onInterim, onFinal, onError, onEnd, onStart }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) return null
  const recognition = new Recognition()
  recognition.lang = lang
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1
  recognition.onstart = () => onStart?.()
  recognition.onresult = (event) => {
    let interim = ''
    let final = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const text = event.results[index][0]?.transcript || ''
      if (event.results[index].isFinal) final += text
      else interim += text
    }
    if (interim) onInterim?.(interim)
    if (final.trim()) onFinal?.(final.trim())
  }
  recognition.onerror = (event) => onError?.(event.error || 'unknown')
  recognition.onend = () => onEnd?.()
  return recognition
}

export function recognitionSupported() { return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition) }

