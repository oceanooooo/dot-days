// 상점: 나의 보상(MO-SHP-001), 잡화점(MO-SHP-002), 보상 만들기(MO-SHP-003), 아이콘 고르기(MO-SHP-004)
// 가방(MO-BAG-001), 아이템 상세(MO-BAG-002), 상자 열기(MO-BAG-003)
import { store } from '../store.js';
import { ITEMS } from '../sprites-items.js';
import {
  itemInfo, itemActions, canBuyReward, buyReward, canBuyShop, buyShop, useItem, openChest, sellItem, sellPrice, makeReward,
} from '../game.js';
import { SHOP_ITEMS, RARITY, CAT_NAMES, ICON_CATS, PRICE_GUIDE, REWARD_CHEERS, REWARD_PRESETS, PRICE_PER_30MIN, PRICE_PER_1000WON } from '../data.js';
import { SHAPES, VARIANTS, VARIANT_GROUPS } from '../sprites-variants.js';
import { html, num, josa, pp, clamp, pick } from '../util.js';
import { actions, openOverlay, toast, confirmBox, uiIcon, itemIcon, iconHTML, topOverlay, closeTop, fxAt } from '../ui.js';
import { showResult, chestPopup, achievementToasts } from '../fx.js';
import { sfx } from '../sound.js';
import { pageHead, empty, itemSlot, talkBox } from './common.js';

const minText = m => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`);
/** 시간·용돈 보상 표시 (FR-SHP-009, 010) */
export const rewardUnit = r => (r.kind === 'time' ? `🕒 ${minText(r.minutes)}` : r.kind === 'money' ? `💰 ${num(r.amount)}원` : '');
const shopTabs = cur => html`<nav class="seg" aria-label="상점 메뉴">
  ${[['#/shop', 'rewards', '나의 보상'], ['#/shop/general', 'general', '잡화점'], ['#/shop/bag', 'bag', '가방']].map(([href, id, label]) =>
    html`<a class="seg-btn ${cur === id ? 'on' : ''}" href="${href}" ${cur === id ? html`aria-current="page"` : ''}>${label}</a>`)}
