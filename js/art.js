// ============================================================
// 도트 데이즈 (Dot Days) — 캐릭터 · 동료 · 장면 도트 아트
// - 모든 캐릭터/생물은 이 프로젝트 오리지널 디자인
// - 색은 pixel.js 의 PAL 키를 기본으로 쓰고, 하늘/바다 띠 같은 장면 전용 색만 이 파일에 정의
// - 장면은 192×108 원본 해상도로 그리고 앱이 CSS(image-rendering: pixelated)로 확대
// - import 시점에는 document 를 건드리지 않음 (오프스크린 캔버스는 함수 안에서 지연 생성)
// ============================================================
import { PAL, drawPixels } from './pixel.js';

// ------------------------------------------------------------
// 1. 스프라이트 도우미
// ------------------------------------------------------------
const BL16 = '................';
/** 숨쉬기 프레임: cut 행을 지우고 그 위쪽을 1px 아래로 내림 (발은 고정) */
const breathe = (f, cut) => [BL16, ...f.slice(0, cut), ...f.slice(cut + 1)];
/** 한 줄 위로 (떠오르기) */
const liftUp = (f, n = 1) => [...f.slice(n), ...Array(n).fill(BL16)];
/** 특정 행 교체 */
const withRows = (f, rows) => f.map((r, i) => (rows[i] !== undefined ? rows[i] : r));

// ------------------------------------------------------------
// 2. 아바타 (16×24, 2프레임 idle) — 같은 몸 베이스(머리 11px, 몸 8px, 다리 5px)
//    눈: 8~9행 / 볼·입: 10행 / 턱: 11~12행
// ------------------------------------------------------------
const STRAW_A = [
  '................',
  '.....kkkkkk.....',
  '....kyyYyyyk....',
  '....kyyyyyYk....',
  '...kkrrrrrrkk...',
  '.kkyyyyyyyyyykk.',
  'kyyYyyyyyyYyyyYk',
  '.kkDDssssssDDkk.',
  '..kDckcccckcDk..',
  '..kcckcccckcck..',
  '..kcpccPPccpck..',
  '...kcccccccsk...',
  '....kkkkkkkk....',
  '...kwwwwwwwwk...',
  '..kwwwwwwwwwlk..',
  '..kcwwwwwwwlck..',
  '..kcwwwwwwwlck..',
  '...kBBBBBBBBk...',
  '...kbBBBBBBBk...',
  '...kBBBkkBBBk...',
  '...kcck..kcsk...',
  '...kcck..kcsk...',
  '..krrrk..krrrk..',
  '..kkkkk..kkkkk..',
];

const DIVER_A = [
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkSSySSSkk...',
  '..kKKKKKKKKKKk..',
  '..kKaiaaaaaaKk..',
  '..kSKKKKKKKKSk..',
  '..kSScSSSScSdk..',
  '..kcckcccckcck..',
  '..kcckcccckcck..',
  '..kcpccPPccpck..',
  '...kcccccccsk...',
  '....kkkkkkkk....',
  '...ktTTTTTTTk...',
  '..ktTTTTTTTTTk..',
  '..ktaaaaaaaaTk..',
  '..kcTTTTTTTTck..',
  '...kTTTTTTTTk...',
  '...kNNNllNNNk...',
  '...kTTTkkTTTk...',
  '...kTTk..kTTk...',
  '...ktTk..ktTk...',
  '..kNNNk..kNNNk..',
  '..kkkkk..kkkkk..',
];

const RANGER_A = [
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkrrrrrrkk...',
  '..krrwrrrrwrRkk.',
  '..kRRRRRRRRRRkrk',
  '..kddDdddDddDkRk',
  '..kdddcddcdddkk.',
  '..kdckcccckcdk..',
  '..kcckcccckcck..',
  '..kcpccPPccpck..',
  '...kcccccccskkk.',
  '....kkkkkkkkkSdk',
  '..kgGGDssDGGfkdk',
  '.kgGGGDssDGGGfkk',
  '.kGGGGDssDGGGGk.',
  '.kfGfkDssDkfGfk.',
  '..kkkcssssSckk..',
  '...kdDDYDDDdk...',
  '...kdddkkdddk...',
  '...kcck..kcsk...',
  '...kDDk..kDDk...',
  '..kDDDk..kDDDk..',
  '..kkkkk..kkkkk..',
];

const KEEPER_A = [
  '................',
  '........kk......',
  '.....kkkKkk.....',
  '...kkKKKKKKkk...',
  '..kKMMKKKKKKKk..',
  '..kKMKKKKKKKKk..',
  '..kKKKKKKKKKKk..',
  '..kKKcKKKKcKKk..',
  '..kKkkkcckkkKk..',
  '..kkiaakkiaakk..',
  '..kcpccPPccpck..',
  '...kcccccccsk...',
  '....kkkkkkkk....',
  '...knnwwwwnnk...',
  '..knnnnwwnnnNk..',
  '..knnnnYnnnnNk..',
  '..kcnnnnnnnNck..',
  '...knnnYnnnNkkk.',
  '...knnnnnnnNkDDk',
  '...kNNNkkNNNkyik',
  '...kNNk..kNNkYyk',
  '...kDDk..kDDkDDk',
  '..kDDDk..kDDDkk.',
  '..kkkkk..kkkkk..',
];

export const AVATARS = {
  straw: {
    name: '밀짚모자',
    desc: '여름방학을 맞아 바닷가 마을에 놀러 온 아이. 밀짚모자와 흰 티셔츠가 트레이드마크.',
    frames: [STRAW_A, breathe(STRAW_A, 15)],
  },
  diver: {
    name: '견습 다이버',
    desc: '바다를 누구보다 좋아하는 견습 다이버. 물안경은 늘 이마에 올려 둔다.',
    frames: [DIVER_A, breathe(DIVER_A, 17)],
  },
  ranger: {
    name: '마을 모험가',
    desc: '반다나를 질끈 묶고 작은 배낭을 멘 모험가. 초록 망토를 휘날리며 마을 구석구석을 누빈다.',
    frames: [RANGER_A, breathe(RANGER_A, 15)],
  },
  keeper: {
    name: '등대지기',
    desc: '동그란 안경을 쓴 차분한 등대지기. 밤이면 손등불을 들고 항구를 한 바퀴 돈다.',
    frames: [KEEPER_A, breathe(KEEPER_A, 15)],
  },
};

// ------------------------------------------------------------
// 3. 동료 몽글이 (16×16) — 둥실 떠다니는 바다 젤리
// ------------------------------------------------------------
const MONG_A = [
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkaaaaaakk...',
  '..kaaiiaaaaaak..',
  '..kaiaaaaaaaak..',
  '.kaaaaaaaaaaaak.',
  '.kaaakaaaakaaak.',
  '.kaaakaaaakaaak.',
  '.kapaaaPPaaapak.',
  '.ktttttttttttTk.',
  '..kttttttttTTk..',
  '..kkkkkkkkkkkk..',
  '...Tt..Tt..Tt...',
  '....Tt..Tt..Tt..',
  '................',
];
const MONG_B = withRows(liftUp(MONG_A), {
  12: '....Tt..Tt..Tt..',
  13: '...Tt..Tt..Tt...',
  14: '..T...T...T.....',
});
const MONG_HAPPY_A = withRows(MONG_A, {
  0: '.............y..',
  1: '............yiy.',
  2: '.....kkkkkk..y..',
  8: '.kaakakaakakaak.',
  9: '.kapaaaRRaaapak.',
});
const MONG_HAPPY_B = withRows(liftUp(MONG_HAPPY_A, 1), {
  0: '..y.............',
  1: '.yiy.kkkkkk.....',
  2: '..ykkaaaaaakk...',
  12: '....Tt..Tt..Tt..',
  13: '...Tt..Tt..Tt...',
  14: '..T...T...T.....',
});

