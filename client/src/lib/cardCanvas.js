// ─────────────────────────────────────────────
//  Card image generator — draws the FIFA card
//  to an off-screen canvas via Canvas 2D API.
//  No html2canvas: avoids CORS/border-radius bugs.
// ─────────────────────────────────────────────
import {
  STICKER_ICONS, getStickerPos,
  CARD_SHAPES, CARD_RECT_WIDTH, STAR_SETS, STAR_SET_FOR_RANK, STAR_PLACEMENT,
  ACHIEVEMENT_BADGE_LAYOUT, BADGE_TYPES, BADGE_TYPE_LIST, CARD_COLOR_THEMES, NOVIS_CONTENT_LAYOUT,
  getCardColorKey, getCardSubTier, getBadgeColors,
} from '../components/FifaCard';

const CW = 520;   // output canvas width
const CH = 720;   // output canvas height
const CARD_W = 300;
const CARD_H = 450;
const CARD_X = (CW - CARD_W) / 2;   // 110
const CARD_Y = (CH - CARD_H) / 2;   // 135

// Native card width the live "normal" size FifaCard actually renders at —
// its own shapeScale is w/CARD_RECT_WIDTH = 220/220 = 1, i.e. no stretch at
// all. Every content position below (from NOVIS_CONTENT_LAYOUT, plus the
// avatar/name/stat font sizes copied straight out of FifaCard.jsx's JSX) is
// therefore a real, exact pixel value at this width, not an approximation —
// drawing in this same 220-wide space and scaling the whole result by one
// uniform factor at the end is what keeps the shaped-card output pixel-true
// to the live card, for every tier, instead of hand-refitting a second copy
// of the layout into a fixed box (which both stretched the crown/stars
// non-uniformly and drifted the content positions out of sync over time).
const NATIVE_W = CARD_RECT_WIDTH; // 220
// Drawn 1:1 with the live card's own native width — anything larger here
// scales every stroke/border proportionally thicker in the actual saved
// file (a real, visible difference from the live card, not just a display
// artifact), since line widths below are literal live-card pixel values.
const OUTPUT_W = NATIVE_W;

const POS_ABBR = { Attacker: 'AT', Midfielder: 'MF', Defender: 'DF', Goalkeeper: 'GK' };
const STAT_KEYS   = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const STAT_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];

export const DEFAULT_BG = { id: 'dark', label: 'Dark', src: null };

// Pulled from FifaCard's own CARD_COLOR_THEMES (keyed by getCardColorKey)
// rather than a hand-copied palette — that copy was exactly how this ever
// drifted from the live card's colors (Perak stayed on its old blue here
// after the live card moved to silver) in the first place.
function getTheme(rank) {
  return CARD_COLOR_THEMES[getCardColorKey(rank) || 'novis'];
}

