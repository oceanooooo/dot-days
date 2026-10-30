// 디데이: 목록(MO-DDY-001), 계산기(MO-DDY-002), 만들기·수정(MO-DDY-003) — REQ-02
import { store } from '../store.js';
import { today, checkAchievements } from '../game.js';
import { KIND_NAMES, quickList, shiftDays, between, anniversaries, ddayView, sortDdays } from '../dday.js';
import { html, fmtDate, num, clamp, uid, diffDays } from '../util.js';
import { actions, openOverlay, toast, confirmBox, uiIcon, itemIcon, topOverlay, closeTop } from '../ui.js';
import { achievementToasts } from '../fx.js';
import { pickIcon } from './shop.js';
import { pageHead, empty, seg } from './common.js';

const kindBadge = k => html`<span class="tag kind-${k}">${KIND_NAMES[k]}</span>`;

// ---------------------------------------------------------------- 목록
export const ddayListPage = {
  screen: 'MO-DDY-001', tab: 'me',
  render(S) {
    const day = today(S);
    const list = sortDdays(S.ddays, S.settings.ddaySort, day, S.settings.dplusFrom1);
    return html`${pageHead(S, '디데이', { back: '#/me', right: html`<a class="btn sm" href="#/dday/calc">${uiIcon('calendar', 16)} 계산기</a>` })}
    <div class="content">
      ${S.ddays.length ? html`
        <div class="sort-row">${seg([['near', '가까운 순'], ['created', '등록 순']], S.settings.ddaySort, 'dday.sort', '정렬')}</div>
        <div class="dlist">${list.map(({ dd, v }) => html`<button class="dcard panel ${v.past ? 'past' : ''} ${v.celebrate ? 'celebrate' : ''}" data-act="dday.edit" data-id="${dd.id}">
          <span class="slot">${itemIcon(dd.icon || 'letter', 32)}</span>
          <span class="dcard-body"><b class="dcard-name">${dd.name}${dd.pinned ? html` <span class="pin" title="마을에 고정">${uiIcon('pin', 16, '고정됨')}</span>` : ''}</b>
            <span class="dcard-date">${fmtDate(v.target)} ${kindBadge(dd.kind)}</span>${dd.memo ? html`<span class="dcard-memo">${dd.memo}</span>` : ''}</span>
          <span class="dday-big">${v.text}${v.sub ? html`<small>${v.sub}</small>` : ''}</span>
        </button>`)}</div>` : empty('기다리는 날이 있어? 계산기로 날짜를 찾아보자!', html`<a class="btn primary" href="#/dday/calc">계산기 열기</a>`)}
    </div>
    <div class="fab-row"><button class="btn primary" data-act="dday.new">${uiIcon('plus', 16)} 디데이</button></div>`;
  },
};