export const MASCOT = {
  name: '몽글이',
  desc: '물빛 마을 앞바다에서 태어난 말랑말랑 바다 젤리. 할 일을 끝내면 함께 기뻐해 준다.',
  frames: [MONG_A, MONG_B],
  happy: [MONG_HAPPY_A, MONG_HAPPY_B],
};

// ------------------------------------------------------------
// 4. 헤엄치는 다이버 (16×16, 오른쪽을 보고 헤엄)
// ------------------------------------------------------------
const SWIM_A = [
  '................',
  '...........kkk..',
  '..........kSSSk.',
  '.k..kkkkkkSSySSk',
  'kYkkyyyyySSSSSdk',
  'kYttYYYYOSKKKKKk',
  'kYTTtttttScKKaik',
  '.kkTNTTTTcccKaak',
  'kYTTNTTTTkccKKKk',
  'kYkkNTTTkkkccMk.',
  'kYk.kkkk...kkk..',
  '.k..............',
  '................',
  '................',
  '................',
  '................',
];
const SWIM_B = [
  '................',
  '...........kkk..',
  '..........kSSSk.',
  '....kkkkkkSSySSk',
  '.k.kyyyyySSSSSdk',
  'kYkkYYYYOSKKKKKk',
  'kYtttttttScKKaik',
  'kYTTNTTTTcccKaak',
  'kYTTNTTTTkccKKKk',
  'kYkkNTTTkkkccMk.',
  '.k..kkkk...kkk..',
  '................',
  '................',
  '................',
  '................',
  '................',
];
export const DIVER_SWIM = [SWIM_A, SWIM_B];

// ============================================================
// 5. 장면 공통
// ============================================================
const W = 192, H = 108, HZ = 58; // HZ: 수평선(바다 첫 행)
export const SCENE_W = W, SCENE_H = H;
/** 아바타(16×24) 좌상단. 몽글이는 x+20, y-4 근처에 그려짐 */
export const VILLAGE_STAND = { x: 80, y: 72 };

function makeCanvas(w, h) {
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  throw new Error('art.js: 캔버스를 만들 수 없는 환경');
}
function ctx2d(c) {
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}

