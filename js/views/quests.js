// 퀘스트: 카드, 목록(MO-QST-001), 만들기·수정 시트(MO-QST-002), 유혹 기록(MO-QST-004), 완료·취소·복제·보관
import { store } from '../store.js';
import {
  today, isDone, isScheduled, doneCount, todayQuests, activeQuests, badQuests, nextDay, previewReward, completeQuest, undoQuest, makeQuest,
  attrList, cleanDays, slippedOn, slipBad, undoSlip, duplicateDraft, archiveQuest, savePreset,
} from '../game.js';
import { DIFF, SLOTS, SLOT_IDS, BAD, TEMPTER_IDS } from '../data.js';
import { html, WEEKDAYS, clamp, diffDays, fmtShort } from '../util.js';
import { actions, openOverlay, toast, confirmBox, uiIcon, uiAnim, attrIcon, iconHTML, tempterHTML, tempterName, topOverlay, closeTop, fxAt } from '../ui.js';
import { showResult, slipPopup } from '../fx.js';
import { sfx } from '../sound.js';
import { pageHead, empty, seg, stars } from './common.js';
import { openPresetPicker } from './manage.js';
import { pickIcon } from './shop.js';

// ---------------------------------------------------------------- 표시 도우미
export function repeatText(q) {
  const r = q.repeat;
  if (q.kind === 'bad') return '유혹';
  if (r.type === 'once') return '한 번';
  if (r.type === 'daily') return '매일';
  if (r.type === 'weekly') return r.days.length === 7 ? '매일' : [...r.days].sort().map(d => WEEKDAYS[d]).join('·');
  if (r.type === 'monthly') return `매월 ${[...(r.dates || [])].sort((a, b) => a - b).map(d => (d === 31 ? '말일' : `${d}일`)).join('·')}`;
  return `${r.every}일마다`;
}
function dueText(q, day) {
  if (q.repeat.type !== 'once' || !q.due || q.doneAt) return null;
  const left = diffDays(day, q.due);
  if (left < 0) return html`<span class="due over">기한 지남</span>`;
  if (left === 0) return html`<span class="due today">D-DAY</span>`;
  return html`<span class="due">~${fmtShort(q.due)}</span>`;
}
const rewardText = q => { const p = previewReward(q); return `+${p.exp} EXP · 🐚${p.coins}`; };
export const questIcon = (q, size = 32) => (q.icon ? iconHTML(q.icon, size) : q.attrs[0] ? attrIcon(q.attrs[0], size) : uiIcon('quest', size));

/** 퀘스트 카드 (FR-QST-013). mode: 'today' | 'all' | 'done' */
export function questCard(S, q, day, mode = 'today') {
  if (q.kind === 'bad') return badCard(S, q, day);
  const done = isDone(S, q, day);
  const sched = isScheduled(S, q, day);
  const cnt = doneCount(S, day, q.id);
  const multi = q.repeat.type !== 'once' && q.times > 1;
  let right;
  if (sched && !done) {
    right = html`<button class="qbtn" data-act="quest.complete" data-id="${q.id}" data-silent="1" aria-label="${q.name} 완료${multi ? ` (${cnt}/${q.times})` : ''}">${multi ? html`<span class="qbtn-n">${cnt}/${q.times}</span>` : uiIcon('check', 24)}</button>`;
  } else if (done && (q.repeat.type !== 'once' ? cnt > 0 : q.doneDay === day)) {
    right = html`<span class="qdone">${uiIcon('check', 24, '완료함')}${mode !== 'today' ? html`<button class="btn sm ghost" data-act="quest.undo" data-id="${q.id}">취소</button>` : ''}</span>`;
  } else if (done) {
    right = html`<span class="qdone">${uiIcon('check', 24, '완료함')}</span>`;
  } else {
    const nd = nextDay(S, q, day);
    right = html`<span class="qnext">${nd ? html`다음<br>${fmtShort(nd)}` : ''}</span>`;
  }
  return html`<article class="qcard ${done ? 'done' : ''}">
    <button class="qcard-main" data-act="quest.edit" data-id="${q.id}" aria-label="${q.name} 수정">
      <span class="qcard-icon">${questIcon(q)}</span>
      <span class="qcard-body">
        <span class="qcard-name">${q.name}</span>
        <span class="qcard-meta">${stars(q.diff)}<span class="rep">${repeatText(q)}${multi ? ` ${q.times}회` : ''}</span>${q.streak > 0 ? html`<span class="streak">${uiAnim('fire', 16)}${q.streak}</span>` : ''}${dueText(q, day)}</span>
        <span class="qcard-reward">${rewardText(q)}</span>
      </span>
    </button>
    ${right}
  </article>`;
}

