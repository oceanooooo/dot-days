// 관리(MO-MNG-001), 퀘스트 프리셋(MO-MNG-002), 보관함(MO-MNG-003), 능력치 관리(MO-MNG-004·005), 프리셋에서 고르기(MO-QST-003)
import { store } from '../store.js';
import { attrList, attrDef, attrInfo, addAttrDef, removeAttrDef, archiveQuest, previewReward } from '../game.js';
import { PRESETS, PRESET_CATS, ATTR_MAX, ATTR_COLORS } from '../data.js';
import { html, fmtShort, keyOf } from '../util.js';
import { actions, openOverlay, toast, confirmBox, uiIcon, attrIcon, iconHTML, tempterHTML, topOverlay, closeTop, fxAt } from '../ui.js';
import { pageHead, empty, stars, talkBox } from './common.js';
import { openQuestEditor, repeatText, questIcon } from './quests.js';
import { pickIcon } from './shop.js';

const allPresets = S => [...S.presets.map(p => ({ ...p, cat: 'mine' })), ...PRESETS];
const CATS = [['mine', '내 프리셋'], ...PRESET_CATS];
const presetIcon = (S, p) => (p.kind === 'bad' ? tempterHTML(p.monster, 'idle', 32) : questIcon({ ...p, attrs: (p.attrs || []).filter(a => attrList(S).some(d => d.id === a)) }, 32));
function presetRow(S, p, act, mine) {
  const pr = previewReward(p);
  return html`<article class="preset panel">
    <button class="preset-main" data-act="${act}" data-id="${p.id}"><span class="slot">${presetIcon(S, p)}</span>
      <span class="preset-body"><b>${p.name}</b><small>${stars(p.diff)} ${repeatText({ kind: p.kind, repeat: { days: [], dates: [], ...p.repeat } })}${p.times > 1 ? ` ${p.times}회` : ''} · ${p.kind === 'bad' ? '유혹' : `+${pr.exp} EXP`}</small></span></button>
    ${mine ? html`<button class="btn sm ghost" data-act="mng.presetDel" data-id="${p.id}" aria-label="${p.name} 프리셋 삭제">${uiIcon('trash', 16)}</button>` : ''}
  </article>`;
}

// ---------------------------------------------------------------- 관리 홈
export const managePage = {
  screen: 'MO-MNG-001', tab: 'me',
  render(S) {
    const arch = S.quests.filter(q => q.archived).length;
    return html`${pageHead(S, '관리', { back: '#/me' })}
    <div class="content">
      ${talkBox('자주 쓰는 건 프리셋으로, 쉬는 퀘스트는 보관함에!')}
      <nav class="menu panel" aria-label="관리 메뉴">
        <a class="menu-item" href="#/manage/presets">${uiIcon('preset', 24)}<span>퀘스트 프리셋</span><b>내 ${S.presets.length} · 기본 ${PRESETS.length}</b></a>
        <a class="menu-item" href="#/manage/archive">${uiIcon('archive', 24)}<span>보관함</span><b>${arch}</b></a>
        <a class="menu-item" href="#/manage/attrs">${uiIcon('chart', 24)}<span>능력치</span><b>${attrList(S).length}/${ATTR_MAX}</b></a>
        <a class="menu-item" href="#/shop">${uiIcon('shop', 24)}<span>나의 보상</span><b>${S.rewards.length}</b></a>
      </nav>
    </div>`;
  },
};

// ---------------------------------------------------------------- 퀘스트 프리셋
let presetCat = 'health';
export const presetsPage = {
  screen: 'MO-MNG-002', tab: 'me',
  render(S) {
    const list = allPresets(S).filter(p => p.cat === presetCat);
    return html`${pageHead(S, '퀘스트 프리셋', { back: '#/manage' })}
    <div class="content">
      <div class="chips scroll">${CATS.map(([v, l]) => html`<button class="chip ${presetCat === v ? 'on' : ''}" data-act="mng.presetCat" data-v="${v}">${l}</button>`)}</div>
      <p class="hint">누르면 그 설정으로 새 퀘스트 만들기가 열려요.${presetCat === 'mine' ? ' 퀘스트 저장 때 \'프리셋으로도 저장\'을 켜면 여기에 쌓여요.' : ''}</p>
      ${list.length ? html`<div class="preset-list">${list.map(p => presetRow(S, p, 'mng.presetUse', presetCat === 'mine'))}</div>` : empty('아직 내 프리셋이 없어요.')}
    </div>`;
  },
};

