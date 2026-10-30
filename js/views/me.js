// 모험가(MO-ADV-001), 업적(MO-ADV-002), 도감(MO-ADV-003), 기록·통계(MO-ADV-004)
import { store } from '../store.js';
import { ITEMS } from '../sprites-items.js';
import { AVATARS } from '../art.js';
import { pixelURL } from '../pixel.js';
import { levelInfo, attrInfo, titleOf, dexStats, DEX_IDS, itemInfo, achvContext, achvProgress, today, attrList } from '../game.js';
import { openDay } from './insights.js';
import { ACHIEVEMENTS, RARITY, CAT_NAMES, ICON_CATS } from '../data.js';
import { html, num, addDays, fmtShort, fmtDate, fmtTime, keyOf, weekName, weekday } from '../util.js';
import { actions, openOverlay, uiIcon, itemIcon, attrIcon } from '../ui.js';
import { pageHead, bar, itemSlot } from './common.js';

const avatarImg = (id, size) => {
  const fr = (AVATARS[id] || AVATARS.straw).frames;
  const s = Math.max(1, Math.round(size * (window.devicePixelRatio || 1) / 16));
  const h = size * 1.5;
  return html`<span class="avatar-anim" style="--w:${size}px;--h:${h}px" aria-hidden="true">
    <img class="px f1" src="${pixelURL('av0' + id, fr[0], s)}" width="${size}" height="${h}" alt=""><img class="px f2" src="${pixelURL('av1' + id, fr[1], s)}" width="${size}" height="${h}" alt=""></span>`;
};
export { avatarImg };

// ---------------------------------------------------------------- 모험가
export const mePage = {
  screen: 'MO-ADV-001', tab: 'me',
  render(S) {
    const L = levelInfo(S.exp), dex = dexStats(S);
    const achN = Object.keys(S.achv).length;
    return html`${pageHead(S, '모험가')}
    <div class="content">
      <section class="profile panel">
        ${avatarImg(S.profile.avatar, 64)}
        <div class="profile-main">
          <p class="profile-title">${titleOf(L.lv)}</p>
          <h2 class="profile-name">${S.profile.name} <span class="lv">Lv.${L.lv}</span></h2>
          <div class="hud-exp">${bar(L.cur, L.need, { cls: 'exp', label: '경험치' })}<span class="hud-num">${num(L.cur)}/${num(L.need)}</span></div>
          <p class="muted">누적 경험치 ${num(S.exp)}</p>
        </div>
      </section>
      <h2 class="section-title">능력치</h2>
      <ul class="attr-list panel">${attrList(S).map(a => {
        const I = attrInfo(S.attrs[a.id] || 0);
        return html`<li class="attr-row" style="--c:${a.color}">${attrIcon(a.id, 24)}<span class="attr-name">${a.name}</span><span class="lv">Lv.${I.lv}</span>
          ${bar(I.cur, I.need, { cls: 'attr', label: `${a.name} 경험치`, segs: 8 })}<span class="attr-num">${I.cur}/${I.need}</span></li>`;
      })}</ul>
      <nav class="menu panel" aria-label="모험가 메뉴">
        <a class="menu-item" href="#/me/dashboard">${uiIcon('dashboard', 24)}<span>대시보드</span><b>현황</b></a>
        <a class="menu-item" href="#/me/history">${uiIcon('history', 24)}<span>히스토리</span><b>${S.log.length}건</b></a>
        <a class="menu-item" href="#/me/achievements">${uiIcon('trophy', 24)}<span>업적</span><b>${achN}/${ACHIEVEMENTS.length}</b></a>
        <a class="menu-item" href="#/me/dex">${uiIcon('dex', 24)}<span>도감</span><b>${dex.pct}%</b></a>
        <a class="menu-item" href="#/me/records">${uiIcon('chart', 24)}<span>기록·통계</span><b></b></a>
        <a class="menu-item" href="#/dday">${uiIcon('calendar', 24)}<span>디데이</span><b>${S.ddays.length}개</b></a>
        <a class="menu-item" href="#/manage">${uiIcon('tools', 24)}<span>관리</span><b>프리셋·보관함·능력치</b></a>
        <a class="menu-item" href="#/settings">${uiIcon('gear', 24)}<span>설정</span><b></b></a>
      </nav>
    </div>`;
  },
};