/** 유혹 카드 (FR-QST-024~026): 몬스터 상태 = 오늘 해버림 웃음 / 참는 중 잠 / 그 외 기본 */
export function badCard(S, q, day) {
  const slipped = slippedOn(S, q, day);
  const clean = cleanDays(S, q, day);
  const state = slipped ? 'laugh' : clean >= 1 ? 'sleep' : 'idle';
  return html`<article class="qcard bad ${slipped ? 'slipped' : ''}">
    <button class="qcard-main" data-act="quest.edit" data-id="${q.id}" aria-label="${q.name} 수정">
      <span class="qcard-icon tempter">${tempterHTML(q.monster, state, 40)}</span>
      <span class="qcard-body">
        <span class="qcard-name">${q.name}</span>
        <span class="qcard-meta">${stars(q.diff)}<span class="clean">${uiIcon('shield', 16)}${slipped ? '오늘 해버림' : `${clean}일째 참는 중`}</span>${q.cleanBest ? html`<span class="rep">최고 ${q.cleanBest}일</span>` : ''}</span>
        <span class="qcard-reward">해버리면 🐚−${BAD.penalty[q.diff]} · 참으면 하루 🐚+${BAD.bonusCoins[q.diff]}</span>
      </span>
    </button>
    <button class="qbtn slip" data-act="quest.slip" data-id="${q.id}" aria-label="${q.name} 해버렸어">해버렸어</button>
  </article>`;
}

/** 오늘 목록: 시간대 그룹 + 맨 아래 유혹 (FR-HOM-005) */
export function todayGroups(S, day) {
  const list = todayQuests(S, day);
  const bads = badQuests(S);
  if (!list.length && !bads.length) return null;
  const h = new Date().getHours();
  const nowSlot = h >= 4 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';
  const order = [nowSlot, ...SLOT_IDS.filter(s => s !== nowSlot && s !== 'any'), 'any'];
  return [...order.map(slot => {
    const qs = list.filter(q => q.slot === slot).sort((a, b) => isDone(S, a, day) - isDone(S, b, day));
    if (!qs.length) return '';
    return html`<section class="qgroup"><h3 class="group-head">${SLOTS[slot].name}${slot === nowSlot ? html`<span class="badge now">지금</span>` : ''}</h3>
      <div class="qgrid">${qs.map(q => questCard(S, q, day, 'today'))}</div></section>`;
  }), bads.length ? html`<section class="qgroup bad-group"><h3 class="group-head">${uiIcon('monster', 16)} 유혹 <small class="muted">하면 안 되는 것</small></h3><div class="qgrid">${bads.map(q => badCard(S, q, day))}</div></section>` : ''];
}