// ---- 색 도우미 ----
const _rgb = new Map();
const hex = (c) => (c && c[0] === '#' ? c : PAL[c]);
function rgb(c) {
  const h = hex(c);
  let v = _rgb.get(h);
  if (!v) {
    const n = parseInt(h.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    _rgb.set(h, v);
  }
  return v;
}
const c8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toHex = (r, g, b) => '#' + ((1 << 24) | (c8(r) << 16) | (c8(g) << 8) | c8(b)).toString(16).slice(1);
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function mul(a, b) {
  const A = rgb(a), B = rgb(b);
  return toHex((A[0] * B[0]) / 255, (A[1] * B[1]) / 255, (A[2] * B[2]) / 255);
}
/** 메모이즈된 색 변환기 */
function memoTone(fn) {
  const m = new Map();
  return (c) => {
    const h = hex(c);
    let v = m.get(h);
    if (!v) { v = fn(h); m.set(h, v); }
    return v;
  };
}
const toneOf = (fn) => {
  const t = memoTone(fn);
  const pal = {};
  for (const k in PAL) pal[k] = t(k);
  t.pal = pal;
  return t;
};

// 시간대별 지상 색 보정 (낮: 그대로)
const TONES = {};
function tone(time) {
  if (TONES[time]) return TONES[time];
  let fn;
  if (time === 'sunset') fn = (c) => mix(mul(c, '#ffd3b6'), '#9c5f8a', 0.16);
  else if (time === 'night') fn = (c) => mix(mul(c, '#7383b3'), '#18223f', 0.36);
  else fn = (c) => c;
  return (TONES[time] = toneOf(fn));
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 픽셀 버퍼: 색을 칠하면서 tag(레이어 번호)도 기록 */
class Buf {
  constructor(w = W, h = H) {
    this.w = w; this.h = h;
    this.d = new Array(w * h).fill(null);
    this.tag = new Uint8Array(w * h);
    this.t = 0;
    this.g = hex; // 색 변환기
  }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.d[i] = this.g(c);
    this.tag[i] = this.t;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  }
  tagAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.tag[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  disc(cx, cy, r, c) {
    const rr = r * r + r * 0.6;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= rr) this.set(cx + dx, cy + dy, c);
  }
  spr(px, x, y) {
    for (let j = 0; j < px.length; j++)
      for (let i = 0; i < px[j].length; i++) {
        const ch = px[j][i];
        if (ch !== '.' && ch !== ' ') this.set(x + i, y + j, ch);
      }
  }
  canvas() {
    const cv = makeCanvas(this.w, this.h);
    const g = ctx2d(cv);
    const img = g.createImageData(this.w, this.h);
    const D = img.data;
    for (let i = 0; i < this.d.length; i++) {
      const c = this.d[i];
      if (!c) continue;
      const v = rgb(c);
      D[i * 4] = v[0]; D[i * 4 + 1] = v[1]; D[i * 4 + 2] = v[2]; D[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
}

/** 체커보드 디더 (lvl 1=25%, 2=50%, 3=75%) */
function dith(x, y, lvl) {
  if (lvl <= 0) return false;
  if (lvl >= 4) return true;
  if (lvl === 2) return ((x + y) & 1) === 0;
  const q = (x + ((y & 1) << 1)) & 3;
  return lvl === 1 ? q === 0 : q !== 2;
}
/** 색 띠 + 경계 3행 디더 */
function bands(b, y0, y1, colors, bounds) {
  for (let y = y0; y < y1; y++) {
    let i = 0;
    while (i < bounds.length && y >= bounds[i]) i++;
    for (let x = 0; x < b.w; x++) {
      let c = colors[i];
      if (i < bounds.length) {
        const d = bounds[i] - y;
        if (d <= 3 && dith(x, y, 4 - d)) c = colors[i + 1];
      }
      b.set(x, y, c);
    }
  }
}

/** px 스프라이트 → 캔버스 (팔레트 지정) */
function sprCanvas(px, pal = PAL) {
  const w = Math.max(...px.map((r) => r.length));
  const cv = makeCanvas(w, px.length);
  drawPixels(ctx2d(cv), px, 0, 0, 1, pal);
  return cv;
}
const flipX = (px) => px.map((r) => r.split('').reverse().join(''));

function fill(ctx, c, x, y, w = 1, h = 1) {
  ctx.fillStyle = hex(c);
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ============================================================
// 6. 마을 (물빛 마을)
// ============================================================
const SKY = {
  day: { c: ['#7dbadb', '#92c7e2', '#a8d4e8', '#bfe0ec', '#d6ebee'], b: [14, 26, 37, 48] },
  sunset: { c: ['#665b9b', '#8c73ad', '#bc84a6', '#e2988e', '#f1b47e'], b: [14, 26, 37, 48] },
  night: { c: ['#131b33', '#17213d', '#1c2a4a', '#223557', '#2a4264'], b: [14, 26, 37, 48] },
};
const SEA = {
  day: { c: ['#4a8cb8', '#5c9ec6', '#73b4d3', '#8cc8da'], b: [61, 66, 72], wave: '#a7d8e3', glint: '#ffffff' },
  sunset: { c: ['#6c5f99', '#80699f', '#9d77a2', '#bb869e'], b: [61, 66, 72], wave: '#d59a9e', glint: '#ffe0a6' },
  night: { c: ['#17284a', '#1b2f52', '#20375b', '#253f64'], b: [61, 66, 72], wave: '#30507a', glint: '#ebe7c9' },
};
const CLOUD_COL = {
  day: { hi: '#ffffff', lit: '#fffaf0', mid: '#e8eff2', sh: '#cddbe5', base: '#b4c9d8' },
  sunset: { hi: '#ffe6c6', lit: '#f8c8a2', mid: '#e8a99f', sh: '#b98ba8', base: '#957298' },
  night: { hi: '#5d6c9b', lit: '#44527e', mid: '#3c4875', sh: '#343f6a', base: '#2d3761' },
};
// 구름 모양: 원(cx, cy, r) 묶음. speed = 1px 이동에 걸리는 tick 수
const CLOUDS = [
  { base: 46, x0: 34, y: 12, speed: 64, discs: [[10, 40, 7], [22, 36, 10], [38, 34, 12], [56, 33, 12], [72, 36, 10], [84, 40, 7], [30, 24, 10], [46, 20, 13], [62, 24, 10], [42, 9, 9], [54, 11, 8]] },
  { base: 11, x0: 4, y: 5, speed: 18, discs: [[6, 7, 5], [14, 5, 6], [23, 6, 6], [31, 8, 4]] },
  { base: 9, x0: 146, y: 20, speed: 26, discs: [[5, 5, 4], [12, 4, 5], [19, 6, 4]] },
];

function cloudCanvas(shape, cc) {
  let maxX = 0;
  for (const [x, , r] of shape.discs) maxX = Math.max(maxX, x + r);
  const w = maxX + 2, h = shape.base + 1;
  const lit = new Uint8Array(w * h);
  const discs = [...shape.discs].sort((a, b) => a[1] - b[1]);
  for (const [cx, cy, r] of discs) {
    const lx = cx - r * 0.3, ly = cy - r * 0.4, lr = r * 0.84;
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (y < 0 || y > shape.base || x < 0 || x >= w) continue;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > r * r + r * 0.5) continue;
        const ex = x - lx, ey = y - ly;
        lit[y * w + x] = ex * ex + ey * ey <= lr * lr ? 2 : 1;
      }
  }
  const b = new Buf(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, v = lit[i];
      if (!v) continue;
      const up = y > 0 ? lit[i - w] : 0;
      const up2 = y > 1 ? lit[i - 2 * w] : 0;
      let c;
      if (v === 2) c = !up || (x > 0 && !lit[i - w - 1]) ? cc.hi : cc.lit;
      else if (up === 2) c = (x + y) & 1 ? cc.mid : cc.lit;
      else if (up2 === 2) c = (x + y) & 1 ? cc.sh : cc.mid;
      else c = cc.sh;
      if (y >= shape.base - 2) c = y === shape.base || (x + y) & 1 ? cc.base : c;
      b.set(x, y, c);
    }
  return b.canvas();
}

const SUN_X = 150, MOON_X = 140;

// ---- 하늘 (시간대별 캐시) ----
function buildSky(time) {
  const b = new Buf();
  const S = SKY[time];
  bands(b, 0, HZ, S.c, S.b);
  const stars = [];
  if (time === 'sunset') {
    // 수평선에 걸린 해 + 디더 후광
    const sx = SUN_X, sy = 57;
    for (let y = sy - 15; y < HZ; y++)
      for (let x = sx - 16; x <= sx + 16; x++) {
        const d = Math.hypot(x - sx, (y - sy) * 1.1);
        if (d <= 9) b.set(x, y, d <= 7 ? '#fbe2a0' : '#f8cf86');
        else if (d <= 12 && dith(x, y, 2)) b.set(x, y, '#f5c27f');
        else if (d <= 15 && dith(x, y, 1)) b.set(x, y, '#f3bc80');
      }
  }
  if (time === 'night') {
    const r = rng(11);
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * 50);
      if (Math.hypot(x - 140, y - 15) < 12) continue;
      const tw = r() < 0.35;
      if (tw) stars.push({ x, y, p: Math.floor(r() * 24), per: 12 + Math.floor(r() * 14) });
      else b.set(x, y, r() < 0.5 ? '#5d6c96' : '#8995b8');
    }
    // 달 + 후광
    const mx = 140, my = 15;
    for (let y = my - 12; y <= my + 12; y++)
      for (let x = mx - 12; x <= mx + 12; x++) {
        const d = Math.hypot(x - mx, y - my);
        if (d <= 5.6) b.set(x, y, '#f3ecd0');
        else if (d <= 9 && dith(x, y, 2)) b.set(x, y, '#2c4166');
        else if (d <= 12 && dith(x, y, 1)) b.set(x, y, '#263a5e');
      }
    b.set(mx - 2, my - 1, '#ddd3b2'); b.set(mx + 1, my + 2, '#ddd3b2'); b.set(mx + 2, my + 1, '#ddd3b2');
    b.set(mx - 1, my + 3, '#e6dec2');
  }
  return { cv: b.canvas(), stars };
}

// ---- 지상 레이어 ----
const hillTop = (x) => Math.round(36 + Math.pow(x / 66, 1.8) * 42);
const LAMP = { x: 175, y: 41 };
const BOAT_POS = { x: 120, y: 63 };

function house(b, x, gy, w, wallH, roofH, roof, roofD, wall, wallD, wins, emis) {
  const wy = gy - wallH;
  // 벽
  for (let yy = wy; yy < gy; yy++)
    for (let xx = x; xx < x + w; xx++) b.set(xx, yy, xx >= x + w - 2 ? wallD : wall);
  b.rect(x, wy, w, 1, wallD); // 처마 그림자
  // 지붕 (사다리꼴, 기와 줄무늬)
  for (let j = 0; j < roofH; j++) {
    const yy = wy - 1 - j;
    const inset = Math.round((j * (w / 2 - 3)) / roofH);
    const x0 = x - 2 + inset, x1 = x + w + 1 - inset;
    for (let xx = x0; xx <= x1; xx++) {
      let c = j % 2 === 0 ? roofD : roof;
      if (j === roofH - 1) c = roofD;
      if (xx === x0 || xx === x1) c = 'k';
      b.set(xx, yy, c);
    }
  }
  b.rect(x - 2, wy - 1, w + 4, 1, 'K');
  // 창문
  for (const [wx, wyy, ww, wh] of wins) {
    emis.push([x + wx, wy + wyy, ww, wh]);
    b.rect(x + wx, wy + wyy, ww, wh, 'n');
    b.set(x + wx, wy + wyy, 'b');
  }
}

function tetrapod(b, x, y) {
  b.set(x + 1, y, 'l');
  b.set(x, y + 1, 'l'); b.set(x + 1, y + 1, 'm'); b.set(x + 2, y + 1, 'm');
  b.set(x, y + 2, 'm'); b.set(x + 2, y + 2, 'M');
}

function sunflowerHead(b, x, y, big) {
  if (big) {
    const P = [
      '..yyY..',
      '.yYYYYY',
      'yYdDDYO',
      'yYDDDYO',
      'YYDDDOO',
      '.YYYOO.',
      '..YOO..',
    ];
    b.spr(P, x - 3, y - 3);
  } else {
    const P = ['.yY.', 'yDdY', 'YDDO', '.YO.'];
    b.spr(P, x - 1, y - 1);
  }
}
const SUNFLOWERS = [
  // [바닥 x, 높이, 큰꽃?]
  [7, 24, 1], [15, 17, 0], [24, 29, 1], [33, 20, 1], [42, 14, 0], [50, 22, 1],
  [137, 18, 0], [146, 27, 1], [157, 21, 1], [168, 30, 1], [177, 16, 0], [186, 24, 1],
];
function buildSunflowers(time, pose) {
  const b = new Buf();
  b.g = tone(time);
  const base = 104;
  SUNFLOWERS.forEach(([x, h, big], i) => {
    const sway = (i + pose) % 2;
    const top = base - h;
    for (let y = base; y >= top; y--) {
      const xx = x + (y < top + h * 0.45 ? sway : 0);
      b.set(xx, y, 'G');
      b.set(xx + 1, y, y % 3 ? 'f' : 'G');
    }
    // 잎
    const ly = top + Math.round(h * 0.55);
    b.set(x - 1, ly, 'G'); b.set(x - 2, ly, 'g'); b.set(x - 2, ly - 1, 'g'); b.set(x - 3, ly - 1, 'G');
    b.set(x + 2, ly + 4, 'G'); b.set(x + 3, ly + 4, 'G'); b.set(x + 3, ly + 3, 'g'); b.set(x + 4, ly + 3, 'f');
    sunflowerHead(b, x + sway, top - 1, big);
  });
  // 풀 덤불 (꽃 밑동)
  const r = rng(5);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * 60) + (i % 2 ? 132 : 0);
    const y = 100 + Math.floor(r() * 6);
    b.set(x, y, r() < 0.5 ? 'g' : 'G');
    b.set(x, y - 1, 'G');
  }
  return b.canvas();
}

