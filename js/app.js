import { createAvatar } from './avatar.js'
import { defaultModel, generateReply, listModels, providerLabel } from './gemini-client.js'
import { PROVIDERS, clearStoredKey, hasConsent, loadSettings, providerFor, saveConsent, saveSettings, storedApiKey } from './settings.js'
import { ConversationState, STATES } from './state-machine.js'
import { createRecognition, recognitionSupported } from './speech-recognition.js'
import { createSpeaker } from './speech-synthesis.js'

const $ = (id) => document.getElementById(id)
const el = {
  settingsToggle: $('settings-toggle'), settingsPanel: $('settings-panel'), settingsClose: $('settings-close'), provider: $('provider-select'), key: $('api-key'), toggleKey: $('toggle-key'), clearKey: $('clear-key'), remember: $('remember-key'), base: $('base-url'), model: $('model-id'), reasoning: $('reasoning-effort'), providerHint: $('provider-hint'), keyHint: $('key-hint'), testProvider: $('test-provider'), testConnection: $('test-connection'), modelResults: $('model-results'),
  avatarStage: $('avatar-stage'), avatarCaption: $('avatar-caption'), statusDot: $('status-dot'), statusLabel: $('status-label'), statusDetail: $('status-detail'), interimLabel: $('interim-label'), interim: $('interim-text'), manual: $('manual-input'), sendManual: $('send-manual'), conversation: $('conversation-list'), start: $('start-button'), startLabel: $('start-label'), stop: $('stop-button'), stopSpeaking: $('stop-speaking'), retry: $('retry-button'), clearConversation: $('clear-conversation'), language: $('language'), voice: $('voice-select'), rate: $('speech-rate'), rateValue: $('rate-value'), mode: $('conversation-mode'), consent: $('consent'), consentAccept: $('consent-accept'),
}

const stateLabels = { idle: ['待命', '輸入 API Key 後，按一下開始說話。'], listening: ['聆聽中', '請說話；辨識完成後會送出這一輪內容。'], thinking: ['思考中', '正在將你的話交給模型，請稍候。'], speaking: ['說話中', 'AI 正在朗讀回覆；此時不會啟動麥克風。'], 'await-tap': ['點一下繼續', '自動續聽受到瀏覽器限制，請按開始說話。'], error: ['錯誤', '請檢查設定或重試。'] }
let settings = loadSettings()
let models = []
let messages = []
let pendingText = ''
let recognition = null
let recognitionEnded = false
let recognitionStarted = false
let recognitionWatchdog = 0
let activeAbort = null
let lastPrompt = ''
let autoListen = true
let consentNeeded = !hasConsent()
let voices = []
const MAX_INPUT_LENGTH = 2000

const avatar = createAvatar(el.avatarStage, el.avatarCaption)
const state = new ConversationState((next, detail) => {
  const [label, fallback] = stateLabels[next] || stateLabels.idle
  el.statusLabel.textContent = label
  el.statusDetail.textContent = detail || fallback
  el.avatarStage.dataset.state = next
  avatar.setState(next)
  el.statusDot.className = `status-dot status-${next}`
  const active = next !== STATES.IDLE && next !== STATES.AWAIT_TAP && next !== STATES.ERROR
  el.start.disabled = active && next !== STATES.LISTENING
  el.stop.disabled = !active
  el.startLabel.textContent = next === STATES.LISTENING ? '收音中…' : next === STATES.SPEAKING ? '朗讀中…' : '開始說話'
  if (next === STATES.ERROR) el.retry.hidden = false
  else if (next !== STATES.THINKING) el.retry.hidden = true
})

function config() { return { provider: settings.provider, apiKey: settings.apiKey, baseUrl: settings.baseUrl, modelId: settings.modelId, reasoningEffort: settings.reasoningEffort } }

function persist() { saveSettings(settings) }

function setStatusError(message) {
  state.set(STATES.ERROR, message)
  el.modelResults.textContent = message
}

function renderProviderOptions() {
  el.provider.replaceChildren(...PROVIDERS.map((provider) => { const option = document.createElement('option'); option.value = provider.id; option.textContent = provider.label; option.disabled = provider.disabled; return option }))
  el.provider.value = settings.provider
}

