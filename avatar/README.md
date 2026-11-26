# Socrates Voice AI：人物與白貓動畫素材包（Codex / GitHub Pages）

此素材包將先前的 **40 歲短髮女性** 與新增的 **白貓** 合併。每個角色皆有**一般現代模式**以及**希臘／蘇格拉底模式（頭戴金色麥穗）**，適合用於 iPhone Safari 上的 AI 語音聊天、蘇格拉底式提問助教。圖片是**純黑背景 `#000000`**，不是透明 PNG。

## 1. 素材總覽

| 角色 | 風格 | 代碼 | 待機 `idle` | 說話 `speaking` | 思考 `thinking` |
|---|---|---|---:|---:|---:|
| 約 40 歲短髮女性 | 一般模式 | `human` + `modern` | 11 | 11 | 11 |
| 約 40 歲短髮女性 | 麥穗／希臘模式 | `human` + `socrates` | 11 | 11 | 11 |
| 白貓 | 一般模式 | `cat` + `modern` | 11 | 11 | 11 |
| 白貓 | 麥穗／希臘模式 | `cat` + `socrates` | 11 | 11 | 11 |

合計 **132 個獨立動畫影格**，每個影格有 **PNG + WebP**，總共 **264 張靜態圖片**；另附 **12 段 GIF 預覽**。所有獨立影格皆為 **512 × 512 px、RGB、黑色背景**。獨立影格是從 AI 繪製的總覽圖分切及放大，並非原生 512px 精細繪圖。

## 2. 檔案結構

```text
avatar/
├── README.md                  ← 本說明
├── CODEX_IMPORT_PROMPT.md     ← 可直接貼給 Codex 的整合指令
├── manifest.json              ← 全部 132 影格的順序與播放時長
├── avatar-player.js           ← 直接可用的 ES module 動畫播放器
├── demo.html                  ← 人物/白貓、兩種模式、三種動作切換
├── overview.png               ← 原本人物動畫總覽
├── overview_cat.png           ← 新增白貓動畫總覽
├── overview_all.jpg           ← 兩組素材總覽
├── assets/
│   ├── modern/                ← 原有女性／一般（保留舊路徑）
│   │   ├── idle/              ← idle_01.png/.webp ～ idle_11
│   │   ├── speaking/
│   │   └── thinking/
│   ├── socrates/              ← 原有女性／麥穗（保留舊路徑）
│   │   ├── idle/
│   │   ├── speaking/
│   │   └── thinking/
│   └── cat/                   ← 新增白貓
│       ├── modern/
│       │   ├── idle/
│       │   ├── speaking/
│       │   └── thinking/
│       └── socrates/
│           ├── idle/
│           ├── speaking/
│           └── thinking/
└── previews/                 ← 12 段預覽 GIF
```

每組 `idle`、`speaking`、`thinking` 各有 `01`～`11` 影格，從左至右分切，依 `manifest.json` 的 `frames` 順序播放。圖片總覽圖本身的編號與間隔可能不一致，以 manifest / 檔名為準。

## 3. 如何匯入 GitHub Pages 專案

Vite、React 等專案：將此素材包**整個資料夾**重新命名成 `avatar`，放到專案的 `public/avatar/`。純 HTML 專案：放在專案根目錄的 `avatar/`。

```text
你的專案/
├── index.html
└── public/             # Vite/React 專案才有
    └── avatar/
        ├── manifest.json
        ├── avatar-player.js
        ├── demo.html
        └── assets/ ...
```

用開發伺服器測試，**不要雙擊 `demo.html` 用 `file://` 開啟**（瀏覽器可能封鎖 `fetch` 和 ES modules）。本機可執行 `python -m http.server 8000`，或使用 Vite 的 `npm run dev`。

部署至 `https://<username>.github.io/<repo>/` 後，預覽網址通常為 `https://<username>.github.io/<repo>/avatar/demo.html`。請依 GitHub Pages 的 repo base path 解析 `manifestUrl`，避免誤用 `/avatar/` 絕對路徑而漏掉 `<repo>`。

## 4. 程式整合：角色、模式、狀態

HTML：

```html
<img id="avatar" width="512" height="512"
     alt="AI 語音助教角色" style="background:#000;max-width:100%;height:auto">
```

JavaScript（下例假設主頁與 `avatar/` 目錄同層）：

