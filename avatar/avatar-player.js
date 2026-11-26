/**
 * Zero-dependency sprite player for GitHub Pages.
 * 2 characters (human/cat), 2 appearance modes (modern/socrates), 3 animation states.
 * The original human-only API avatar.setMode('socrates') remains supported.
 */
export async function createAvatarPlayer(img, {
  manifestUrl = './manifest.json',
  character = 'human',
  mode = 'modern',
  state = 'idle',
  format = 'webp',
} = {}) {
  if (!(img instanceof HTMLImageElement)) throw new TypeError('Expected an <img> element');
  const manifestHref = new URL(manifestUrl, document.baseURI);
  const response = await fetch(manifestHref);
  if (!response.ok) throw new Error(`Avatar manifest HTTP ${response.status}: ${manifestHref.href}`);
  const data = await response.json();
  if (!data.characters || !data.states) throw new Error('Invalid avatar manifest (requires schemaVersion 2)');

  // Accept cat-modern / cat-socrates as legacy-like direct mode IDs too.
  let currentCharacter = character === 'white-cat' ? 'cat' : character;
  let currentMode = mode;
  if (mode === 'cat-modern' || mode === 'cat-socrates') {
    currentCharacter = 'cat';
    currentMode = mode.split('-')[1];
  }
  let currentState = state;
  let frameIndex = 0;
  let elapsedMs = 0;
  let lastTime = null;
  let requestId = null;
  let running = true;
  let cacheWarm = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function keyFor(ch = currentCharacter, appearance = currentMode) {
    const key = data.characters[ch]?.modes?.[appearance];
    if (!key) throw new Error(`Unknown avatar character/mode: ${ch}/${appearance}`);
    return key;
  }
  function frames() {
    const key = keyFor();
    const selected = data.states[key]?.[currentState];
    if (!selected?.frames?.length) throw new Error(`Unknown avatar state: ${key}/${currentState}`);
    return selected.frames;
  }
  function assetUrl(f) {
    return new URL(f[format] || f.webp || f.png, manifestHref).href;
  }
  function render() {
    const image = frames()[frameIndex];
    const url = assetUrl(image);
    if (img.src !== url) img.src = url;
    img.alt = `AI 助教角色：${data.characters[currentCharacter].label}／${currentMode}／${currentState}`;
    img.style.backgroundColor = '#000';
  }
  function preloadCurrentMode() {
    const id = keyFor();
    if (cacheWarm.has(id)) return;
    cacheWarm.add(id);
    for (const seq of Object.values(data.states[id])) {
      for (const item of seq.frames) {
        const preview = new Image();
        preview.src = assetUrl(item);
      }
    }
  }
  function reset() {
    frameIndex = 0;
    elapsedMs = 0;
    lastTime = null;
    preloadCurrentMode();
    render();
  }
  function tick(time) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 250);
    lastTime = time;
    if (!document.hidden && !reducedMotion.matches) {
      elapsedMs += dt;
      const seq = frames();
      if (elapsedMs >= (seq[frameIndex].durationMs || 200)) {
        elapsedMs = 0;
        frameIndex = (frameIndex + 1) % seq.length;
        render();
      }
    }
    requestId = requestAnimationFrame(tick);
  }

  keyFor();
  frames();
  const player = {
    setCharacter(next) {
      const ch = next === 'white-cat' ? 'cat' : next;
      if (!data.characters[ch]) throw new Error(`Invalid character: ${next}`);
      if (currentCharacter !== ch) { currentCharacter = ch; reset(); }
    },
    setMode(next) {
      if (next === 'cat-modern' || next === 'cat-socrates') {
        currentCharacter = 'cat';
        next = next.slice(4);
      }
      keyFor(currentCharacter, next);
      if (currentMode !== next || img.dataset.avatarMode !== `${currentCharacter}:${next}`) {
        currentMode = next;
        img.dataset.avatarMode = `${currentCharacter}:${next}`;
        reset();
      }
    },
    setState(next) {
      if (!data.states[keyFor()]?.[next]) throw new Error(`Invalid state: ${next}`);
      if (currentState !== next) { currentState = next; reset(); }
    },
    getCharacter: () => currentCharacter,
    getMode: () => currentMode,
    getState: () => currentState,
    getResolvedMode: () => keyFor(),
    stop() {
      running = false;
      if (requestId != null) cancelAnimationFrame(requestId);
    },
  };
  reset();
  requestId = requestAnimationFrame(tick);
  return player;
}
