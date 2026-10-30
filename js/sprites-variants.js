// 색상 변형 아이콘 라이브러리 (16x16)
// 같은 모양을 36가지 색으로 바꿔 쓰는 장식·선택용 아이콘. (수집품 아님)
//  - 모양(SHAPES): 몸통은 명암 키 1(가장 밝음)~4(가장 어두움), 5(가장 진한 디테일), k 외곽선, i 흰 반짝임.
//    그 밖의 문자는 고정색(코르크·종이·커피 등)이며 BASE 표에 있는 PAL 색을 그대로 씀.
//  - 변형(VARIANTS): 빨·주·노·초·파·남·보·핑·갈·회 × 파스텔·비비드·다크 = 30 + 흰색·검정·무지개·홀로그램·금색·은색 = 36
//  - variantSprite(shapeId, variantId) → { frames: [{ px, pal }] }  (pal만으로 모든 문자 색을 알 수 있음)
// 순수 데이터·순수 함수. import·DOM 없음.

/* eslint-disable max-len */

// 고정색(pixel.js PAL과 같은 값). 모양 템플릿의 고정 부분에서 사용.
const BASE = {
  k: '#2a2840', i: '#ffffff', w: '#fffaf0', l: '#d9d4c7', m: '#a39e93', M: '#6e6a72', K: '#4a4766',
  s: '#e8d2a2', S: '#c9a46c', d: '#8f6a45', D: '#5c4232', y: '#f7d774', Y: '#ebb43f', O: '#c86a3a', g: '#a8d58a', G: '#6aaa64',
};

