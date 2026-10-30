// 디데이 계산 (기능명세서 6장). 날짜는 모두 'YYYY-MM-DD' 키
import { addDays, addMonths, diffDays, parseKey, lastDayOf } from './util.js';

export const KIND_NAMES = { dday: '목표일', dplus: '시작일', yearly: '매년' };

/** 빠른 계산 8개 */
export const QUICK = [
  { label: '1주 후', days: 7 }, { label: '1달 후', months: 1 }, { label: '50일 후', days: 50 }, { label: '100일 후', days: 100 },
  { label: '6달 후', months: 6 }, { label: '200일 후', days: 200 }, { label: '1년 후', months: 12 }, { label: '1000일 후', days: 1000 },
];
export const quickList = base => QUICK.map(q => ({ ...q, date: q.months ? addMonths(base, q.months) : addDays(base, q.days) }));

export const shiftDays = (base, n, dir = 1) => addDays(base, dir * n);

/** 두 날짜 사이: 일수, 주+일, 달력 기준 개월+일, 시작일 포함 일수 */
export function between(a, b) {
  const sign = b >= a ? 1 : -1;
  const [s, e] = sign > 0 ? [a, b] : [b, a];
  const days = diffDays(s, e);
  let months = 0;
  while (addMonths(s, months + 1) <= e) months++;
  const restDays = diffDays(addMonths(s, months), e);
  return { sign, days, weeks: Math.floor(days / 7), weekRest: days % 7, months, restDays, inclusive: days + 1 };
}

/** 기념일 N일째 날짜 (시작일 = 1일째가 기본) */
export const nthDay = (start, n, from1 = true) => addDays(start, from1 ? n - 1 : n);
/** n주년 (2/29 → 평년 2/28은 addMonths가 보정) */
export const yearsAfter = (start, n) => addMonths(start, n * 12);

export function anniversaries(start, from1 = true, today) {
  const list = [];
  for (let n = 100; n <= 1000; n += 100) list.push({ label: `${n}일`, date: nthDay(start, n, from1) });
  for (let n = 1500; n <= 3000; n += 500) list.push({ label: `${n}일`, date: nthDay(start, n, from1) });
  for (let y = 1; y <= 10; y++) list.push({ label: `${y}주년`, date: yearsAfter(start, y), year: true });
  list.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  let nextMarked = false;
  for (const it of list) {
    it.left = diffDays(today, it.date);
    it.past = it.left < 0;
    if (!it.past && !nextMarked) { it.next = true; nextMarked = true; }
  }
  return list;
}

/** 매년 반복: 오늘 이후(오늘 포함) 다음 돌아오는 날 */
export function nextYearly(date, today) {
  const { m, d } = parseKey(date);
  const { y: ty } = parseKey(today);
  const make = y => `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDayOf(y, m))).padStart(2, '0')}`;
  let next = make(ty);
  if (next < today) next = make(ty + 1);
  return next;
}

/** 디데이 표시값 (FR-DDY-007) → { text, left(정렬용), sub, celebrate } */
export function ddayView(dd, today, from1 = true) {
  if (dd.kind === 'dday') {
    const left = diffDays(today, dd.date);
    return { left, text: left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${-left}`, past: left < 0, celebrate: left === 0, target: dd.date };
  }
  if (dd.kind === 'dplus') {
    const since = diffDays(dd.date, today);
    if (since < 0) return { left: -since, text: `D-${-since}`, target: dd.date };
    const n = since + (from1 ? 1 : 0);
    return { left: Infinity, text: `D+${n}`, sub: `${n}일째`, celebrate: n > 0 && n % 100 === 0, target: dd.date, count: n };
  }
  // yearly
  const next = nextYearly(dd.date, today);
  const left = diffDays(today, next);
  const years = parseKey(next).y - parseKey(dd.date).y;
  return { left, text: left === 0 ? 'D-DAY' : `D-${left}`, sub: years > 0 ? `${years}주년` : '', celebrate: left === 0, target: next };
}

export function sortDdays(list, mode, today, from1) {
  const arr = list.map(dd => ({ dd, v: ddayView(dd, today, from1) }));
  if (mode === 'near') {
    const key = x => (x.v.past ? 1e9 - x.v.left : x.v.left === Infinity ? 5e8 : x.v.left);
    arr.sort((a, b) => key(a) - key(b));
  } else arr.sort((a, b) => a.dd.createdAt - b.dd.createdAt);
  return arr;
}
