# Socrates Voice Avatar：角色動畫素材包

本素材包可直接複製到 **GitHub Pages / Codex** 專案。由同一張總覽圖切出現代卡通風格的 40 歲左右女性短髮角色，背景為純黑色 `#000000`。角色分為不戴頭飾的「一般模式」與戴金色麥穗頭冠的「蘇格拉底模式」。

## 一、交付內容

- `overview.png`：原始總覽圖，方便查看所有表情與姿勢。
- `assets/modern/{idle,speaking,thinking}/*.png`：一般模式的獨立 PNG 影格。
- `assets/socrates/{idle,speaking,thinking}/*.png`：蘇格拉底模式的獨立 PNG 影格。
- 每張 PNG 都有同名 `.webp`，可優先用於手機網頁以節省流量。
- `manifest.json`：兩種模式、三種狀態、影格順序、單張停留時間與相對檔案路徑。
- `avatar-player.js`：無框架依賴的影格播放工具（ES module）。
- `demo.html`：可切換模式、待機、說話、思考的預覽頁。
- `previews/*.gif`：六個連續播放的預覽動畫；正式專案建議使用 WebP 影格而非 GIF，才能靈活切換動作狀態。

### 數量與影像規格

| 模式 | 狀態 | 張數 | 檔名 |
|---|---|---:|---|
| 一般 `modern` | 待機 `idle` | 11 | `idle_01`～`idle_11` |
| 一般 `modern` | 說話 `speaking` | 11 | `speaking_01`～`speaking_11` |
| 一般 `modern` | 思考 `thinking` | 11 | `thinking_01`～`thinking_11` |
| 蘇格拉底 `socrates` | 待機 `idle` | 11 | `idle_01`～`idle_11` |
| 蘇格拉底 `socrates` | 說話 `speaking` | 11 | `speaking_01`～`speaking_11` |
| 蘇格拉底 `socrates` | 思考 `thinking` | 11 | `thinking_01`～`thinking_11` |

**共 66 個影格**，每個影格均有 PNG 和 WebP 版本（共 132 個靜態圖檔）。尺寸都是 **256 × 256 pixels**，RGB、黑色背景，不具透明度。由原總覽圖裁切後放大，不代表原生 256px 高解析繪製。依原圖從左至右重新編號，因原總覽圖原本存在跳號，請以檔名／manifest 順序為準。

## 二、直接放入 Codex 專案

建議將整個資料夾放入 GitHub Pages 專案的 `public/avatar/`（例如使用 Vite、React）或純靜態專案根目錄的 `avatar/`。

```text
public/
└── avatar/
    ├── README.md
    ├── overview.png
    ├── manifest.json
    ├── avatar-player.js
    ├── demo.html
    ├── assets/
    │   ├── modern/
    │   │   ├── idle/idle_01.webp ... idle_11.webp
    │   │   ├── speaking/speaking_01.webp ... speaking_11.webp
    │   │   └── thinking/thinking_01.webp ... thinking_11.webp
    │   └── socrates/
    │       ├── idle/idle_01.webp ... idle_11.webp
    │       ├── speaking/speaking_01.webp ... speaking_11.webp
    │       └── thinking/thinking_01.webp ... thinking_11.webp
    └── previews/
        └── ...
```

若專案是純 HTML，將整個 `avatar/` 放在專案根目錄，在瀏覽器開啟 `https://<username>.github.io/<repository>/avatar/demo.html` 即可預覽。若以本機測試，使用 `python -m http.server 8000` 等本機伺服器，不要直接以 `file://` 開啟；瀏覽器可能阻擋 ES module 與 JSON 請求。

## 三、播放控制與狀態機

- `idle`：AI 等待使用者、聆聽時；包含慢速頭部微擺與眨眼。
- `thinking`：已取得語音辨識文字，正在等待 LLM API 回覆；呈現思考、仰望、提問姿態。
- `speaking`：TTS 正在朗讀 AI 回覆；循環切換不同嘴形。

建議語音流程：

```text
[開啟頁面] -> idle (等待/聆聽)
[STT 完成辨識] -> thinking (向 LLM API 發送文字)
[取得 LLM 回覆並開始 TTS 播放] -> speaking
[TTS 播放結束/取消/錯誤] -> idle
```

