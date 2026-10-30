// 도트 렌더러: 문자 격자(px 배열)를 팔레트 색으로 그려 canvas / dataURL로 만든다.
// 모든 에셋은 이 팔레트만 사용한다. (여름 톤, 채도 낮춤, 외곽선은 검정 대신 남색 잉크)

export const PAL = {
  k: '#2a2840', // 잉크(외곽선)
  K: '#4a4766', // 연한 잉크
  i: '#ffffff', // 반짝임 하이라이트
  w: '#fffaf0', // 따뜻한 흰색
  l: '#d9d4c7', // 밝은 회색
  m: '#a39e93', // 중간 회색
  M: '#6e6a72', // 어두운 회색
  c: '#f6ecd2', // 크림
  s: '#e8d2a2', // 모래
  S: '#c9a46c', // 황갈색
  d: '#8f6a45', // 갈색
  D: '#5c4232', // 진갈색
  y: '#f7d774', // 연노랑
  Y: '#ebb43f', // 해바라기/금색
  o: '#ef9a52', // 주황
  O: '#c86a3a', // 진주황
  r: '#e8675e', // 코랄 레드
  R: '#b0423f', // 진빨강
  p: '#f5b8b0', // 분홍
  P: '#d9808a', // 장미
  g: '#a8d58a', // 연두
  G: '#6aaa64', // 초록
  f: '#3f7a52', // 숲색
  a: '#b9e6ef', // 연한 물빛
  b: '#7cc3dc', // 하늘
  B: '#3f8fb8', // 바다
  n: '#275d86', // 남청
  N: '#1c3a5e', // 심해
  t: '#6fd0c0', // 민트
  T: '#2f9a92', // 청록
  v: '#c3a6e0', // 라벤더
  V: '#8a68b8', // 보라
  u: '#5b4596', // 진보라
};

const cache = new Map();

/** px: 같은 길이의 문자열 배열. '.' 또는 ' ' 은 투명. pal: 일부 색 덮어쓰기 */
export function drawPixels(ctx, px, x = 0, y = 0, scale = 1, pal = PAL) {
  for (let row = 0; row < px.length; row++) {
    const line = px[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.' || ch === ' ') continue;
      const color = pal[ch] || PAL[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export function pixelCanvas(px, scale = 1, palOverride) {
  const pal = palOverride ? { ...PAL, ...palOverride } : PAL;
  const w = Math.max(...px.map(r => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = px.length * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawPixels(ctx, px, 0, 0, scale, pal);
  return canvas;
}

/** 캐시된 dataURL. key가 같으면 다시 그리지 않음 */
export function pixelURL(key, px, scale = 1, palOverride) {
  const k = `${key}@${scale}`;
  if (!cache.has(k)) cache.set(k, pixelCanvas(px, scale, palOverride).toDataURL());
  return cache.get(k);
}
