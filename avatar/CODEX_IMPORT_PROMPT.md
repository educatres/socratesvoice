# Codex 整合任務：Socrates Voice AI 虛擬角色人物＋白貓

請先讀取 `avatar/README.md`、`avatar/manifest.json`、`avatar/avatar-player.js`，將整個 `avatar/` 素材目錄整合至現有的 **GitHub Pages 語音 AI 網頁**。請實際修改程式、測試並完成整合，不要只給開發建議。

## 必須完成的功能

1. 新增「角色」選擇器：**短髮女性（約 40 歲）**、**白貓**。
2. 保留「外觀模式」選擇器：**一般模式**、**希臘／蘇格拉底模式（金色麥穗頭冠）**。
3. 無論選擇人物或白貓，均能在兩種外觀之間切換；切換角色不應重設原本的外觀與對話模式。
4. 保留原有 API Key 使用與文字聊天／語音處理功能，不得因素材變更影響本來的 STT、LLM、TTS 流程。
5. 每種角色與外觀都有以下動畫：`idle`（待機眨眼與微擺）、`thinking`（LLM 回覆前思考）、`speaking`（TTS 發聲時嘴形變動）。
6. 於 TTS 的 `onstart`、`onend`、`onerror` 事件切換 `speaking`／`idle`；如果語音被取消或失敗，也要回待機。等待 LLM 時切成 `thinking`。
7. 優先載入 WebP 影格，根據 `manifest.json` 播放，不能把 overview 或 GIF 預覽當成正式狀態動畫。
8. 使用響應式版面，在 iPhone Safari 正常顯示，背景 `#000000`；切換角色／模式／狀態時不閃白。
9. 保留 GitHub Pages 的 repo base path 正確性；不要把 `manifestUrl` 寫死成根網址 `/avatar/manifest.json`。
10. 尊重 `prefers-reduced-motion`，並維持語音「先聽，再說」的半雙工控制以及手動續聽備援。
11. 請檢查 2 角色 × 2 外觀 × 3 狀態共 **12 組**動畫，每組 11 張，檔案全部可載入，不能有編號／水平分隔線殘留。

## 播放 API

```js
const avatar = await createAvatarPlayer(imgElement, {
  manifestUrl: './avatar/manifest.json',
  character: 'human',
  mode: 'modern',
  state: 'idle',
  format: 'webp'
});

avatar.setCharacter('cat');
avatar.setMode('socrates');
avatar.setState('thinking');
avatar.setState('speaking');
avatar.setState('idle');
```

請確認原本人物專用的 `setMode('modern'|'socrates')` 呼叫仍能運作。`manifest.json` 為 schemaVersion 2，`states` keys 為 `modern`、`socrates`、`cat-modern`、`cat-socrates`。

## 驗收

- 四種角色外觀組合都能動態切換，且動畫持續播放。
- TTS 開始時畫面有明顯張嘴、閉嘴的循環，TTS 停止則恢復待機。
- `demo.html` 的三個操作群組可正常切換所有組合。
- 能於 GitHub Pages 發布後以 HTTPS 正常開啟，網頁在 iPhone Safari 可用；若 SpeechRecognition 不受支援，提供文字輸入備援而不是讓網頁壞掉。