// ---------------------------------------------------------------- 업적
export const achievementsPage = {
  screen: 'MO-ADV-002', tab: 'me',
  render(S) {
    const ctx = achvContext(S);
    const n = Object.keys(S.achv).length;
    return html`${pageHead(S, '업적', { back: '#/me' })}
    <div class="content">
      <div class="summary panel"><b>${n} / ${ACHIEVEMENTS.length}</b> 달성 ${bar(n, ACHIEVEMENTS.length, { cls: 'sun', segs: 14 })}</div>
      <div class="grid g3 achv-grid">${ACHIEVEMENTS.map(a => {
        const got = S.achv[a.id];
        const v = achvProgress(S, a, ctx);
        return html`<button class="achv ${got ? 'got' : 'locked'}" data-act="achv.detail" data-id="${a.id}">
          <span class="medal">${got ? itemIcon(a.icon, 32, '') : uiIcon('lock', 24, '')}</span>
          <span class="achv-name">${a.name}</span>
          <span class="achv-sub">${got ? fmtShort(keyOf(new Date(got))) : `${num(v)}/${num(a.goal)}`}</span>
        </button>`;
      })}</div>
    </div>`;
  },
};

// ---------------------------------------------------------------- 도감
let dexCat = 'all';
export const dexPage = {
  screen: 'MO-ADV-003', tab: 'me',
  render(S) {
    const st = dexStats(S);
    const cats = ICON_CATS.filter(c => DEX_IDS.some(id => ITEMS[id].cat === c));
    if (DEX_IDS.some(id => ITEMS[id].cat === 'charm')) cats.push('charm');
    const ids = DEX_IDS.filter(id => dexCat === 'all' || ITEMS[id].cat === dexCat);
    return html`${pageHead(S, '도감', { back: '#/me' })}
    <div class="content">
      <div class="summary panel"><b>${st.pct}%</b> <span class="muted">(${st.got}/${st.total})</span> ${bar(st.got, st.total, { cls: 'sea', segs: 14 })}
        <div class="dex-cats">${cats.map(c => { const all = DEX_IDS.filter(id => ITEMS[id].cat === c); return html`<span class="tag">${CAT_NAMES[c]} ${all.filter(id => S.dex[id]).length}/${all.length}</span>`; })}</div></div>
      <div class="chips scroll">${[['all', '전체'], ...cats.map(c => [c, CAT_NAMES[c]])].map(([v, l]) => html`<button class="chip ${dexCat === v ? 'on' : ''}" data-act="dex.cat" data-v="${v}">${l}</button>`)}</div>
      <div class="grid g5 dex-grid">${ids.map(id => {
        const d = S.dex[id], info = itemInfo(S, id);
        return html`<div class="dex-cell">${itemSlot(S, info, { act: 'dex.detail', sil: !d, isNew: d && !d.seen, size: 32, label: d ? info.name : '아직 모르는 아이템' })}<span class="dex-name">${d ? info.name : '???'}</span></div>`;
      })}</div>
    </div>`;
  },
  mounted() {
    // 도감을 열어 보면 NEW 표시 제거 (FR-DEX-004) — 화면에는 이번에 한 번 보여줌
    const unseen = Object.entries(store.S.dex).filter(([, d]) => !d.seen);
    if (unseen.length) setTimeout(() => store.update(S => { for (const [id] of unseen) S.dex[id].seen = true; }, { noTouch: true, silent: true }), 1500);
  },
};

