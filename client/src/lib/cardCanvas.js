// ─────────────────────────────────────────────
//  Card image generator — draws the FIFA card
//  to an off-screen canvas via Canvas 2D API.
//  No html2canvas: avoids CORS/border-radius bugs.
// ─────────────────────────────────────────────
import {
  STICKER_ICONS, getStickerPos,
  CARD_SHAPES, CARD_RECT_WIDTH, STAR_SETS, STAR_SET_FOR_RANK, STAR_PLACEMENT,
  ACHIEVEMENT_BADGE_LAYOUT, BADGE_TYPES, BADGE_TYPE_LIST, getCardColorKey, getCardSubTier, getBadgeColors,
} from '../components/FifaCard';

const CW = 520;   // output canvas width
const CH = 720;   // output canvas height
const CARD_W = 300;
const CARD_H = 450;
const CARD_X = (CW - CARD_W) / 2;   // 110
const CARD_Y = (CH - CARD_H) / 2;   // 135

const POS_ABBR = { Attacker: 'AT', Midfielder: 'MF', Defender: 'DF', Goalkeeper: 'GK' };
const STAT_KEYS   = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const STAT_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];

export const DEFAULT_BG = { id: 'dark', label: 'Dark', src: null };

function getTheme(rank) {
  if (rank.startsWith('Emas'))   return { stops: ['#b8860b','#ffd700','#b8860b'], border: '#ffd700', text: '#3a2a00', muted: '#6b4e00', statBg: 'rgba(0,0,0,0.2)' };
  if (rank.startsWith('Perak'))  return { stops: ['#3a7a96','#aadaef','#3a7a96'], border: '#6ec8e8', text: '#0b1e2b', muted: '#1a3c50', statBg: 'rgba(0,0,0,0.15)' };
  if (rank.startsWith('Gangsa')) return { stops: ['#7c4a1a','#cd7f32','#7c4a1a'], border: '#cd7f32', text: '#2a1400', muted: '#5a3010', statBg: 'rgba(0,0,0,0.2)' };
  return                                { stops: ['#2a2d30','#3d4144','#2a2d30'], border: '#555',    text: '#e8e9eb', muted: '#aaa',    statBg: 'rgba(255,255,255,0.1)' };
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
// sub-tier stars). Novis/Gangsa/Perak/Emas keep their true, unstretched
// proportions live (fixed width, body height varies a little per color —
// see CARD_SHAPES' own comment) but this canvas has a fixed cx/cy/cw/ch
// content box tuned for one fixed size, so here the shape is instead scaled
// non-uniformly (scaleX from the fixed width, scaleY from the fixed body
// height) to fit that box exactly. The stretch this introduces on the crown
// (a few percent, since the shapes' real proportions are all close) is
// invisible at the size this renders at — a much smaller risk than
// reflowing every hand-tuned content position to match a bottom-anchored,
// variable-height body the way the live card does.
function drawCardShape(ctx, colorKey, subTier, cx, cy, cw, ch, stops, borderColor) {
  const shapeDef = CARD_SHAPES[colorKey];
  const scaleX = cw / CARD_RECT_WIDTH;
  const scaleY = ch / (shapeDef.viewBoxH - shapeDef.topEdgeY);
  const crownH = shapeDef.topEdgeY * scaleY;
  const originX = cx - shapeDef.rectLeftX * scaleX;
  const originY = cy - crownH;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scaleX, scaleY);
  const shapePath = new Path2D(shapeDef.path);

  // Drop shadow: fill once (any opaque color) with the shadow set, then
  // fill again for real with no shadow — the standard canvas trick, since
  // shadowBlur/Offset would otherwise double up with the gradient fill.
  // Divided by scaleY so the shadow reads as the same physical size
  // regardless of a color's slightly different body-height stretch.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16 / scaleY;
  ctx.shadowOffsetY = 8 / scaleY;
  ctx.fillStyle = '#000';
  ctx.fill(shapePath);
  ctx.restore();

  ctx.fillStyle = shapeGradient(ctx, shapeDef.viewBoxW, shapeDef.viewBoxH, stops);
  ctx.fill(shapePath);
  ctx.fillStyle = shapeShine(ctx, shapeDef.viewBoxW, shapeDef.viewBoxH);
  ctx.fill(shapePath);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3 / scaleX;
  ctx.stroke(shapePath);

  // ── Sub-tier star(s) ──────────────────────────────────
  const starSetKey = subTier ? STAR_SET_FOR_RANK[colorKey]?.[subTier] : null;
  const starSet = starSetKey ? STAR_SETS[starSetKey] : null;
  const starPlacement = subTier ? STAR_PLACEMENT[`${colorKey}-${subTier}`] : null;
  if (starSet && starPlacement) {
    ctx.save();
    ctx.translate(starPlacement.left, starPlacement.top);
    ctx.scale(starPlacement.width / starSet.viewBoxW, starPlacement.height / starSet.viewBoxH);
    ctx.fillStyle = shapeGradient(ctx, starSet.viewBoxW, starSet.viewBoxH, stops);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.7 * starSet.viewBoxW / (starPlacement.width * scaleX);
    starSet.paths.forEach(d => {
      const p = new Path2D(d);
      ctx.fill(p);
      ctx.stroke(p);
    });
    ctx.restore();
  }

  ctx.restore();
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

export async function drawCardImage({ profile, cardStats, rank, bgUrl, customTheme, achievementBadges }) {
  await document.fonts.ready;

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
    // ── Card shape (crown silhouette + stars) + border ───
    drawCardShape(ctx, colorKey, subTier, cx, cy, cw, ch, t.stops, t.border);
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
  }

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

  // ── Watermark ────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `700 16px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('BOLAHH.COM', CW / 2, CH - 16);

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
    // Fixed 3-slot stack, filled from the top slot down — see the matching
    // comment in FifaCard.jsx for why this uses BADGE_TYPE_LIST.length
    // rather than achievementBadges.length.
    const lastBadgeTop = (cy + ch) - cw * ACHIEVEMENT_BADGE_LAYOUT.bottomFrac - badgeSize;
    const topStart = lastBadgeTop - (BADGE_TYPE_LIST.length - 1) * (badgeSize + gap);
    const badgeX = (cx + cw + badgeSize * ACHIEVEMENT_BADGE_LAYOUT.overflowFrac) - badgeSize;
    achievementBadges.forEach((b, i) => {
      drawAchievementBadge(ctx, b.type, b.rarity, badgeX, topStart + i * (badgeSize + gap), badgeSize);
    });
  }

  return canvas;
}