function grad145(ctx, x, y, w, h, stops) {
  const a = 145 * Math.PI / 180;
  const r = Math.hypot(w, h) / 2;
  const cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createLinearGradient(
    cx - Math.cos(a) * r, cy - Math.sin(a) * r,
    cx + Math.cos(a) * r, cy + Math.sin(a) * r,
  );
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Explicitly requests the exact family+weight pairs this file draws with
// canvas `ctx.font`, rather than trusting `document.fonts.ready` alone —
// that only waits on fonts the browser has *already started* loading, and
// canvas font matching never itself triggers a load the way rendering real
// DOM text does. If the bold weight of a face hadn't been used anywhere
// else on the page yet (e.g. Space Mono 700 for the rank/position labels),
// `ctx.font` would silently fall back to the platform default instead of
// erroring, which is exactly the mismatched-font bug this guards against.
async function ensureFontsLoaded() {
  await Promise.all([
    document.fonts.load("700 16px 'Bebas Neue'"),
    document.fonts.load("700 16px 'Space Mono'"),
    document.fonts.load("400 16px 'Space Mono'"),
    document.fonts.ready,
  ]);
}

function drawPattern(ctx, pattern, color, opacity, cx, cy, cw, ch) {
  if (!pattern || pattern === 'none') return;
  ctx.save();
  rrect(ctx, cx, cy, cw, ch, 20); ctx.clip();
  ctx.globalAlpha = opacity ?? 0.15;
  ctx.strokeStyle = color || '#ffffff';
  ctx.fillStyle   = color || '#ffffff';

  switch (pattern) {
    case 'dots': {
      const sp = 12;
      for (let x = cx + sp / 2; x < cx + cw; x += sp)
        for (let y = cy + sp / 2; y < cy + ch; y += sp) {
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      break;
    }
    case 'diagonal': {
      ctx.lineWidth = 1;
      const sp = 9;
      for (let i = -(ch); i < cw + ch; i += sp) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy);
        ctx.lineTo(cx + i + ch, cy + ch);
        ctx.stroke();
      }
      break;
    }
    case 'grid': {
      ctx.lineWidth = 1;
      const sp = 16;
      for (let x = cx; x <= cx + cw; x += sp) { ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + ch); ctx.stroke(); }
      for (let y = cy; y <= cy + ch; y += sp) { ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke(); }
      break;
    }
    case 'crosshatch': {
      ctx.lineWidth = 1;
      const sp = 9;
      for (let i = -(ch); i < cw + ch; i += sp) {
        ctx.beginPath(); ctx.moveTo(cx + i, cy); ctx.lineTo(cx + i + ch, cy + ch); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + cw - i, cy); ctx.lineTo(cx + cw - i - ch, cy + ch); ctx.stroke();
      }
      break;
    }
    case 'carbon': {
      ctx.lineWidth = 1;
      ctx.globalAlpha = (opacity ?? 0.15) * 0.5;
      const sp = 8;
      for (let x = cx; x <= cx + cw; x += sp) { ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + ch); ctx.stroke(); }
      for (let y = cy; y <= cy + ch; y += sp) { ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke(); }
      break;
    }
  }
  ctx.restore();
}

function drawElements(ctx, ct, cx, cy, cw, ch) {
  const { elemCorners, elemSideBars, elemCenterDiamond, elemFrame, elemColor, elemOpacity } = ct;
  if (!elemCorners && !elemSideBars && !elemCenterDiamond && !elemFrame) return;
  const c  = elemColor   || '#ffffff';
  const op = elemOpacity ?? 0.3;
  const arm = 24, pad = 17, sw = 2.5;

  ctx.save();
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.globalAlpha = op; ctx.lineCap = 'round';

  if (elemCorners) {
    ctx.lineWidth = sw;
    const corners = [
      [[cx + pad + arm, cy + pad], [cx + pad, cy + pad], [cx + pad, cy + pad + arm]],
      [[cx + cw - pad - arm, cy + pad], [cx + cw - pad, cy + pad], [cx + cw - pad, cy + pad + arm]],
      [[cx + pad + arm, cy + ch - pad], [cx + pad, cy + ch - pad], [cx + pad, cy + ch - pad - arm]],
      [[cx + cw - pad - arm, cy + ch - pad], [cx + cw - pad, cy + ch - pad], [cx + cw - pad, cy + ch - pad - arm]],
    ];
    for (const pts of corners) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.stroke();
    }
  }

  if (elemSideBars) {
    ctx.lineWidth = sw * 0.7;
    ctx.setLineDash([6, 10]);
    const bx1 = cx + pad - 4, bx2 = cx + cw - pad + 4;
    const by1 = cy + ch * 0.22, by2 = cy + ch * 0.78;
    ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx1, by2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx2, by1); ctx.lineTo(bx2, by2); ctx.stroke();
    ctx.setLineDash([]);
  }

  if (elemCenterDiamond) {
    const dy = cy + ch * 0.552, ds = 8;
    ctx.beginPath();
    ctx.moveTo(cx + cw / 2, dy - ds);
    ctx.lineTo(cx + cw / 2 + ds, dy);
    ctx.lineTo(cx + cw / 2, dy + ds);
    ctx.lineTo(cx + cw / 2 - ds, dy);
    ctx.closePath(); ctx.fill();
  }

  if (elemFrame) {
    ctx.lineWidth = sw * 0.7;
    rrect(ctx, cx + 9, cy + 9, cw - 18, ch - 18, 14); ctx.stroke();
  }

  ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// objectBoundingBox-style gradient/shine, matching the live card's SVG