// ---------------------------------------------------------------- 기록·통계
const heatLevel = n => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4);
export const recordsPage = {
  screen: 'MO-ADV-004', tab: 'me',
  render(S) {
    const day = today(S);
    const dex = dexStats(S);
    const activeDays = Object.values(S.days).filter(d => d.q > 0 || d.dive > 0).length;
    // 17주 잔디: 이번 주 토요일까지 채운 7×17 격자
    const last = addDays(day, 6 - weekday(day));
    const cells = [];
    for (let i = 17 * 7 - 1; i >= 0; i--) {
      const d = addDays(last, -i);
      cells.push({ d, n: S.days[d]?.q || 0, future: d > day });
    }
    const week = [];
    for (let i = 6; i >= 0; i--) { const d = addDays(day, -i); week.push({ d, exp: Math.max(0, S.days[d]?.exp || 0) }); }
    const maxExp = Math.max(50, ...week.map(w => w.exp));
    const stats = [
      ['총 퀘스트 완료', `${num(S.stats.quests)}회`], ['활동한 날', `${num(activeDays)}일`],
      ['최장 연속', `${num(Math.max(S.stats.bestStreak, ...S.quests.map(q => q.best), 0))}일`], ['총 다이빙', `${num(S.stats.diveMin)}분 (${num(S.stats.dives)}회)`],
      ['모은 조개', num(S.stats.coinsEarned)], ['쓴 조개', num(S.stats.coinsSpent)], ['도감 수집률', `${dex.pct}%`], ['완벽한 하루', `${num(S.stats.perfectDays)}일`],
    ];
    return html`${pageHead(S, '기록·통계', { back: '#/me' })}
    <div class="content">
      <div class="stat-grid">${stats.map(([k, v]) => html`<div class="stat panel"><span class="stat-k">${k}</span><b class="stat-v">${v}</b></div>`)}</div>
      <h2 class="section-title">도트 잔디 <small class="muted">최근 17주 퀘스트 완료</small></h2>
      <div class="heat panel" role="img" aria-label="최근 17주 날짜별 퀘스트 완료 수">
        <div class="heat-grid">${cells.map(c => html`<button class="heat-cell l${heatLevel(c.n)} ${c.d === day ? 'today' : ''} ${c.future ? 'future' : ''}" data-act="heat.tip" data-d="${c.d}" data-n="${c.n}" ${c.future ? 'disabled' : ''} aria-label="${fmtShort(c.d)} ${c.n}개"></button>`)}</div>
        <div class="heat-legend"><span>적음</span>${[0, 1, 2, 3, 4].map(l => html`<i class="heat-cell l${l}"></i>`)}<span>많음</span></div>
        <p class="heat-tip muted" id="heat-tip" aria-live="polite">칸을 누르면 그날 상세가 열려요</p>
      </div>
      <h2 class="section-title">이번 주 경험치</h2>
      <div class="bars panel" role="img" aria-label="최근 7일 획득 경험치">${week.map(w => html`<div class="bar-col"><b>${w.exp}</b><span class="bar-v" style="--h:${w.exp / maxExp}"></span><span class="bar-d ${w.d === day ? 'today' : ''}">${weekName(w.d)}</span></div>`)}</div>
      <h2 class="section-title">최근 활동</h2>
      ${S.log.length ? html`<ol class="log panel">${S.log.slice(0, 30).map(l => html`<li><span class="log-t">${fmtShort(keyOf(new Date(l.t))).slice(0, 5)} ${fmtTime(l.t)}</span><span class="log-x">${l.text}</span><span class="log-r">${l.exp ? `+${l.exp} EXP ` : ''}${l.coins ? `${l.coins > 0 ? '+' : ''}${l.coins}🐚` : ''}</span></li>`)}</ol>` : html`<p class="muted pad">아직 기록이 없어요</p>`}
    </div>`;
  },
};

actions({
  'achv.detail': el => {
    const a = ACHIEVEMENTS.find(x => x.id === el.dataset.id), S = store.S, got = S.achv[a.id];
    const v = achvProgress(S, a);
    openOverlay({
      type: 'modal', title: a.name, screen: 'MO-ADV-002',
      render: () => html`<div class="item-head"><span class="slot lg ${got ? 'r4' : ''}">${got ? itemIcon(a.icon, 48) : uiIcon('lock', 32)}</span><div><h2 class="modal-title">${a.name}</h2><p class="item-meta">${got ? `${fmtDate(keyOf(new Date(got)))} 달성` : `진행 ${num(v)}/${num(a.goal)}`}</p></div></div>
        <p class="modal-text">조건: ${a.desc}<br>보상: 🐚 ${a.coins}</p><button class="btn block" data-act="ov.close">닫기</button>`,
    });
  },
  'dex.cat': el => { dexCat = el.dataset.v; store.emit({}); },
  'dex.detail': el => {
    const id = el.dataset.key, S = store.S, d = S.dex[id], info = itemInfo(S, id);
    openOverlay({
      type: 'modal', title: '도감', screen: 'MO-ADV-003',
      render: () => d ? html`<div class="item-head"><span class="slot lg r${info.rarity}">${itemIcon(id, 64)}</span><div><h2 class="modal-title">${info.name}</h2><p class="item-meta">${RARITY[info.rarity].name} · ${CAT_NAMES[info.cat]}</p></div></div>
        <p class="modal-text">${info.desc}</p><p class="item-own">처음 만난 날 ${fmtDate(keyOf(new Date(d.first)))} · 누적 ${d.count}개</p><button class="btn block" data-act="ov.close">닫기</button>`
        : html`<div class="item-head"><span class="slot lg unknown">${itemIcon(id, 64, '', true)}</span><div><h2 class="modal-title">???</h2><p class="item-meta">${CAT_NAMES[info.cat]}</p></div></div>
        <p class="modal-text">아직 만나지 못했다.</p><button class="btn block" data-act="ov.close">닫기</button>`,
    });
  },
  'heat.tip': el => { document.getElementById('heat-tip').textContent = `${fmtShort(el.dataset.d)} · 퀘스트 ${el.dataset.n}개 완료`; openDay(el.dataset.d); },
});