系統不應在 TTS 發聲時再啟動 STT，避免辨識到手機揚聲器的聲音（半雙工）。iPhone Safari 對瀏覽器 SpeechRecognition / speechSynthesis 的支援與自動續聽行為可能受版本、權限、使用者互動及系統限制影響；保留「點擊麥克風繼續」備援。

### 播放速度

`manifest.json` 的每張影格附 `durationMs`，這些是近似動畫節奏，不是唇形音素時間碼。`idle` 和 `thinking` 刻意放慢，`speaking` 約每 140–190 毫秒換一次影格。若效果過快／過慢，調整 `durationMs`。動畫工具每一輪回到第一張，因此個別轉頭姿態不一定完美銜接；可用 CSS `transform: rotate()` 與 `translateY()` 做細緻緩動。

## 四、最小整合範例（原生 JavaScript）

HTML：

```html
<img id="avatar" width="256" height="256" alt="AI 語音助教" style="background:#000;max-width:100%;" />
```

JavaScript（假設內容放在 `/avatar/`，請按自己專案的 GitHub Pages 子路徑調整）：

```js
import { createAvatarPlayer } from './avatar/avatar-player.js';
const avatar = await createAvatarPlayer(document.querySelector('#avatar'), {
  manifestUrl: './avatar/manifest.json',
  mode: 'modern',
  state: 'idle',
  format: 'webp'
});

avatar.setMode('socrates'); // 切換成麥穗花冠
avatar.setState('thinking'); // LLM 回覆之前

const u = new SpeechSynthesisUtterance('你認為這個答案的理由是什麼？');
u.lang = 'zh-TW';
u.onstart = () => avatar.setState('speaking');
u.onend = () => avatar.setState('idle');
u.onerror = () => avatar.setState('idle');
speechSynthesis.speak(u); // iOS 可能要求使用者先點擊按鈕等互動
```

以上是整合示意，**不是可直接工作的完整 STT／LLM／TTS 對話產品**。如果 `avatar-player.js` 在 `avatar` 目錄，用相對路徑載入模組和清單。請確保程式碼中 `manifestUrl` 是相對網頁所在位置可正確解析的網址（GitHub Pages 專案通常有 repository 子路徑）。

## 五、給 Codex 的開發任務

> 請整合 `avatar/` 動畫素材到目前的 GitHub Pages 語音聊天專案，閱讀 `avatar/README.md` 和 `avatar/manifest.json`。使用 `avatar-player.js` 或重寫同等狀態機，支援一般與蘇格拉底模式切換；待機時播放 idle、LLM 回覆等待時播放 thinking、TTS 開始播放時切換 speaking，結束／取消／錯誤時切回 idle。預設使用 WebP 靜態影格，不要把 overview.png 當成動畫。保留 iPhone Safari 的語音權限／播放限制應對與手動續聽備援。測試 GitHub Pages repo 子路徑、圖片載入、模式切換、TTS 事件、手機版響應式版面與 prefers-reduced-motion。若需進一步嘴形同步，根據 TTS 的實際播放時間選擇嘴形，但不要宣稱這套素材已有精確的音素對嘴。

## 六、限制與後續改良

1. **不是動作捕捉／骨架動畫**：此包由一張 AI 生成的圖拆成靜態影格，部分角度與五官位置略有差異，連續播放時仍可能有跳動。可調慢速度並搭配 CSS 微幅擺動，但不能保證影片級流暢度。
2. **唇形只模擬說話**：不同張嘴幅度可在 TTS 期間循環，但不代表逐字、逐音節同步。要做到精準 lip-sync，需有 TTS 音素／時間戳或改用具備嘴形控制的分層角色圖。
3. **尺寸解析度有限**：獨立影格來自原始 1536×1024 的總覽圖，每張角色在原圖中的高度僅約 100 多像素。輸出成 256×256 是放大後便於網頁使用，放大到 4K 不會更清晰。
4. **背景為純黑**：圖片不是透明背景；如果要改成透明或任意背景，需要重新產生／進一步摳圖。
5. **手機效能**：優先 WebP、預載當前狀態與下一狀態；頁面隱藏時停止或減少動畫更新；尊重使用者的減少動態效果設定。

---

素材包以現有總覽圖分切建立；圖片人物是可愛的約 40 歲短髮女性現代卡通形象，兩種模式角色視覺一致、頭冠不同。