export const SHAPES = {
  heart: { name: '하트', px: [
    '................',
    '................',
    '...kkkk..kkkk...',
    '..k1112kk2223k..',
    '.k1ii122222223k.',
    '.k1i1222222233k.',
    '.k112222222333k.',
    '.k122222223334k.',
    '..k2222223334k..',
    '...k22223334k...',
    '....k222334k....',
    '.....k2344k.....',
    '......k44k......',
    '.......kk.......',
    '................',
    '................',
  ] },
  marble: { name: '유리구슬', px: [
    '................',
    '.....kkkkkk.....',
    '...kk333333kk...',
    '..k3322222233k..',
    '.k3ii222222213k.',
    '.k3i2222222213k.',
    'k32222222222223k',
    'k32222222222223k',
    'k32222222222213k',
    'k32222222222114k',
    '.k322222221114k.',
    '.k332222211144k.',
    '..k3333344444k..',
    '...kk444444kk...',
    '.....kkkkkk.....',
    '................',
  ] },
  check: { name: '완료 배지', px: [
    '................',
    '................',
    '...kkkkkkkkkk...',
    '..k1111111112k..',
    '.k112222222223k.',
    '.k122222222ii3k.',
    '.k12222222ii43k.',
    '.k12ii222ii433k.',
    '.k124ii2ii4233k.',
    '.k2224iii42233k.',
    '.k22224i422333k.',
    '.k222224423333k.',
    '.k233333333344k.',
    '..k4444444444k..',
    '...kkkkkkkkkk...',
    '................',
  ] },
  star: { name: '별', px: [
    '................',
    '.......kk.......',
    '......k12k......',
    '......k12k......',
    '.....k1i23k.....',
    '.kkkkk1223kkkkk.',
    '.k112222222333k.',
    '..k1222222233k..',
    '...k22222233k...',
    '....k222233k....',
    '...k22223334k...',
    '..k2223kk3344k..',
    '..k223k..k344k..',
    '.k23k......k44k.',
    '.kk..........kk.',
    '................',
  ] },
  gem: { name: '보석', px: [
    '................',
    '................',
    '................',
    '...kkkkkkkkkk...',
    '..k1i11122223k..',
    '.k11i111222233k.',
    'k11111122223333k',
    '.k1i2222333344k.',
    '..k1222233344k..',
    '...k12223334k...',
    '....k122334k....',
    '.....k1234k.....',
    '......k24k......',
    '.......kk.......',
    '................',
    '................',
  ] },
  potion: { name: '물약', px: [
    '................',
    '......kkkk......',
    '......kSdk......',
    '.....kkkkkk.....',
    '......kwlk......',
    '......kwlk......',
    '....kkwiwlkk....',
    '...kiwwwwwllk...',
    '..kw11111122lk..',
    '.kwi222222233lk.',
    '.ki21222223334k.',
    '.k222222233344k.',
    '.k322213333444k.',
    '..k3333334444k..',
    '...kkkkkkkkkk...',
    '................',
  ] },
  flower: { name: '꽃', px: [
    '................',
    '................',
    '......kkkk......',
    '.....k1i12k.....',
    '.kkk.k1122k.kkk.',
    'k1i2kk1223kk223k',
    'k1222kkkkkk2233k',
    '.k122k5555k233k.',
    '..k22k5y55k33k..',
    '..kkkk55y5kkkk..',
    '.k122kk55kk223k.',
    '.k12222kk22333k.',
    '.k22233kk23344k.',
    '..k2233kk3344k..',
    '...kkkk..kkkk...',
    '................',
  ] },
  ribbon: { name: '리본', px: [
    '................',
    '................',
    '.kkk........kkk.',
    'k1i1kk....kk223k',
    'k11222kkkk22233k',
    'k12224k12k42334k',
    'k12244k22k44334k',
    'k2244kk23kk4434k',
    '.kkkkk1223kkkkk.',
    '....k12kk23k....',
    '...k122kk2334k..',
    '..k122k..k2334k.',
    '.k1k22k...k3k44k',
    '..k.kk.....k.kk.',
    '................',
    '................',
  ] },
  balloon: { name: '풍선', px: [
    '................',
    '.....kkkkkk.....',
    '...kk112222kk...',
    '..k1ii2222223k..',
    '.k1ii222222233k.',
    '.k1i2222222333k.',
    '.k122222222333k.',
    '.k222222223333k.',
    '.k222222233334k.',
    '..k2222233334k..',
    '...k22233344k...',
    '....kk3344kk....',
    '......k44k......',
    '.......mk.......',
    '........m.......',
    '.......m........',
  ] },
  candy: { name: '사탕', px: [
    '................',
    '................',
    '................',
    'kk............kk',
    'k1k..kkkkkk..k3k',
    'k12kkw122w2kk23k',
    'k12k12w222w3k33k',
    'k124222w222w433k',
    'k124w222w233434k',
    'k12k2w233l33k34k',
    'k22kk3l334lkk44k',
    'k2k..kkkkkk..k4k',
    'kk............kk',
    '................',
    '................',
    '................',
  ] },
  crown: { name: '왕관', px: [
    '................',
    '................',
    '.kk....kk....kk.',
    'kwlk..kwlk..kwlk',
    '.k1k..k12k..k3k.',
    '.k12k.k12k.k23k.',
    '.k1i2kk12kk233k.',
    '.k122222222333k.',
    '.k1i2222222333k.',
    '.k4w444ww444w4k.',
    '.k122222222333k.',
    '.k333333334444k.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ] },
  book: { name: '책', px: [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.k441i22222223k.',
    '.k441222222233k.',
    '.k4412wwwww233k.',
    '.k4412wmmmw233k.',
    '.k4412wwwww233k.',
    '.k441222222333k.',
    '.k442222223333k.',
    '.k443333333334k.',
    '.k45wwwwwwwwwlk.',
    '.k454444444444k.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ] },
  bell: { name: '방울종', px: [
    '................',
    '......kkkk......',
    '......k12k......',
    '.....kkkkkk.....',
    '....k1i1222k....',
    '...k1i112223k...',
    '...k1i222223k...',
    '...k12222233k...',
    '...k12222233k...',
    '..k1222222333k..',
    '..k1222222333k..',
    '.k122222223334k.',
    'k12222222333344k',
    '.kkkkkkkkkkkkkk.',
    '......k55k......',
    '.......kk.......',
  ] },
  cup: { name: '머그컵', px: [
    '....l...l.......',
    '...l...l........',
    '.kkkkkkkkkkk....',
    '.k1DDDDDDD3k....',
    '.k1i1222223k....',
    '.k1i2222233kkkk.',
    '.k112222233k333k',
    '.k4w444w444kkk3k',
    '.k122222233k.k3k',
    '.k122222333kkk3k',
    '.k122223333k333k',
    '.k223333344kkkk.',
    '..k3344444k.....',
    '...kkkkkkk......',
    '................',
    '................',
  ] },
};

// 변형 정의. ramp = [1, 2, 3, 4, 5] (밝음 → 어두움). swatch = 대표색(목록 칩용)
const RAMPS = {
  'red-pastel':    ['#fff0ec', '#f9cdc6', '#ebaaa5', '#cf8389', '#a35e6c'],
  'orange-pastel': ['#fff3e4', '#fbd9b5', '#efbb8c', '#d39570', '#a6705c'],
  'yellow-pastel': ['#fffbe2', '#fbedb0', '#efd88a', '#d4b06a', '#a78456'],
  'green-pastel':  ['#f0fbe8', '#d0efc0', '#b0dc9f', '#86bd86', '#5f9668'],
  'blue-pastel':   ['#eaf8fd', '#c4e6f4', '#a2cde4', '#7ea8c9', '#5d7ea6'],
  'indigo-pastel': ['#edf0fc', '#cbd2f2', '#adb2e2', '#8a8bc6', '#6a66a2'],
  'purple-pastel': ['#f8edfc', '#e5ccf2', '#cdaee2', '#a88bc6', '#7f67a2'],
  'pink-pastel':   ['#fff0f4', '#f9cddd', '#eeaac6', '#cf86aa', '#a3628d'],
  'brown-pastel':  ['#f6ece0', '#e6d2bb', '#d1b49a', '#b08f7c', '#876c62'],
  'gray-pastel':   ['#f5f4f6', '#e0dfe4', '#c7c6cd', '#a6a5ae', '#81808a'],

  'red-vivid':     ['#ffb4a0', '#ef6a5a', '#d4403a', '#a02f3a', '#6a2232'],
  'orange-vivid':  ['#ffd9a0', '#f59f4e', '#df7a2e', '#a8522c', '#6e3324'],
  'yellow-vivid':  ['#fff6b8', '#fadc5a', '#e8b832', '#b8862c', '#7c5626'],
  'green-vivid':   ['#cdf2a4', '#82d264', '#4fb24a', '#357f3c', '#22552c'],
  'blue-vivid':    ['#b4ecfb', '#5cc4ea', '#2f9ed6', '#28679c', '#1d3f66'],
  'indigo-vivid':  ['#b8c6fa', '#6f86e6', '#4655cf', '#353a9a', '#26286a'],
  'purple-vivid':  ['#e6b6f6', '#b673e2', '#8e48c8', '#62339a', '#3e2468'],
  'pink-vivid':    ['#ffbcd2', '#f2709f', '#d9417f', '#a2306c', '#6a2250'],
  'brown-vivid':   ['#ecc89e', '#c88b56', '#a5643a', '#784430', '#4c2c24'],
  'gray-vivid':    ['#e2e3ea', '#a9abb8', '#868896', '#62636f', '#40414a'],

  'red-dark':      ['#d27a6c', '#a0403c', '#7a2c2e', '#561f26', '#36161c'],
  'orange-dark':   ['#d79a62', '#a6622e', '#7c4424', '#55301e', '#341e16'],
  'yellow-dark':   ['#dcc66a', '#ad8f2c', '#836a22', '#5c491c', '#3a2e16'],
  'green-dark':    ['#8cc078', '#4c8a46', '#356836', '#244a2a', '#162e1c'],
  'blue-dark':     ['#79b8d0', '#357ea0', '#285e7c', '#1d4058', '#132838'],
  'indigo-dark':   ['#8d9ad6', '#46509e', '#333a7a', '#242858', '#191a38'],
  'purple-dark':   ['#b88ad2', '#76449c', '#57317a', '#3c2258', '#261738'],
  'pink-dark':     ['#d880a4', '#a23c6a', '#7c2c52', '#56203c', '#361626'],
  'brown-dark':    ['#b48e6c', '#7e5a3e', '#5e422e', '#422e22', '#2a1d16'],
  'gray-dark':     ['#a4a4ae', '#6c6c78', '#52525c', '#3a3a42', '#26262c'],

  white:  ['#ffffff', '#fbf8f2', '#ebe6dc', '#cdc6ba', '#9e978c'],
  black:  ['#a29ebc', '#48455c', '#302e42', '#1e1c2c', '#121019'],
  gold:   ['#fff6c6', '#f8d56a', '#e4a93a', '#b27428', '#7a4a1f'],
  silver: ['#ffffff', '#e2e7ee', '#b8c0cc', '#8a93a4', '#5c6374'],
};

const NAMES = [
  ['red', '빨강'], ['orange', '주황'], ['yellow', '노랑'], ['green', '초록'], ['blue', '파랑'],
  ['indigo', '남색'], ['purple', '보라'], ['pink', '핑크'], ['brown', '갈색'], ['gray', '회색'],
];

export const VARIANT_GROUPS = [['pastel', '파스텔'], ['vivid', '비비드'], ['dark', '다크'], ['special', '스페셜']];

export const VARIANTS = [
  ...[['pastel', '파스텔'], ['vivid', '비비드'], ['dark', '다크']].flatMap(([g, gName]) =>
    NAMES.map(([c, cName]) => ({ id: `${c}-${g}`, name: `${gName} ${cName}`, group: g, swatch: RAMPS[`${c}-${g}`][1] }))),
  { id: 'white', name: '흰색', group: 'special', swatch: '#fbf8f2' },
  { id: 'black', name: '검정', group: 'special', swatch: '#3a384e' },
  { id: 'rainbow', name: '무지개', group: 'special', swatch: '#f39a4f' },
  { id: 'holo', name: '홀로그램', group: 'special', swatch: '#d9d0f6' },
  { id: 'gold', name: '금색', group: 'special', swatch: '#f8d56a' },
  { id: 'silver', name: '은색', group: 'special', swatch: '#b8c0cc' },
];

// 무지개: 7색 띠 (밝은 면 / 그늘 면). 문자는 PAL과 겹치지 않는 키 사용.
const RAINBOW_LIGHT = ['A', 'C', 'E', 'F', 'H', 'I', 'J'];
const RAINBOW_SHADE = ['L', 'Q', 'U', 'W', 'X', 'Z', 'e'];
const RAINBOW_PAL = {
  A: '#f47c70', C: '#f8a85a', E: '#f8dc68', F: '#8fd27a', H: '#6cc0e8', I: '#7d8de0', J: '#b585dc',
  L: '#cc4f4c', Q: '#d47a36', U: '#d4ae3a', W: '#56a656', X: '#3c8ec0', Z: '#4f5cb4', e: '#8655b4',
  '5': '#4a3a6a',
};
// 홀로그램: 파스텔 무지갯빛 5색 (밝은 면 / 중간 면)
const HOLO_LIGHT = ['h', 'j', 'q', 'x', 'z'];
const HOLO_MID = ['6', '7', '8', '9', '0'];
const HOLO_PAL = {
  h: '#ffdcef', j: '#e8dcff', q: '#d2ecff', x: '#d4f7ea', z: '#fff3c8',
  6: '#f0aed4', 7: '#c4b0f0', 8: '#9cc8ee', 9: '#92d8c2', 0: '#ead79a',
  4: '#9d90c6', 5: '#6f62a0',
};

const TONES = '1234';

function bbox(px) {
  let top = 16, bottom = -1, left = 16, right = -1;
  px.forEach((row, r) => [...row].forEach((ch, c) => {
    if (TONES.includes(ch)) { top = Math.min(top, r); bottom = Math.max(bottom, r); left = Math.min(left, c); right = Math.max(right, c); }
  }));
  return { top, bottom, left, right };
}

function usedPal(px, pal) {
  const out = {};
  px.forEach(row => { for (const ch of row) if (ch !== '.' && ch !== ' ') out[ch] = pal[ch] || BASE[ch]; });
  return out;
}

function rampPal(ramp) {
  return { 1: ramp[0], 2: ramp[1], 3: ramp[2], 4: ramp[3], 5: ramp[4] };
}

function mapPx(px, fn) {
  return px.map((row, r) => [...row].map((ch, c) => fn(ch, r, c)).join(''));
}

// 금·은: 대각선 반짝 줄무늬가 지나감 (0 = 없음)
function glintFrames(px, ramp) {
  const b = bbox(px);
  const span = (b.bottom - b.top) + (b.right - b.left);
  const base = b.top + b.left;
  const pal = { ...rampPal(ramp), k: BASE.k, i: BASE.i };
  const at = [null, Math.round(base + span * 0.3), Math.round(base + span * 0.62)];
  return at.map(s => {
    const out = s == null ? px : mapPx(px, (ch, r, c) => {
      if (!'123'.includes(ch)) return ch;
      if (r + c === s) return 'i';
      if (r + c === s + 1 || r + c === s - 1) return '1';
      return ch;
    });
    return { px: out, pal: usedPal(out, pal) };
  });
}

function rainbowFrames(px) {
  const b = bbox(px);
  const h = (b.bottom - b.top + 1) + (b.right - b.left + 1) * 0.35;
  return [0, 1].map(f => {
    const out = mapPx(px, (ch, r, c) => {
      if (!TONES.includes(ch)) return ch;
      const t = ((r - b.top) + (c - b.left) * 0.35 + f * 0.9) / h;
      const band = Math.max(0, Math.min(6, Math.floor(t * 7)));
      return (ch === '1' || ch === '2') ? RAINBOW_LIGHT[band] : RAINBOW_SHADE[band];
    });
    return { px: out, pal: usedPal(out, { ...RAINBOW_PAL, k: BASE.k, i: BASE.i }) };
  });
}

function holoFrames(px) {
  return [0, 1, 2, 3].map(f => {
    const out = mapPx(px, (ch, r, c) => {
      if (ch === '4') return '4';
      if (!'123'.includes(ch)) return ch;
      const band = ((Math.floor((r + c + 15 - f * 2) / 3) % 5) + 5) % 5;
      return ch === '3' ? HOLO_MID[band] : HOLO_LIGHT[band];
    });
    return { px: out, pal: usedPal(out, { ...HOLO_PAL, k: BASE.k, i: BASE.i }) };
  });
}

/** 모양 × 변형 → { frames: [{ px: 16줄 문자열, pal: { 문자: '#hex' } }] } */
export function variantSprite(shapeId, variantId) {
  const shape = SHAPES[shapeId];
  if (!shape) throw new Error(`unknown shape: ${shapeId}`);
  const px = shape.px;
  if (variantId === 'rainbow') return { frames: rainbowFrames(px) };
  if (variantId === 'holo') return { frames: holoFrames(px) };
  const ramp = RAMPS[variantId];
  if (!ramp) throw new Error(`unknown variant: ${variantId}`);
  if (variantId === 'gold' || variantId === 'silver') return { frames: glintFrames(px, ramp) };
  const pal = { ...rampPal(ramp), k: BASE.k, i: BASE.i };
  return { frames: [{ px, pal: usedPal(px, pal) }] };
}