// gradients (which default to percentages of the path's own bounding box)
// rather than the canvas's outer cx/cy/cw/ch — needed because this is built
// while a shape-local transform is active (see drawCardShape below).
function shapeGradient(ctx, viewBoxW, viewBoxH, stops) {
  const g = ctx.createLinearGradient(viewBoxW * 0.15, 0, viewBoxW * 0.85, viewBoxH);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function shapeShine(ctx, viewBoxW, viewBoxH) {
  const g = ctx.createLinearGradient(viewBoxW * 0.1, 0, viewBoxW * 0.6, viewBoxH * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  return g;
}

// Card2D counterpart to FifaCard.jsx's shaped card (crown silhouette +
// sub-tier stars). Draws at native 1:1 scale (the same scale the live card
// itself uses at "normal" size — its own shapeScale is w/CARD_RECT_WIDTH =
// 220/220 = 1) inside a caller-established uniform ctx.scale — never a
// separate scaleX/scaleY fit to a fixed box, which used to stretch the
// crown and, worse, double-stretch the sub-tier stars (their own
// intentionally non-square placement got a second, unwanted non-uniform
// scale stacked on top of it, reading as visibly squished).
// `originX/originY` is the top-left of the card's content container (i.e.
// (0, headroomTop) in the caller's local space) — NOT the shape's own
// viewBox origin, which sits `rectLeftX` further left.
function drawCardShape(ctx, colorKey, shapeDef, originX, originY, stops, borderColor, starSet, starPlacement) {
  // The shape itself is drawn in its own frame, inset by `rectLeftX` (the
  // gap between the wider crown viewBox and the plain body rect it sits
  // above) — but the star is positioned relative to the *container*
  // (originX, originY), same as the live card's `left: starPlacement.left`
  // being a sibling of the shape SVG, not a child of it. Nesting the star's
  // translate inside the shape's rectLeftX-shifted frame (as an earlier
  // version of this function did) silently shifted every star sideways by
  // rectLeftX — invisible for Gangsa/Novis (rectLeftX 0) but wrong for
  // Perak/Emas (16.7/17.6), so the two are kept in separate ctx.save blocks.
  ctx.save();
  ctx.translate(originX - shapeDef.rectLeftX, originY);
  const shapePath = new Path2D(shapeDef.path);

  // Drop shadow: fill once (any opaque color) with the shadow set, then
  // fill again for real with no shadow — the standard canvas trick, since
  // shadowBlur/Offset would otherwise double up with the gradient fill.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#000';
  ctx.fill(shapePath);
  ctx.restore();

  ctx.fillStyle = shapeGradient(ctx, shapeDef.viewBoxW, shapeDef.viewBoxH, stops);
  ctx.fill(shapePath);
  ctx.fillStyle = shapeShine(ctx, shapeDef.viewBoxW, shapeDef.viewBoxH);
  ctx.fill(shapePath);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke(shapePath);
  ctx.restore();

  // ── Sub-tier star(s) ──────────────────────────────────
  if (starSet && starPlacement) {
    ctx.save();
    ctx.translate(originX + starPlacement.left, originY + starPlacement.top);
    ctx.scale(starPlacement.width / starSet.viewBoxW, starPlacement.height / starSet.viewBoxH);
    ctx.fillStyle = shapeGradient(ctx, starSet.viewBoxW, starSet.viewBoxH, stops);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.7 * starSet.viewBoxW / starPlacement.width;
    starSet.paths.forEach(d => {
      const p = new Path2D(d);
      ctx.fill(p);
      ctx.stroke(p);
    });
    ctx.restore();
  }
}

// Parses the handful of SVG transform-list functions BADGE_TYPES actually
// uses (translate/matrix, chained left-to-right) and applies them as
// canvas transforms in the same order — canvas and SVG compose transforms
// the same way, so this reproduces `<g transform="...">` exactly without
// duplicating BADGE_TYPES' path data into a second, pre-flattened copy.
function applySvgTransform(ctx, str) {
  const re = /(translate|matrix)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(str))) {
    const n = m[2].split(/[\s,]+/).map(Number);
    if (m[1] === 'translate') ctx.translate(n[0], n[1] ?? 0);
    else ctx.transform(n[0], n[1], n[2], n[3], n[4], n[5]);
  }
}

