const LABELS = { idle: '待命', listening: '聆聽中', thinking: '思考中', speaking: '說話中', 'await-tap': '點一下繼續', error: '發生錯誤' }
export function createAvatar(stage, caption) {
  let timer = 0
  let activeAction = ''
  let player = null
  let currentVariant = 'socrates'
  let currentCharacter = 'human'
  let currentState = 'idle'
  const actions = [
    ['face-blink', 180], ['face-blink', 220], ['face-brow', 650],
    ['face-turn', 1150], ['face-mouth', 600], ['face-blink', 180],
  ]
  const schedule = () => {
    if (player) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const [className, duration] = actions[Math.floor(Math.random() * actions.length)]
    const delay = 1800 + Math.floor(Math.random() * 6200)
    timer = window.setTimeout(() => {
      timer = 0
      activeAction = className
      stage.classList.add(className)
      window.setTimeout(() => {
        stage.classList.remove(className)
        activeAction = ''
        schedule()
      }, duration)
    }, delay)
  }
  return {
    setPlayer(nextPlayer) {
      player = nextPlayer
      player.setCharacter?.(currentCharacter)
      if (currentVariant) player.setMode(currentVariant === 'general' ? 'modern' : 'socrates')
      player.setState(currentState)
      window.clearTimeout(timer)
      timer = 0
      activeAction = ''
      stage.classList.remove('face-blink', 'face-brow', 'face-turn', 'face-mouth')
    },
    setState(state) {
      currentState = state === 'thinking' || state === 'speaking' ? state : 'idle'
      stage.dataset.state = state
      caption.textContent = LABELS[state] || LABELS.idle
      player?.setState(currentState)
    },
    setVariant(variant) {
      const general = variant === 'general'
      currentVariant = general ? 'general' : 'socratic'
      stage.dataset.variant = general ? 'general' : 'socratic'
      stage.querySelector('.socrates')?.setAttribute('aria-label', general ? '黑白現代風格女性 AI 頭像' : '希臘風格女性蘇格拉底式 AI 頭像')
      player?.setMode(currentVariant === 'general' ? 'modern' : 'socrates')
    },
    setCharacter(character) {
      currentCharacter = character === 'cat' ? 'cat' : 'human'
      stage.dataset.character = currentCharacter
      const label = currentCharacter === 'cat' ? '白貓' : '女性'
      stage.querySelector('.socrates')?.setAttribute('aria-label', `${label} AI 頭像`)
      player?.setCharacter?.(currentCharacter)
    },
    start() { if (!timer && !activeAction) schedule() },
    stop() { window.clearTimeout(timer); timer = 0; if (activeAction) stage.classList.remove(activeAction); activeAction = '' },
  }
}