```js
import { createAvatarPlayer } from './avatar/avatar-player.js';

const avatar = await createAvatarPlayer(document.querySelector('#avatar'), {
  manifestUrl: './avatar/manifest.json',
  character: 'human',  // 'human' 或 'cat'
  mode: 'modern',      // 'modern' 或 'socrates'
  state: 'idle',       // 'idle', 'thinking', 'speaking'
  format: 'webp',
});

// 角色切換，不影響目前一般/希臘模式：
avatar.setCharacter('cat');       // 白貓
avatar.setMode('socrates');       // 白貓戴麥穗
avatar.setState('thinking');      // 思考
avatar.setState('speaking');      // 嘴形變換
avatar.setState('idle');          // 恢復待機

// 或改回人物：
avatar.setCharacter('human');
avatar.setMode('modern');

console.log(avatar.getCharacter(), avatar.getMode(), avatar.getState());
```

**向下相容：** 舊版 `avatar.setMode('modern')` / `avatar.setMode('socrates')` 仍支援，預設角色 `human`。新增 `setCharacter('cat')` 後，`setMode()` 只負責外觀切換，不會自動切回人物；也可直接指定 `avatar.setMode('cat-socrates')`。

`manifest.json` 的 `states` 仍保留原本 `modern`、`socrates` 對應舊人物路徑；新增 `cat-modern` 和 `cat-socrates`。新的 `characters` 欄位負責將角色＋模式映射到內部 keys。`schemaVersion` 更新為 2。

## 5. 語音互動狀態與 iPhone Safari

```text
[頁面啟動／等待使用者] → idle（慢速眨眼、擺頭）
[STT 辨識結束，開始發送 LLM] → thinking（抬頭思考）
[TTS 真正開始播放] → speaking（嘴型循環）
[TTS 結束、取消、出錯] → idle
```

TTS 最小示例：

```js
const utterance = new SpeechSynthesisUtterance('你認為這個答案的理由是什麼？');
utterance.lang = 'zh-TW';
utterance.onstart = () => avatar.setState('speaking');
utterance.onend = () => avatar.setState('idle');
utterance.onerror = () => avatar.setState('idle');
speechSynthesis.speak(utterance);
```

iOS Safari 可能要求使用者先按下「開始對話」才能朗讀與辨識，亦可能限制播放完成後的自動續聽；請保留手動啟動麥克風備援。**建議採半雙工**：TTS 播放時暫停 STT，避免 AI 聽到自己說的話。上述播放器只控制圖片，不包含 STT、API Key、LLM 呼叫與 TTS 引擎。

## 6. 動畫速度、效能與限制

- 速度設定在 `manifest.json` 每一影格的 `durationMs`。待機 600–800ms 左右、眨眼 140ms 左右，說話約 140–190ms，思考約 600–750ms。可修改以調整表情節奏。
- **說話嘴形不是精確對嘴**。這些畫格僅模擬開／合嘴；若要逐音素同步，需另整合 TTS viseme 或 phoneme timing。
- 靜態影格並非骨架動畫，某些動作切換可能有輕微跳格；已統一黑背景與畫框，前端可再加極小幅 CSS `transform` 緩動，但不保證影片等級流暢。
- 優先使用 **WebP**，建議畫面顯示寬度約 220–300 CSS px；避免一次載入所有角色素材，切換到新角色時可預載該角色的影格。
- 在背景分頁停止計時，並尊重 `prefers-reduced-motion`（提供靜態第一幀）。
- `overview*.png/jpg` 與 `previews/*.gif` 僅為示意，正式介面用 `assets/**.webp` 與 `manifest.json` 播放。

## 7. 給 Codex 的開發工作

請直接使用本資料夾的 `CODEX_IMPORT_PROMPT.md`。整合完成後檢查：
1. 人物／白貓切換。
2. 一般／麥穗模式切換，且白貓在麥穗模式仍是白貓。
3. 各模式的 `idle`、`speaking`、`thinking` 自動循環。
4. WebP 影像成功載入，無文字編號／總覽圖分隔線殘留。
5. iPhone Safari 上的 TTS 狀態變更、手動續聽和 GitHub Pages repo 子路徑。

> 圖像與素材已產出並打包；這是 **動畫素材元件**，不是已串好 AI API 的整個語音產品。