// ---------------------------------------------------------------- 계산기
const calc = { tab: 'quick', base: null, n: 100, dir: 1, a: null, b: null, start: null };
export const ddayCalcPage = {
  screen: 'MO-DDY-002', tab: 'me',
  render(S) {
    const day = today(S);
    calc.base ||= day; calc.a ||= day; calc.b ||= day; calc.start ||= day;
    const from1 = S.settings.dplusFrom1;
    const row = (label, date, kind = 'dday', extra = '') => {
      const left = diffDays(day, date);
      return html`<li class="calc-row"><span class="calc-label">${label}</span><span class="calc-date">${fmtDate(date)}</span>
        <span class="calc-left">${left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `${-left}일 전`}</span>${extra}
        <button class="btn sm" data-act="calc.reg" data-date="${date}" data-kind="${kind}" data-name="${label}">등록</button></li>`;
    };
    let body;
    if (calc.tab === 'quick') {
      body = html`<label class="field"><span class="label">기준일</span><input class="input" type="date" data-in="calc.base" value="${calc.base}"></label>
        <ul class="calc-list panel">${quickList(calc.base).map(q => row(`${calc.base === day ? '' : '기준일 '}${q.label}`, q.date))}</ul>`;
    } else if (calc.tab === 'shift') {
      const res = shiftDays(calc.base, calc.n, calc.dir);
      body = html`<label class="field"><span class="label">기준일</span><input class="input" type="date" data-in="calc.base" value="${calc.base}"></label>
        <div class="field"><span class="label">며칠</span><div class="row"><input class="input short" type="number" min="1" max="36500" data-in="calc.n" value="${calc.n}" aria-label="일수">
          ${seg([['1', '후'], ['-1', '전']], String(calc.dir), 'calc.dir', '방향')}</div></div>
        <ul class="calc-list panel">${row(`${calc.n}일 ${calc.dir > 0 ? '후' : '전'}`, res)}</ul>`;
    } else if (calc.tab === 'between') {
      const r = between(calc.a, calc.b);
      body = html`<div class="row two"><label class="field"><span class="label">시작일</span><input class="input" type="date" data-in="calc.a" value="${calc.a}"></label>
        <label class="field"><span class="label">끝일</span><input class="input" type="date" data-in="calc.b" value="${calc.b}"></label></div>
        <div class="between panel" aria-live="polite">
          <p class="between-big">${num(r.days)}일 ${r.sign < 0 ? html`<small>(끝일이 더 빨라요)</small>` : ''}</p>
          <p>${num(r.weeks)}주${r.weekRest ? ` ${r.weekRest}일` : ''} · ${r.months ? `${num(r.months)}개월 ` : ''}${r.restDays}일</p>
          <p class="muted">시작일을 1일째로 세면 ${num(r.inclusive)}일째</p>
        </div>`;
    } else {
      const list = anniversaries(calc.start, from1, day);
      body = html`<label class="field"><span class="label">시작일 (만난 날, 입사일 등)</span><input class="input" type="date" data-in="calc.start" value="${calc.start}"></label>
        <button class="btn block" data-act="calc.reg" data-date="${calc.start}" data-kind="dplus" data-name="우리의 시작">${uiIcon('plus', 16)} 이 날을 D+day로 등록</button>
        <p class="hint">시작일을 ${from1 ? '1일째' : '0일째'}로 세요 (설정에서 변경)</p>
        <ul class="calc-list panel">${list.map(a => html`<li class="calc-row ${a.past ? 'past' : ''} ${a.next ? 'next' : ''}"><span class="calc-label">${a.label}${a.next ? html` <span class="badge now">다음</span>` : ''}</span>
          <span class="calc-date">${fmtDate(a.date)}</span><span class="calc-left">${a.past ? '지남' : a.left === 0 ? '오늘' : `D-${a.left}`}</span>
          <button class="btn sm" data-act="calc.reg" data-date="${a.date}" data-kind="dday" data-name="${a.label}">등록</button></li>`)}</ul>`;
    }
    return html`${pageHead(S, '디데이 계산기', { back: '#/dday' })}
    <div class="content">
      ${seg([['quick', '빠른 계산'], ['shift', 'N일 후/전'], ['between', '날짜 사이'], ['anniv', '기념일']], calc.tab, 'calc.tab', '계산 종류')}
      ${body}
    </div>`;
  },
};

// ---------------------------------------------------------------- 만들기·수정
let ddraft = null, dedit = null;
export function openDdayEditor(dd = null, preset = {}) {
  dedit = dd;
  const day = today(store.S);
  ddraft = dd ? { ...dd } : { name: preset.name || '', date: preset.date || day, kind: preset.kind || 'dday', icon: 'letter', memo: '', pinned: false };
  openOverlay({
    type: 'sheet', screen: 'MO-DDY-003', title: dd ? '디데이 수정' : '디데이 등록',
    render: () => {
      const v = ddayView(ddraft, day, store.S.settings.dplusFrom1);
      return html`
      <div class="icon-field"><span class="slot lg">${itemIcon(ddraft.icon, 48)}</span><button class="btn sm" data-act="de.icon">아이콘 바꾸기</button></div>
      <label class="field"><span class="label">이름 <em>필수</em></span><input class="input" data-in="de.name" maxlength="20" value="${ddraft.name}" placeholder="예: 여름 여행" autocomplete="off" ${dd ? '' : 'autofocus'}></label>
      <div class="field"><span class="label">종류</span><div class="chips three">${[['dday', '목표일 D-day'], ['dplus', '시작일 D+day'], ['yearly', '매년 반복']].map(([k, l]) =>
        html`<button class="chip ${ddraft.kind === k ? 'on' : ''}" data-act="de.kind" data-v="${k}" aria-pressed="${ddraft.kind === k}">${l}</button>`)}</div></div>
      <label class="field"><span class="label">${ddraft.kind === 'dplus' ? '시작일' : ddraft.kind === 'yearly' ? '기념일(처음 날짜)' : '목표일'}</span><input class="input" type="date" data-in="de.date" value="${ddraft.date}"></label>
      <p class="preview panel inset" aria-live="polite"><b class="dday-big inline">${v.text}</b> ${v.sub || ''} · ${fmtDate(v.target)}</p>
      <label class="field"><span class="label">메모</span><input class="input" data-in="de.memo" maxlength="100" value="${ddraft.memo}" placeholder="(선택)" autocomplete="off"></label>
      <label class="toggle-row"><span>마을에 고정 <small class="muted">최대 3개</small></span><input type="checkbox" class="toggle" data-in="de.pin" ${ddraft.pinned ? 'checked' : ''}></label>`;
    },
    foot: () => html`${dd ? html`<button class="btn danger" data-act="de.delete">${uiIcon('trash', 16)} 삭제</button>` : ''}<button class="btn primary grow" data-act="de.save" ${ddraft.name.trim() ? '' : 'disabled'}>저장</button>`,
  });
}
const dsync = () => { const b = topOverlay()?.box.querySelector('[data-act="de.save"]'); if (b) b.disabled = !ddraft.name.trim(); };