const BOAT = [
  '.........k..........',
  '.........k..........',
  '.....kkkkkkkk.......',
  '.....kwwwwwwk.......',
  '.....kwnnwnwk.......',
  'kkkkkkkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwwwwwk..',
  '..kBBBBBBBBBBBBBk...',
  '...kkkkkkkkkkkkk....',
];

function buildVillage(time) {
  const T = tone(time);
  const b = new Buf();
  const emis = [];
  const night = time === 'night';
  // ---- 바다 (장면 전용 색, 보정 없음) ----
  b.t = 1;
  const S = SEA[time];
  bands(b, HZ, 82, S.c, S.b);
  const r = rng(7);
  for (let i = 0; i < 60; i++) {
    const y = HZ + 2 + Math.floor(Math.pow(r(), 0.8) * 17);
    const x = Math.floor(r() * W);
    const len = 2 + Math.floor(r() * 2 + (y - HZ) / 7);
    for (let k = 0; k < len; k++) b.set(x + k, y, S.wave);
  }
  // ---- 지상 (시간대 보정) ----
  b.t = 2;
  b.g = T;
  // 먼 섬
  for (let x = 64; x <= 130; x++) {
    const h = Math.max(8 * (1 - ((x - 84) / 16) ** 2), 5 * (1 - ((x - 110) / 14) ** 2), x > 66 && x < 128 ? 1 : 0);
    if (h <= 0) continue;
    const top = HZ - Math.round(h);
    for (let y = top; y < HZ; y++) {
      let c = '#87acae';
      if (y === top && x < 100) c = '#9dbfbb';
      else if (x > 86 && y > top && dith(x, y, 2)) c = '#7a9fa4';
      b.set(x, y, c);
    }
  }
  b.set(84, HZ - 9, '#e9e5d8'); b.set(84, HZ - 10, '#e9e5d8');
  for (let x = 66; x < 128; x += 1) if (dith(x, HZ, 2)) b.set(x, HZ, '#a7d6e0');
  // 방파제 + 테트라포드
  for (let x = 146; x < W; x++) {
    b.set(x, 66, 'w'); b.set(x, 67, 'l');
    for (let y = 68; y <= 71; y++) b.set(x, y, (x - 146) % 11 === 0 ? 'M' : y === 71 ? 'M' : 'm');
  }
  for (let y = 66; y <= 71; y++) b.set(145, y, 'M');
  for (const tx of [144, 150, 156, 163, 170, 178, 186]) tetrapod(b, tx, 70 + (tx % 3 === 0 ? 1 : 0));
  // 등대 (흰 몸통 + 붉은 띠)
  for (let y = 46; y <= 65; y++) {
    const half = y < 54 ? 3 : 4;
    for (let x = 175 - half; x <= 176 + half - 1 + 1; x++) {
      let c = 'w';
      if (x >= 176 + half - 1) c = 'l';
      if (x === 175 - half) c = 'c';
      if (y >= 52 && y <= 55) c = x >= 176 + half - 1 ? 'R' : 'r';
      b.set(x, y, c);
    }
  }
  b.rect(174, 61, 3, 5, 'n'); b.set(174, 61, 'B');
  b.rect(171, 45, 10, 1, 'M'); b.rect(171, 44, 10, 1, 'K');
  b.set(171, 43, 'K'); b.set(180, 43, 'K');
  b.rect(172, 39, 8, 5, 'K');
  b.rect(173, 40, 6, 3, 'a');
  b.set(173, 40, 'i');
  b.rect(172, 38, 8, 1, 'R'); b.rect(173, 37, 6, 1, 'R'); b.rect(174, 36, 4, 1, 'R');
  b.rect(175, 35, 2, 1, 'K');
  if (time !== 'day') emis.push([173, 40, 6, 3, 'lamp']);
  // 언덕
  for (let x = 0; x <= 70; x++) {
    const top = hillTop(x);
    for (let y = top; y < 80; y++) {
      let c = 'G';
      if (y === top) c = 'g';
      else if (y === top + 1 && x % 3 === 0) c = 'g';
      else if ((x * 7 + y * 11) % 19 === 0) c = 'f';
      else if ((x * 5 + y * 3) % 23 === 0) c = 'g';
      else if (y > 72) c = dith(x, y, y > 75 ? 2 : 1) ? 'f' : 'G';
      b.set(x, y, c);
    }
  }
  // 나무 덤불
  for (const [tx, ty, tr] of [[4, 36, 5], [13, 33, 4], [44, 48, 5], [52, 54, 4], [30, 41, 4]]) {
    b.disc(tx, ty, tr, 'f');
    b.disc(tx - 1, ty - 1, tr - 1, 'G');
    b.set(tx - 2, ty - tr + 1, 'g'); b.set(tx - 1, ty - tr + 1, 'g'); b.set(tx - 3, ty - tr + 2, 'g');
  }
  // 집 3채 (계단식)
  const stone = (x, gy, w) => { b.rect(x - 1, gy, w + 2, 1, 'l'); b.rect(x - 1, gy + 1, w + 2, 2, 'm'); for (let xx = x; xx < x + w; xx += 4) b.set(xx, gy + 1 + ((xx / 4) % 2), 'M'); };
  house(b, 3, 42, 18, 7, 6, 'n', 'N', 'c', 's', [[3, 2, 3, 2], [11, 2, 3, 2]], emis);
  stone(3, 42, 18);
  house(b, 25, 53, 17, 7, 5, 'O', 'R', 'w', 'l', [[3, 2, 2, 3], [9, 2, 4, 2]], emis);
  stone(25, 53, 17);
  house(b, 41, 68, 16, 8, 5, 'T', 'f', 'c', 's', [[2, 2, 3, 2]], emis);
  // 가게 차양(줄무늬) + 자판기
  for (let xx = 47; xx < 57; xx++) { b.set(xx, 63, xx % 2 ? 'B' : 'w'); b.set(xx, 64, xx % 2 ? 'n' : 'l'); }
  b.rect(48, 65, 7, 3, 'D');
  b.rect(58, 61, 5, 7, 'r'); b.rect(59, 62, 3, 3, 'w'); b.set(59, 66, 'k'); b.set(61, 66, 'k'); b.rect(62, 61, 1, 7, 'R');
  emis.push([59, 62, 3, 3, 'vend']);
  // 방조제
  for (let x = 0; x < W; x++) {
    b.set(x, 77, 'w');
    b.set(x, 78, 'l');
    b.set(x, 79, x % 16 === 0 ? 'M' : 'm');
    b.set(x, 80, 'M');
  }
  // 길
  const r2 = rng(3);
  for (let y = 81; y < 101; y++)
    for (let x = 0; x < W; x++) {
      let c = 's';
      if (y === 81) c = 'S';
      else if (y === 82 && dith(x, y, 2)) c = 'S';
      b.set(x, y, c);
    }
  for (let i = 0; i < 90; i++) b.set(Math.floor(r2() * W), 84 + Math.floor(r2() * 16), r2() < 0.7 ? 'S' : 'd');
  // 풀밭
  for (let y = 101; y < H; y++)
    for (let x = 0; x < W; x++) b.set(x, y, y === 101 ? (dith(x, y, 2) ? 'g' : 'G') : y > 105 && dith(x, y, 2) ? 'f' : 'G');
  // 그림자 (아바타 / 몽글이)
  const sx = VILLAGE_STAND.x, sy = VILLAGE_STAND.y + 23;
  for (let x = sx + 1; x <= sx + 14; x++) { b.set(x, sy, 'S'); if (x > sx + 2 && x < sx + 13) b.set(x, sy + 1, 'S'); }
  for (let x = sx + 23; x <= sx + 32; x++) if (dith(x, sy + 1, 2) || (x > sx + 24 && x < sx + 31)) b.set(x, sy + 1, 'S');
  // 전봇대 + 전선
  const PX = 64;
  for (let y = 22; y <= 104; y++) { b.set(PX, y, 'd'); b.set(PX + 1, y, 'D'); }
  for (let y = 90; y <= 100; y++) { const c = Math.floor((y - 90) / 2) % 2 ? 'k' : 'Y'; b.set(PX, y, c); b.set(PX + 1, y, c); b.set(PX - 1, y, c === 'Y' ? 'y' : 'k'); b.set(PX + 2, y, c); }
  b.rect(57, 26, 16, 1, 'D'); b.rect(59, 31, 12, 1, 'D');
  for (const ix of [57, 61, 68, 72]) b.set(ix, 25, 'l');
  for (const ix of [59, 70]) b.set(ix, 30, 'l');
  b.rect(66, 35, 4, 6, 'm'); b.rect(66, 35, 1, 6, 'l'); b.rect(66, 41, 4, 1, 'M');
  b.rect(62, 58, 2, 3, 'Y');
  const wire = (x0, y0, x1, y1, sag) => {
    let prev = null;
    const xs = Math.max(0, Math.min(x0, x1)), xe = Math.min(W - 1, Math.max(x0, x1));
    for (let x = xs; x <= xe; x++) {
      const t = (x - x0) / (x1 - x0);
      const y = Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t));
      if (prev !== null && Math.abs(y - prev) > 1) for (let yy = Math.min(y, prev) + 1; yy < Math.max(y, prev); yy++) b.set(x, yy, 'K');
      b.set(x, y, 'K');
      prev = y;
    }
  };
  wire(57, 25, -80, 19, 6);
  wire(59, 30, -80, 25, 6);
  wire(72, 25, 280, 31, 12);
  wire(70, 30, 280, 37, 11);
  // 창문 불빛 (보정 없이)
  b.g = hex;
  if (time !== 'day') {
    for (const [x, y, w, h, kind] of emis) {
      if (kind === 'lamp') { b.rect(x, y, w, h, '#ffe9a0'); b.set(x, y, '#fffaf0'); continue; }
      if (kind === 'vend') { b.rect(x, y, w, h, night ? '#e9f3e6' : '#f2eedc'); continue; }
      if (!night && (x + y) % 3 !== 0) continue;
      b.rect(x, y, w, h, night ? '#f7d774' : '#f0c27c');
      b.rect(x, y + h - 1, w, 1, night ? '#e8b24a' : '#d99a63');
    }
  }
  // 바다 반짝임 후보 (보이는 바다 픽셀만)
  const glints = [];
  const r3 = rng(23);
  for (let i = 0; i < 400 && glints.length < 46; i++) {
    let x, y;
    if (time === 'day') { x = Math.floor(r3() * W); y = HZ + 2 + Math.floor(r3() * 17); }
    else {
      const cx = time === 'sunset' ? SUN_X : MOON_X;
      x = Math.round(cx + (r3() - 0.5) * (14 + (r3() * 22)));
      y = HZ + 1 + Math.floor(r3() * 18);
    }
    if (b.tagAt(x, y) !== 1 || b.tagAt(x + 3, y) !== 1 || b.tagAt(x - 3, y) !== 1) continue;
    if (x > BOAT_POS.x - 2 && x < BOAT_POS.x + 22 && y > BOAT_POS.y && y < BOAT_POS.y + 11) continue;
    glints.push({ x, y, p: Math.floor(r3() * 32), per: 10 + Math.floor(r3() * 14), len: 2 + Math.floor(r3() * 4) });
  }
  const foam = [];
  for (let x = 0; x < W; x++) if (b.tagAt(x, 76) === 1) foam.push(x);
  return { cv: b.canvas(), glints, foam };
}

