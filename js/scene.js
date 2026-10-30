// 도트 씬 렌더러: 192×108 원본을 그려 화면 크기에 맞게 정수배 확대. 8fps, 화면이 안 보이면 멈춤 (NFR-PRF-003)
import { SCENE_W, SCENE_H, VILLAGE_STAND, AVATARS, MASCOT, DIVER_SWIM, drawVillage, drawDive, drawFireworks } from './art.js';
import { drawPixels } from './pixel.js';

const FPS = 8;
const scenes = new Set();
let tick = 0, last = 0, raf = 0;

/** kind: 'village' | 'dive'. getOpts() → { time, avatar, celebrate, depth } */
export function mountScene(canvas, kind, getOpts) {
  const off = document.createElement('canvas');
  off.width = SCENE_W; off.height = SCENE_H;
  const s = { canvas, kind, getOpts, off, octx: off.getContext('2d'), k: 0 };
  s.octx.imageSmoothingEnabled = false;
  scenes.add(s);
  draw(s);
  start();
  return () => scenes.delete(s);
}

function draw(s) {
  const o = s.getOpts();
  const c = s.octx;
  if (s.kind === 'village') {
    drawVillage(c, { time: o.time, tick });
    const av = AVATARS[o.avatar] || AVATARS.straw;
    drawPixels(c, av.frames[Math.floor(tick / 4) % 2], VILLAGE_STAND.x, VILLAGE_STAND.y);
    const mf = ((o.happy || o.celebrate) && MASCOT.happy) ? MASCOT.happy : MASCOT.frames;
    const bob = Math.floor(tick / 6) % 2;
    drawPixels(c, mf[Math.floor(tick / 3) % 2], VILLAGE_STAND.x + 20, VILLAGE_STAND.y - 4 - bob);
    if (o.celebrate) drawFireworks(c, { tick, seed: 7 });
  } else {
    drawDive(c, { depth: o.depth || 0, tick });
    const bob = Math.floor(tick / 5) % 2;
    drawPixels(c, DIVER_SWIM[Math.floor(tick / 3) % 2], 88, 46 + bob);
  }
  // 화면에 맞게 정수배로 키운 캔버스에 복사 (흐림 없음)
  const cw = s.canvas.clientWidth || SCENE_W;
  const k = Math.max(1, Math.ceil((cw * (window.devicePixelRatio || 1)) / SCENE_W));
  if (k !== s.k) { s.k = k; s.canvas.width = SCENE_W * k; s.canvas.height = SCENE_H * k; }
  const ctx = s.canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.off, 0, 0, SCENE_W * k, SCENE_H * k);
}

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (document.hidden || t - last < 1000 / FPS) return;
  last = t; tick++;
  for (const s of scenes) {
    if (!s.canvas.isConnected) { scenes.delete(s); continue; }
    if (s.canvas.offsetParent === null) continue; // 숨겨진 캔버스는 건너뜀
    draw(s);
  }
  if (!scenes.size) { cancelAnimationFrame(raf); raf = 0; }
}
function start() { if (!raf) raf = requestAnimationFrame(loop); }
export const sceneSize = { w: SCENE_W, h: SCENE_H };

/** 현재 시각(또는 설정)으로 마을 시간대 */
export function timeOfDay(theme = 'auto', d = new Date()) {
  if (theme !== 'auto') return theme;
  const h = d.getHours();
  return h >= 6 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'sunset' : 'night';
}
