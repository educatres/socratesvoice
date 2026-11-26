const LABELS = { idle: '待命', listening: '聆聽中', thinking: '思考中', speaking: '說話中', 'await-tap': '點一下繼續', error: '發生錯誤' }
export function createAvatar(stage, caption) {
  return { setState(state) { stage.dataset.state = state; caption.textContent = LABELS[state] || LABELS.idle } }
}