function updateSettingsForm() {
  const provider = providerFor(settings.provider)
  el.provider.value = settings.provider; el.key.value = settings.apiKey; el.remember.checked = settings.rememberKey; el.base.value = settings.baseUrl; el.model.value = settings.modelId; el.language.value = settings.language; el.voice.value = settings.voiceName; el.rate.value = settings.rate; el.rateValue.value = settings.rate; el.mode.value = settings.mode; el.reasoning.value = settings.reasoningEffort; el.providerHint.textContent = provider.hint
  el.keyHint.textContent = settings.provider === 'google' ? 'Google 原生 endpoint 會以 key query 傳送；OpenAI 相容 endpoint 使用 Authorization header。' : 'Key 僅用於目前瀏覽器工作階段，不會寫入 URL 或 console。'
  el.reasoning.closest('.field').hidden = settings.provider !== 'cgu'
}

function selectProvider(id) {
  const provider = providerFor(id)
  settings = { ...settings, provider: id, apiKey: storedApiKey(id), baseUrl: provider.defaultBaseUrl, modelId: defaultModel(id), reasoningEffort: id === 'cgu' ? 'medium' : settings.reasoningEffort }
  models = []; persist(); updateSettingsForm(); showModels('')
}

function showModels(message = '') {
  el.modelResults.replaceChildren()
  if (message) { const p = document.createElement('p'); p.textContent = message; el.modelResults.append(p) }
  if (!models.length) return
  const label = document.createElement('label'); label.className = 'field model-picker'; label.textContent = '可用模型'
  const select = document.createElement('select'); select.id = 'model-list'; models.forEach((model) => { const option = document.createElement('option'); option.value = model.id; option.textContent = `${model.displayName || model.id}（${model.id}）`; select.append(option) }); select.value = settings.modelId; select.addEventListener('change', () => { settings = { ...settings, modelId: select.value }; persist(); el.model.value = select.value })
  label.append(select); el.modelResults.append(label)
}

function populateVoices() {
  voices = window.speechSynthesis?.getVoices?.() || []
  const preferred = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(settings.language.toLowerCase().split('-')[0]))
  const ordered = [...preferred.filter((voice) => voice.lang.toLowerCase() === settings.language.toLowerCase()), ...preferred.filter((voice) => voice.lang.toLowerCase() !== settings.language.toLowerCase()), ...voices.filter((voice) => !preferred.includes(voice))]
  el.voice.replaceChildren()
  const system = document.createElement('option'); system.value = ''; system.textContent = '系統預設'; el.voice.append(system)
  ordered.forEach((voice) => { const option = document.createElement('option'); option.value = voice.name; option.textContent = `${voice.name}（${voice.lang}）`; el.voice.append(option) })
  el.voice.value = settings.voiceName
}

function getVoice() { return voices.find((voice) => voice.name === settings.voiceName) || null }
const speaker = createSpeaker({ getVoice, getRate: () => Number(settings.rate), getLang: () => settings.language, onStart: () => state.set(STATES.SPEAKING), onEnd: () => onSpeechEnd(), onError: () => { state.set(STATES.AWAIT_TAP, '朗讀遇到瀏覽器限制，仍可閱讀文字；請按開始說話。') } })

function onSpeechEnd() {
  if (state.state !== STATES.SPEAKING) return
  if (autoListen && document.visibilityState === 'visible' && recognitionSupported()) {
    window.setTimeout(() => { if (state.state === STATES.SPEAKING) beginListening(true) }, 350)
  } else state.set(STATES.AWAIT_TAP)
}

function renderConversation() {
  el.conversation.replaceChildren()
  for (const message of messages) {
    const article = document.createElement('article'); article.className = `message ${message.role}`
    const heading = document.createElement('span'); heading.className = 'message-role'; heading.textContent = message.role === 'user' ? '你' : '蘇格拉底'
    const text = document.createElement('p'); text.textContent = message.content
    article.append(heading, text); el.conversation.append(article)
  }
  el.conversation.scrollTop = el.conversation.scrollHeight
}

function resetRecognition() {
  window.clearTimeout(recognitionWatchdog)
  if (recognition) { try { recognition.abort() } catch { /* ignore */ } }
  recognition = null; recognitionStarted = false; recognitionEnded = false; pendingText = ''
}

function finishListening(session, turn) {
  if (!pendingText || !state.isCurrent(session, turn)) return
  const text = pendingText.trim().slice(0, MAX_INPUT_LENGTH); pendingText = ''
  el.interim.textContent = text; el.interimLabel.textContent = '辨識完成'
  window.setTimeout(() => submitText(text, session, turn), 0)
}