const villageCache = {};
function village(time) {
  if (villageCache[time]) return villageCache[time];
  const T = tone(time);
  const v = {
    sky: buildSky(time),
    clouds: CLOUDS.map((s) => cloudCanvas(s, CLOUD_COL[time])),
    fg: buildVillage(time),
    flowers: [buildSunflowers(time, 0), buildSunflowers(time, 1)],
    boat: sprCanvas(BOAT, T.pal),
  };
  return (villageCache[time] = v);
}

const FIREFLIES = [[18, 86], [30, 78], [44, 90], [10, 96], [140, 84], [152, 92], [166, 80], [180, 90], [36, 60], [124, 96]];

export function drawVillage(ctx, { time = 'day', tick = 0 } = {}) {
  if (!SKY[time]) time = 'day';
  const v = village(time);
  const night = time === 'night', sunset = time === 'sunset';
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.drawImage(v.sky.cv, 0, 0);
  // 별 반짝임
  for (const s of v.sky.stars) {
    const ph = (tick + s.p) % s.per;
    if (ph < 2) {
      fill(ctx, '#fffaf0', s.x, s.y);
      if (ph === 0) { fill(ctx, '#8995b8', s.x - 1, s.y); fill(ctx, '#8995b8', s.x + 1, s.y); fill(ctx, '#8995b8', s.x, s.y - 1); fill(ctx, '#8995b8', s.x, s.y + 1); }
    } else fill(ctx, ph < 5 ? '#8995b8' : '#4d5b85', s.x, s.y);
  }
  // 구름 (느리게 흐름, 화면 밖으로 나가면 반대편에서 다시)
  CLOUDS.forEach((s, i) => {
    const cv = v.clouds[i];
    const span = W + cv.width;
    const x = (((s.x0 + Math.floor(tick / s.speed)) % span) + span) % span;
    const xx = x >= W ? x - span : x; // 오른쪽으로 빠지면 왼쪽 밖에서 다시 등장
    ctx.drawImage(cv, Math.round(xx), s.y);
  });
  // 갈매기
  if (!night) {
    const gx = ((Math.floor(tick / 2) + 30) % 260) - 30, gy = 30 + (Math.floor(tick / 6) % 4 === 0 ? 1 : 0);
    const up = Math.floor(tick / 3) % 2;
    const gc = sunset ? '#5f4d73' : '#fffaf0', gs = sunset ? '#4a3b5e' : '#a39e93';
    if (up) { fill(ctx, gs, gx, gy - 1); fill(ctx, gc, gx + 1, gy); fill(ctx, gc, gx + 2, gy + 1); fill(ctx, gc, gx + 3, gy); fill(ctx, gs, gx + 4, gy - 1); }
    else { fill(ctx, gc, gx, gy + 1); fill(ctx, gc, gx + 1, gy); fill(ctx, gc, gx + 2, gy + 1); fill(ctx, gc, gx + 3, gy); fill(ctx, gc, gx + 4, gy + 1); }
  }
  // 지상
  ctx.drawImage(v.fg.cv, 0, 0);
  // 배 (살랑살랑)
  ctx.drawImage(v.boat, BOAT_POS.x, BOAT_POS.y + (Math.floor(tick / 6) % 2));
  // 바다 반짝임
  const G = SEA[time].glint;
  for (const g of v.fg.glints) {
    const ph = (tick + g.p) % g.per;
    if (time === 'day') {
      if (ph === 0) fill(ctx, G, g.x, g.y);
      else if (ph === 1) { fill(ctx, G, g.x - 1, g.y, 3, 1); fill(ctx, G, g.x, g.y - 1, 1, 3); }
      else if (ph === 2) fill(ctx, '#d9f0f2', g.x, g.y);
    } else {
      if (ph < 3) fill(ctx, G, g.x - (g.len >> 1), g.y, g.len + (ph === 1 ? 2 : 0), 1);
      else if (ph < 5) fill(ctx, sunset ? '#e9b98f' : '#8d93a8', g.x, g.y, Math.max(1, g.len - 2), 1);
    }
  }
  // 방조제 물거품
  const fo = Math.floor(tick / 3);
  ctx.fillStyle = night ? '#4d6a90' : sunset ? '#e6c2b6' : '#e8f6f6';
  for (const x of v.fg.foam) if ((x + fo) % 9 < 2) ctx.fillRect(x, 76, 1, 1);
  // 해바라기 (번갈아 흔들림)
  ctx.drawImage(v.flowers[Math.floor(tick / 8) % 2], 0, 0);
  // 등대 불빛 (밤/노을)
  if (time !== 'day') {
    const step = tick % 32;
    const ang = (step / 32) * Math.PI * 2;
    const dir = Math.cos(ang);
    const len = Math.round(Math.abs(dir) * 70);
    if (len > 6 && Math.sin(ang) > -0.2) {
      ctx.fillStyle = night ? '#fff1b8' : '#ffe8c0';
      const sgn = dir > 0 ? 1 : -1;
      for (let i = 2; i <= len; i++) {
        const hh = Math.max(1, Math.round(i * 0.09));
        ctx.globalAlpha = (night ? 0.32 : 0.2) * (1 - i / (len + 6));
        ctx.fillRect(LAMP.x + sgn * i, LAMP.y - hh, 1, hh * 2 + 1);
      }
      ctx.globalAlpha = 1;
    }
    if (Math.abs(Math.sin(ang)) > 0.92 && Math.sin(ang) > 0) {
      ctx.globalAlpha = 0.5;
      fill(ctx, '#fff6d0', LAMP.x - 4, LAMP.y - 1, 9, 3);
      fill(ctx, '#fff6d0', LAMP.x - 1, LAMP.y - 4, 3, 9);
      ctx.globalAlpha = 1;
    }
  }
  // 반딧불 (밤)
  if (night) {
    FIREFLIES.forEach(([fx, fy], i) => {
      const t = tick + i * 7;
      if (t % 14 > 9) return;
      const x = fx + Math.round(Math.sin(t * 0.21 + i) * 4), y = fy + Math.round(Math.sin(t * 0.13 + i * 2) * 3);
      ctx.globalAlpha = 0.35;
      fill(ctx, '#a8d58a', x - 1, y, 3, 1);
      fill(ctx, '#a8d58a', x, y - 1, 1, 3);
      ctx.globalAlpha = 1;
      fill(ctx, '#effab0', x, y);
    });
  }
}

