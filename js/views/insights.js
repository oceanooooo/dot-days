// 현황 묶음: 대시보드(MO-ADV-005), 히스토리(MO-ADV-006), 날짜 상세(MO-ADV-007), 달력(MO-ADV-008)
// REQ-06: 이전 기간 비교, 날짜별 추이, 시간대, 하이라이트, 연속 순위, 퀘스트 14일 기록, 월 달력, 기록 검색
import { store } from '../store.js';
import { today, isScheduled, doneCount, activeQuests, badQuests, attrList, cleanDays } from '../game.js';
import { html, num, addDays, diffDays, weekday, WEEKDAYS, fmtDate, fmtShort, fmtTime, dayKey, parseKey, lastDayOf, addMonths } from '../util.js';
import { actions, openOverlay, uiIcon, uiAnim, attrIcon, tempterHTML } from '../ui.js';
import { pageHead, seg, empty, subnav, mascotImg } from './common.js';
import { questIcon } from './quests.js';
import { INSIGHT_TABS } from '../nav.js';

const logDay = (S, l) => l.day || dayKey(new Date(l.t), S.settings.dayStart);
const minutesText = m => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`);
const pad2 = n => String(n).padStart(2, '0');
const insightNav = cur => subnav(INSIGHT_TABS, cur, '현황 화면');

// ---------------------------------------------------------------- 기간 (FR-STA-007)
const PERIODS = [['week', '이번 주'], ['month', '이번 달'], ['d30', '최근 30일'], ['all', '전체']];
const PREV_NAME = { week: '지난 주', month: '지난 달', d30: '그 전 30일' };
function range(S, period) {
  const day = today(S);
  if (period === 'week') return [addDays(day, -((weekday(day) + 6) % 7)), day]; // 월요일 시작
  if (period === 'month') { const { y, m } = parseKey(day); return [`${y}-${pad2(m)}-01`, day]; }
  if (period === 'd30') return [addDays(day, -29), day];
  const first = Object.keys(S.days).sort()[0] || day;
  return [first < day ? first : day, day];
}
/** 비교할 직전 기간 (같은 길이) */
function prevRange(S, period, [a, b]) {
  if (period === 'week') return [addDays(a, -7), addDays(b, -7)];
  if (period === 'd30') return [addDays(a, -30), addDays(b, -30)];
  if (period === 'month') {
    const pa = addMonths(a, -1), { y, m } = parseKey(pa), { d } = parseKey(b);
    return [pa, `${y}-${pad2(m)}-${pad2(Math.min(d, lastDayOf(y, m)))}`];
  }
  return null;
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

/** 최근 14일 한 칸씩: ok 완료 / miss 놓침 / off 쉬는 날 / wait 오늘 아직 */
function strip(S, q) {
  const day = today(S), out = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(day, -i);
    if (d < q.repeat.start || !isScheduled(S, q, d)) { out.push({ d, s: 'off' }); continue; }
    const done = doneCount(S, d, q.id) >= q.times;
    out.push({ d, s: done ? 'ok' : d === day ? 'wait' : 'miss' });
  }
  return out;
}

function metrics(S, R) {
  const days = Object.entries(S.days).filter(([d]) => inRange(d, R)).map(([, v]) => v);
  const logs = S.log.filter(l => inRange(logDay(S, l), R));
  const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
  const quests = activeQuests(S).filter(q => q.repeat.type !== 'once').map(q => ({ q, ...achievement(S, q, R) })).filter(x => x.need);
  const need = sum(quests, x => x.need), ok = sum(quests, x => x.ok);
  return {
    days, logs, quests,
    done: sum(days, d => d.q), rate: need ? Math.round((ok / need) * 100) : null,
    exp: Math.max(0, sum(days, d => d.exp)), dive: sum(days, d => d.dive),
    earned: sum(logs.filter(l => l.coins > 0), l => l.coins), spent: Math.abs(sum(logs.filter(l => l.type === 'buy'), l => l.coins)),
    minutes: sum(logs, l => l.minutes && l.type === 'use' ? l.minutes : 0), allowance: sum(logs, l => l.amount),
    active: days.filter(d => d.q > 0 || d.dive > 0).length, perfect: days.filter(d => d.perfect).length,
  };
}

const HOURS = [['새벽', 0, 6], ['아침', 6, 10], ['낮', 10, 14], ['오후', 14, 18], ['저녁', 18, 22], ['밤', 22, 24]];

export function dashboardData(S, period) {
  const R = range(S, period);
  const M = metrics(S, R);
  const PR = prevRange(S, period, R), P = PR ? metrics(S, PR) : null;
  const attrs = Object.fromEntries(attrList(S).map(a => [a.id, 0]));
  for (const l of M.logs) for (const [a, n] of Object.entries(l.attrs || {})) if (a in attrs) attrs[a] += n;
  const byWeek = Array(7).fill(0);
  for (const [d, v] of Object.entries(S.days)) if (inRange(d, R)) byWeek[weekday(d)] += v.q || 0;

  // 날짜별 추이: 62일까지는 하루씩, 그보다 길면 주 단위로 묶음
  const len = diffDays(R[0], R[1]) + 1, weekly = len > 62;
  const series = [];
  for (let d = R[0]; d <= R[1]; d = addDays(d, weekly ? 7 : 1)) {
    let q = 0, exp = 0;
    for (let i = 0; i < (weekly ? 7 : 1); i++) { const x = addDays(d, i); if (x > R[1]) break; q += S.days[x]?.q || 0; exp += Math.max(0, S.days[x]?.exp || 0); }
    series.push({ d, q, exp });
  }
  const hours = HOURS.map(([n, a, b]) => ({ n, a, b, c: 0 }));
  const qLogs = M.logs.filter(l => l.type === 'quest');
  for (const l of qLogs) { const h = new Date(l.t).getHours(); hours.find(x => h >= x.a && h < x.b).c++; }
  const byQuest = {};
  for (const l of qLogs) byQuest[l.qid] = (byQuest[l.qid] || 0) + 1;
  const topId = Object.entries(byQuest).sort((a, b) => b[1] - a[1])[0];
  const topQ = topId && S.quests.find(q => q.id === topId[0]);
  const bestDay = Object.entries(S.days).filter(([d]) => inRange(d, R)).sort((a, b) => (b[1].q || 0) - (a[1].q || 0))[0];
  return {
    R, PR, P, ...M, attrs, byWeek, series, weekly, hours,
    top: topQ ? { q: topQ, n: topId[1] } : null,
    bestDay: bestDay && bestDay[1].q ? { d: bestDay[0], n: bestDay[1].q } : null,
    streaks: activeQuests(S).filter(q => q.repeat.type !== 'once' && q.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5),
    bads: badQuests(S).map(q => ({ q, slips: M.logs.filter(l => l.type === 'slip' && l.qid === q.id).length, clean: cleanDays(S, q, today(S)), best: Math.max(q.cleanBest || 0, cleanDays(S, q, today(S))) })),
  };
}

/** 이전 기간 대비 증감 표시 */
function delta(cur, prev, { unit = '', pct = false } = {}) {
  if (prev == null || cur == null) return '';
  const diff = cur - prev;
  if (!diff) return html`<span class="delta same" aria-label="이전과 같음">＝ 같음</span>`;
  const up = diff > 0, v = pct ? `${Math.abs(diff)}%p` : `${num(Math.abs(diff))}${unit}`;
  return html`<span class="delta ${up ? 'up' : 'down'}" aria-label="이전보다 ${v} ${up ? '증가' : '감소'}">${up ? '▲' : '▼'} ${v}</span>`;
}
const rateTalk = r => (r == null ? '반복 퀘스트를 만들면 달성률을 보여 줄게!' : r >= 90 ? '거의 완벽해! 이대로만 가자!' : r >= 70 ? '잘하고 있어. 조금만 더!' : r >= 40 ? '절반은 넘겼어. 하나씩 해 보자.' : '천천히 다시 시작해도 괜찮아.');

// ---------------------------------------------------------------- 대시보드
let lowFirst = false, chartMode = 'q';
export const dashboardPage = {
  screen: 'MO-ADV-005', tab: 'me',
  render(S) {
    const period = S.settings.dashPeriod || 'week';
    const D = dashboardData(S, period), P = D.P;
    const maxAttr = Math.max(1, ...Object.values(D.attrs));
    const attrSum = Object.values(D.attrs).reduce((a, b) => a + b, 0);
    const maxWeek = Math.max(1, ...D.byWeek);
    const maxHour = Math.max(1, ...D.hours.map(h => h.c));
    const peak = D.hours.reduce((a, b) => (b.c > a.c ? b : a));
    const vals = D.series.map(x => x[chartMode]);
    const maxS = Math.max(1, ...vals), avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const qs = [...D.quests].sort((a, b) => (lowFirst ? a.rate - b.rate : b.rate - a.rate));
    const day = today(S);
    const tiles = [
      ['check', '퀘스트 완료', `${num(D.done)}회`, delta(D.done, P?.done, { unit: '회' })],
      ['exp', '획득 경험치', num(D.exp), delta(D.exp, P?.exp)],
      ['coin', '획득 조개', num(D.earned), delta(D.earned, P?.earned)],
      ['shop', '쓴 조개', num(D.spent), delta(D.spent, P?.spent)],
      ['dive', '다이빙', minutesText(D.dive), delta(D.dive, P?.dive, { unit: '분' })],
      ['sun', '활동한 날', `${D.active}일`, delta(D.active, P?.active, { unit: '일' })],
      ['clock', '보상으로 쉰 시간', minutesText(D.minutes), ''],
      ['money', '받은 용돈', `${num(D.allowance)}원`, ''],
    ];
    const ring = D.rate ?? 0;
    return html`${pageHead(S, '대시보드', { back: '#/me' })}
    ${insightNav('me/dashboard')}
    <div class="content dash">
      ${seg(PERIODS, period, 'dash.period', '기간')}
      <p class="hint">${fmtDate(D.R[0])} ~ ${fmtDate(D.R[1])}${D.PR ? html` · 비교: ${PREV_NAME[period]} (${fmtShort(D.PR[0])}~${fmtShort(D.PR[1])})` : ''}</p>

      <section class="dash-hero panel" aria-label="기간 요약">
        <div class="ring" style="--p:${ring}" role="img" aria-label="달성률 ${D.rate == null ? '없음' : D.rate + '%'}"><b>${D.rate == null ? '-' : D.rate}<small>${D.rate == null ? '' : '%'}</small></b><span>달성률</span></div>
        <div class="hero-body">
          <p class="hero-talk">${mascotImg(32, ring >= 70)}<span>${rateTalk(D.rate)}</span></p>
          <ul class="hero-facts">
            <li>${uiAnim('sparkle', 16)} 완벽한 하루 <b>${D.perfect}일</b></li>
            <li>${uiIcon('fire', 16)} 최고 연속 <b>${D.streaks[0] ? `${D.streaks[0].streak}일` : '-'}</b></li>
            ${P ? html`<li>${uiIcon('chart', 16)} 달성률 ${delta(D.rate, P.rate, { pct: true }) || html`<b>-</b>`}</li>` : ''}
          </ul>
        </div>
      </section>

      <div class="stat-grid tiles">${tiles.map(([ic, k, v, dl]) => html`<div class="stat panel"><span class="stat-k">${uiAnim(ic, 16)} ${k}</span><b class="stat-v">${v}</b>${dl}</div>`)}</div>

      <section class="dash-sec"><h2 class="section-title">${D.weekly ? '주별' : '날짜별'} 추이
        ${seg([['q', '완료'], ['exp', '경험치']], chartMode, 'dash.chart', '추이 지표')}</h2>
        <div class="trend panel">
          <div class="trend-plot ${D.series.length > 16 ? 'dense' : ''}" role="img" aria-label="${D.weekly ? '주별' : '날짜별'} ${chartMode === 'q' ? '퀘스트 완료' : '획득 경험치'}, 평균 ${avg.toFixed(1)}, 최고 ${num(maxS)}">
            <span class="trend-avg" style="--h:${avg / maxS}"><i>평균 ${avg < 10 ? avg.toFixed(1) : Math.round(avg)}</i></span>
            ${D.series.map(x => html`<span class="trend-col ${x.d === day || (D.weekly && x.d <= day && addDays(x.d, 6) >= day) ? 'today' : ''}" style="--h:${x[chartMode] / maxS}" title="${fmtShort(x.d)}${D.weekly ? ' 주' : ''} · ${num(x[chartMode])}"><span class="trend-v"></span></span>`)}
          </div>
          <div class="trend-axis"><span>${fmtShort(D.series[0].d)}</span><span>${fmtShort(D.series[D.series.length - 1].d)}</span></div>
          <details class="table-view"><summary>표로 보기</summary>
            <table><thead><tr><th scope="col">${D.weekly ? '주 시작' : '날짜'}</th><th scope="col">완료</th><th scope="col">경험치</th></tr></thead>
            <tbody>${D.series.map(x => html`<tr><th scope="row">${fmtShort(x.d)}</th><td>${x.q}</td><td>${num(x.exp)}</td></tr>`)}</tbody></table></details>
        </div></section>

      <section class="dash-sec"><h2 class="section-title">하이라이트</h2>
        <ul class="highlights">
          <li class="panel">${uiAnim('trophy', 24)}<span>가장 열심히 한 날</span><b>${D.bestDay ? `${fmtShort(D.bestDay.d)} · ${D.bestDay.n}회` : '-'}</b></li>
          <li class="panel">${D.top ? questIcon(D.top.q, 24) : uiIcon('quest', 24)}<span>가장 많이 한 퀘스트</span><b>${D.top ? `${D.top.q.name} · ${D.top.n}회` : '-'}</b></li>
          <li class="panel">${uiIcon('clock', 24)}<span>가장 활발한 시간</span><b>${peak.c ? `${peak.n} (${peak.a}~${peak.b}시)` : '-'}</b></li>
        </ul></section>

      <section class="dash-sec two-col">
        <div><h2 class="section-title">시간대별 완료</h2>
          <ul class="hbars hours panel">${D.hours.map(h => html`<li class="${h === peak && h.c ? 'peak' : ''}">${uiIcon(h.a < 6 || h.a >= 18 ? 'moon' : 'sun', 16)}<span class="hb-name">${h.n} <small>${h.a}~${h.b}시</small></span><span class="hb-track"><span class="hb-fill sun" style="--v:${h.c / maxHour}"></span></span><b>${h.c}회</b></li>`)}</ul></div>
        <div><h2 class="section-title">요일별 완료</h2>
          <div class="bars panel" role="img" aria-label="요일별 완료: ${D.byWeek.map((n, i) => `${WEEKDAYS[i]} ${n}`).join(', ')}">${D.byWeek.map((n, i) => html`<div class="bar-col"><b>${n}</b><span class="bar-v ${n === maxWeek && n ? 'top' : ''}" style="--h:${n / maxWeek}"></span><span class="bar-d ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${WEEKDAYS[i]}</span></div>`)}</div></div>
      </section>

      <section class="dash-sec"><h2 class="section-title">능력치별 성장</h2>
        ${attrSum ? html`<div class="share panel" role="img" aria-label="능력치 비중: ${attrList(S).filter(a => D.attrs[a.id]).map(a => `${a.name} ${Math.round((D.attrs[a.id] / attrSum) * 100)}%`).join(', ')}">
          <div class="share-bar">${attrList(S).filter(a => D.attrs[a.id]).map(a => html`<span style="--c:${a.color};--w:${D.attrs[a.id] / attrSum}" title="${a.name} ${Math.round((D.attrs[a.id] / attrSum) * 100)}%"></span>`)}</div>
          <ul class="share-legend">${attrList(S).filter(a => D.attrs[a.id]).map(a => html`<li><i style="--c:${a.color}"></i>${a.name} ${Math.round((D.attrs[a.id] / attrSum) * 100)}%</li>`)}</ul></div>` : ''}
        <ul class="hbars panel">${attrList(S).map(a => html`<li style="--c:${a.color}">${attrIcon(a.id, 16)}<span class="hb-name">${a.name}</span><span class="hb-track"><span class="hb-fill" style="--v:${D.attrs[a.id] / maxAttr}"></span></span><b>+${num(D.attrs[a.id])}</b></li>`)}</ul></section>

      <section class="dash-sec"><h2 class="section-title">퀘스트별 달성률 <button class="btn sm ghost" data-act="dash.sort">${lowFirst ? '높은 순' : '낮은 순'}으로</button></h2>
        ${qs.length ? html`<ul class="qrates panel">${qs.map(x => html`<li>
            <div class="qr-top">${questIcon(x.q, 16)}<span class="hb-name">${x.q.name}</span><span class="hb-track"><span class="hb-fill sea" style="--v:${x.rate}"></span></span><b>${x.ok}/${x.need} ${Math.round(x.rate * 100)}%</b></div>
            <ol class="qstrip" aria-label="${x.q.name} 최근 14일: 완료 ${strip(S, x.q).filter(c => c.s === 'ok').length}일, 놓침 ${strip(S, x.q).filter(c => c.s === 'miss').length}일">${strip(S, x.q).map(c => html`<li class="${c.s}" title="${fmtShort(c.d)} ${({ ok: '완료', miss: '놓침', off: '쉬는 날', wait: '오늘 아직' })[c.s]}"></li>`)}</ol></li>`)}</ul>
            <p class="legend-line"><i class="ok"></i>완료 <i class="miss"></i>놓침 <i class="off"></i>쉬는 날 <i class="wait"></i>오늘 아직 <span class="muted">· 칸 하나 = 하루 (최근 14일)</span></p>`
          : html`<p class="muted pad">이 기간에 해야 했던 반복 퀘스트가 없어요</p>`}
        <p class="hint">달성률은 최근 60일 완료 기록으로 계산해요. 오늘 아직 안 한 퀘스트는 빼고 셉니다.</p></section>

      <section class="dash-sec"><h2 class="section-title"><span class="st">${uiIcon('fire', 16)} 지금 이어지는 연속</span></h2>
        ${D.streaks.length ? html`<ol class="rank panel">${D.streaks.map((q, i) => html`<li><b class="rank-n r${i + 1}">${i + 1}</b>${questIcon(q, 16)}<span class="hb-name">${q.name}</span><span>${q.streak}일째 <small class="muted">최고 ${q.best}일</small></span></li>`)}</ol>`
          : html`<p class="muted pad">이어지는 연속 기록이 없어요. 오늘 하나 완료해 볼까요?</p>`}</section>

      <section class="dash-sec"><h2 class="section-title"><span class="st">${uiIcon('monster', 16)} 유혹 현황</span></h2>
        ${D.bads.length ? html`<ul class="bad-stats panel">${D.bads.map(b => html`<li>${tempterHTML(b.q.monster, b.clean ? 'sleep' : 'laugh', 32)}<span class="hb-name">${b.q.name}</span><span>기록 <b>${b.slips}</b>회</span><span>${uiAnim('shield', 16)} <b>${b.clean}</b>일째 · 최고 ${b.best}일</span></li>`)}</ul>`
          : html`<p class="muted pad">등록한 유혹이 없어요. 퀘스트 만들기에서 '유혹'을 골라 보세요.</p>`}</section>
    </div>`;
  },
};

// ---------------------------------------------------------------- 달력 (MO-ADV-008)
let calMonth = null;
const heatLevel = n => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4);
export const calendarPage = {
  screen: 'MO-ADV-008', tab: 'me',
  render(S) {
    const day = today(S);
    const { y: ty, m: tm } = parseKey(day);
    const thisMonth = `${ty}-${pad2(tm)}-01`;
    if (!calMonth) calMonth = thisMonth;
    const { y, m } = parseKey(calMonth), last = lastDayOf(y, m);
    const lead = weekday(calMonth);
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= last; d++) cells.push(`${y}-${pad2(m)}-${pad2(d)}`);
    while (cells.length % 7) cells.push(null);
    const R = [calMonth, `${y}-${pad2(m)}-${pad2(last)}`], M = metrics(S, [R[0], R[1] > day ? day : R[1]]);
    const slipN = d => Object.values(S.slips?.[d] || {}).reduce((a, b) => a + b, 0);
    const first = Object.keys(S.days).sort()[0] || day;
    const canPrev = calMonth > first.slice(0, 8) + '01', canNext = calMonth < thisMonth;
    return html`${pageHead(S, '달력', { back: '#/me' })}
    ${insightNav('me/calendar')}
    <div class="content">
      <div class="cal-nav panel">
        <button class="icon-btn" data-act="cal.step" data-v="-1" ${canPrev ? '' : 'disabled'} aria-label="이전 달">${uiIcon('arrow_left', 24)}</button>
        <h2 class="cal-title" aria-live="polite">${y}년 ${m}월</h2>
        <button class="icon-btn" data-act="cal.step" data-v="1" ${canNext ? '' : 'disabled'} aria-label="다음 달">${uiIcon('arrow_right', 24)}</button>
        ${calMonth !== thisMonth ? html`<button class="btn sm ghost" data-act="cal.today">이번 달</button>` : ''}
      </div>
      <div class="stat-grid tiles cal-sum">
        <div class="stat panel"><span class="stat-k">${uiAnim('check', 16)} 완료</span><b class="stat-v">${num(M.done)}회</b></div>
        <div class="stat panel"><span class="stat-k">${uiAnim('sun', 16)} 활동한 날</span><b class="stat-v">${M.active}일</b></div>
        <div class="stat panel"><span class="stat-k">${uiAnim('sparkle', 16)} 완벽한 하루</span><b class="stat-v">${M.perfect}일</b></div>
        <div class="stat panel"><span class="stat-k">${uiAnim('exp', 16)} 경험치</span><b class="stat-v">${num(M.exp)}</b></div>
      </div>
      <div class="cal panel">
        <div class="cal-grid" role="grid" aria-label="${y}년 ${m}월 완료 달력">
          <div class="cal-row" role="row">${WEEKDAYS.map((w, i) => html`<span class="cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}" role="columnheader">${w}</span>`)}</div>
          ${Array.from({ length: cells.length / 7 }, (_, r) => html`<div class="cal-row" role="row">${cells.slice(r * 7, r * 7 + 7).map(d => {
            if (!d) return html`<span class="cal-cell blank" role="gridcell"></span>`;
            const v = S.days[d] || {}, n = v.q || 0, fut = d > day, sl = slipN(d);
            const label = `${fmtShort(d)}${fut ? ' 미래' : ` 퀘스트 ${n}회 완료${v.perfect ? ', 완벽한 하루' : ''}${v.dive ? `, 다이빙 ${v.dive}분` : ''}${sl ? `, 유혹 ${sl}회` : ''}`}`;
            return html`<span role="gridcell"><button class="cal-cell l${heatLevel(n)} ${d === day ? 'today' : ''} ${fut ? 'future' : ''}" data-act="day.open" data-d="${d}" ${fut ? 'disabled' : ''} aria-label="${label}">
              <span class="cal-d">${parseKey(d).d}</span>${n ? html`<span class="cal-n">${n}</span>` : ''}
              <span class="cal-marks">${v.perfect ? html`<i class="mk-perfect" aria-hidden="true">★</i>` : ''}${v.dive ? html`<i class="mk-dive" aria-hidden="true"></i>` : ''}${sl ? html`<i class="mk-slip" aria-hidden="true"></i>` : ''}</span></button></span>`;
          })}</div>`)}
        </div>
        <div class="cal-legend"><span>완료</span>${[0, 1, 2, 3, 4].map(l => html`<i class="cal-cell l${l}"></i>`)}<span>많음</span>
          <span class="sep"></span><i class="mk-perfect">★</i>완벽 <i class="mk-dive"></i>다이빙 <i class="mk-slip"></i>유혹</div>
      </div>
      <p class="hint center">날짜를 누르면 그날 상세가 열려요</p>
    </div>`;
  },
};

// ---------------------------------------------------------------- 히스토리
const FILTERS = [['all', '전체'], ['quest', '퀘스트'], ['bad', '유혹'], ['reward', '보상'], ['dive', '다이빙'], ['item', '아이템'], ['achv', '업적']];
const TYPE_OF = { quest: 'quest', slip: 'bad', clean: 'bad', buy: 'reward', use: 'reward', dive: 'dive', 'dive-fail': 'dive', chest: 'item', sell: 'item', charm: 'item', achv: 'achv' };
const LOG_ICON = { quest: 'check', slip: 'monster', clean: 'shield', buy: 'shop', use: 'gift', dive: 'dive', 'dive-fail': 'dive', chest: 'gift', sell: 'coin', charm: 'sparkle', achv: 'trophy' };
export const logLine = (S, l) => html`<li class="hist-row t-${TYPE_OF[l.type] || 'etc'}"><span class="log-t">${fmtTime(l.t)}</span>${uiIcon(LOG_ICON[l.type] || 'info', 16)}<span class="log-x">${l.text}</span>
  <span class="log-r">${l.exp ? `+${l.exp} EXP ` : ''}${l.coins ? `${l.coins > 0 ? '+' : ''}${l.coins}🐚` : ''}${l.minutes ? ` 🕒${minutesText(l.minutes)}` : ''}${l.amount ? ` 💰${num(l.amount)}원` : ''}</span></li>`;

let hFilter = 'all', hPage = 1, hQuery = '';
export const historyPage = {
  screen: 'MO-ADV-006', tab: 'me',
  render(S) {
    const q = hQuery.trim().toLowerCase();
    const byText = S.log.filter(l => !q || String(l.text).toLowerCase().includes(q));
    const counts = Object.fromEntries(FILTERS.map(([v]) => [v, v === 'all' ? byText.length : byText.filter(l => TYPE_OF[l.type] === v).length]));
    const all = byText.filter(l => hFilter === 'all' || TYPE_OF[l.type] === hFilter);
    const shown = all.slice(0, hPage * 50);
    // 같은 날 기록은 한 묶음으로 (기록 순서가 섞여 있어도 날짜별로 모음), 최신 날짜부터
    const byDay = new Map();
    for (const l of shown) { const d = logDay(S, l); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(l); }
    const groups = [...byDay].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([d, ls]) => [d, ls.sort((a, b) => b.t - a.t)]);
    const sumExp = all.reduce((s, l) => s + (l.exp || 0), 0), sumCoin = all.reduce((s, l) => s + (l.coins || 0), 0);
    return html`${pageHead(S, '히스토리', { back: '#/me' })}
    ${insightNav('me/history')}
    <div class="content">
      <label class="field hist-search"><span class="sr">기록 검색</span>${uiIcon('search', 16)}<input class="input" type="search" data-in="hist.q" value="${hQuery}" placeholder="퀘스트·보상 이름으로 찾기" autocomplete="off"></label>
      <div class="chips scroll" role="group" aria-label="종류">${FILTERS.map(([v, l]) => html`<button class="chip ${hFilter === v ? 'on' : ''}" data-act="hist.filter" data-v="${v}" aria-pressed="${hFilter === v}">${l} <span class="seg-n">${counts[v]}</span></button>`)}</div>
      <p class="hist-total" aria-live="polite"><b>${num(all.length)}건</b>${sumExp ? ` · +${num(sumExp)} EXP` : ''}${sumCoin ? ` · 🐚 ${sumCoin > 0 ? '+' : ''}${num(sumCoin)}` : ''}${q ? html` · '${hQuery.trim()}' 검색 <button class="btn sm ghost" data-act="hist.clear">검색 지우기</button>` : ''}</p>
      ${groups.length ? groups.map(([d, ls]) => {
        const v = S.days[d] || {};
        return html`<section class="hist-day">
          <button class="hist-head" data-act="day.open" data-d="${d}"><span class="hist-date"><b>${parseKey(d).m}.${pad2(parseKey(d).d)}</b><small>${WEEKDAYS[weekday(d)]}</small></span>
            <small>퀘스트 ${v.q || 0} · +${num(Math.max(0, v.exp || 0))} EXP · 🐚 ${num(v.coins || 0)}${v.perfect ? ' · ★ 완벽' : ''}</small><span class="hist-more">상세</span>${uiIcon('arrow_right', 16)}</button>
          <ol class="log panel">${ls.map(l => logLine(S, l))}</ol></section>`;
      }) : empty(q ? `'${hQuery.trim()}' 검색 결과가 없어요` : '아직 기록이 없어요')}
      ${all.length > shown.length ? html`<button class="btn block" data-act="hist.more">더 보기 (${num(all.length - shown.length)}건 남음)</button>` : ''}
      <p class="hint center">활동 기록은 최근 2,000건까지 보관해요</p>
    </div>`;
  },
};

/** 날짜 상세 (MO-ADV-007): 전날·다음날로 넘겨 보기 */
export function openDay(d0) {
  let d = d0;
  const h = openOverlay({
    type: 'sheet', screen: 'MO-ADV-007', title: fmtDate(d),
    render: () => {
      const S = store.S, v = S.days[d] || {}, day = today(S);
      const recent = diffDays(d, day) < 60;
      const qs = S.quests.filter(q => q.kind !== 'bad' && (q.repeat.type === 'once' ? q.doneDay === d : isScheduled(S, q, d) && q.repeat.start <= d));
      const ls = S.log.filter(l => logDay(S, l) === d);
      const slips = badQuests(S).filter(q => S.slips?.[d]?.[q.id]);
      const okN = qs.filter(q => doneCount(S, d, q.id) >= (q.repeat.type === 'once' ? 1 : q.times)).length;
      return html`<div class="day-nav">
          <button class="btn sm ghost" data-act="day.step" data-v="-1">${uiIcon('arrow_left', 16)} 전날</button>
          <span class="day-rate">${recent && qs.length ? html`할 일 <b>${okN}/${qs.length}</b>` : ''}</span>
          <button class="btn sm ghost" data-act="day.step" data-v="1" ${d >= day ? 'disabled' : ''}>다음날 ${uiIcon('arrow_right', 16)}</button></div>
        <div class="day-sum stat-grid">
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
  dayHandles.add(h); h.done.then(() => dayHandles.delete(h));
  h.step = n => { const nd = addDays(d, n); if (nd > today(store.S)) return; d = nd; h.opts.title = fmtDate(d); h.box.setAttribute('aria-label', h.opts.title); h.rerender(); };
  return h;
}

