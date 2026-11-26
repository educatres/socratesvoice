export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', hint: '支援 OpenAI 相容的 /models 與 /chat/completions。', disabled: false },
  { id: 'xai', label: 'Grok（xAI）', defaultBaseUrl: 'https://api.x.ai/v1', hint: '以 xAI 的 OpenAI 相容 API 為基線。', disabled: false },
  { id: 'google', label: 'Google AI Studio', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', hint: '可使用 OpenAI 相容 endpoint；也支援 Gemini 原生 generateContent。', disabled: false },
  { id: 'cgu', label: 'CGU', defaultBaseUrl: 'https://air.cgu.edu.tw/cgullmapi/v1', hint: 'CGU API；請依服務契約確認 CORS 與可用模型。', disabled: false },
]

export const DEFAULTS = {
  google: 'gemini-flash-lite-latest',
  cgu: 'gpt-oss:20b',
}

const CONFIG_KEY = 'socrates-voice.config.v1'
const SESSION_KEYS = 'socrates-voice.api-keys.session.v1'
const CONSENT_KEY = 'socrates-voice.consent.v1'

function readJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch { return fallback }
}

export function providerFor(id) { return PROVIDERS.find((item) => item.id === id) || PROVIDERS[2] }

export function storedApiKey(providerId) {
  const keys = readJson(window.sessionStorage, SESSION_KEYS, {})
  return typeof keys[providerId] === 'string' ? keys[providerId] : ''
}

export function loadSettings() {
  const saved = readJson(window.localStorage, CONFIG_KEY, {})
  const id = PROVIDERS.some((provider) => provider.id === saved.provider) ? saved.provider : 'google'
  const provider = providerFor(id)
  const keys = readJson(window.sessionStorage, SESSION_KEYS, {})
  return {
    provider: id,
    apiKey: typeof keys[id] === 'string' ? keys[id] : '',
    baseUrl: typeof saved.baseUrl === 'string' && saved.baseUrl ? saved.baseUrl : provider.defaultBaseUrl,
    modelId: typeof saved.modelId === 'string' && saved.modelId ? saved.modelId : DEFAULTS[id] || '',
    rememberKey: saved.rememberKey === true,
    language: saved.language === 'en-US' ? 'en-US' : 'zh-TW',
    voiceName: typeof saved.voiceName === 'string' ? saved.voiceName : '',
    rate: Number.isFinite(saved.rate) ? Math.min(1.2, Math.max(0.7, saved.rate)) : 0.9,
    mode: saved.mode === 'general' ? 'general' : 'socratic',
    character: saved.character === 'cat' ? 'cat' : 'human',
    reasoningEffort: ['low', 'medium', 'high'].includes(saved.reasoningEffort) ? saved.reasoningEffort : 'medium',
  }
}

export function saveSettings(settings) {
  const safe = {
    provider: settings.provider, baseUrl: settings.baseUrl, modelId: settings.modelId,
    rememberKey: settings.rememberKey, language: settings.language, voiceName: settings.voiceName,
    rate: settings.rate, mode: settings.mode, character: settings.character, reasoningEffort: settings.reasoningEffort,
  }
  try { window.localStorage.setItem(CONFIG_KEY, JSON.stringify(safe)) } catch { /* private mode: memory only */ }
  try {
    const keys = readJson(window.sessionStorage, SESSION_KEYS, {})
    if (settings.rememberKey && settings.apiKey) keys[settings.provider] = settings.apiKey
    else delete keys[settings.provider]
    window.sessionStorage.setItem(SESSION_KEYS, JSON.stringify(keys))
  } catch { /* private mode: memory only */ }
}

export function clearStoredKey(providerId) {
  try {
    const keys = readJson(window.sessionStorage, SESSION_KEYS, {})
    delete keys[providerId]
    window.sessionStorage.setItem(SESSION_KEYS, JSON.stringify(keys))
  } catch { /* ignore storage errors */ }
}

export function hasConsent() {
  try { return window.localStorage.getItem(CONSENT_KEY) === 'yes' } catch { return false }
}

export function saveConsent() {
  try { window.localStorage.setItem(CONSENT_KEY, 'yes') } catch { /* ignore storage errors */ }
}

