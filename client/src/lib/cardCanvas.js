// ─────────────────────────────────────────────
//  Card image generator — draws the FIFA card
//  to an off-screen canvas via Canvas 2D API.
//  No html2canvas: avoids CORS/border-radius bugs.
// ─────────────────────────────────────────────
import { STICKER_ICONS, getStickerPos, CROWN_PATH } from '../components/FifaCard';
import { fetchBorderCatalog, resolveBorderRender } from './borderCatalog';

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

// Canvas2D counterpart to renderCardBorder() in FifaCard.jsx — draws the
// same procedural border descriptor primitives so the exported PNG matches the
// live card. The animated shimmer is a live-card-only flourish (CSS
// animation has no meaning on a static snapshot), so it's skipped here.
function drawBorder(ctx, border, cx, cy, cw, ch) {
  const pad = 11, arm = 16, sw = 2, rx = 13, innerGap = 5;
  const c  = border.color;
  const ac = border.accentColor || border.color;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = c; ctx.lineWidth = sw;
  if (border.frameDash) ctx.setLineDash([3, 4]);
  rrect(ctx, cx + pad, cy + pad, cw - pad * 2, ch - pad * 2, rx);
  ctx.stroke();
  ctx.setLineDash([]);

  if (border.frame === 'double') {
    ctx.strokeStyle = ac; ctx.lineWidth = sw * 0.7;
    rrect(ctx, cx + pad + innerGap, cy + pad + innerGap, cw - (pad + innerGap) * 2, ch - (pad + innerGap) * 2, Math.max(rx - innerGap, 2));
    ctx.stroke();
  }

  if (border.corners) {
    ctx.strokeStyle = c; ctx.lineWidth = sw;
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

  if (border.ticks) {
    ctx.strokeStyle = c; ctx.lineWidth = sw;
    for (let i = 1; i <= border.ticks; i++) {
      const x = cx + pad + ((cw - pad * 2) / (border.ticks + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, cy + ch - pad);
      ctx.lineTo(x, cy + ch - pad - 8);
      ctx.stroke();
    }
  }

  if (border.badgeIcon === 'crown') {
    const size = 20;
    ctx.save();
    ctx.translate(cx + cw / 2 - size / 2, cy + pad - size * 0.55);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = ac;
    ctx.fill(new Path2D(CROWN_PATH));
    ctx.restore();
  }

  if (border.laurel) {
    ctx.fillStyle = ac;
    ctx.globalAlpha = 0.85;
    const ly = cy + ch - pad - 16;
    [[cx + pad + 6, false], [cx + cw - pad - 6, true]].forEach(([lx, flip]) => {
      const s = flip ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(lx + s * (6 + i * 5), ly - i * 2);
        ctx.rotate((s * (18 + i * 9)) * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.globalAlpha = 1;
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

export async function drawCardImage({ profile, cardStats, rank, bgUrl, customTheme, equippedBorder }) {
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

  // ── Watermark ────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `700 16px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('BOLAHH.COM', CW / 2, CH - 16);

  // ── Decorative elements (topmost layer) ──────────────
  if (customTheme) drawElements(ctx, customTheme, cx, cy, cw, ch);

  // ── Equipped cosmetic border ──────────────────────────
  if (equippedBorder) {
    const rows = await fetchBorderCatalog();
    const render = resolveBorderRender(rows.find(r => r.key === equippedBorder), 'card');
    if (render?.type === 'procedural') {
      drawBorder(ctx, render, cx, cy, cw, ch);
    } else if (render?.type === 'image') {
      const img = await loadImg(render.imageUrl);
      if (img) {
        // Unclipped, same 4% overscale as the live card (FifaCard.jsx) — the
        // border renders its full shape on top rather than being cropped to
        // the card's rounded rect.
        const bleed = 1.04;
        const bw = cw * bleed, bh = ch * bleed;
        const bx = cx - (bw - cw) / 2, by = cy - (bh - ch) / 2;
        ctx.drawImage(img, bx, by, bw, bh);
      }
    }
  }

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

  return canvas;
}
