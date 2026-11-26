import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanSpeechText, splitSpeech } from '../js/speech-synthesis.js'

test('speech text strips markdown and urls while preserving readable text', () => {
  assert.equal(cleanSpeechText('**你好**，請看 https://example.com。'), '你好，請看')
})

test('long speech is split at punctuation', () => {
  const chunks = splitSpeech('第一句。第二句！第三句？', 5)
  assert.equal(chunks.length, 3)
  assert.ok(chunks.every((chunk) => chunk.length <= 8))
})

