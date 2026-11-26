import { DEFAULTS, PROVIDERS, providerFor } from './settings.js'

const DEFAULT_SYSTEM = '你是一位蘇格拉底式 AI 家教。以使用者選定的語言回覆，預設使用台灣繁體中文。透過引導式問題幫助使用者釐清概念、假設、證據及推理，不急於提供完整答案。每次先簡短回應使用者的想法，再提出一個清楚且具體的問題。語氣自然，適合口語朗讀，每次原則上 50 至 150 個中文字，避免 Markdown、網址及冗長條列。若使用者要求直接解釋，應提供適當說明，不必強制反問。不確定時明確承認，不捏造資訊。'
const CGU_ALLOWED_MODEL_IDS = ['gemma-4-26b-a4b-it', 'gpt-oss:20b', 'gpt-oss-120b']

function cleanBaseUrl(url) { return String(url || '').trim().replace(/\/+$/, '') }
function googleNative(url) { return /generativelanguage\.googleapis\.com\/v1(beta|alpha)?$/i.test(cleanBaseUrl(url)) }
function authHeaders(key) {
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  return headers
}

function errorMessage(status, body) {
  const message = body?.error?.message || body?.message || body?.raw || ''
  if (status === 401 || status === 403) return `認證失敗（${status}）：請確認 API Key、權限與限制設定。`
  if (status === 404) return `找不到模型或 endpoint（404）：請檢查模型 ID 與 Base URL。`
  if (status === 429) return '已達配額或頻率限制（429）；請稍後再試或檢查服務配額。'
  if (status >= 500) return `模型服務暫時錯誤（${status}）；請稍後手動重試。`
  if (message && /api.?key|credential|authorization/i.test(message)) return `API Key 或權限錯誤（${status}）。`
  return message ? `API 錯誤（${status}）：${message.slice(0, 240)}` : `API 請求失敗（${status}）。`
}

export async function requestJson(url, init, { signal, timeoutMs = 45000 } = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    let body = {}
    try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }
    if (!response.ok) throw new Error(errorMessage(response.status, body))
    return body
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(signal?.aborted ? '已取消模型請求。' : '模型請求逾時（45 秒），請稍後再試。')
    if (error instanceof TypeError) throw new Error('無法連線到模型 API；請檢查網路、Base URL 與服務是否允許此網站的 CORS。')
    throw error
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export async function listModels(config, options = {}) {
  if (!config.apiKey.trim()) throw new Error('請先輸入 API Key。')
  const base = cleanBaseUrl(config.baseUrl || providerFor(config.provider).defaultBaseUrl)
  if (config.provider === 'google' && googleNative(base)) {
    const body = await requestJson(`${base}/models`, { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey } }, options)
    return (body.models || []).filter((item) => (item.supportedGenerationMethods || []).includes('generateContent')).map((item) => ({ id: String(item.name || '').replace(/^models\//, ''), displayName: item.displayName || item.name }))
  }
  const body = await requestJson(`${base}/models`, { headers: authHeaders(config.apiKey) }, options)
  const rows = Array.isArray(body) ? body : body.data || body.models || []
  const models = rows.map((item) => ({ id: String(item.id || item.name || '').replace(/^models\//, ''), displayName: item.displayName || item.name || item.id })).filter((item) => item.id)
  return config.provider === 'cgu' ? models.filter((item) => CGU_ALLOWED_MODEL_IDS.includes(item.id.toLowerCase())) : models
}

function conversationBody(config, messages, system) {
  const base = cleanBaseUrl(config.baseUrl || providerFor(config.provider).defaultBaseUrl)
  if (config.provider === 'google' && googleNative(base)) {
    const contents = messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }))
    return { url: `${base}/models/${encodeURIComponent(config.modelId)}:generateContent`, init: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 512, temperature: 0.6 } }), native: true } }
  }
  if (config.provider === 'cgu' && /luna/i.test(config.modelId)) {
    return { url: `${base}/responses`, init: { method: 'POST', headers: authHeaders(config.apiKey), body: JSON.stringify({ model: config.modelId, input: messages.at(-1)?.content || '', instructions: system, max_output_tokens: 512, reasoning: { effort: config.reasoningEffort || 'medium' } }) }, responses: true, native: false }
  }
  const all = system ? [{ role: 'system', content: system }, ...messages] : messages
  return { url: `${base}/chat/completions`, init: { method: 'POST', headers: authHeaders(config.apiKey), body: JSON.stringify({ model: config.modelId, messages: all, temperature: 0.6, max_tokens: 512 }) }, native: false }
}

export async function generateReply(config, messages, { language = 'zh-TW', mode = 'socratic', signal } = {}) {
  if (!config.apiKey.trim()) throw new Error('請先輸入 API Key。')
  if (!config.modelId.trim()) throw new Error('請先設定模型 ID。')
  const languageRule = language === 'en-US' ? '使用英文回覆。' : '使用台灣繁體中文回覆。'
  const modeRule = mode === 'general' ? '目前是一般對話模式，適當回答使用者，不必每次反問。' : '目前是蘇格拉底模式：先簡短回應，再提出一個具體引導問題。'
  const system = `${DEFAULT_SYSTEM}\n${languageRule}\n${modeRule}`
  const request = conversationBody(config, messages, system)
  const body = await requestJson(request.url, request.init, { signal })
  const text = request.native ? (body.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('') : request.responses ? (typeof body.output_text === 'string' ? body.output_text : (body.output || []).flatMap((item) => item.content || []).map((part) => part.text || '').join('')) : body.choices?.[0]?.message?.content || ''
  if (!text.trim()) {
    const reason = body.candidates?.[0]?.finishReason
    throw new Error(reason ? `模型沒有產生可朗讀的文字（${reason}）。` : '模型已回應，但沒有可讀取的文字內容。')
  }
  return text.trim()
}

export function defaultModel(provider) { return DEFAULTS[provider] || '' }
export function providerLabel(provider) { return PROVIDERS.find((item) => item.id === provider)?.label || provider }

