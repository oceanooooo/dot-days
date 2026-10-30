// 공용 도구: HTML 이스케이프, 날짜(하루 경계), 한국어 조사, 숫자, 난수

// ---------- HTML (사용자 입력은 항상 글자 그대로 표시: NFR-SEC-003)
const RAW = Symbol('raw');
export const raw = s => ({ [RAW]: true, s: String(s) });
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const val = v => (v == null || v === false ? '' : Array.isArray(v) ? v.map(val).join('') : v[RAW] ? v.s : esc(v));
/** 태그드 템플릿: 끼워 넣는 값은 자동 이스케이프, raw()·html``로 만든 값만 그대로 */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += val(vals[i]) + strings[i + 1];
  return raw(out);
}
export const str = h => (h && h[RAW] ? h.s : val(h));

// ---------- 날짜. 날짜 키는 'YYYY-MM-DD'(현지 시간)
const pad = n => String(n).padStart(2, '0');
const WEEK = '일월화수목금토';
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 하루 시작 시각(dayStart시) 이전이면 전날로 봄 */
export function dayKey(date = new Date(), dayStart = 4) {
  return keyOf(new Date(date.getTime() - dayStart * 3600e3));
}
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m, d };
}
/** 날짜 키 → 정수 일 번호 (UTC 기준이라 서머타임 영향 없음) */
export const dayNum = k => { const { y, m, d } = parseKey(k); return Date.UTC(y, m - 1, d) / 86400e3; };
export const fromNum = n => { const d = new Date(n * 86400e3); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const addDays = (k, n) => fromNum(dayNum(k) + n);
export const diffDays = (a, b) => dayNum(b) - dayNum(a); // b - a
export const weekday = k => new Date(dayNum(k) * 86400e3).getUTCDay(); // 0=일
export const weekName = k => WEEK[weekday(k)];
export const WEEKDAYS = WEEK.split('');
export const lastDayOf = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1~12
/** 달력 기준 N달 더하기. 없는 날짜는 말일로 보정 (1/31 + 1달 = 2/28) */
export function addMonths(k, n) {
  const { y, m, d } = parseKey(k);
  const t = y * 12 + (m - 1) + n;
  const ny = Math.floor(t / 12), nm = (t % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, lastDayOf(ny, nm)))}`;
}
export const fmtDate = k => { const { y, m, d } = parseKey(k); return `${y}.${pad(m)}.${pad(d)} (${weekName(k)})`; };
export const fmtShort = k => { const { m, d } = parseKey(k); return `${pad(m)}.${pad(d)} (${weekName(k)})`; };
export const fmtTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDateTime = t => { const d = new Date(t); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${fmtTime(t)}`; };
export const fmtMMSS = sec => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
export function ago(t, now = Date.now()) {
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ---------- 한국어 조사: 받침 유무로 선택 (을/를, 이/가, 은/는, 과/와, 으로/로)
const DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };
function batchim(word) {
  const ch = String(word).trim().slice(-1);
  if (!ch) return null;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28; // 0이면 받침 없음
  if (/[0-9]/.test(ch)) return DIGIT_BATCHIM[ch] ? (ch === '1' || ch === '7' || ch === '8' ? 8 : 1) : 0;
  return null;
}
export function josa(word, pair) {
  const [a, b] = pair.split('/'); // a: 받침 있을 때, b: 없을 때
  const bc = batchim(word);
  if (bc == null) return `${word}${a}(${b})`;
  if (a === '으로') return `${word}${bc === 0 || bc === 8 ? b : a}`; // ㄹ 받침은 '로'
  return `${word}${bc ? a : b}`;
}

/** 조사만 반환: 〈이름〉처럼 감쌀 때 → `〈${n}〉${pp(n, '을/를')}` */
export const pp = (word, pair) => josa(word, pair).slice(String(word).length);

// ---------- 숫자·난수·기타
export const num = n => Math.round(n).toLocaleString('ko-KR');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round = n => Math.floor(n + 0.5); // 0.5는 올림
export let rand = Math.random;
export const setRandom = fn => { rand = fn; }; // 테스트용
export const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
export const pick = arr => arr[Math.floor(rand() * arr.length)];
export function pickWeighted(weights) { // [w0, w1, ...] → index
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) { if ((r -= weights[i]) < 0) return i; }
  return weights.length - 1;
}
export const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
export const deepCopy = o => JSON.parse(JSON.stringify(o));
