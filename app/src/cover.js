// VICE GRID poster renderer — draws a multi-panel GTA-style poster onto any
// canvas. One draw path serves the live preview and the exported PNG, so the
// app shows exactly what it exports. Everything is drawn with the canvas 2D
// API: no image assets, no web fonts and no network beyond the photos.
export const LOOKS = {
  sunset: {
    name: 'Sunset Strip',
    sky: ['#ff9a3c', '#ff5e78', '#7b2ff7'],
    band: '#ff2e63',
    accent: '#ffd319',
    ink: '#1a0b2e',
    gap: '#14082b',
  },
  neon: {
    name: 'Neon Night',
    sky: ['#2b0a4a', '#ff2e88', '#00e5ff'],
    band: '#00e5ff',
    accent: '#ff2e88',
    ink: '#0b0214',
    gap: '#0b0214',
  },
  heat: {
    name: 'Heat Wave',
    sky: ['#ffb703', '#ff7b00', '#0b3d3a'],
    band: '#ffb703',
    accent: '#fb8500',
    ink: '#10231f',
    gap: '#0e1f1c',
  },
};

// Panel rects in unit space: [x, y, w, h] as fractions of the poster.
export const LAYOUTS = {
  triple: {
    name: 'Triple Threat',
    rects: [
      [0, 0, 0.66, 1],
      [0.66, 0, 0.34, 0.5],
      [0.66, 0.5, 0.34, 0.5],
    ],
  },
  quad: {
    name: 'Four Corners',
    rects: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  strip: {
    name: 'Boulevard Strip',
    rects: [
      [0, 0, 0.34, 1],
      [0.34, 0, 0.32, 1],
      [0.66, 0, 0.34, 1],
    ],
  },
  hero: {
    name: 'Hero + Duo',
    rects: [
      [0, 0, 1, 0.7],
      [0, 0.7, 0.5, 0.3],
      [0.5, 0.7, 0.5, 0.3],
    ],
  },
};

export const EXPORT_SIZES = {
  square: { name: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { name: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { name: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

// Build the default panel list for a layout: photos dealt round-robin.
export function defaultPanels(layoutKey, photoCount) {
  const rects = LAYOUTS[layoutKey].rects;
  return rects.map((r, i) => ({
    photo: photoCount > 0 ? i % photoCount : -1,
    scale: 1,
    ox: 0,
    oy: 0,
  }));
}

// Draw one photo cover-fitting a rect, with per-panel pan (ox/oy in fractions
// of the rect) and zoom (scale). The photo is drawn, then graded in place.
function drawPhotoPanel(ctx, img, rect, panel, look, grade) {
  const [x, y, w, h] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const s = base * panel.scale;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    const dx = x + (w - dw) / 2 + panel.ox * w;
    const dy = y + (h - dh) / 2 + panel.oy * h;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(x, y, w, h);
  }
  // Grade: a warm golden-hour wash at grade 0 sweeping to a cool neon wash
  // at grade 100, laid over the photo with soft light so the photo stays.
  const t = grade / 100;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, t < 0.5 ? look.sky[0] : look.sky[1]);
  grad.addColorStop(1, look.sky[2]);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.25 + 0.35 * Math.abs(t - 0.5) * 2;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // Vignette so panels read as photographs, not flat tiles.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.strokeRect(x, y, w, h);
}

// Draw the whole poster. opts: { look, grade, layout, caption, sub, panels, images }.
// images is an array of HTMLImageElement (or null entries); panels[i].photo
// indexes into it (-1 draws an empty tile).
export function drawPoster(ctx, W, H, opts) {
  const look = LOOKS[opts.look] || LOOKS.sunset;
  const layout = LAYOUTS[opts.layout] || LAYOUTS.triple;
  const gap = Math.max(4, Math.round(W * 0.008));
  const bandH = Math.round(H * 0.17);
  const photoH = H - bandH;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = look.gap;
  ctx.fillRect(0, 0, W, H);

  layout.rects.forEach((r, i) => {
    const panel = opts.panels[i] || { photo: -1, scale: 1, ox: 0, oy: 0 };
    const img = panel.photo >= 0 ? opts.images[panel.photo] : null;
    const rect = [
      Math.round(r[0] * W) + gap / 2,
      Math.round(r[1] * photoH) + gap / 2,
      Math.round(r[2] * W) - gap,
      Math.round(r[3] * photoH) - gap,
    ];
    drawPhotoPanel(ctx, img, rect, panel, look, opts.grade);
  });

  // Caption band with a diagonal accent slash.
  const by = photoH;
  ctx.fillStyle = look.band;
  ctx.fillRect(0, by, W, bandH);
  ctx.fillStyle = look.accent;
  ctx.beginPath();
  const slashW = Math.round(W * 0.045);
  ctx.moveTo(0, by);
  ctx.lineTo(slashW, by);
  ctx.lineTo(slashW * 0.4, by + bandH);
  ctx.lineTo(0, by + bandH);
  ctx.closePath();
  ctx.fill();

  // Caption: heavy outline lettering, sized to fit the band.
  const caption = (opts.caption || 'SUNSET HEIST').toUpperCase();
  let fontPx = Math.round(bandH * 0.52);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const setFont = (px) => {
    ctx.font = `900 ${px}px "Arial Black", Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(px * 0.06)}px`; } catch { /* older canvas */ }
  };
  setFont(fontPx);
  const maxW = W - Math.round(W * 0.09);
  while (ctx.measureText(caption).width > maxW && fontPx > 12) {
    fontPx -= 2;
    setFont(fontPx);
  }
  const cx = Math.round(W * 0.045);
  const cy = by + bandH * 0.42;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = look.ink;
  ctx.lineWidth = Math.max(2, Math.round(fontPx * 0.14));
  ctx.strokeText(caption, cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(caption, cx, cy);

  // Sub-caption, right-aligned in the band.
  const sub = (opts.sub || '').toUpperCase();
  if (sub) {
    const subPx = Math.max(10, Math.round(bandH * 0.2));
    ctx.font = `700 ${subPx}px Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subPx * 0.18)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'right';
    ctx.fillStyle = look.ink;
    ctx.fillText(sub, W - Math.round(W * 0.03), by + bandH * 0.82);
    ctx.textAlign = 'left';
  }

  // Maker's mark, top-left of the poster.
  const markPx = Math.max(10, Math.round(H * 0.016));
  ctx.font = `800 ${markPx}px Arial, Helvetica, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(markPx * 0.22)}px`; } catch { /* older canvas */ }
  const mark = 'VICE GRID';
  const mw = ctx.measureText(mark).width + markPx * 1.6;
  const mh = markPx * 2.1;
  ctx.fillStyle = 'rgba(10,6,20,0.72)';
  ctx.fillRect(gap, gap, mw, mh);
  ctx.fillStyle = look.accent;
  ctx.fillText(mark, gap + markPx * 0.8, gap + mh / 2 + 1);
}
