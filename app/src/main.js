// VICE GRID editor: wires the poster renderer to the page controls.
// Upload or drop photos, pick samples, drag panels to swap them, pan and zoom
// the selected panel, pick a look and a grade, type a caption, export a PNG.
import { LOOKS, LAYOUTS, EXPORT_SIZES, defaultPanels, drawPoster } from './cover.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

const state = {
  look: 'sunset',
  grade: 25,
  layout: 'triple',
  caption: 'SUNSET HEIST',
  sub: 'VICE CITY • 2026',
  size: 'wide',
  mode: 'swap',
  selected: 0,
  photos: [], // { name, img }
  panels: [],
};

function gradeName(g) {
  return g <= 33 ? 'Golden hour' : g <= 66 ? 'Dusk' : 'Neon night';
}

function panelRects(W, H) {
  const layout = LAYOUTS[state.layout];
  const gap = Math.max(4, Math.round(W * 0.008));
  const bandH = Math.round(H * 0.17);
  const photoH = H - bandH;
  return layout.rects.map((r) => [
    Math.round(r[0] * W) + gap / 2,
    Math.round(r[1] * photoH) + gap / 2,
    Math.round(r[2] * W) - gap,
    Math.round(r[3] * photoH) - gap,
  ]);
}

function render() {
  const size = EXPORT_SIZES[state.size];
  const scale = Math.min(880 / size.w, 620 / size.h, 1);
  const W = Math.round(size.w * scale);
  const H = Math.round(size.h * scale);
  if (preview.width !== W || preview.height !== H) {
    preview.width = W;
    preview.height = H;
  }
  drawPoster(pctx, W, H, {
    look: state.look,
    grade: state.grade,
    layout: state.layout,
    caption: state.caption,
    sub: state.sub,
    panels: state.panels,
    images: state.photos.map((p) => p.img),
  });
  // Selection outline on the chosen panel.
  const rects = panelRects(W, H);
  const sel = rects[state.selected];
  if (sel) {
    pctx.save();
    pctx.strokeStyle = LOOKS[state.look].accent;
    pctx.lineWidth = 3;
    pctx.setLineDash([10, 6]);
    pctx.strokeRect(sel[0] - 2, sel[1] - 2, sel[2] + 4, sel[3] + 4);
    pctx.restore();
  }
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
}

function refreshTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.type = 'button';
    b.title = p.name;
    const im = document.createElement('img');
    im.src = p.img.src;
    im.alt = p.name;
    b.appendChild(im);
    b.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      render();
    });
    tray.appendChild(b);
  });
}

function addPhoto(name, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      state.photos.push({ name, img });
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function loadSamples() {
  await addPhoto('Boulevard', 'samples/boulevard.jpg');
  await addPhoto('Pier', 'samples/pier.jpg');
  state.panels = defaultPanels(state.layout, state.photos.length);
  refreshTray();
  render();
}

// --- Pointer interaction on the preview canvas -----------------------------
let drag = null; // { panel, x0, y0, moved }

function hitPanel(e) {
  const r = preview.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * preview.width;
  const y = ((e.clientY - r.top) / r.height) * preview.height;
  const rects = panelRects(preview.width, preview.height);
  for (let i = 0; i < rects.length; i++) {
    const [rx, ry, rw, rh] = rects[i];
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return { i, x, y };
  }
  return null;
}

preview.addEventListener('pointerdown', (e) => {
  const hit = hitPanel(e);
  if (!hit) return;
  state.selected = hit.i;
  drag = { panel: hit.i, x0: hit.x, y0: hit.y, moved: false };
  preview.setPointerCapture(e.pointerId);
  render();
});

preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = hitPanel(e);
  if (!hit) return;
  const dx = hit.x - drag.x0;
  const dy = hit.y - drag.y0;
  if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
  if (state.mode === 'pan' && drag.moved) {
    const rects = panelRects(preview.width, preview.height);
    const [rx, ry, rw, rh] = rects[drag.panel];
    const p = state.panels[drag.panel];
    p.ox = Math.max(-0.4, Math.min(0.4, p.ox + dx / rw));
    p.oy = Math.max(-0.4, Math.min(0.4, p.oy + dy / rh));
    drag.x0 = hit.x;
    drag.y0 = hit.y;
    render();
  }
});

preview.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const hit = hitPanel(e);
  if (state.mode === 'swap' && drag.moved && hit && hit.i !== drag.panel) {
    // VICE GRID signature: drag a panel onto another to swap the photos.
    const a = state.panels[drag.panel].photo;
    state.panels[drag.panel].photo = state.panels[hit.i].photo;
    state.panels[hit.i].photo = a;
    state.selected = hit.i;
  }
  drag = null;
  render();
});

preview.addEventListener('wheel', (e) => {
  const hit = hitPanel(e);
  if (!hit) return;
  e.preventDefault();
  state.selected = hit.i;
  const p = state.panels[hit.i];
  p.scale = Math.max(0.6, Math.min(3, p.scale * (e.deltaY < 0 ? 1.08 : 0.93)));
  render();
}, { passive: false });

// --- Controls ---------------------------------------------------------------
function bindButtons(containerId, current, apply) {
  const box = $(containerId);
  box.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === current);
    b.addEventListener('click', () => {
      apply(b.dataset.v);
      box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      render();
    });
  });
}