/** 프리셋에서 고르기 팝업 (MO-QST-003) → 고른 프리셋 (취소 시 undefined) */
let pickCat = 'health';
export function openPresetPicker() {
  const h = openOverlay({
    type: 'modal', screen: 'MO-QST-003', title: '프리셋에서 고르기', cls: 'ov-presets',
    render: () => {
      const S = store.S;
      const list = allPresets(S).filter(p => p.cat === pickCat);
      return html`<h2 class="modal-title">프리셋에서 고르기</h2>
        <div class="chips scroll">${CATS.map(([v, l]) => html`<button class="chip ${pickCat === v ? 'on' : ''}" data-act="pp.cat" data-v="${v}">${l}</button>`)}</div>
        <div class="preset-list scrollbox">${list.length ? list.map(p => presetRow(S, p, 'pp.pick', false)) : html`<p class="muted pad">아직 내 프리셋이 없어요</p>`}</div>
        <button class="btn block" data-act="ov.close">취소</button>`;
    },
  });
  return h.done;
}

// ---------------------------------------------------------------- 보관함
export const archivePage = {
  screen: 'MO-MNG-003', tab: 'me',
  render(S) {
    const list = S.quests.filter(q => q.archived).sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
    return html`${pageHead(S, '보관함', { back: '#/manage' })}
    <div class="content">
      ${list.length ? html`<div class="preset-list">${list.map(q => html`<article class="preset panel">
        <div class="preset-main"><span class="slot">${q.kind === 'bad' ? tempterHTML(q.monster, 'sleep', 32) : questIcon(q, 32)}</span>
          <span class="preset-body"><b>${q.name}</b><small>${repeatText(q)} · ${q.archivedAt ? fmtShort(keyOf(new Date(q.archivedAt))) + ' 보관' : ''}${q.best ? ` · 최고 연속 ${q.best}일` : ''}</small></span></div>
        <button class="btn sm primary" data-act="mng.restore" data-id="${q.id}">${uiIcon('restore', 16)} 다시 쓰기</button>
        <button class="btn sm ghost" data-act="mng.archDel" data-id="${q.id}" aria-label="${q.name} 삭제">${uiIcon('trash', 16)}</button>
      </article>`)}</div>` : empty('지금은 쉬고 있는 퀘스트가 없어.')}
    </div>`;
  },
};

// ---------------------------------------------------------------- 능력치 관리
export const attrsPage = {
  screen: 'MO-MNG-004', tab: 'me',
  render(S) {
    const defs = attrList(S);
    return html`${pageHead(S, '능력치', { back: '#/manage' })}
    <div class="content">
      <p class="hint">퀘스트에 연결하면 자라는 능력치예요. 기본 7개는 이름·아이콘·색만 바꿀 수 있어요. (${defs.length}/${ATTR_MAX})</p>
      <ul class="attr-manage panel">${defs.map(a => {
        const I = attrInfo(S.attrs[a.id] || 0);
        const n = S.quests.filter(q => q.attrs.includes(a.id)).length;
        return html`<li><button class="attr-mrow" data-act="mng.attrEdit" data-id="${a.id}" style="--c:${a.color}">${attrIcon(a.id, 24)}<b>${a.name}</b><span class="lv">Lv.${I.lv}</span>
          ${a.builtin ? html`<span class="tag">기본</span>` : ''}<span class="muted">퀘스트 ${n}</span><span class="swatch" style="background:${a.color}"></span></button></li>`;
      })}</ul>
    </div>
    ${defs.length < ATTR_MAX ? html`<div class="fab-row"><button class="btn primary" data-act="mng.attrNew">${uiIcon('plus', 16)} 능력치</button></div>` : ''}`;
  },
};

