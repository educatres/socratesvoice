const LABELS = { idle: '待命', listening: '聆聽中', thinking: '思考中', speaking: '說話中', 'await-tap': '點一下繼續', error: '發生錯誤' }
export function createAvatar(stage, caption) {
  let timer = 0
  let activeAction = ''
  const actions = [
    ['face-blink', 180], ['face-blink', 220], ['face-brow', 650],
    ['face-turn', 1150], ['face-mouth', 600], ['face-blink', 180],
  ]
  const schedule = () => {
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
    setState(state) { stage.dataset.state = state; caption.textContent = LABELS[state] || LABELS.idle },
    start() { if (!timer && !activeAction) schedule() },
    stop() { window.clearTimeout(timer); timer = 0; if (activeAction) stage.classList.remove(activeAction); activeAction = '' },
  }
}