bindButtons('looks', state.look, (v) => { state.look = v; });
bindButtons('layouts', state.layout, (v) => {
  state.layout = v;
  state.panels = defaultPanels(v, state.photos.length);
  state.selected = 0;
});
bindButtons('sizes', state.size, (v) => { state.size = v; });

$('grade').addEventListener('input', (e) => {
  state.grade = Number(e.target.value);
  $('gradeVal').textContent = gradeName(state.grade);
  render();
});
$('caption').addEventListener('input', (e) => { state.caption = e.target.value || 'UNTITLED'; render(); });
$('sub').addEventListener('input', (e) => { state.sub = e.target.value; render(); });
$('modeSwap').addEventListener('click', () => {
  state.mode = 'swap';
  $('modeSwap').classList.add('on');
  $('modePan').classList.remove('on');
  $('modeHint').textContent = 'Drag a panel onto another to swap them. Click a photo in the tray to place it in the selected panel.';
});
$('modePan').addEventListener('click', () => {
  state.mode = 'pan';
  $('modePan').classList.add('on');
  $('modeSwap').classList.remove('on');
  $('modeHint').textContent = 'Drag inside the selected panel to pan its photo. Scroll over a panel to zoom it.';
});
$('zoomIn').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.scale = Math.min(3, p.scale * 1.15);
  render();
});
$('zoomOut').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.scale = Math.max(0.6, p.scale / 1.15);
  render();
});
$('resetPanel').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.scale = 1; p.ox = 0; p.oy = 0;
  render();
});

// Upload + drag-and-drop.
$('upload').addEventListener('change', async (e) => {
  for (const f of e.target.files) {
    if (!f.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(f);
    await addPhoto(f.name, url);
  }
  refreshTray();
  render();
});
const drop = $('drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
  e.preventDefault();
  drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => {
  e.preventDefault();
  drop.classList.remove('over');
}));
drop.addEventListener('drop', async (e) => {
  for (const f of e.dataTransfer.files) {
    if (!f.type.startsWith('image/')) continue;
    await addPhoto(f.name, URL.createObjectURL(f));
  }
  refreshTray();
  render();
});

// --- Export -----------------------------------------------------------------
function renderCover(sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  const c = document.createElement('canvas');
  c.width = size.w;
  c.height = size.h;
  drawPoster(c.getContext('2d'), size.w, size.h, {
    look: state.look,
    grade: state.grade,
    layout: state.layout,
    caption: state.caption,
    sub: state.sub,
    panels: state.panels,
    images: state.photos.map((p) => p.img),
  });
  return c;
}

function exportCover(sizeKey) {
  return new Promise((resolve) => {
    renderCover(sizeKey).toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-grid-${sizeKey}-${state.caption.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(url);
    }, 'image/png');
  });
}

$('exportBtn').addEventListener('click', () => exportCover(state.size));

// --- Keyboard shortcuts (round-2 polish) -----------------------------------
// Keys 1-4 switch layouts, L cycles the look, E exports the current size.
// Typing in a text field never triggers a shortcut.
function syncButtons() {
  const mark = (id, value) => document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle('on', b.dataset.v === value));
  mark('looks', state.look);
  mark('layouts', state.layout);
  mark('sizes', state.size);
}
const LAYOUT_KEYS = ['triple', 'quad', 'strip', 'hero'];
const LOOK_KEYS = ['sunset', 'neon', 'heat'];
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (k >= '1' && k <= '4') {
    state.layout = LAYOUT_KEYS[Number(k) - 1];
    state.panels = defaultPanels(state.layout, state.photos.length);
    state.selected = 0;
    syncButtons();
    render();
  } else if (k === 'l') {
    state.look = LOOK_KEYS[(LOOK_KEYS.indexOf(state.look) + 1) % LOOK_KEYS.length];
    syncButtons();
    render();
  } else if (k === 'e') {
    exportCover(state.size);
  }
});

// Query presets (handy for screenshots): ?look=&layout=&caption=&sub=&grade=&size=
function applyQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('look') && LOOKS[q.get('look')]) state.look = q.get('look');
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('caption')) { state.caption = q.get('caption'); $('caption').value = state.caption; }
  if (q.get('sub') !== null) { state.sub = q.get('sub') || ''; $('sub').value = state.sub; }
  if (q.get('grade') !== null) {
    state.grade = Math.max(0, Math.min(100, Number(q.get('grade')) || 0));
    $('grade').value = String(state.grade);
    $('gradeVal').textContent = gradeName(state.grade);
  }
  if (q.get('size') && EXPORT_SIZES[q.get('size')]) state.size = q.get('size');
  document.querySelectorAll('#looks button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.look));
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.layout));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.size));
}

// Test hook: the screenshot driver calls these, the page never depends on them.
window.__vicegrid = {
  state,
  exportCover: (sizeKey) => new Promise((resolve) => {
    renderCover(sizeKey || state.size).toBlob((blob) => {
      const r = new FileReader();
      r.onload = () => resolve({ dataUrl: r.result, w: EXPORT_SIZES[sizeKey || state.size].w, h: EXPORT_SIZES[sizeKey || state.size].h });
      r.readAsDataURL(blob);
    }, 'image/png');
  }),
  render,
};

applyQuery();
loadSamples();
