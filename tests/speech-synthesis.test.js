import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanSpeechText, createSpeaker, primeSpeechSynthesis, splitSpeech } from '../js/speech-synthesis.js'

test('speech text strips markdown and urls while preserving readable text', () => {
  assert.equal(cleanSpeechText('**你好**，請看 https://example.com。'), '你好，請看')
})

test('long speech is split at punctuation', () => {
  const chunks = splitSpeech('第一句。第二句！第三句？', 5)
  assert.equal(chunks.length, 3)
  assert.ok(chunks.every((chunk) => chunk.length <= 8))
})

test('speech queue can be primed and invoked through the browser synthesis API', () => {
  const oldWindow = globalThis.window
  const oldUtterance = globalThis.SpeechSynthesisUtterance
  const spoken = []
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text }
  }
  globalThis.window = {
    setTimeout,
    clearTimeout,
    speechSynthesis: {
      speak(utterance) { spoken.push(utterance) },
      cancel() {},
      resume() {},
    },
  }
  try {
    assert.equal(primeSpeechSynthesis('zh-TW'), true)
    const speaker = createSpeaker({ getVoice: () => null, getRate: () => 0.9, getLang: () => 'zh-TW' })
    speaker.speak('測試朗讀。')
    assert.equal(spoken.length, 2)
    assert.equal(spoken[0].volume, 0)
    assert.equal(spoken[1].volume, 1)
    speaker.stop()
  } finally {
    globalThis.window = oldWindow
    globalThis.SpeechSynthesisUtterance = oldUtterance
  }
})