// ---------------------------------------------------------------- 목록 화면 (MO-QST-001)
let tab = 'today';
export const questsPage = {
  screen: 'MO-QST-001', tab: 'quests', title: '퀘스트',
  render(S) {
    const day = today(S);
    const list = todayQuests(S, day);
    const act = activeQuests(S), bads = badQuests(S);
    const doneList = act.filter(q => (q.repeat.type === 'once' ? q.doneAt : isScheduled(S, q, day) && doneCount(S, day, q.id) > 0 && isDone(S, q, day)));
    const tabs = [['today', '오늘', list.filter(q => !isDone(S, q, day)).length], ['all', '전체', act.length + bads.length], ['done', '완료', doneList.length]];
    let body;
    if (tab === 'today') {
      body = todayGroups(S, day) || empty('오늘은 쉬어가는 날! 새 퀘스트를 만들어 볼까?');
    } else if (tab === 'all') {
      const sort = S.settings.questSort;
      const cmp = sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'ko') : (a, b) => a.createdAt - b.createdAt;
      const groups = [['daily', '매일'], ['weekly', '요일 지정'], ['interval', 'N일마다'], ['monthly', '매월'], ['once', '한 번']];
      body = act.length + bads.length ? html`
        <div class="sort-row">${seg([['created', '만든 순'], ['name', '이름 순']], sort, 'quest.sort', '정렬')}</div>
        ${groups.map(([t, name]) => {
          const qs = act.filter(q => q.repeat.type === t && !(t === 'once' && q.doneAt)).sort(cmp);
          return qs.length ? html`<section class="qgroup"><h3 class="group-head">${name} <span class="muted">${qs.length}</span></h3><div class="qgrid">${qs.map(q => questCard(S, q, day, 'all'))}</div></section>` : '';
        })}
        ${bads.length ? html`<section class="qgroup bad-group"><h3 class="group-head">${uiIcon('monster', 16)} 유혹 <span class="muted">${bads.length}</span></h3><div class="qgrid">${[...bads].sort(cmp).map(q => badCard(S, q, day))}</div></section>` : ''}`
        : empty('퀘스트 게시판이 비어 있어. 첫 퀘스트를 붙여 볼까?');
    } else {
      const once = doneList.filter(q => q.repeat.type === 'once').sort((a, b) => b.doneAt - a.doneAt);
      const rep = doneList.filter(q => q.repeat.type !== 'once');
      body = doneList.length ? html`
        ${rep.length ? html`<section class="qgroup"><h3 class="group-head">오늘 완료한 반복 퀘스트</h3><div class="qgrid">${rep.map(q => questCard(S, q, day, 'done'))}</div></section>` : ''}
        ${once.length ? html`<section class="qgroup"><h3 class="group-head">끝낸 한 번 퀘스트</h3><div class="qgrid">${once.map(q => questCard(S, q, day, 'done'))}</div></section>` : ''}` : empty('아직 완료한 퀘스트가 없어. 하나씩 해 보자!');
    }
    return html`${pageHead(S, '퀘스트')}
      <div class="content">
        ${seg(tabs, tab, 'quest.tab', '퀘스트 목록')}
        <div class="tool-row"><a class="btn sm ghost-line" href="#/manage">${uiIcon('tools', 16)} 프리셋·보관함</a></div>
        <div class="qlist">${body}</div>
      </div>
      <div class="fab-row"><button class="btn primary" data-act="quest.new">${uiIcon('plus', 16)} 새 퀘스트</button></div>`;
  },
};

// ---------------------------------------------------------------- 완료·취소·유혹 기록
function complete(id, el) {
  const res = store.update(S => completeQuest(S, id));
  if (!res) return;
  sfx('complete');
  if (el) fxAt(el, 'burst', 80);
  showResult(res);
  toast(res.finished ? `〈${res.quest.name}〉 완료!` : `〈${res.quest.name}〉 ${res.count}/${res.target}`, {
    icon: 'check', action: { label: '되돌리기', fn: () => undo(id) },
  });
}
function undo(id) {
  const r = store.update(S => undoQuest(S, id));
  if (r) { sfx('undo'); toast('완료를 취소했어요'); }
}
async function slip(id) {
  const q = store.S.quests.find(x => x.id === id);
  if (!q) return;
  const ok = await confirmBox({ title: `〈${q.name}〉 해버렸어?`, text: `조개 🐚 ${BAD.penalty[q.diff]}개가 줄어들어요. 경험치는 그대로예요.`, ok: '응, 해버렸어', cancel: '아니, 참았어' });
  if (!ok) { sfx('item'); return; }
  const res = store.update(S => slipBad(S, id));
  if (!res) return;
  slipPopup(res);
  toast(`〈${q.name}〉 기록했어요`, { icon: 'monster', action: { label: '되돌리기', fn: () => { if (store.update(S => undoSlip(S, id))) { sfx('undo'); toast('기록을 취소했어요'); } } } });
}

