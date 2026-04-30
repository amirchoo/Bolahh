// ─────────────────────────────────────────────
//  Card image generator — draws the FIFA card
//  to an off-screen canvas via Canvas 2D API.
//  No html2canvas: avoids CORS/border-radius bugs.
// ─────────────────────────────────────────────

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
  if (rank.startsWith('Perak'))  return { stops: ['#6e7275','#c0c0c0','#6e7275'], border: '#c0c0c0', text: '#1a1a1a', muted: '#444',    statBg: 'rgba(0,0,0,0.2)' };
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

export async function drawCardImage({ profile, cardStats, rank, bgUrl }) {
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width  = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d');
  const t   = getTheme(rank);
  const cx  = CARD_X, cy = CARD_Y, cw = CARD_W, ch = CARD_H;

  // ── Background ────────────────────────────────────────
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
  ctx.restore();

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

  // ── Rank (top-right) ──────────────────────────────────
  ctx.font = `700 13px 'Space Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillStyle = t.muted;
  ctx.fillText(rank, cx + cw - 14, cy + 16);

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
  ctx.fillStyle = t.text;
  ctx.font = `700 24px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText((profile?.name || 'PLAYER').toUpperCase(), cx + cw / 2, nameY);

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
    `${profile?.games_played || 0} GAMES PLAYED   ·   ${profile?.total_points || 0} PTS`,
    cx + cw / 2, btmY,
  );

  // ── Watermark ────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `700 16px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('BOLAHH.COM', CW / 2, CH - 16);

  return canvas;
}