let adraft = null, aedit = null;
export function openAttrEditor(def = null) {
  aedit = def;
  adraft = def ? { ...def } : { name: '', icon: 'v:gem:blue-vivid', color: ATTR_COLORS[4] };
  openOverlay({
    type: 'sheet', screen: 'MO-MNG-005', title: def ? '능력치 수정' : '능력치 추가',
    render: () => html`
      <div class="icon-field"><span class="slot lg">${iconHTML(adraft.icon, 48)}</span><button class="btn sm" data-act="ae.icon">아이콘 바꾸기</button></div>
      <label class="field"><span class="label">이름 <em>필수</em> <small>1~6자</small></span><input class="input" data-in="ae.name" maxlength="6" value="${adraft.name}" placeholder="예: 운전" autocomplete="off" ${def ? '' : 'autofocus'}></label>
      <p class="hint warn" id="ae-dup" ${dupName() ? '' : 'hidden'}>같은 이름의 능력치가 있어요</p>
      <div class="field"><span class="label">색</span><div class="chips color-pick">${ATTR_COLORS.map(c => html`<button class="chip swatch-chip ${adraft.color === c ? 'on' : ''}" data-act="ae.color" data-v="${c}" aria-label="색 ${c}" aria-pressed="${adraft.color === c}"><span class="swatch" style="background:${c}"></span></button>`)}</div></div>`,
    foot: () => html`${def && !def.builtin ? html`<button class="btn danger" data-act="ae.delete">${uiIcon('trash', 16)} 삭제</button>` : ''}<button class="btn primary grow" data-act="ae.save" ${avalid() ? '' : 'disabled'}>저장</button>`,
  });
}
const dupName = () => attrList(store.S).some(a => a.name === adraft.name.trim() && a.id !== aedit?.id);
const avalid = () => adraft.name.trim().length > 0 && !dupName();

actions({
  'mng.presetCat': el => { presetCat = el.dataset.v; store.emit({}); },
  'mng.presetUse': el => { const p = allPresets(store.S).find(x => x.id === el.dataset.id); if (p) openQuestEditor(null, { draft: JSON.parse(JSON.stringify(p)) }); },
  'mng.presetDel': async el => {
    const p = store.S.presets.find(x => x.id === el.dataset.id);
    if (!p || !(await confirmBox({ title: `〈${p.name}〉 프리셋을 삭제할까요?`, ok: '삭제', danger: true }))) return;
    store.update(S => { S.presets = S.presets.filter(x => x.id !== p.id); });
    toast('프리셋을 삭제했어요', { icon: 'trash' });
  },
  'pp.cat': el => { pickCat = el.dataset.v; topOverlay().rerender(); },
  'pp.pick': el => closeTop(allPresets(store.S).find(x => x.id === el.dataset.id)),
  'mng.restore': el => {
    fxAt(el, 'twinkle', 72);
    const q = store.update(S => archiveQuest(S, el.dataset.id, false));
    if (q) toast(`〈${q.name}〉 다시 시작! 오늘부터 연속 기록을 쌓아요`, { icon: 'restore' });
  },
  'mng.archDel': async el => {
    const q = store.S.quests.find(x => x.id === el.dataset.id);
    if (!q || !(await confirmBox({ title: `〈${q.name}〉 퀘스트를 삭제할까요?`, text: '지난 기록과 통계는 남아요.', ok: '삭제', danger: true }))) return;
    store.update(S => { S.quests = S.quests.filter(x => x.id !== q.id); });
    toast('퀘스트를 삭제했어요', { icon: 'trash' });
  },
  'mng.attrNew': () => openAttrEditor(),
  'mng.attrEdit': el => openAttrEditor(attrDef(store.S, el.dataset.id)),
  'ae.name': el => { adraft.name = el.value; const b = topOverlay()?.box.querySelector('[data-act="ae.save"]'); if (b) b.disabled = !avalid(); const w = document.getElementById('ae-dup'); if (w) w.hidden = !dupName(); },
  'ae.color': el => { adraft.color = el.dataset.v; topOverlay().rerender(); },
  'ae.icon': async () => { const sheet = topOverlay(); const id = await pickIcon(adraft.icon); if (id) { adraft.icon = id; sheet.rerender(); } },
  'ae.save': () => {
    if (!avalid()) return;
    const d = { name: adraft.name.trim(), icon: adraft.icon, color: adraft.color };
    store.update(S => { if (aedit) Object.assign(S.attrDefs.find(a => a.id === aedit.id), d); else addAttrDef(S, d); });
    closeTop();
    toast(aedit ? '능력치를 고쳤어요' : `〈${d.name}〉 능력치를 만들었어요`, { icon: 'chart' });
  },
  'ae.delete': async () => {
    const ok = await confirmBox({ title: `〈${aedit.name}〉 능력치를 삭제할까요?`, text: '쌓인 경험치가 사라지고 퀘스트 연결에서도 빠져요.', ok: '삭제', danger: true });
    if (!ok) return;
    store.update(S => removeAttrDef(S, aedit.id));
    closeTop();
    toast('능력치를 삭제했어요', { icon: 'trash' });
  },
});