// ---------------------------------------------------------------- 만들기·수정 시트 (MO-QST-002)
let draft = null, editing = null, asPreset = false;
const blank = preset => ({ kind: 'good', name: '', memo: '', diff: 2, attrs: [], icon: null, monster: TEMPTER_IDS[0], repeat: { type: 'daily', days: [], every: 2, dates: [] }, times: 1, slot: preset.slot || 'any', due: null });
export function openQuestEditor(q = null, preset = {}) {
  editing = q; asPreset = false;
  draft = q ? JSON.parse(JSON.stringify(q)) : { ...blank(preset), ...JSON.parse(JSON.stringify(preset.draft || {})) };
  draft.repeat = { days: [], every: 2, dates: [], type: 'daily', ...draft.repeat };
  draft.kind ||= 'good';
  draft.monster ||= TEMPTER_IDS[0];
  openOverlay({
    type: 'sheet', screen: 'MO-QST-002', title: q ? (q.kind === 'bad' ? '유혹 수정' : '퀘스트 수정') : '새 퀘스트',
    render: editorBody,
    foot: () => html`${q ? html`<button class="btn danger" data-act="qe.delete" aria-label="삭제">${uiIcon('trash', 16)}</button>
      <button class="btn" data-act="qe.dup">${uiIcon('copy', 16)} 복제</button><button class="btn" data-act="qe.archive">${uiIcon('archive', 16)} 보관</button>` : ''}
      <button class="btn primary grow" data-act="qe.save" ${valid() ? '' : 'disabled'}>저장</button>`,
  });
}
const valid = () => draft.name.trim().length > 0 && (draft.kind === 'bad' || ((draft.repeat.type !== 'weekly' || draft.repeat.days.length > 0) && (draft.repeat.type !== 'monthly' || draft.repeat.dates.length > 0)));
const choice = (act, v, on, label, extra = '') => html`<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}">${extra}${label}</button>`;

function editorBody() {
  const S = store.S, d = draft, r = d.repeat, bad = d.kind === 'bad';
  const p = previewReward({ diff: d.diff, attrs: d.attrs });
  return html`
  ${editing ? '' : html`<div class="row between"><div class="chips two grow">${choice('qe.kind', 'good', !bad, '퀘스트', uiIcon('quest', 16))}${choice('qe.kind', 'bad', bad, '유혹 (하면 안 되는 것)', uiIcon('monster', 16))}</div></div>
    <button class="btn block ghost-line" data-act="qe.preset">${uiIcon('preset', 16)} 프리셋에서 가져오기</button>`}
  <label class="field"><span class="label">이름 <em>필수</em></span>
    <input class="input" data-in="qe.name" value="${d.name}" maxlength="30" placeholder="${bad ? '예: 야식 먹기' : '예: 독서 20분'}" autocomplete="off" ${editing ? '' : 'autofocus'}></label>
  <div class="field"><span class="label">난이도</span>
    <div class="chips five">${[1, 2, 3, 4, 5].map(n => choice('qe.diff', n, d.diff === n, DIFF[n].name, html`<span class="stars mini">${'★'.repeat(n)}</span>`))}</div></div>
  ${bad ? html`<div class="field"><span class="label">유혹 몬스터</span>
    <div class="chips three">${TEMPTER_IDS.map(t => choice('qe.monster', t, d.monster === t, tempterName(t), tempterHTML(t, 'idle', 24)))}</div></div>`
    : html`<div class="field icon-field"><span class="label">아이콘</span><span class="slot">${d.icon ? iconHTML(d.icon, 32) : d.attrs[0] ? attrIcon(d.attrs[0], 32) : uiIcon('quest', 32)}</span>
    <button class="btn sm" data-act="qe.icon">바꾸기</button>${d.icon ? html`<button class="btn sm ghost" data-act="qe.noicon">기본으로</button>` : ''}</div>`}
  <div class="field"><span class="label">능력치 <small>최대 2개</small></span>
    <div class="chips attrs">${attrList(S).map(a => choice('qe.attr', a.id, d.attrs.includes(a.id), a.name, attrIcon(a.id, 16)))}</div></div>
  ${bad ? '' : html`
  <div class="field"><span class="label">반복</span>
    <div class="chips five">${[['once', '한 번'], ['daily', '매일'], ['weekly', '요일'], ['interval', 'N일마다'], ['monthly', '매월']].map(([t, l]) => choice('qe.repeat', t, r.type === t, l))}</div>
    ${r.type === 'weekly' ? html`<div class="chips week">${WEEKDAYS.map((w, i) => choice('qe.day', i, r.days.includes(i), w))}</div>${r.days.length ? '' : html`<p class="hint warn">요일을 1개 이상 골라 주세요</p>`}` : ''}
    ${r.type === 'interval' ? html`<div class="stepper"><button class="btn sm" data-act="qe.every" data-v="-1" aria-label="하루 줄이기">−</button><b>${r.every}일마다</b><button class="btn sm" data-act="qe.every" data-v="1" aria-label="하루 늘리기">+</button></div>` : ''}
    ${r.type === 'monthly' ? html`<div class="chips seven month">${Array.from({ length: 31 }, (_, i) => i + 1).map(n => choice('qe.date', n, r.dates.includes(n), n === 31 ? '말일' : String(n)))}</div>
      <p class="hint ${r.dates.length ? '' : 'warn'}">${r.dates.length ? '없는 날짜(예: 2월 30일)는 그 달 말일에 해요' : '날짜를 1개 이상 골라 주세요'}</p>` : ''}
  </div>
  ${r.type !== 'once' ? html`<div class="field"><span class="label">하루 목표 횟수</span>
    <div class="stepper"><button class="btn sm" data-act="qe.times" data-v="-1" aria-label="횟수 줄이기">−</button><b>${d.times}회</b><button class="btn sm" data-act="qe.times" data-v="1" aria-label="횟수 늘리기">+</button></div></div>` : ''}
  <div class="field"><span class="label">시간대</span>
    <div class="chips four">${SLOT_IDS.map(s => choice('qe.slot', s, d.slot === s, SLOTS[s].name))}</div></div>
  ${r.type === 'once' ? html`<div class="field"><span class="label">기한</span>
    <div class="row"><input class="input" type="date" data-in="qe.due" value="${d.due || ''}"><button class="chip ${d.due ? '' : 'on'}" data-act="qe.nodue">기한 없음</button></div></div>` : ''}`}
  <label class="field"><span class="label">메모</span>
    <textarea class="input" rows="2" data-in="qe.memo" maxlength="200" placeholder="${bad ? '왜 참고 싶은지 적어 두기 (선택)' : '어떻게 할지 적어 두기 (선택)'}">${d.memo}</textarea></label>
  <label class="toggle-row"><span>${uiIcon('preset', 16)} 프리셋으로도 저장</span><input type="checkbox" class="toggle" data-in="qe.asPreset" ${asPreset ? 'checked' : ''}></label>
  <div class="preview panel inset" aria-live="polite">
    ${bad ? html`<b>해버리면</b> 🐚 −${BAD.penalty[d.diff]} · <b>하루 참으면</b> 🐚 +${BAD.bonusCoins[d.diff]}${d.attrs.length ? ` · 능력치 +${BAD.bonusAttr[d.diff]}` : ''}`
    : html`<b>완료 보상</b> +${p.exp} EXP · 🐚 ${p.coins}${p.attr ? ` · 능력치 +${p.attr}` : ''} · 드롭 ${Math.round(p.drop * 100)}%`}
    ${editing && editing.streak ? html`<br><small>${uiIcon('fire', 16)} 연속 ${editing.streak}일 (수정해도 유지돼요)</small>` : ''}
  </div>`;
}
const re = () => topOverlay()?.rerender();
const syncSave = () => { const b = topOverlay()?.box.querySelector('[data-act="qe.save"]'); if (b) b.disabled = !valid(); };

