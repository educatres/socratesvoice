export const STATES = Object.freeze({ IDLE: 'idle', LISTENING: 'listening', THINKING: 'thinking', SPEAKING: 'speaking', AWAIT_TAP: 'await-tap', ERROR: 'error' })

export class ConversationState {
  constructor(onChange) { this.state = STATES.IDLE; this.onChange = onChange; this.session = 0; this.turn = 0 }
  set(state, detail = '') { this.state = state; this.onChange?.(state, detail); return state }
  beginSession() { this.session += 1; this.turn = 0; return this.session }
  nextTurn() { this.turn += 1; return this.turn }
  invalidate() { this.session += 1; this.turn += 1 }
  isCurrent(session, turn) { return session === this.session && turn === this.turn }
}