</nav>`;

// ---------------------------------------------------------------- 나의 보상
export const rewardsPage = {
  screen: 'MO-SHP-001', tab: 'shop',
  render(S) {
    return html`${pageHead(S, '상점')}
    <div class="content">
      ${shopTabs('rewards')}
      ${S.rewards.length ? html`<div class="shop-list">${S.rewards.map(r => {
        const c = canBuyReward(S, r);
        return html`<article class="shop-card panel">
          <button class="shop-main" data-act="reward.edit" data-id="${r.id}" aria-label="${r.name} 수정">
            <span class="slot">${itemIcon(r.icon, 32)}</span>
            <span class="shop-body"><b class="shop-name">${r.name}</b>${rewardUnit(r) ? html`<span class="tag unit">${rewardUnit(r)}</span>` : ''}${r.desc ? html`<span class="shop-desc">${r.desc}</span>` : ''}
              ${r.stock != null ? html`<span class="stock ${r.stock === 0 ? 'out' : ''}">${r.stock === 0 ? '품절' : `남은 ${r.stock}개`}</span>` : ''}</span>
          </button>
          <div class="shop-buy"><span class="price">${uiIcon('coin', 16)}${num(r.price)}</span>
            <button class="btn sm primary" data-act="reward.buy" data-id="${r.id}" ${c.ok ? '' : 'disabled'}>구매</button>
            ${!c.ok && c.reason ? html`<small class="why">${c.reason}</small>` : ''}</div>
        </article>`;
      })}</div>` : empty('아직 보상이 없어. 열심히 한 나에게 줄 선물을 등록해 봐!')}
    </div>
    <div class="fab-row"><button class="btn primary" data-act="reward.new">${uiIcon('plus', 16)} 보상 추가</button></div>`;
  },
};

// ---------------------------------------------------------------- 잡화점
export const generalPage = {
  screen: 'MO-SHP-002', tab: 'shop',
  render(S) {
    return html`${pageHead(S, '상점')}
    <div class="content">
      ${shopTabs('general')}
      ${talkBox('어서 와! 오늘은 뭐가 필요해?')}
      <div class="shop-list">${SHOP_ITEMS.map(it => {
        const info = itemInfo(S, it.id);
        const c = canBuyShop(S, it.id);
        return html`<article class="shop-card panel">
          <div class="shop-main"><span class="slot r${info.rarity}">${itemIcon(it.id, 32)}</span>
            <span class="shop-body"><b class="shop-name">${info.name}</b><span class="shop-desc">${it.effect}</span>
            <span class="stock">가지고 있는 수 ${S.bag[it.id] || 0}${it.max ? ` / 최대 ${it.max}` : ''}</span></span></div>
          <div class="shop-buy"><span class="price">${uiIcon('coin', 16)}${num(it.price)}</span>
            <button class="btn sm primary" data-act="shop.buy" data-id="${it.id}" ${c.ok ? '' : 'disabled'}>구매</button>
            ${!c.ok && c.reason ? html`<small class="why">${c.reason}</small>` : ''}</div>
        </article>`;
      })}</div>
    </div>`;
  },
};

// ---------------------------------------------------------------- 가방
const BAG_FILTERS = [['all', '전체'], ['reward', '보상'], ['consume', '소모품'], ['chest', '상자'], ['collect', '수집품']];
const bagCat = info => (info.reward ? 'reward' : ['potion', 'food', 'charm'].includes(info.cat) ? 'consume' : info.cat === 'chest' ? 'chest' : 'collect');
let bagFilter = 'all';
export const bagPage = {
  screen: 'MO-BAG-001', tab: 'shop',
  render(S) {
    const keys = Object.keys(S.bag).filter(k => S.bag[k] > 0);
    const infos = keys.map(k => itemInfo(S, k)).filter(i => bagFilter === 'all' || bagCat(i) === bagFilter)
      .sort((a, b) => (bagCat(a) > bagCat(b) ? 1 : bagCat(a) < bagCat(b) ? -1 : (b.rarity || 0) - (a.rarity || 0)));
    return html`${pageHead(S, '상점')}
    <div class="content">
      ${shopTabs('bag')}
      <div class="chips filter" role="group" aria-label="분류">${BAG_FILTERS.map(([v, l]) => html`<button class="chip ${bagFilter === v ? 'on' : ''}" data-act="bag.filter" data-v="${v}" aria-pressed="${bagFilter === v}">${l}</button>`)}</div>
      ${keys.length === 0 ? empty('가방이 텅 비었어. 퀘스트를 깨면 아이템이 떨어질지도?', html`<a class="btn primary" href="#/shop">상점 가기</a>`)
        : infos.length ? html`<div class="grid g-bag">${infos.map(i => itemSlot(S, i, { act: 'bag.detail', count: S.bag[i.key], label: `${i.name} ${S.bag[i.key]}개` }))}</div>`
        : html`<p class="muted center pad">이 분류에는 아이템이 없어요</p>`}
    </div>`;
  },
};

function openDetail(key) {
  const h = openOverlay({
    type: 'modal', screen: 'MO-BAG-002', title: '아이템 상세', cls: 'ov-item',
    render: () => {
      const S = store.S, n = S.bag[key] || 0;
      if (!n) return html`<p class="modal-text">다 썼어요.</p><button class="btn block" data-act="ov.close">닫기</button>`;
      const info = itemInfo(S, key);
      const acts = itemActions(info), price = sellPrice(info);
      return html`
        <div class="item-head"><span class="slot lg r${info.rarity || 0}">${itemIcon(info.icon, 64)}</span>
          <div><h2 class="modal-title">${info.name}</h2>
          <p class="item-meta">${info.reward ? '나의 보상' : html`${RARITY[info.rarity].name} · ${CAT_NAMES[info.cat]}`}</p></div></div>
        <p class="modal-text">${info.desc}</p>
        ${info.cat === 'charm' ? html`<p class="hint">놓친 날이 생기면 자동으로 사용돼요.</p>` : ''}
        <p class="item-own">가지고 있는 수: <b>${n}</b></p>
        <div class="btn-row wrap">
          ${acts.includes('use') ? html`<button class="btn primary" data-act="item.use" data-key="${key}">사용</button>` : ''}
          ${acts.includes('eat') ? html`<button class="btn primary" data-act="item.use" data-key="${key}">먹기 (+${info.rarity * 5} EXP)</button>` : ''}
          ${acts.includes('open') ? html`<button class="btn primary" data-act="item.open" data-key="${key}">열기</button>` : ''}
          ${acts.includes('sell') ? html`<button class="btn" data-act="item.sell" data-key="${key}" data-n="1">판매 🐚${price}</button>
            ${n > 1 ? html`<button class="btn" data-act="item.sell" data-key="${key}" data-n="${n}">모두 판매 🐚${price * n}</button>` : ''}` : ''}
          <button class="btn ghost" data-act="ov.close">닫기</button>
        </div>`;
    },
  });
  return h;
}

// ---------------------------------------------------------------- 보상 만들기·수정 (MO-SHP-003)
let rdraft = null, redit = null;
export function openRewardEditor(r = null) {
  redit = r;
  rdraft = r ? { kind: 'normal', minutes: 60, amount: 5000, ...r } : { name: '', desc: '', price: '', icon: 'gift', stock: null, kind: 'normal', minutes: 60, amount: 5000 };
  if (!rdraft.minutes) rdraft.minutes = 60;
  if (!rdraft.amount) rdraft.amount = 5000;
  openOverlay({
    type: 'sheet', screen: 'MO-SHP-003', title: r ? '보상 수정' : '보상 추가',
    render: () => html`
      ${r ? '' : html`<div class="field"><span class="label">보상 프리셋</span><div class="chips scroll">${REWARD_PRESETS.map((p, i) => html`<button class="chip" data-act="re.preset" data-v="${i}">${itemIcon(p.icon, 16)}${p.name}</button>`)}</div></div>`}
      <div class="icon-field"><span class="slot lg">${itemIcon(rdraft.icon, 48)}</span><button class="btn sm" data-act="re.icon">아이콘 바꾸기</button></div>
      <div class="field"><span class="label">종류</span><div class="chips three">${[['normal', '일반'], ['time', '🕒 시간'], ['money', '💰 용돈']].map(([k, l]) => html`<button class="chip ${rdraft.kind === k ? 'on' : ''}" data-act="re.kind" data-v="${k}" aria-pressed="${rdraft.kind === k}">${l}</button>`)}</div>
        ${rdraft.kind === 'time' ? html`<div class="stepper"><button class="btn sm" data-act="re.min" data-v="-30" aria-label="30분 줄이기">−</button><b>${minText(rdraft.minutes)}</b><button class="btn sm" data-act="re.min" data-v="30" aria-label="30분 늘리기">+</button><small class="muted">30분 단위</small></div>` : ''}
        ${rdraft.kind === 'money' ? html`<div class="stepper"><button class="btn sm" data-act="re.amt" data-v="-1000" aria-label="1,000원 줄이기">−</button><b>${num(rdraft.amount)}원</b><button class="btn sm" data-act="re.amt" data-v="1000" aria-label="1,000원 늘리기">+</button><small class="muted">1,000원 단위</small></div>` : ''}</div>
      <label class="field"><span class="label">이름 <em>필수</em></span><input class="input" data-in="re.name" maxlength="20" value="${rdraft.name}" placeholder="예: 게임 1시간" autocomplete="off" ${r ? '' : 'autofocus'}></label>
      <label class="field"><span class="label">설명</span><input class="input" data-in="re.desc" maxlength="60" value="${rdraft.desc}" placeholder="어떤 보상인지 (선택)" autocomplete="off"></label>
      <label class="field"><span class="label">가격 (조개) <em>필수</em></span><input class="input" type="number" inputmode="numeric" min="1" max="99999" data-in="re.price" value="${rdraft.price}" placeholder="1~99,999"></label>
      ${rdraft.kind === 'normal' ? html`<div class="chips four">${PRICE_GUIDE.map(([l, v]) => html`<button class="chip" data-act="re.guide" data-v="${v}">${l} ${num(v)}</button>`)}</div>
      <p class="hint">하루 평균 60조개쯤 모여요. 소소한 30~60 · 중간 100~200 · 큰 300~500 · 특별한 1,000 이상</p>`
      : html`<button class="chip" data-act="re.guide" data-v="${recommend()}">추천 🐚 ${num(recommend())}</button>
      <p class="hint">${rdraft.kind === 'time' ? `30분당 ${PRICE_PER_30MIN}조개` : `1,000원당 ${PRICE_PER_1000WON}조개`} 기준 추천이에요</p>`}
      <div class="field"><span class="label">재고</span>
        <div class="row"><button class="chip ${rdraft.stock == null ? 'on' : ''}" data-act="re.stock" data-v="inf">무제한</button>
        <button class="chip ${rdraft.stock != null ? 'on' : ''}" data-act="re.stock" data-v="n">수량 정하기</button>
        ${rdraft.stock != null ? html`<input class="input short" type="number" min="0" max="99" data-in="re.stockn" value="${rdraft.stock}" aria-label="재고 수량">` : ''}</div></div>`,
    foot: () => html`${r ? html`<button class="btn danger" data-act="re.delete">${uiIcon('trash', 16)} 삭제</button>` : ''}<button class="btn primary grow" data-act="re.save" ${rvalid() ? '' : 'disabled'}>저장</button>`,
  });
}
const recommend = () => (rdraft.kind === 'time' ? (rdraft.minutes / 30) * PRICE_PER_30MIN : (rdraft.amount / 1000) * PRICE_PER_1000WON);
const rvalid = () => rdraft.name.trim() && +rdraft.price >= 1 && +rdraft.price <= 99999;
const rsync = () => { const b = topOverlay()?.box.querySelector('[data-act="re.save"]'); if (b) b.disabled = !rvalid(); };

/** 아이콘 고르기 팝업 (MO-SHP-004): [아이템] [색상 아이콘] → 고른 아이콘 키 (취소 시 undefined) */
let iconCat = 'food', iconTab = 'item', vShape = 'heart', vGroup = 'pastel';
export function pickIcon(current = '') {
  if (current.startsWith('v:')) { const [, sh, vid] = current.split(':'); iconTab = 'variant'; vShape = SHAPES[sh] ? sh : vShape; vGroup = VARIANTS.find(v => v.id === vid)?.group || vGroup; }
  else if (ITEMS[current]) { iconTab = 'item'; iconCat = ICON_CATS.includes(ITEMS[current].cat) ? ITEMS[current].cat : iconCat; }
  const h = openOverlay({
    type: 'modal', screen: 'MO-SHP-004', title: '아이콘 고르기', cls: 'ov-icons',
    render: () => html`<h2 class="modal-title">아이콘 고르기</h2>
      <div class="seg" role="tablist">${[['item', '아이템'], ['variant', '색상 아이콘']].map(([v, l]) => html`<button class="seg-btn ${iconTab === v ? 'on' : ''}" role="tab" aria-selected="${iconTab === v}" data-act="icon.tab" data-v="${v}">${l}</button>`)}</div>
      ${iconTab === 'item' ? html`
      <div class="chips scroll">${ICON_CATS.map(c => html`<button class="chip ${iconCat === c ? 'on' : ''}" data-act="icon.cat" data-v="${c}">${CAT_NAMES[c]}</button>`)}</div>
      <div class="grid g5 icon-grid">${Object.entries(ITEMS).filter(([, it]) => it.cat === iconCat && !it.hidden).map(([id, it]) =>
        html`<button class="slot ${id === current ? 'picked' : ''}" data-act="icon.pick" data-id="${id}" aria-label="${it.name}">${itemIcon(id, 32)}</button>`)}</div>` : html`
      <div class="chips scroll">${Object.entries(SHAPES).map(([id, sh]) => html`<button class="chip ${vShape === id ? 'on' : ''}" data-act="icon.shape" data-v="${id}">${iconHTML(`v:${id}:red-vivid`, 16)}${sh.name}</button>`)}</div>
      <div class="chips four">${VARIANT_GROUPS.map(([g, l]) => html`<button class="chip ${vGroup === g ? 'on' : ''}" data-act="icon.group" data-v="${g}">${l}</button>`)}</div>
      <div class="grid g5 icon-grid variant-grid">${VARIANTS.filter(v => v.group === vGroup).map(v => {
        const key = `v:${vShape}:${v.id}`;
        return html`<button class="slot ${key === current ? 'picked' : ''}" data-act="icon.pick" data-id="${key}" aria-label="${v.name} ${SHAPES[vShape].name}">${iconHTML(key, 32)}<span class="vname">${v.name.replace(/^(파스텔|비비드|다크) /, '')}</span></button>`;
      })}</div>`}
      <button class="btn block" data-act="ov.close">취소</button>`,
  });
  return h.done;
}

// ---------------------------------------------------------------- 동작
actions({
  'reward.new': () => openRewardEditor(),
  'reward.edit': el => openRewardEditor(store.S.rewards.find(r => r.id === el.dataset.id)),
  'reward.buy': async el => {
    const r = store.S.rewards.find(x => x.id === el.dataset.id);
    if (!r) return;
    const ok = await confirmBox({ title: `〈${r.name}〉${pp(r.name, '을/를')} 🐚${num(r.price)}에 살까요?`, ok: '구매' });
    if (!ok) return;
    const res = store.update(S => buyReward(S, r.id));
    if (!res) return sfx('error');
    sfx('coin');
    toast(`${josa(r.name, '을/를')} 손에 넣었다! 가방에 넣어 뒀어.`, { item: r.icon });
    achievementToasts(res.achievements);
  },
  'shop.buy': async el => {
    const id = el.dataset.id, info = itemInfo(store.S, id), it = SHOP_ITEMS.find(x => x.id === id);
    const ok = await confirmBox({ title: `${josa(info.name, '을/를')} 🐚${num(it.price)}에 살까요?`, text: it.effect, ok: '구매' });
    if (!ok) return;
    const res = store.update(S => buyShop(S, id));
    if (!res) return sfx('error');
    sfx('coin');
    toast(`${josa(info.name, '을/를')} 손에 넣었다!`, { item: id });
  },
  'bag.filter': el => { bagFilter = el.dataset.v; store.emit({}); },
  'bag.detail': el => openDetail(el.dataset.key),
  'item.use': async el => {
    const key = el.dataset.key, info = itemInfo(store.S, key);
    if (info.reward) {
      const ok = await confirmBox({ title: `〈${info.name}〉${pp(info.name, '을/를')} 사용할까요?`, text: '열심히 모은 보상, 마음껏 즐겨요!', ok: '사용' });
      if (!ok) return;
    }
    if (info.reward) fxAt(el, 'hearts', 96);
    const res = store.update(S => useItem(S, key));
    closeTop();
    if (!res) return;
    if (info.reward) { sfx('item'); toast(pick(REWARD_CHEERS), { item: info.icon, ms: 3500 }); achievementToasts(res.achievements); }
    else showResult(res);
  },
  'item.open': el => {
    const res = store.update(S => openChest(S, el.dataset.key));
    closeTop();
    if (res) chestPopup(res);
  },
  'item.sell': el => {
    const res = store.update(S => sellItem(S, el.dataset.key, +el.dataset.n));
    if (!res) return;
    sfx('coin');
    toast(`${josa(res.info.name, '을/를')} 팔아서 ${josa(`🐚${res.coins}`, '을/를')} 받았다`, { item: res.info.icon });
    topOverlay()?.rerender();
  },
  're.name': el => { rdraft.name = el.value; rsync(); },
  're.desc': el => { rdraft.desc = el.value; },
  're.price': el => { rdraft.price = el.value; rsync(); },
  're.guide': el => { rdraft.price = el.dataset.v; topOverlay().rerender(); rsync(); },
  're.kind': el => { rdraft.kind = el.dataset.v; topOverlay().rerender(); },
  're.min': el => { rdraft.minutes = clamp(rdraft.minutes + +el.dataset.v, 30, 480); topOverlay().rerender(); },
  're.amt': el => { rdraft.amount = clamp(rdraft.amount + +el.dataset.v, 1000, 100000); topOverlay().rerender(); },
  're.preset': el => { const p = REWARD_PRESETS[+el.dataset.v]; Object.assign(rdraft, { name: p.name, kind: p.kind, price: p.price, icon: p.icon, ...(p.minutes ? { minutes: p.minutes } : {}), ...(p.amount ? { amount: p.amount } : {}) }); topOverlay().rerender(); rsync(); },
  're.stock': el => { rdraft.stock = el.dataset.v === 'inf' ? null : (rdraft.stock ?? 5); topOverlay().rerender(); },
  're.stockn': el => { rdraft.stock = clamp(Math.floor(+el.value || 0), 0, 99); },
  're.icon': async () => {
    const sheet = topOverlay();
    const id = await pickIcon(rdraft.icon);
    if (id) { rdraft.icon = id; sheet.rerender(); }
  },
  'icon.cat': el => { iconCat = el.dataset.v; topOverlay().rerender(); },
  'icon.tab': el => { iconTab = el.dataset.v; topOverlay().rerender(); },
  'icon.shape': el => { vShape = el.dataset.v; topOverlay().rerender(); },
  'icon.group': el => { vGroup = el.dataset.v; topOverlay().rerender(); },
  'icon.pick': el => closeTop(el.dataset.id),
  're.save': () => {
    if (!rvalid()) return;
    const d = { name: rdraft.name.trim(), desc: rdraft.desc.trim(), price: Math.floor(+rdraft.price), icon: rdraft.icon, stock: rdraft.stock, kind: rdraft.kind, minutes: rdraft.kind === 'time' ? rdraft.minutes : 0, amount: rdraft.kind === 'money' ? rdraft.amount : 0 };
    store.update(S => {
      if (redit) Object.assign(S.rewards.find(r => r.id === redit.id), d);
      else S.rewards.push(makeReward(d));
    });
    closeTop();
    toast(redit ? '보상을 고쳤어요' : '상점에 보상을 올렸어요', { item: d.icon });
  },
  're.delete': async () => {
    const r = redit;
    const ok = await confirmBox({ title: `〈${r.name}〉${pp(r.name, '을/를')} 상점에서 내릴까요?`, text: '가방에 있는 건 그대로 남아요.', ok: '삭제', danger: true });
    if (!ok) return;
    store.update(S => { S.rewardArchive[r.id] = { name: r.name, desc: r.desc, icon: r.icon, kind: r.kind, minutes: r.minutes, amount: r.amount }; S.rewards = S.rewards.filter(x => x.id !== r.id); });
    closeTop();
    toast('보상을 내렸어요', { icon: 'trash' });
  },
});
