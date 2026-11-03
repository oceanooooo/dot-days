// 전체 메뉴(MO-COM-006): 어느 화면에서든 모든 화면으로 한 번에 이동 (REQ-06)
import { store } from '../store.js';
import { html } from '../util.js';
import { actions, openOverlay, closeTop, uiIcon, topOverlay } from '../ui.js';
import { SITE, MENU_GROUPS, currentKey, trail } from '../nav.js';
import { openQuestEditor } from './quests.js';

const KEYS = { village: '1', quests: '2', shop: '3', dive: '4', me: '5' };

function badge(S, k) {
  if (k === 'me/history') return `${S.log.length}건`;
  if (k === 'dday') return `${S.ddays.length}개`;
  if (k === 'manage/archive') return `${S.quests.filter(q => q.archived).length}개`;
  if (k === 'manage/presets') return `내 ${S.presets.length}`;
  if (k === 'quests') return `${S.quests.filter(q => !q.archived).length}개`;
  return '';
}

export function openMenu() {
  if (topOverlay()?.opts.screen === 'MO-COM-006') return closeTop();
  const cur = currentKey();
  const here = new Set(trail(cur));
  openOverlay({
    type: 'sheet', screen: 'MO-COM-006', title: '전체 메뉴', cls: 'ov-menu',
    render: () => {
      const S = store.S;
      return html`<label class="field menu-search"><span class="sr">메뉴 검색</span>${uiIcon('search', 16)}<input class="input" type="search" id="menu-q" placeholder="화면 이름으로 찾기 (예: 달력)" autocomplete="off" aria-controls="menu-groups"></label>
        <button class="btn block menu-new" data-act="nav.newQuest">${uiIcon('plus', 16)} 새 퀘스트 만들기 <small>(N)</small></button>
        <div id="menu-groups">${MENU_GROUPS.map(([g, keys]) => html`<section class="menu-group"><h3 class="group-head">${g}</h3>
          <ul class="menu-tiles">${keys.map(k => { const m = SITE[k], on = k === cur, b = badge(S, k);
            return html`<li data-name="${m.title} ${m.desc || ''} ${g}"><a class="mtile ${on ? 'on' : here.has(k) ? 'up' : ''}" href="#/${k}" data-act="nav.go" data-v="${k}" ${on ? html`aria-current="page"` : ''}>
              ${uiIcon(m.icon, 24)}<span class="mtile-t">${m.title}</span>${b ? html`<small>${b}</small>` : ''}${KEYS[k] ? html`<kbd class="mtile-key" title="단축키">${KEYS[k]}</kbd>` : ''}${on ? html`<em class="mtile-here">여기</em>` : ''}</a></li>`; })}</ul></section>`)}
        <p class="muted pad center" id="menu-none" hidden>찾는 화면이 없어요</p></div>
        <p class="hint center">PC 단축키: 1~5 주 메뉴 · N 새 퀘스트 · M 전체 메뉴 · Esc 닫기</p>`;
    },
    onRender: h => {
      const q = h.box.querySelector('#menu-q');
      q.addEventListener('input', () => {
        const v = q.value.trim().toLowerCase();
        let any = false;
        for (const sec of h.box.querySelectorAll('.menu-group')) {
          let n = 0;
          for (const li of sec.querySelectorAll('li')) { const ok = !v || li.dataset.name.toLowerCase().includes(v); li.hidden = !ok; if (ok) n++; }
          sec.hidden = !n; any ||= n > 0;
        }
        h.box.querySelector('#menu-none').hidden = any;
      });
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = h.box.querySelector('.menu-group:not([hidden]) li:not([hidden]) a'); if (a) { e.preventDefault(); a.click(); } } });
      // 포커스는 현재 화면 칸에 (키보드 사용자가 바로 옆으로 이동)
      setTimeout(() => (h.box.querySelector('.mtile.on') || q).focus({ preventScroll: false }), 30);
    },
  });
}

actions({
  'nav.menu': () => openMenu(),
  'nav.go': el => { closeTop(); location.hash = '#/' + el.dataset.v; },
  'nav.newQuest': () => { closeTop(); setTimeout(() => openQuestEditor(), 140); },
});