function beginListening(isAuto = false) {
  if (consentNeeded) { el.consent.hidden = false; return }
  if (!settings.apiKey.trim()) { openSettings(true); setStatusError('請先輸入 API Key，再開始語音對話。'); return }
  if (!recognitionSupported()) { state.set(STATES.AWAIT_TAP, '此瀏覽器不支援語音辨識，請在下方文字框輸入訊息。'); el.manual.focus(); return }
  speaker.stop(); autoListen = isAuto || el.mode.value !== 'general'
  state.beginSession(); const session = state.session; const turn = state.nextTurn(); resetRecognition(); recognitionEnded = false
  recognition = createRecognition({ lang: settings.language, onStart: () => { window.clearTimeout(recognitionWatchdog); recognitionStarted = true; state.set(STATES.LISTENING); el.interimLabel.textContent = '辨識中'; el.interim.textContent = '請說話…' }, onInterim: (text) => { el.interim.textContent = text; el.interimLabel.textContent = '辨識中' }, onFinal: (text) => { pendingText = `${pendingText} ${text}`.trim(); try { recognition?.stop() } catch { /* ignore */ } }, onError: (error) => { if (error === 'aborted') return; resetRecognition(); if (error === 'not-allowed' || error === 'service-not-allowed') setStatusError('麥克風權限被拒絕，請在 Safari 網站設定允許麥克風，或改用文字輸入。'); else setStatusError(`語音辨識失敗（${error}），可重試或改用文字輸入。`) }, onEnd: () => { window.clearTimeout(recognitionWatchdog); recognitionEnded = true; if (pendingText) finishListening(session, turn); else if (state.state === STATES.LISTENING && recognitionStarted) state.set(STATES.AWAIT_TAP, '沒有辨識到文字，請再試一次。') } })
  try { recognition.start() } catch { setStatusError('無法啟動麥克風，請重試或改用文字輸入。') }
  recognitionWatchdog = window.setTimeout(() => { if (!recognitionStarted && state.isCurrent(session, turn)) { resetRecognition(); state.set(STATES.AWAIT_TAP, '瀏覽器沒有啟動語音辨識，請再試一次或改用文字輸入。') } }, 8000)
}

function stopAll() { autoListen = false; state.invalidate(); resetRecognition(); activeAbort?.abort(); activeAbort = null; speaker.stop(); window.speechSynthesis?.cancel?.(); state.set(STATES.IDLE); el.interimLabel.textContent = '已停止'; el.interim.textContent = '按一下開始說話，或直接輸入文字。' }

async function submitText(text, session = state.session, turn = state.nextTurn()) {
  if (!text.trim() || !state.isCurrent(session, turn)) return
  if (!settings.apiKey.trim()) { openSettings(true); setStatusError('請先輸入 API Key。'); return }
  if (state.state === STATES.THINKING) return
  speaker.stop()
  const userMessage = { role: 'user', content: text.trim().slice(0, MAX_INPUT_LENGTH) }
  messages = [...messages, userMessage].slice(-20); renderConversation(); el.manual.value = ''; lastPrompt = text.trim(); state.set(STATES.THINKING); el.retry.hidden = true
  activeAbort = new AbortController()
  try {
    const reply = await generateReply(config(), messages, { language: settings.language, mode: settings.mode, signal: activeAbort.signal })
    if (!state.isCurrent(session, turn)) return
    messages = [...messages, { role: 'assistant', content: reply }].slice(-20); renderConversation(); state.set(STATES.SPEAKING); speaker.speak(reply)
  } catch (error) {
    if (!state.isCurrent(session, turn)) return
    const message = error instanceof Error ? error.message : '模型請求失敗。'
    setStatusError(message); el.retry.hidden = false
  } finally { activeAbort = null }
}

function retry() { if (lastPrompt) submitText(lastPrompt, state.session, state.nextTurn()) }

function openSettings(focus = false) { el.settingsPanel.hidden = false; el.settingsToggle.setAttribute('aria-expanded', 'true'); if (focus) el.key.focus() }
function closeSettings() { el.settingsPanel.hidden = true; el.settingsToggle.setAttribute('aria-expanded', 'false') }

async function testProvider() {
  settings = { ...settings, apiKey: el.key.value.trim(), baseUrl: el.base.value.trim(), modelId: el.model.value.trim() }; persist();
  if (!settings.apiKey) { showModels('請先輸入 API Key。'); return }
  el.testProvider.disabled = true; models = []; showModels('正在測試並讀取模型…')
  try { models = await listModels(config()); if (models.length && !models.some((item) => item.id === settings.modelId)) settings = { ...settings, modelId: models[0].id }; persist(); updateSettingsForm(); showModels(models.length ? `測試成功：已讀取 ${models.length} 個可用模型。` : '測試成功，但此 Provider 沒有回傳可列舉的模型；可手動輸入模型 ID。') }
  catch (error) { showModels(`Provider 測試失敗：${error instanceof Error ? error.message : String(error)}`) }
  finally { el.testProvider.disabled = false }
}

