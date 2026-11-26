import test from 'node:test'
import assert from 'node:assert/strict'
import { ConversationState, STATES } from '../js/state-machine.js'

test('state machine invalidates stale session callbacks', () => {
  const states = []
  const machine = new ConversationState((state) => states.push(state))
  const session = machine.beginSession()
  const turn = machine.nextTurn()
  assert.equal(machine.isCurrent(session, turn), true)
  machine.set(STATES.THINKING)
  machine.invalidate()
  assert.equal(machine.isCurrent(session, turn), false)
  machine.set(STATES.IDLE)
  assert.deepEqual(states, [STATES.THINKING, STATES.IDLE])
})

