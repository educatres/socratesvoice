/** No dependencies. Place this module beside manifest.json at your GitHub Pages base path. */
export async function createAvatarPlayer(img, { manifestUrl = './manifest.json', mode = 'modern', state = 'idle', format = 'webp' } = {}) {
  const absoluteManifestUrl = new URL(manifestUrl, document.baseURI);
  const response = await fetch(absoluteManifestUrl);
  if (!response.ok) throw new Error(`Cannot load avatar manifest: ${response.status}`);
  const data = await response.json();
  let currentMode = mode;
  let currentState = state;
  let frame = 0;
  let elapsed = 0;
  let previousTime = null;
  let requestId = null;
  let running = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function frames() {
    const selected = data.states[currentMode]?.[currentState];
    if (!selected) throw new Error(`Invalid avatar mode/state: ${currentMode}/${currentState}`);
    return selected.frames;
  }
  function frameUrl(f) {
    return new URL(f[format] ?? f.png, absoluteManifestUrl).href;
  }
  function render() {
    img.src = frameUrl(frames()[frame]);
    img.alt = `${currentMode} / ${currentState} / frame ${frame + 1}`;
    img.style.backgroundColor = '#000';
  }
  function tick(time) {
    if (!running) return;
    const dt = previousTime === null ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    if (!document.hidden && !reduceMotion.matches) {
      elapsed += dt;
      const list = frames();
      if (elapsed >= list[frame].durationMs) {
        elapsed = 0;
        frame = (frame + 1) % list.length;
        render();
      }
    }
    requestId = requestAnimationFrame(tick);
  }
  function reset() { frame = 0; elapsed = 0; previousTime = null; render(); }
  const player = {
    setMode(next) { if (!data.states[next]) throw new Error(`Invalid mode: ${next}`); currentMode = next; reset(); },
    setState(next) { if (!data.states[currentMode][next]) throw new Error(`Invalid state: ${next}`); currentState = next; reset(); },
    getMode() { return currentMode; },
    getState() { return currentState; },
    stop() { running = false; if (requestId !== null) cancelAnimationFrame(requestId); },
  };
  // Preload just the active mode in the background to reduce flicker between states.
  for (const entry of Object.values(data.states[currentMode])) {
    for (const f of entry.frames) { const pre = new Image(); pre.src = frameUrl(f); }
  }
  render();
  requestId = requestAnimationFrame(tick);
  return player;
}