actions({
  'dday.sort': el => store.update(S => { S.settings.ddaySort = el.dataset.v; }),
  'dday.new': () => openDdayEditor(),
  'dday.edit': el => openDdayEditor(store.S.ddays.find(d => d.id === el.dataset.id)),
  'calc.tab': el => { calc.tab = el.dataset.v; store.emit({}); },
  'calc.base': el => { if (el.value) { calc.base = el.value; store.emit({}); } },
  'calc.n': el => { const n = clamp(Math.floor(+el.value || 1), 1, 36500); if (n !== calc.n) { calc.n = n; refreshShift(); } },
  'calc.dir': el => { calc.dir = +el.dataset.v; store.emit({}); },
  'calc.a': el => { if (el.value) { calc.a = el.value; store.emit({}); } },
  'calc.b': el => { if (el.value) { calc.b = el.value; store.emit({}); } },
  'calc.start': el => { if (el.value) { calc.start = el.value; store.emit({}); } },
  'calc.reg': el => openDdayEditor(null, { date: el.dataset.date, kind: el.dataset.kind, name: el.dataset.name.replace(/^기준일 /, '') }),
  'de.name': el => { ddraft.name = el.value; dsync(); },
  'de.memo': el => { ddraft.memo = el.value; },
  'de.kind': el => { ddraft.kind = el.dataset.v; topOverlay().rerender(); },
  'de.date': el => { if (el.value) { ddraft.date = el.value; topOverlay().rerender(); } },
  'de.pin': el => {
    const others = store.S.ddays.filter(d => d.pinned && d.id !== dedit?.id).length;
    if (el.checked && others >= 3) { el.checked = false; toast('최대 3개까지 고정할 수 있어요', { icon: 'pin' }); return; }
    ddraft.pinned = el.checked;
  },
  'de.icon': async () => { const sheet = topOverlay(); const id = await pickIcon(ddraft.icon); if (id) { ddraft.icon = id; sheet.rerender(); } },
  'de.save': () => {
    if (!ddraft.name.trim()) return;
    const d = { name: ddraft.name.trim(), date: ddraft.date, kind: ddraft.kind, icon: ddraft.icon, memo: ddraft.memo.trim(), pinned: ddraft.pinned };
    const res = store.update(S => {
      if (dedit) { Object.assign(S.ddays.find(x => x.id === dedit.id), d); return []; }
      S.ddays.push({ id: uid(), createdAt: Date.now(), ...d });
      S.stats.ddays++;
      return checkAchievements(S);
    });
    closeTop();
    toast(dedit ? '디데이를 고쳤어요' : '디데이를 등록했어요', { item: d.icon });
    achievementToasts(res);
    if (!dedit && location.hash !== '#/dday') location.hash = '#/dday';
  },
  'de.delete': async () => {
    const ok = await confirmBox({ title: `〈${dedit.name}〉 디데이를 삭제할까요?`, ok: '삭제', danger: true });
    if (!ok) return;
    store.update(S => { S.ddays = S.ddays.filter(x => x.id !== dedit.id); });
    closeTop();
    toast('디데이를 삭제했어요', { icon: 'trash' });
  },
});

// N일 입력 중에는 입력 칸을 다시 그리지 않고 결과 줄만 바꿈 (커서 유지)
function refreshShift() {
  const ul = document.querySelector('.calc-list');
  if (!ul) return;
  const res = shiftDays(calc.base, calc.n, calc.dir);
  const left = diffDays(today(store.S), res);
  ul.querySelector('.calc-label').textContent = `${calc.n}일 ${calc.dir > 0 ? '후' : '전'}`;
  ul.querySelector('.calc-date').textContent = fmtDate(res);
  ul.querySelector('.calc-left').textContent = left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `${-left}일 전`;
  const b = ul.querySelector('[data-act="calc.reg"]');
  b.dataset.date = res; b.dataset.name = `${calc.n}일 ${calc.dir > 0 ? '후' : '전'}`;
}