// ============================================================
// 7. 바닷속 (집중 다이빙)
// ============================================================
const DIVE_RAMP = ['#a6dfe0', '#8bd2d8', '#6fc0d0', '#58abc6', '#4794b8', '#3a7ea8', '#306896', '#285481', '#21426b', '#1a3253', '#13243e', '#0d182b'];
const diveBucket = (d) => Math.max(0, Math.min(10, Math.round((Number(d) || 0) * 10)));
const diveCols = (bk) => [0, 1, 2, 3, 4].map((k) => DIVE_RAMP[Math.min(11, Math.round(bk * 0.7 + k))]);
const floorY = (x) => 94 + Math.round(2 * Math.sin(x * 0.055 + 1) + Math.sin(x * 0.16));

function branchCoral(b, x, y, h, c1, c2) {
  for (let i = 0; i < h; i++) { b.set(x, y - i, c1); }
  const arms = [[-1, 0.35, 0.6], [1, 0.55, 0.5], [-1, 0.75, 0.35]];
  for (const [dir, at, len] of arms) {
    const yy = y - Math.round(h * at);
    const L = Math.max(2, Math.round(h * len));
    for (let k = 1; k <= L; k++) b.set(x + dir * Math.min(k, 2), yy - k + 1, k > L - 2 ? c2 : c1);
  }
  b.set(x, y - h, c2);
}

function rock(b, cx, by, rx, ry) {
  for (let y = by - ry; y <= by; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x - cx) / rx, ny = (y - by) / ry;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const lit = -0.55 * nx - 0.85 * ny;
      let c = '#5f6d86';
      if (lit > 0.78) c = '#7e8ea6';
      else if (r2 > 0.7 && lit < 0.45) c = '#4a556d';
      else if (lit < 0.2 && dith(x, y, 2)) c = '#4a556d';
      const ax = (x - cx) / rx, ay = (y - 1 - by) / ry;
      if (ax * ax + ay * ay > 1) c = x % 4 === 1 ? 'g' : 'G'; // 윗면 이끼
      b.set(x, y, c);
    }
}
function fanCoral(b, cx, by, r, c1, c2) {
  for (let y = by - r; y <= by; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, (y - by) * 1.1);
      if (d > r) continue;
      if (d > r - 1.2 || (x + y) % 2 === 0 || x === cx) b.set(x, y, d > r - 1.2 ? c1 : c2);
    }
  b.set(cx, by, c2); b.set(cx, by - 1, c2);
}

const FISH_A = ['B..BBB.', 'BBBBBkB', 'B..aaa.'];
const FISH_B = ['...yy.', 'y.yyyy', 'yyyyky', 'y.YYY.'];
const JELLY = [
  [
    '...vvv...',
    '.vvvvvvv.',
    'vviivvvvv',
    'vivvvvvvV',
    'vvvvvvvvV',
    'VpVpVpVpV',
    '.v.p.v.p.',
    '.p.v.p.v.',
    'v.p.v.p..',
    '.v..p..v.',
    '....v....',
  ],
  [
    '.........',
    '...vvv...',
    '.vvvvvvv.',
    'vviivvvvV',
    'vvvvvvvvV',
    '.VpVpVpV.',
    '.v.p.v.p.',
    '..p.v.p.v',
    '.v.p.v.p.',
    '..v..p...',
    '.....v...',
  ],
];
const LANTERN_FISH = [
  '....MM...',
  '...M..y..',
  '.kkkk....',
  'kKKKKk...',
  'KiKKKKk..',
  'KkKKKKKkK',
  'kKmmKKkKk',
  '.kkkkk..k',
];