actions({
  'quest.tab': el => { tab = el.dataset.v; store.emit({}); },
  'quest.sort': el => store.update(S => { S.settings.questSort = el.dataset.v; }),
  'quest.complete': el => complete(el.dataset.id, el),
  'quest.undo': el => undo(el.dataset.id),
  'quest.slip': el => slip(el.dataset.id),
  'quest.new': el => openQuestEditor(null, { slot: el.dataset.slot }),
  'quest.edit': el => { const q = store.S.quests.find(x => x.id === el.dataset.id); if (q) openQuestEditor(q); },
  'qe.kind': el => { draft.kind = el.dataset.v; re(); },
  'qe.preset': async () => {
    const sheet = topOverlay();
    const pr = await openPresetPicker();
    if (!pr) return;
    const t = JSON.parse(JSON.stringify(pr));
    Object.assign(draft, { kind: t.kind || 'good', name: t.name, memo: t.memo || '', diff: t.diff, attrs: t.attrs || [], icon: t.icon || null, monster: t.monster || draft.monster, times: t.times || 1, slot: t.slot || 'any' });
    draft.repeat = { days: [], every: 2, dates: [], ...(t.repeat || { type: 'daily' }) };
    sheet.rerender(); syncSave();
  },
  'qe.name': el => { draft.name = el.value; syncSave(); },
  'qe.memo': el => { draft.memo = el.value; },
  'qe.diff': el => { draft.diff = +el.dataset.v; re(); },
  'qe.monster': el => { draft.monster = el.dataset.v; re(); },
  'qe.icon': async () => { const sheet = topOverlay(); const id = await pickIcon(draft.icon || 'v:star:yellow-vivid'); if (id) { draft.icon = id; sheet.rerender(); } },
  'qe.noicon': () => { draft.icon = null; re(); },
  'qe.attr': el => {
    const a = el.dataset.v, list = draft.attrs;
    if (list.includes(a)) list.splice(list.indexOf(a), 1);
    else { list.push(a); if (list.length > 2) list.shift(); }
    re();
  },
  'qe.repeat': el => { draft.repeat.type = el.dataset.v; if (draft.repeat.type === 'once') draft.times = 1; re(); },
  'qe.day': el => { const d = +el.dataset.v, days = draft.repeat.days; days.includes(d) ? days.splice(days.indexOf(d), 1) : days.push(d); re(); },
  'qe.date': el => { const d = +el.dataset.v, ds = draft.repeat.dates; ds.includes(d) ? ds.splice(ds.indexOf(d), 1) : ds.push(d); re(); },
  'qe.every': el => { draft.repeat.every = clamp(draft.repeat.every + +el.dataset.v, 2, 30); re(); },
  'qe.times': el => { draft.times = clamp(draft.times + +el.dataset.v, 1, 10); re(); },
  'qe.slot': el => { draft.slot = el.dataset.v; re(); },
  'qe.due': el => { draft.due = el.value || null; re(); },
  'qe.nodue': () => { draft.due = null; re(); },
  'qe.asPreset': el => { asPreset = el.checked; },
  'qe.save': () => {
    if (!valid()) return;
    const d = draft;
    d.name = d.name.trim(); d.memo = (d.memo || '').trim();
    if (d.kind === 'bad') { d.repeat = { ...d.repeat, type: 'daily' }; d.times = 1; d.slot = 'any'; d.due = null; d.icon = null; }
    if (d.repeat.type === 'once') d.times = 1; else d.due = null;
    store.update(S => {
      if (editing) {
        const q = S.quests.find(x => x.id === editing.id);
        const typeChanged = q.repeat.type !== d.repeat.type;
        Object.assign(q, { name: d.name, memo: d.memo, diff: d.diff, attrs: d.attrs, times: d.times, slot: d.slot, due: d.due, icon: d.icon, monster: d.monster });
        q.repeat = { ...d.repeat, start: q.repeat.start };
        if (typeChanged && d.repeat.type !== 'once') { q.doneAt = null; q.doneDay = null; }
      } else {
        S.quests.push(makeQuest(d, today(S)));
      }
      if (asPreset) savePreset(S, d);
    });
    closeTop();
    toast(editing ? '퀘스트를 고쳤어요' : asPreset ? '퀘스트와 프리셋을 저장했어요' : '퀘스트 게시판에 붙였어요', { icon: asPreset ? 'preset' : 'quest' });
  },
  'qe.dup': () => {
    const src = editing;
    fxAt(topOverlay()?.box.querySelector('[data-act="qe.dup"]'), 'poof', 72);
    closeTop();
    setTimeout(() => openQuestEditor(null, { draft: duplicateDraft(src) }), 160);
  },
  'qe.archive': () => {
    const q = editing;
    store.update(S => archiveQuest(S, q.id, true));
    fxAt(topOverlay()?.box.querySelector('[data-act="qe.archive"]'), 'poof', 72);
    closeTop();
    toast(`〈${q.name}〉 보관함에 넣었어요`, { icon: 'archive', action: { label: '되돌리기', fn: () => store.update(S => { const x = S.quests.find(y => y.id === q.id); x.archived = false; }) } });
  },
  'qe.delete': async () => {
    const q = editing;
    const ok = await confirmBox({ title: `〈${q.name}〉 ${q.kind === 'bad' ? '유혹' : '퀘스트'}를 삭제할까요?`, text: '지난 기록과 통계는 남아요. 잠시 쉬려면 [보관]을 써 보세요.', ok: '삭제', danger: true });
    if (!ok) return;
    store.update(S => { S.quests = S.quests.filter(x => x.id !== q.id); });
    topOverlay()?.close();
    toast('퀘스트를 삭제했어요', { icon: 'trash' });
  },
});
