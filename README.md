# Socrates Voice AI｜蘇格拉底語音 AI

手機優先的純前端語音對話網站。使用者在瀏覽器輸入自己的 API Key，透過 Web Speech API 辨識語音、以 Google Gemini 或相容 Provider 產生回覆，再使用瀏覽器內建朗讀。

## 目前功能

- 半雙工狀態：待命、聆聽、思考、說話、手動續聽與錯誤復原。
- Web Speech API（`SpeechRecognition`／`webkitSpeechRecognition`）支援中文與英文；不支援時仍可手動輸入。
- `speechSynthesis` 聲音選擇、0.7–1.2 速度、停止朗讀與分句 watchdog 友善流程。
- 黑底 CSS 蘇格拉底人像動畫；沒有外部影片素材也能運作，`prefers-reduced-motion` 會降低動畫。
- 參考專案相同的 Provider 體驗：OpenAI、Grok（xAI）、Google AI Studio、CGU；每家可設定 API Key、Base URL、模型 ID，並測試 Key／讀取模型／測試生成。
- Google AI Studio 同時支援原生 Gemini `generateContent` 與 OpenAI 相容 `/chat/completions` endpoint。
- API 請求 45 秒逾時、AbortController 取消、429／401／403／404／5xx／CORS 可理解錯誤。
- 最近 10 輪對話（最多 20 則訊息）；蘇格拉底模式及一般對話模式。
- API Key 預設只在記憶體；只有使用者勾選保存時才寫入 `sessionStorage`，永不使用 `localStorage` 保存 Key。其他 UI 設定可保存在 localStorage。
- 首次使用的語音／資料外送告知；頁面離開前景會停止收音、朗讀與模型請求。

## 本機測試

需要 HTTPS 或 localhost 才能讓瀏覽器提供麥克風權限。可使用任一靜態伺服器，例如：

```bash
npx serve .
```

或以 Python：

```bash
python -m http.server 4173
```

接著開啟 `http://localhost:4173/`。靜態語法檢查與單元測試：

```bash
npm run check
npm test
```

## API Key 與 Provider

1. 在 Google AI Studio 的 API keys 頁面建立金鑰，或使用你有權限的 OpenAI／xAI／CGU 金鑰。
2. 在設定中選 Provider、貼上 Key，確認 Base URL 與模型 ID。
3. 按「測試 Key 並讀取模型」；若服務不支援列舉模型，可直接填入模型 ID，再按「測試模型連線」。
4. 需要跨重新整理保存時，明確勾選「在此瀏覽器保存此 Provider 的 Key」。此選項使用 `sessionStorage`，關閉分頁後通常會清除；不同 Provider 的 Key 分開保存。

Google AI Studio 預設使用 `gemini-flash-lite-latest`。原生 Google endpoint 使用 `x-goog-api-key` header；OpenAI 相容 endpoint 與其他 Provider 使用 `Authorization: Bearer`。瀏覽器是否允許某個自訂 endpoint 的 CORS，取決於該服務本身。CGU 的 Luna 模型依參考專案走 `/responses`，其他 CGU 模型走 `/chat/completions`。

## GitHub Pages

將此資料夾提交至 repository 的 `main` 分支，Settings → Pages → Deploy from a branch → `main`／`root`。所有 CSS、JS 與連結採相對路徑，適用 repository 子路徑。請勿提交真實 API Key。

## 隱私與限制

純前端無法完全保護瀏覽器中的秘密；請替 API Key 設定來源限制、配額與費用監控。語音辨識可能由 Apple／瀏覽器遠端服務處理；對話文字會送往你選定的模型服務。本專案不主動錄音、不使用追蹤器、不把 Key 寫入 URL、console、錯誤訊息或匯出資料。

iOS Safari 的麥克風權限、自動續聽、TTS voices、背景／鎖屏行為必須在實機驗證。規格要求的 10 輪連續對話、實際 Gemini 配額及各 Provider CORS 未在此環境宣稱已通過；若 Safari 拒絕自動重啟，介面會切換為「點一下繼續」。