async function testConnection() {
  settings = { ...settings, apiKey: el.key.value.trim(), baseUrl: el.base.value.trim(), modelId: el.model.value.trim() }; persist()
  el.testConnection.disabled = true; models = []; showModels('正在測試模型連線…')
  try { const controller = new AbortController(); const reply = await generateReply(config(), [{ role: 'user', content: '請只回覆：連線成功。' }], { language: settings.language, mode: 'general', signal: controller.signal }); showModels(`連線成功：模型回覆「${reply.slice(0, 80)}${reply.length > 80 ? '…' : ''}」`) }
  catch (error) { showModels(`模型連線失敗：${error instanceof Error ? error.message : String(error)}`) }
  finally { el.testConnection.disabled = false }
}

function clearConversation() { messages = []; lastPrompt = ''; renderConversation(); el.interim.textContent = '對話已清除。'; el.interimLabel.textContent = '尚未開始'; stopAll() }

function setupEvents() {
  el.settingsToggle.addEventListener('click', () => el.settingsPanel.hidden ? openSettings() : closeSettings()); el.settingsClose.addEventListener('click', closeSettings)
  el.provider.addEventListener('change', (event) => selectProvider(event.target.value)); el.key.addEventListener('input', () => { settings = { ...settings, apiKey: el.key.value }; models = []; showModels(''); persist() }); el.toggleKey.addEventListener('click', () => { const visible = el.key.type === 'text'; el.key.type = visible ? 'password' : 'text'; el.toggleKey.textContent = visible ? '顯示' : '隱藏' }); el.clearKey.addEventListener('click', () => { clearStoredKey(settings.provider); settings = { ...settings, apiKey: '', rememberKey: false }; el.key.value = ''; el.remember.checked = false; persist(); showModels('已清除目前 Provider 的 API Key。') }); el.remember.addEventListener('change', () => { settings = { ...settings, rememberKey: el.remember.checked }; persist() }); el.base.addEventListener('change', () => { settings = { ...settings, baseUrl: el.base.value.trim() }; persist() }); el.model.addEventListener('input', () => { settings = { ...settings, modelId: el.model.value.trim() }; persist() }); el.reasoning.addEventListener('change', () => { settings = { ...settings, reasoningEffort: el.reasoning.value }; persist() }); el.testProvider.addEventListener('click', testProvider); el.testConnection.addEventListener('click', testConnection)
  el.language.addEventListener('change', () => { settings = { ...settings, language: el.language.value, voiceName: '' }; persist(); populateVoices() }); el.voice.addEventListener('change', () => { settings = { ...settings, voiceName: el.voice.value }; persist() }); el.rate.addEventListener('input', () => { settings = { ...settings, rate: Number(el.rate.value) }; el.rateValue.value = el.rate.value; persist() }); el.mode.addEventListener('change', () => { settings = { ...settings, mode: el.mode.value }; persist() })
  el.start.addEventListener('click', () => beginListening(false)); el.stop.addEventListener('click', stopAll); el.stopSpeaking.addEventListener('click', () => { speaker.stop(); state.set(STATES.AWAIT_TAP, '朗讀已停止；按開始說話繼續。') }); el.retry.addEventListener('click', retry); el.clearConversation.addEventListener('click', clearConversation); el.sendManual.addEventListener('click', () => { const value = el.manual.value.trim(); if (value) { state.beginSession(); submitText(value, state.session, state.nextTurn()) } }); el.manual.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') el.sendManual.click() })
  el.consentAccept.addEventListener('click', () => { saveConsent(); consentNeeded = false; el.consent.hidden = true; beginListening(false) }); window.speechSynthesis?.addEventListener?.('voiceschanged', populateVoices); document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible' && (state.state === STATES.LISTENING || state.state === STATES.SPEAKING || state.state === STATES.THINKING)) stopAll() })
}

renderProviderOptions(); updateSettingsForm(); populateVoices(); setupEvents(); state.set(STATES.IDLE)
if (!recognitionSupported()) el.statusDetail.textContent = '此瀏覽器不支援語音辨識，仍可使用下方文字輸入。'
if (consentNeeded) el.consent.hidden = false
if (!settings.apiKey) openSettings()