// Static counterpart to AchievementBadgeIcon in FifaCard.jsx — same fill/
// outline/icon per rarity, minus the animated shine sweep (a live-only
// flourish, same reasoning as the border shimmer skipped above).
function drawAchievementBadge(ctx, type, rarity, x, y, size) {
  const cfg = BADGE_TYPES[type];
  if (!cfg) return;
  const colors = getBadgeColors(rarity);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 30, size / 30); // AchievementBadgeIcon's own viewBox is 0 0 30 30

  ctx.save();
  applySvgTransform(ctx, cfg.diamondTransform);
  ctx.fillStyle = colors.fill;
  ctx.fill(new Path2D(cfg.path1));
  ctx.fillStyle = colors.outline;
  ctx.fill(new Path2D(cfg.path2), 'evenodd');
  ctx.restore();

  ctx.save();
  applySvgTransform(ctx, cfg.iconTransform);
  ctx.fillStyle = colors.icon;
  ctx.fill(new Path2D(cfg.iconPath));
  ctx.restore();

  ctx.restore();
}

// Draws the front-face content (OVR, position, rank, avatar, name, stats,
// games-played row) for a standard tiered card, in the same native 220-wide
// coordinate space `drawCardShape` uses, bottom-anchored off `bodyBottom`
// exactly like NOVIS_CONTENT_LAYOUT describes the live card — ported
// straight from FifaCard.jsx's own JSX (font sizes, offsets) rather than a
// second hand-tuned approximation, so it can't drift from the live layout
// the way the old fixed-box version did.
async function drawShapedCardContent(ctx, { profile, cardStats, rank, t, bodyBottom }) {
  const L = NOVIS_CONTENT_LAYOUT;
  const overall = Math.round(STAT_KEYS.reduce((s, k) => s + (cardStats[k] || 0), 0) / 6);
  const w = NATIVE_W;

  // OVR
  ctx.fillStyle = t.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = `700 44px 'Bebas Neue', sans-serif`;
  ctx.fillText(String(overall), 14 + L.ovrLeft.n, bodyBottom - L.ovrBottom.n);

  // Position
  ctx.font = `700 11px 'Space Mono', monospace`;
  ctx.fillText(POS_ABBR[profile?.position] || profile?.position || 'POS', 14 + L.posLeft.n, bodyBottom - L.posBottom.n);

  // Rank — top right
  ctx.font = `700 10px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = t.muted;
  ctx.textAlign = 'right';
  ctx.fillText(rank, w - 12 + L.rankLeft.n, bodyBottom - L.rankBottom.n);

  // Avatar
  const avR = 54; // 108px diameter, matching FifaCard's normal-size avatar
  const avX = w / 2 + L.avatarLeft.n;
  const avBottomY = bodyBottom - L.avatarBottom.n;
  const avY = avBottomY - avR;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();

  let drewAvatar = false;
  if (profile?.avatar_url) {
    const img = await loadImg(profile.avatar_url);
    if (img) {
      const ir = img.width / img.height;
      let isx = 0, isy = 0, isw = img.width, ish = img.height;
      if (ir > 1) { isw = ish; isx = (img.width - isw) / 2; }
      else        { ish = isw; isy = (img.height - ish) / 2; }
      ctx.drawImage(img, isx, isy, isw, ish, avX - avR, avY - avR, avR * 2, avR * 2);
      drewAvatar = true;
    }
  }
  if (!drewAvatar) {
    ctx.fillStyle = t.statBg;
    ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
    ctx.fillStyle = t.text;
    ctx.font = `700 28px 'Space Mono', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((profile?.name?.[0] || '?').toUpperCase(), avX, avY);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.strokeStyle = t.border; ctx.lineWidth = 3; ctx.stroke();

  // Name
  const playerName = (profile?.name || 'PLAYER').toUpperCase();
  const isSubscribed = !!(profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date());
  const nameBottomY = bodyBottom - L.nameBottom.n;

  ctx.fillStyle = t.text;
  ctx.font = `700 17px 'Bebas Neue', sans-serif`;
  ctx.textBaseline = 'bottom';

  if (isSubscribed) {
    const tickR = 7, tickGap = 4;
    const nameWidth = ctx.measureText(playerName).width;
    const totalW = nameWidth + tickGap + tickR * 2;
    const startX = w / 2 + L.nameLeft.n - totalW / 2;

    ctx.textAlign = 'left';
    ctx.fillText(playerName, startX, nameBottomY);

    const tickCX = startX + nameWidth + tickGap + tickR;
    const tickCY = nameBottomY - 8;
    ctx.beginPath();
    ctx.arc(tickCX, tickCY, tickR, 0, Math.PI * 2);
    ctx.fillStyle = '#4a9eff';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 8px 'Space Mono', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✓', tickCX, tickCY);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(playerName, w / 2 + L.nameLeft.n, nameBottomY);
  }

  // Stats 3×2 grid — bottom-anchored as a whole, matching the live card's
  // own grid container position; internal box sizing is this renderer's
  // own (the live card's is CSS grid auto-sizing, which has no single
  // native pixel value to port), tuned to the same measured ~200×74 footprint.
  const gridBottom = bodyBottom - L.statsBottom.n + L.statsLeft.n;
  const gridLeft = 10, gridRight = w - 10;
  const colGap = 4, rowGap = 5, rowH = 35;
  const colW = (gridRight - gridLeft - colGap * 2) / 3;

  STAT_KEYS.forEach((key, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const sx = gridLeft + col * (colW + colGap);
    const rowBottomY = gridBottom - (1 - row) * (rowH + rowGap);
    const rowTopY = rowBottomY - rowH;

    ctx.fillStyle = t.statBg;
    rrect(ctx, sx, rowTopY, colW, rowH, 5); ctx.fill();

    ctx.fillStyle = t.text;
    ctx.font = `700 14px 'Space Mono', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(cardStats[key] || 0), sx + colW / 2, rowTopY + 19);

    ctx.fillStyle = t.muted;
    ctx.font = `700 8px 'Space Mono', monospace`;
    ctx.fillText(STAT_LABELS[i], sx + colW / 2, rowTopY + 30);
  });

  // Bottom row — games played, left-aligned, matching the live card's front
  // face exactly (the front never repeats OVR down here; that's back-face-only).
  const rowBottomY = bodyBottom - 8;
  const rowTopY = rowBottomY - 18;
  ctx.beginPath();
  ctx.moveTo(10, rowTopY); ctx.lineTo(w - 10, rowTopY);
  ctx.strokeStyle = t.border + '66'; ctx.lineWidth = 1; ctx.stroke();

  const gp = String(profile?.games_played || 0);
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.font = `700 8px 'Space Mono', monospace`;
  ctx.fillStyle = t.text;
  ctx.fillText(gp, 10, rowBottomY);
  const gpWidth = ctx.measureText(gp).width;
  ctx.font = `400 8px 'Space Mono', monospace`;
  ctx.fillStyle = t.muted;
  ctx.fillText(' GAMES PLAYED', 10 + gpWidth, rowBottomY);
}

export async function drawCardImage({ profile, cardStats, rank, bgUrl, customTheme, achievementBadges }) {
  await ensureFontsLoaded();

  const DPR = Math.min(window.devicePixelRatio || 1, 3);
  const canvas = document.createElement('canvas');
  canvas.width  = CW * DPR;
  canvas.height = CH * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  const t = customTheme
    ? {
        stops:  [customTheme.gradFrom, customTheme.gradMid, customTheme.gradTo],
        border: customTheme.borderColor,
        text:   customTheme.textDark ? '#1a1200' : '#f0f0f0',
        muted:  customTheme.textDark ? '#5a4800' : '#999999',
        statBg: customTheme.textDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)',
      }
    : getTheme(rank);
  const cx  = CARD_X, cy = CARD_Y, cw = CARD_W, ch = CARD_H;
  const colorKey = getCardColorKey(rank);
  const subTier = getCardSubTier(rank);
  const useShapedCard = !customTheme && !!colorKey;

  // ── Canvas background ─────────────────────────────────
  ctx.fillStyle = '#111213';
  ctx.fillRect(0, 0, CW, CH);

  if (bgUrl) {
    const bg = await loadImg(bgUrl);
    if (bg) {
      const br = bg.width / bg.height, cr = CW / CH;
      let sx = 0, sy = 0, sw = bg.width, sh = bg.height;
      if (br > cr) { sw = sh * cr;   sx = (bg.width  - sw) / 2; }
      else         { sh = sw / cr;   sy = (bg.height - sh) / 2; }
      ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, CW, CH);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, CW, CH);
    }
  }

  // ── Glow effect ───────────────────────────────────────
  if (customTheme?.glowEnabled && customTheme?.glowColor) {
    ctx.save();
    ctx.shadowColor = customTheme.glowColor;
    ctx.shadowBlur  = 50;
    rrect(ctx, cx, cy, cw, ch, 20);
    ctx.strokeStyle = customTheme.glowColor + '80';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  if (useShapedCard) {
    // ── Standard tiered card (Novis/Gangsa/Perak/Emas) — drawn natively
    // at 220px wide (see NATIVE_W's own comment) inside one uniform scale,
    // then that whole block is centered in the output canvas. Height
    // varies a few px per color, same as the live card, so it's centered
    // by its own real extent rather than forced into a fixed box.
    const shapeDef = CARD_SHAPES[colorKey];
    const starSetKey = subTier ? STAR_SET_FOR_RANK[colorKey]?.[subTier] : null;
    const starSet = starSetKey ? STAR_SETS[starSetKey] : null;
    const starPlacement = subTier ? STAR_PLACEMENT[`${colorKey}-${subTier}`] : null;
    const crownH = shapeDef.topEdgeY;
    const bodyH = shapeDef.viewBoxH - shapeDef.topEdgeY;
    const headroomTop = starPlacement ? Math.max(0, -starPlacement.top) : 0;
    const totalH = crownH + bodyH + headroomTop;

    const scale = OUTPUT_W / NATIVE_W;
    const originX = (CW - OUTPUT_W) / 2;
    const originY = (CH - totalH * scale) / 2;

    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    drawCardShape(ctx, colorKey, shapeDef, 0, headroomTop, t.stops, t.border, starSet, starPlacement);
    const bodyBottom = totalH;
    await drawShapedCardContent(ctx, { profile, cardStats, rank, t, bodyBottom });

    // ── Achievement badges (right-edge diamond stack) ────
    if (achievementBadges?.length) {
      const badgeSize = NATIVE_W * ACHIEVEMENT_BADGE_LAYOUT.badgeSizeFrac;
      const gap = NATIVE_W * ACHIEVEMENT_BADGE_LAYOUT.gapFrac;
      const lastBadgeTop = bodyBottom - NATIVE_W * ACHIEVEMENT_BADGE_LAYOUT.bottomFrac - badgeSize;
      const topStart = lastBadgeTop - (BADGE_TYPE_LIST.length - 1) * (badgeSize + gap);
      const badgeX = (NATIVE_W + badgeSize * ACHIEVEMENT_BADGE_LAYOUT.overflowFrac) - badgeSize;
      achievementBadges.forEach((b, i) => {
        drawAchievementBadge(ctx, b.type, b.rarity, badgeX, topStart + i * (badgeSize + gap), badgeSize);
      });
    }

    ctx.restore();
  } else {
    // ── Card background + shine ───────────────────────────
    ctx.save();
    rrect(ctx, cx, cy, cw, ch, 20); ctx.clip();
    ctx.fillStyle = grad145(ctx, cx, cy, cw, ch, t.stops);
    ctx.fillRect(cx, cy, cw, ch);
    const shine = ctx.createLinearGradient(cx, cy, cx + cw * 0.7, cy + ch * 0.7);
    shine.addColorStop(0, 'rgba(255,255,255,0.13)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(cx, cy, cw, ch);

    // Foil rainbow overlay
    if (customTheme?.foilEnabled) {
      const foil = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
      foil.addColorStop(0,    'rgba(255,0,0,0.09)');
      foil.addColorStop(0.17, 'rgba(255,165,0,0.09)');
      foil.addColorStop(0.33, 'rgba(255,255,0,0.09)');
      foil.addColorStop(0.5,  'rgba(0,255,100,0.09)');
      foil.addColorStop(0.67, 'rgba(0,150,255,0.09)');
      foil.addColorStop(0.83, 'rgba(150,0,255,0.09)');
      foil.addColorStop(1,    'rgba(255,0,150,0.09)');
      ctx.fillStyle = foil;
      ctx.fillRect(cx, cy, cw, ch);
    }
    ctx.restore();

    // ── Pattern overlay ───────────────────────────────────
    if (customTheme?.pattern && customTheme.pattern !== 'none')
      drawPattern(ctx, customTheme.pattern, customTheme.patternColor, customTheme.patternOpacity, cx, cy, cw, ch);

    // Card border
    ctx.save();
    rrect(ctx, cx, cy, cw, ch, 20);
    ctx.strokeStyle = t.border; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();

    // ── Overall (top-left) ────────────────────────────────
    const overall = Math.round(STAT_KEYS.reduce((s, k) => s + (cardStats[k] || 0), 0) / 6);
    ctx.fillStyle = t.text;
    ctx.textBaseline = 'top';
    ctx.font = `700 62px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(String(overall), cx + 16, cy + 14);

    // Position label below overall
    ctx.font = `700 14px 'Space Mono', monospace`;
    ctx.fillText(POS_ABBR[profile?.position] || profile?.position || 'POS', cx + 16, cy + 86);

    // ── Top-right: badge label (if set) or rank ───────────
    if (customTheme?.badgeLabel) {
      const bc  = customTheme.badgeColor || t.border;
      const txt = customTheme.badgeLabel;
      ctx.save();
      ctx.font = `700 13px 'Bebas Neue', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width;
      const bPad = 10, bH = 20;
      const bW = tw + bPad * 2;
      const bx = cx + cw - 14 - bW;
      const by = cy + 14;
      ctx.fillStyle = bc + '25';
      rrect(ctx, bx, by, bW, bH, 3); ctx.fill();
      ctx.strokeStyle = bc + '70'; ctx.lineWidth = 1;
      rrect(ctx, bx, by, bW, bH, 3); ctx.stroke();
      ctx.fillStyle = bc;
      ctx.fillText(txt, bx + bW / 2, by + bH / 2);
      ctx.font = `700 9px 'Space Mono', monospace`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = t.muted;
      ctx.fillText(rank, cx + cw - 14, by + bH + 3);
      ctx.restore();
    } else {
      ctx.font = `700 13px 'Space Mono', monospace`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = t.muted;
      ctx.fillText(rank, cx + cw - 14, cy + 16);
    }

    // ── Avatar ────────────────────────────────────────────
    const avR = 72;
    const avX = cx + cw / 2;
    const avY = cy + 56 + avR;   // top of avatar circle at cy+56

    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.clip();

    let drewAvatar = false;
    if (profile?.avatar_url) {
      const img = await loadImg(profile.avatar_url);
      if (img) {
        const ir = img.width / img.height;
        let isx = 0, isy = 0, isw = img.width, ish = img.height;
        if (ir > 1) { isw = ish; isx = (img.width - isw) / 2; }
        else        { ish = isw; isy = (img.height - ish) / 2; }
        ctx.drawImage(img, isx, isy, isw, ish, avX - avR, avY - avR, avR * 2, avR * 2);
        drewAvatar = true;
      }
    }
    if (!drewAvatar) {
      ctx.fillStyle = t.statBg;
      ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
      ctx.fillStyle = t.text;
      ctx.font = `700 52px 'Space Mono', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((profile?.name?.[0] || '?').toUpperCase(), avX, avY);
    }
    ctx.restore();

    // Avatar border ring
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.strokeStyle = t.border; ctx.lineWidth = 3; ctx.stroke();

    // ── Player name ───────────────────────────────────────
    const nameY = cy + 56 + avR * 2 + 22;
    const playerName = (profile?.name || 'PLAYER').toUpperCase();
    const isSubscribed = !!(profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date());

    ctx.fillStyle = t.text;
    ctx.font = `700 24px 'Bebas Neue', sans-serif`;
    ctx.textBaseline = 'alphabetic';

    if (isSubscribed) {
      const tickR = 8;
      const tickGap = 5;
      const nameWidth = ctx.measureText(playerName).width;
      const totalW = nameWidth + tickGap + tickR * 2;
      const startX = cx + cw / 2 - totalW / 2;

      ctx.textAlign = 'left';
      ctx.fillText(playerName, startX, nameY);

      const tickCX = startX + nameWidth + tickGap + tickR;
      const tickCY = nameY - 10;

      ctx.beginPath();
      ctx.arc(tickCX, tickCY, tickR, 0, Math.PI * 2);
      ctx.fillStyle = '#4a9eff';
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `700 9px 'Space Mono', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', tickCX, tickCY);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(playerName, cx + cw / 2, nameY);
    }

    // ── Divider ───────────────────────────────────────────
    const divY = nameY + 14;
    ctx.beginPath();
    ctx.moveTo(cx + 16, divY); ctx.lineTo(cx + cw - 16, divY);
    ctx.strokeStyle = t.border + '66'; ctx.lineWidth = 1; ctx.stroke();

    // ── Stats 3×2 grid ────────────────────────────────────
    const sTop  = divY + 12;
    const sGap  = 5;
    const sCW   = (cw - 32 - sGap * 2) / 3;
    const sCH   = 52;

    STAT_KEYS.forEach((key, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const sx = cx + 16 + col * (sCW + sGap);
      const sy = sTop + row * (sCH + sGap);

      ctx.fillStyle = t.statBg;
      rrect(ctx, sx, sy, sCW, sCH, 6); ctx.fill();

      ctx.fillStyle = t.text;
      ctx.font = `700 18px 'Space Mono', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(cardStats[key] || 0), sx + sCW / 2, sy + 30);

      ctx.fillStyle = t.muted;
      ctx.font = `700 9px 'Space Mono', monospace`;
      ctx.fillText(STAT_LABELS[i], sx + sCW / 2, sy + 44);
    });

    // ── Bottom row (pinned to card bottom) ────────────────
    const btmY = cy + ch - 12;
    ctx.beginPath();
    ctx.moveTo(cx + 16, btmY - 16); ctx.lineTo(cx + cw - 16, btmY - 16);
    ctx.strokeStyle = t.border + '66'; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = t.muted;
    ctx.font = `700 9px 'Space Mono', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      `${profile?.games_played || 0} GAMES PLAYED   ·   ${profile?.total_points || 30} OVR`,
      cx + cw / 2, btmY,
    );

    // ── Decorative elements (topmost layer) ──────────────
    if (customTheme) drawElements(ctx, customTheme, cx, cy, cw, ch);

    // ── Icon sticker ──────────────────────────────────────
    if (customTheme?.stickerIcon && customTheme.stickerIcon !== 'none') {
      const icon = STICKER_ICONS.find(i => i.key === customTheme.stickerIcon);
      if (icon) {
        const rel  = getStickerPos(customTheme.stickerPos, cw, ch);
        const sx   = cx + rel.x;
        const sy   = cy + rel.y;
        const size = customTheme.stickerSize ?? 36;
        const col  = customTheme.stickerColor || '#ffffff';
        const op   = customTheme.stickerOpacity ?? 0.9;
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${icon.d}" fill="${col}"/></svg>`;
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
        const sImg = await loadImg(svgUrl);
        if (sImg) {
          ctx.save();
          ctx.globalAlpha = op;
          ctx.drawImage(sImg, sx - size / 2, sy - size / 2, size, size);
          ctx.restore();
        }
      }
    }

    // ── Achievement badges (right-edge diamond stack) ─────
    if (achievementBadges?.length) {
      const badgeSize = cw * ACHIEVEMENT_BADGE_LAYOUT.badgeSizeFrac;
      const gap = cw * ACHIEVEMENT_BADGE_LAYOUT.gapFrac;
      const lastBadgeTop = (cy + ch) - cw * ACHIEVEMENT_BADGE_LAYOUT.bottomFrac - badgeSize;
      const topStart = lastBadgeTop - (BADGE_TYPE_LIST.length - 1) * (badgeSize + gap);
      const badgeX = (cx + cw + badgeSize * ACHIEVEMENT_BADGE_LAYOUT.overflowFrac) - badgeSize;
      achievementBadges.forEach((b, i) => {
        drawAchievementBadge(ctx, b.type, b.rarity, badgeX, topStart + i * (badgeSize + gap), badgeSize);
      });
    }
  }

  // ── Watermark ────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `700 16px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('BOLAHH.COM', CW / 2, CH - 16);

  return canvas;
}
