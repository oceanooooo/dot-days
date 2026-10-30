// 대시보드(MO-ADV-005), 히스토리(MO-ADV-006), 날짜 상세(MO-ADV-007) — 모험가 아래 한 단계 더 깊은 현황
import { store } from '../store.js';
import { today, isScheduled, doneCount, activeQuests, badQuests, attrList, cleanDays } from '../game.js';
import { html, num, addDays, diffDays, weekday, WEEKDAYS, fmtDate, fmtShort, fmtTime, dayKey, parseKey } from '../util.js';
import { actions, openOverlay, uiIcon, uiAnim, attrIcon, tempterHTML } from '../ui.js';
import { pageHead, seg, empty } from './common.js';
import { questIcon } from './quests.js';

const logDay = (S, l) => l.day || dayKey(new Date(l.t), S.settings.dayStart);
const minutesText = m => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`);

// ---------------------------------------------------------------- 기간 (FR-STA-007)
const PERIODS = [['week', '이번 주'], ['month', '이번 달'], ['d30', '최근 30일'], ['all', '전체']];
function range(S, period) {
  const day = today(S);
  if (period === 'week') return [addDays(day, -((weekday(day) + 6) % 7)), day]; // 월요일 시작
  if (period === 'month') { const { y, m } = parseKey(day); return [`${y}-${String(m).padStart(2, '0')}-01`, day]; }
  if (period === 'd30') return [addDays(day, -29), day];
  const first = Object.keys(S.days).sort()[0] || day;
  return [first < day ? first : day, day];
}
const inRange = (d, [a, b]) => d >= a && d <= b;

/** 반복 퀘스트 달성률: 해야 했던 횟수 대비 (완료 기록 보관 60일 안, 오늘은 완료했을 때만 셈) */
function achievement(S, q, [a, b]) {
  const day = today(S), from = [a, addDays(day, -59), q.repeat.start].sort().pop();
  let need = 0, ok = 0;
  for (let d = from; d <= b; d = addDays(d, 1)) {
    if (q.repeat.type === 'once' || !isScheduled(S, q, d)) continue;
    const done = doneCount(S, d, q.id) >= q.times;
    if (d === day && !done) continue;
    need++; if (done) ok++;
  }
  return { need, ok, rate: need ? ok / need : null };
}

export function dashboardData(S, period) {
  const R = range(S, period);
  const days = Object.entries(S.days).filter(([d]) => inRange(d, R)).map(([, v]) => v);
  const logs = S.log.filter(l => inRange(logDay(S, l), R));
  const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
  const attrs = Object.fromEntries(attrList(S).map(a => [a.id, 0]));
  for (const l of logs) for (const [a, n] of Object.entries(l.attrs || {})) if (a in attrs) attrs[a] += n;
  const quests = activeQuests(S).filter(q => q.repeat.type !== 'once').map(q => ({ q, ...achievement(S, q, R) })).filter(x => x.need);
  const need = sum(quests, x => x.need), ok = sum(quests, x => x.ok);
  const byWeek = Array(7).fill(0);
  for (const [d, v] of Object.entries(S.days)) if (inRange(d, R)) byWeek[weekday(d)] += v.q || 0;
  return {
    R, quests,
    done: sum(days, d => d.q), rate: need ? Math.round((ok / need) * 100) : null,
    exp: Math.max(0, sum(days, d => d.exp)), dive: sum(days, d => d.dive),
    earned: sum(logs.filter(l => l.coins > 0), l => l.coins), spent: Math.abs(sum(logs.filter(l => l.type === 'buy'), l => l.coins)),
    minutes: sum(logs, l => l.minutes && l.type === 'use' ? l.minutes : 0), allowance: sum(logs, l => l.amount),
    attrs, byWeek,
    bads: badQuests(S).map(q => ({ q, slips: logs.filter(l => l.type === 'slip' && l.qid === q.id).length, clean: cleanDays(S, q, today(S)), best: Math.max(q.cleanBest || 0, cleanDays(S, q, today(S))) })),
  };
}

// ---------------------------------------------------------------- 대시보드
let lowFirst = false;
export const dashboardPage = {
  screen: 'MO-ADV-005', tab: 'me',
  render(S) {
    const period = S.settings.dashPeriod || 'week';
    const D = dashboardData(S, period);
    const maxAttr = Math.max(1, ...Object.values(D.attrs));
    const maxWeek = Math.max(1, ...D.byWeek);
    const qs = [...D.quests].sort((a, b) => (lowFirst ? a.rate - b.rate : b.rate - a.rate));
    const tiles = [
      ['check', '퀘스트 완료', `${num(D.done)}회`], ['sparkle', '달성률', D.rate == null ? '-' : `${D.rate}%`],
      ['exp', '획득 경험치', num(D.exp)], ['coin', '획득 조개', num(D.earned)],
      ['shop', '쓴 조개', num(D.spent)], ['dive', '다이빙', minutesText(D.dive)],
      ['clock', '보상으로 쉰 시간', minutesText(D.minutes)], ['money', '받은 용돈', `${num(D.allowance)}원`],
    ];
    return html`${pageHead(S, '대시보드', { back: '#/me' })}
    <div class="content dash">
      ${seg(PERIODS, period, 'dash.period', '기간')}
      <p class="hint">${fmtDate(D.R[0])} ~ ${fmtDate(D.R[1])}</p>
      <div class="stat-grid tiles">${tiles.map(([ic, k, v]) => html`<div class="stat panel"><span class="stat-k">${uiAnim(ic, 16)} ${k}</span><b class="stat-v">${v}</b></div>`)}</div>
      <section class="dash-sec"><h2 class="section-title">능력치별 성장</h2>
        <ul class="hbars panel">${attrList(S).map(a => html`<li style="--c:${a.color}">${attrIcon(a.id, 16)}<span class="hb-name">${a.name}</span><span class="hb-track"><span class="hb-fill" style="--v:${D.attrs[a.id] / maxAttr}"></span></span><b>+${num(D.attrs[a.id])}</b></li>`)}</ul></section>
      <section class="dash-sec"><h2 class="section-title">퀘스트별 달성률 <button class="btn sm ghost" data-act="dash.sort">${lowFirst ? '높은 순' : '낮은 순'}으로</button></h2>
        ${qs.length ? html`<ul class="hbars panel">${qs.map(x => html`<li>${questIcon(x.q, 16)}<span class="hb-name">${x.q.name}</span><span class="hb-track"><span class="hb-fill sea" style="--v:${x.rate}"></span></span><b>${x.ok}/${x.need} ${Math.round(x.rate * 100)}%</b></li>`)}</ul>`
          : html`<p class="muted pad">이 기간에 해야 했던 반복 퀘스트가 없어요</p>`}
        <p class="hint">달성률은 최근 60일 완료 기록으로 계산해요. 오늘 아직 안 한 퀘스트는 빼고 셉니다.</p></section>
      <section class="dash-sec"><h2 class="section-title">요일별 완료</h2>
        <div class="bars panel">${D.byWeek.map((n, i) => html`<div class="bar-col"><b>${n}</b><span class="bar-v" style="--h:${n / maxWeek}"></span><span class="bar-d">${WEEKDAYS[i]}</span></div>`)}</div></section>
      <section class="dash-sec"><h2 class="section-title">${uiIcon('monster', 16)} 유혹 현황</h2>
        ${D.bads.length ? html`<ul class="bad-stats panel">${D.bads.map(b => html`<li>${tempterHTML(b.q.monster, b.clean ? 'sleep' : 'laugh', 32)}<span class="hb-name">${b.q.name}</span><span>기록 <b>${b.slips}</b>회</span><span>${uiAnim('shield', 16)} <b>${b.clean}</b>일째 · 최고 ${b.best}일</span></li>`)}</ul>`
          : html`<p class="muted pad">등록한 유혹이 없어요. 퀘스트 만들기에서 '유혹'을 골라 보세요.</p>`}</section>
    </div>`;
  },
};

// ---------------------------------------------------------------- 히스토리
const FILTERS = [['all', '전체'], ['quest', '퀘스트'], ['bad', '유혹'], ['reward', '보상'], ['dive', '다이빙'], ['item', '아이템'], ['achv', '업적']];
const TYPE_OF = { quest: 'quest', slip: 'bad', clean: 'bad', buy: 'reward', use: 'reward', dive: 'dive', 'dive-fail': 'dive', chest: 'item', sell: 'item', charm: 'item', achv: 'achv' };
const LOG_ICON = { quest: 'check', slip: 'monster', clean: 'shield', buy: 'shop', use: 'gift', dive: 'dive', 'dive-fail': 'dive', chest: 'gift', sell: 'coin', charm: 'sparkle', achv: 'trophy' };
export const logLine = (S, l) => html`<li class="hist-row"><span class="log-t">${fmtTime(l.t)}</span>${uiIcon(LOG_ICON[l.type] || 'info', 16)}<span class="log-x">${l.text}</span>
  <span class="log-r">${l.exp ? `+${l.exp} EXP ` : ''}${l.coins ? `${l.coins > 0 ? '+' : ''}${l.coins}🐚` : ''}${l.minutes ? ` 🕒${minutesText(l.minutes)}` : ''}${l.amount ? ` 💰${num(l.amount)}원` : ''}</span></li>`;

let hFilter = 'all', hPage = 1;
export const historyPage = {
  screen: 'MO-ADV-006', tab: 'me',
  render(S) {
    const all = S.log.filter(l => hFilter === 'all' || TYPE_OF[l.type] === hFilter);
    const shown = all.slice(0, hPage * 50);
    const groups = [];
    for (const l of shown) { const d = logDay(S, l); if (!groups.length || groups[groups.length - 1][0] !== d) groups.push([d, []]); groups[groups.length - 1][1].push(l); }
    return html`${pageHead(S, '히스토리', { back: '#/me' })}
    <div class="content">
      <div class="chips scroll">${FILTERS.map(([v, l]) => html`<button class="chip ${hFilter === v ? 'on' : ''}" data-act="hist.filter" data-v="${v}" aria-pressed="${hFilter === v}">${l}</button>`)}</div>
      ${groups.length ? groups.map(([d, ls]) => {
        const v = S.days[d] || {};
        return html`<section class="hist-day">
          <button class="hist-head" data-act="day.open" data-d="${d}">${fmtShort(d)}<small>퀘스트 ${v.q || 0} · +${num(Math.max(0, v.exp || 0))} EXP · 🐚 ${num(v.coins || 0)}</small>${uiIcon('arrow_right', 16)}</button>
          <ol class="log panel">${ls.map(l => logLine(S, l))}</ol></section>`;
      }) : empty('아직 기록이 없어요')}
      ${all.length > shown.length ? html`<button class="btn block" data-act="hist.more">더 보기 (${num(all.length - shown.length)}건 남음)</button>` : ''}
      <p class="hint center">활동 기록은 최근 2,000건까지 보관해요</p>
    </div>`;
  },
};

/** 날짜 상세 (MO-ADV-007) */
export function openDay(d) {
  openOverlay({
    type: 'sheet', screen: 'MO-ADV-007', title: fmtDate(d),
    render: () => {
      const S = store.S, v = S.days[d] || {};
      const recent = diffDays(d, today(S)) < 60;
      const qs = S.quests.filter(q => q.kind !== 'bad' && (q.repeat.type === 'once' ? q.doneDay === d : isScheduled(S, q, d)));
      const ls = S.log.filter(l => logDay(S, l) === d);
      const slips = badQuests(S).filter(q => S.slips?.[d]?.[q.id]);
      return html`<div class="day-sum stat-grid">
          <div class="stat panel"><span class="stat-k">완료</span><b class="stat-v">${v.q || 0}회</b></div>
          <div class="stat panel"><span class="stat-k">경험치</span><b class="stat-v">+${num(Math.max(0, v.exp || 0))}</b></div>
          <div class="stat panel"><span class="stat-k">조개</span><b class="stat-v">${num(v.coins || 0)}</b></div>
          <div class="stat panel"><span class="stat-k">다이빙</span><b class="stat-v">${minutesText(v.dive || 0)}</b></div></div>
        ${v.perfect ? html`<p class="badge-line">${uiAnim('sparkle', 16)} 완벽한 하루!</p>` : ''}
        <h3 class="group-head">그날 할 일</h3>
        ${recent ? (qs.length ? html`<ul class="day-quests panel">${qs.map(q => { const c = doneCount(S, d, q.id), t = q.repeat.type === 'once' ? 1 : q.times, ok = c >= t;
          return html`<li class="${ok ? 'ok' : 'miss'}">${questIcon(q, 16)}<span>${q.name}</span><b>${ok ? '✓' : '✗'} ${c}/${t}</b></li>`; })}</ul>` : html`<p class="muted">해야 할 반복 퀘스트가 없던 날이에요</p>`)
          : html`<p class="muted">완료 여부는 최근 60일만 보관해요</p>`}
        ${slips.length ? html`<h3 class="group-head">유혹 기록</h3><ul class="day-quests panel">${slips.map(q => html`<li class="miss">${tempterHTML(q.monster, 'laugh', 16)}<span>${q.name}</span><b>${S.slips[d][q.id]}회</b></li>`)}</ul>` : ''}
        <h3 class="group-head">그날 기록</h3>
        ${ls.length ? html`<ol class="log panel">${ls.map(l => logLine(S, l))}</ol>` : html`<p class="muted">기록이 없어요</p>`}`;
    },
  });
}

actions({
  'dash.period': el => store.update(S => { S.settings.dashPeriod = el.dataset.v; }, { noTouch: true }),
  'dash.sort': () => { lowFirst = !lowFirst; store.emit({}); },
  'hist.filter': el => { hFilter = el.dataset.v; hPage = 1; store.emit({}); },
  'hist.more': () => { hPage++; store.emit({}); },
  'day.open': el => openDay(el.dataset.d),
});