const diveCache = {};
function dive(bk) {
  if (diveCache[bk]) return diveCache[bk];
  const d = bk / 10;
  const cols = diveCols(bk);
  const fog = cols[4];
  const b = new Buf();
  bands(b, 0, H, cols, [20, 40, 62, 84]);
  // 먼 바위 실루엣
  const far = mix(cols[3], cols[4], 0.5);
  for (let x = 0; x < W; x++) {
    const hgt = Math.max(0, Math.round(10 + 8 * Math.sin(x * 0.045) + 5 * Math.sin(x * 0.13 + 1)));
    const top = 92 - hgt;
    if (x > 70 && x < 122) continue;
    for (let y = top; y < 96; y++) b.set(x, y, dith(x, y, y === top ? 2 : 4) ? far : null);
  }
  // 바닥 (깊이에 따라 물빛에 묻힘)
  const T = memoTone((c) => mix(c, fog, 0.12 + d * 0.62));
  b.g = T;
  for (let x = 0; x < W; x++) {
    const top = floorY(x);
    for (let y = top; y < H; y++) {
      let c = 's';
      if (y === top) c = 'c';
      else if (y > top + 5 && dith(x, y, y > top + 9 ? 2 : 1)) c = 'S';
      if ((x * 7 + y * 3) % 23 === 0) c = 'S';
      b.set(x, y, c);
    }
  }
  // 바위 (납작한 둔덕 + 이끼)
  for (const [cx, by, rx, ry] of [[10, 101, 13, 10], [26, 102, 7, 5], [179, 100, 14, 12], [162, 102, 7, 5], [193, 101, 7, 8]]) rock(b, cx, by, rx, ry);
  // 산호
  branchCoral(b, 36, floorY(36), 15, 'P', 'p');
  branchCoral(b, 42, floorY(42), 10, 'P', 'p');
  branchCoral(b, 47, floorY(47), 6, 'v', 'w');
  fanCoral(b, 148, floorY(148), 8, 'o', 'O');
  branchCoral(b, 140, floorY(140), 9, 'O', 'y');
  // 뇌산호 · 해면
  for (const [cx, cy, r, c1, c2] of [[60, 97, 5, 'v', 'V'], [128, 96, 4, 'p', 'P']]) {
    for (let y = cy - r; y <= cy; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1) b.set(x, y, y === cy - r || (x + 2 * y) % 4 === 0 ? c2 : c1);
    b.set(cx - 2, cy - r + 1, 'w');
  }
  for (const [tx, h] of [[66, 7], [69, 5]]) { for (let i = 0; i < h; i++) { b.set(tx, floorY(tx) - i, 'T'); b.set(tx + 1, floorY(tx) - i, 't'); } b.set(tx, floorY(tx) - h, 'k'); b.set(tx + 1, floorY(tx) - h, 'K'); }
  // 불가사리 / 조개
  b.set(112, 99, 'o'); b.set(111, 100, 'o'); b.set(113, 100, 'o'); b.set(112, 100, 'O'); b.set(111, 101, 'o'); b.set(113, 101, 'o');
  b.set(84, 101, 'p'); b.set(85, 101, 'w'); b.set(86, 101, 'p'); b.set(85, 100, 'p');
  b.g = hex;
  // 스프라이트 (깊이 톤)
  const ST = toneOf((c) => mix(c, fog, 0.06 + d * 0.4));
  const v = {
    cv: b.canvas(),
    cols,
    fog,
    kelp: ((K) => [K('G'), K('f'), K('g')])(memoTone((c) => mix(c, fog, 0.1 + d * 0.62))),
    fishA: [sprCanvas(FISH_A, ST.pal), sprCanvas(flipX(FISH_A), ST.pal)],
    fishB: [sprCanvas(FISH_B, ST.pal), sprCanvas(flipX(FISH_B), ST.pal)],
    jelly: JELLY.map((f) => sprCanvas(f, d > 0.7 ? { v: '#7fe0cf', V: '#4cb8ad', p: '#c9f5e8', i: '#ffffff' } : ST.pal)),
    lantern: sprCanvas(LANTERN_FISH),
    bubble: mix('a', fog, d * 0.5),
  };
  return (diveCache[bk] = v);
}

const KELP = [[12, 34, 0], [27, 46, 1.3], [50, 26, 2.1], [138, 40, 0.7], [160, 52, 1.9], [184, 30, 2.8]];
const BUBBLES = [[8, 1, 2], [20, 2, 1], [37, 1, 3], [52, 2, 2], [64, 1, 1], [74, 2, 2], [118, 1, 2], [128, 2, 1], [141, 1, 3], [156, 2, 2], [171, 1, 1], [185, 2, 2]];
const RAYS = [[30, 7, 90], [66, 4, 70], [128, 9, 100], [162, 5, 80], [196, 8, 96]];