actions({
  'dash.period': el => store.update(S => { S.settings.dashPeriod = el.dataset.v; }, { noTouch: true }),
  'dash.sort': () => { lowFirst = !lowFirst; store.emit({}); },
  'dash.chart': el => { chartMode = el.dataset.v; store.emit({}); },
  'hist.filter': el => { hFilter = el.dataset.v; hPage = 1; store.emit({}); },
  'hist.more': () => { hPage++; store.emit({}); },
  'hist.clear': () => { hQuery = ''; hPage = 1; store.emit({}); setTimeout(() => document.querySelector('.hist-search input')?.focus(), 50); },
  'hist.q': el => {
    hQuery = el.value; hPage = 1;
    clearTimeout(histTimer);
    histTimer = setTimeout(() => { store.emit({}); requestAnimationFrame(() => { const i = document.querySelector('.hist-search input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 250);
  },
  'day.open': el => openDay(el.dataset.d),
  'day.step': el => { const top = el.closest('.ov'); for (const x of dayHandles) if (x.el === top) x.step(+el.dataset.v); },
  'cal.step': el => { calMonth = addMonths(calMonth, +el.dataset.v); store.emit({}); },
  'cal.today': () => { calMonth = null; store.emit({}); },
});
let histTimer = 0;
const dayHandles = new Set();