/** 둥근 계단식 발광 (알파 겹침) */
function glow(ctx, cx, cy, r, color, a) {
  ctx.fillStyle = hex(color);
  ctx.globalAlpha = a;
  for (const k of [1, 0.68, 0.38]) {
    const R = Math.max(1, Math.round(r * k));
    for (let dy = -R; dy <= R; dy++) {
      const w = Math.round(Math.sqrt(R * R - dy * dy + R * 0.5));
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawDive(ctx, { depth = 0, tick = 0 } = {}) {
  const bk = diveBucket(depth);
  const d = bk / 10;
  const v = dive(bk);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.drawImage(v.cv, 0, 0);
  // 빛줄기
  const ra = 0.2 * Math.pow(1 - d, 1.4);
  if (ra > 0.01) {
    ctx.fillStyle = '#eefcf6';
    const sh = Math.floor(tick / 6) % 2;
    RAYS.forEach(([x0, w, len], i) => {
      const ww = w + ((i + sh) % 2);
      const L = Math.round(len * (1 - d * 0.6));
      for (let y = 0; y < L; y++) {
        ctx.globalAlpha = ra * (y < L / 3 ? 1 : y < (2 * L) / 3 ? 0.66 : 0.33);
        ctx.fillRect(Math.round(x0 - y * 0.42) + sh, y, ww, 1);
      }
    });
    ctx.globalAlpha = 1;
  }
  // 해초
  KELP.forEach(([x0, h, ph]) => {
    const base = floorY(x0) + 1;
    const hh = Math.round(h * (1 - d * 0.35));
    for (let i = 0; i < hh; i++) {
      const sway = Math.round(Math.sin(Math.floor(tick / 2) * 0.45 + ph + i * 0.13) * 3 * (i / hh));
      const x = x0 + sway, y = base - i;
      fill(ctx, v.kelp[0], x, y);
      fill(ctx, v.kelp[1], x + 1, y);
      if (i > 3 && i % 5 === 0) { fill(ctx, v.kelp[2], x - 2, y, 2, 1); fill(ctx, v.kelp[0], x - 3, y - 1); }
      if (i > 3 && i % 5 === 2) { fill(ctx, v.kelp[0], x + 2, y, 2, 1); fill(ctx, v.kelp[1], x + 4, y - 1); }
    }
  });
  // 물고기 떼 (얕은 곳)
  const fishK = Math.max(0, 1 - d / 0.6);
  if (fishK > 0) {
    const nA = Math.round(7 * fishK), nB = Math.round(5 * fishK);
    const ax = ((tick + 70) % (W + 60)) - 40;
    for (let i = 0; i < nA; i++) {
      const fx = ax + ((i * 13) % 31) - (i % 3) * 4, fy = 14 + ((i * 5) % 13) + (((tick >> 1) + i) % 2);
      ctx.drawImage(v.fishA[0], fx, fy);
    }
    const bx = W + 20 - ((Math.floor((tick * 2) / 3) + 90) % (W + 60));
    for (let i = 0; i < nB; i++) {
      const fx = bx + ((i * 11) % 23) + (i % 2) * 3, fy = 30 + ((i * 7) % 9) + (((tick >> 1) + i) % 2);
      ctx.drawImage(v.fishB[1], fx, fy);
    }
  }
  // 해파리 (중간 깊이)
  if (d >= 0.3) {
    const J = [[30, 40, 0], [150, 26, 5], [166, 62, 11]];
    const n = d >= 0.75 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const [jx, jy, p] = J[i];
      const f = Math.floor((tick + p) / 4) % 2;
      const yy = jy + Math.round(Math.sin((tick + p * 3) * 0.08) * 4);
      if (d > 0.7) glow(ctx, jx + 4, yy + 3, 8 + f, '#6fd0c0', 0.1);
      ctx.drawImage(v.jelly[f], jx, yy);
    }
  }
  // 깊은 곳의 발광 생물
  if (d >= 0.55) {
    const k = (d - 0.55) / 0.45;
    const L = [[34, 66, 1, 0], [148, 80, -1, 9]];
    L.forEach(([lx, ly, dir, p]) => {
      const x = lx + Math.round(Math.sin((tick + p) * 0.05) * 10), y = ly + (Math.floor((tick + p) / 8) % 2);
      ctx.drawImage(v.lantern, x, y);
      const pulse = Math.floor((tick + p) / 3) % 4;
      glow(ctx, x + 6, y + 1, 5 + (pulse % 2), '#f7d774', (0.09 + 0.03 * (pulse % 2)) * (0.6 + k));
      fill(ctx, pulse === 3 ? '#fffaf0' : '#f7d774', x + 6, y + 1);
    });
    // 플랑크톤
    const R = rng(91);
    for (let i = 0; i < 26; i++) {
      const px = Math.floor(R() * W), py0 = Math.floor(R() * H), per = 10 + Math.floor(R() * 12), ph = Math.floor(R() * 20);
      if (px > 80 && px < 112 && py0 > 40 && py0 < 68) continue;
      const py = (py0 - Math.floor(tick / 5) + H) % H;
      const on = (tick + ph) % per;
      if (on > 6) continue;
      ctx.globalAlpha = (on < 3 ? 1 : 0.5) * (0.4 + 0.6 * k);
      fill(ctx, i % 3 === 0 ? '#c3a6e0' : '#6fd0c0', px, py);
    }
    ctx.globalAlpha = 1;
  }
  // 거품
  BUBBLES.forEach(([x0, sp, sz], i) => {
    const y = H + 6 - ((Math.floor((tick * sp) / 2) + i * 17) % (H + 12));
    const x = x0 + (Math.floor((tick + i * 3) / 4) % 2);
    const c = v.bubble;
    if (sz === 1) fill(ctx, c, x, y);
    else if (sz === 2) { fill(ctx, c, x, y, 2, 2); fill(ctx, '#ffffff', x, y); }
    else { fill(ctx, c, x + 1, y); fill(ctx, c, x, y + 1); fill(ctx, c, x + 2, y + 1); fill(ctx, c, x + 1, y + 2); fill(ctx, '#ffffff', x, y); }
  });
  // 수면 (얕을 때만)
  if (bk <= 1) {
    const a = bk === 0 ? 1 : 0.5;
    for (let x = 0; x < W; x++) {
      const yy = 2 + Math.round(Math.sin(x * 0.22 + tick * 0.7) + Math.sin(x * 0.09 - tick * 0.3));
      ctx.globalAlpha = 0.55 * a;
      fill(ctx, '#e4f7f2', x, 0, 1, Math.max(0, yy));
      ctx.globalAlpha = 0.9 * a;
      fill(ctx, '#ffffff', x, yy);
      ctx.globalAlpha = 0.4 * a;
      if ((x + (tick >> 1)) % 5 === 0) fill(ctx, '#ffffff', x, yy + 2);
    }
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// 8. 불꽃놀이 (투명 오버레이 — drawVillage 위에 그림)
// ============================================================
const FW_COLS = [['Y', 'y'], ['r', 'p'], ['v', 'w'], ['t', 'w'], ['p', 'y']];
const FW_CYCLE = 24;

export function drawFireworks(ctx, { tick = 0, seed = 1 } = {}) {
  const s = Math.abs(Math.floor(seed)) || 1;
  const n = 2 + (s % 3); // 2~4발
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < n; i++) {
    const off = Math.floor((i * FW_CYCLE) / n) + i * 2;
    const t = (tick + off) % FW_CYCLE;
    const cyc = Math.floor((tick + off) / FW_CYCLE);
    const R = rng(s * 7919 + i * 104729 + cyc * 31337);
    const cx = 18 + Math.floor(R() * (W - 36)), cy = 10 + Math.floor(R() * 22);
    const [c1, c2] = FW_COLS[Math.floor(R() * FW_COLS.length)];
    const rays = 12 + 2 * Math.floor(R() * 3);
    const maxR = 9 + Math.floor(R() * 5);
    const rot = R() * Math.PI;
    if (t < 5) {
      // 쏘아 올림
      const y = Math.round(54 - ((54 - cy) * (t + 1)) / 5);
      fill(ctx, 'w', cx, y);
      ctx.globalAlpha = 0.7; fill(ctx, 'y', cx, y + 1);
      ctx.globalAlpha = 0.35; fill(ctx, 'y', cx, y + 2, 1, 2);
      ctx.globalAlpha = 1;
    } else if (t === 5) {
      // 터지는 순간
      fill(ctx, 'i', cx - 2, cy, 5, 1); fill(ctx, 'i', cx, cy - 2, 1, 5);
      fill(ctx, c1, cx - 1, cy - 1); fill(ctx, c1, cx + 1, cy - 1); fill(ctx, c1, cx - 1, cy + 1); fill(ctx, c1, cx + 1, cy + 1);
    } else if (t < 20) {
      const k = Math.min(1, (t - 5) / 7);
      const rr = maxR * (1 - (1 - k) * (1 - k)) + (t > 12 ? (t - 12) * 0.35 : 0);
      const drop = t > 11 ? (t - 11) * (t - 11) * 0.1 : 0;
      for (let j = 0; j < rays; j++) {
        if (t > 15 && (j + t) % 2) continue;
        if (t > 17 && (j + t) % 3) continue;
        const a = rot + (j / rays) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const x = cx + ca * rr, y = cy + sa * rr + drop;
        if (t < 13) {
          ctx.globalAlpha = 0.75; fill(ctx, c2, x - ca, y - sa);
          ctx.globalAlpha = 0.4; fill(ctx, c2, x - ca * 2, y - sa * 2);
          ctx.globalAlpha = 1;
          fill(ctx, c1, x, y);
          if (t >= 8 && j % 2 === 0) fill(ctx, c2, cx + ca * rr * 0.5, cy + sa * rr * 0.5);
        } else {
          fill(ctx, (j + t) % 3 ? c2 : 'i', x, y);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}
