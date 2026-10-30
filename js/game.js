// 게임 규칙. 상태(S)를 직접 바꾸고, 화면에 보여줄 결과 객체를 돌려준다. DOM에 의존하지 않음(테스트 가능)
import { ITEMS } from './sprites-items.js';
import {
  DIFF, STREAK_BONUS, RARITY, ATTR_IDS, TITLES, CHESTS, POTIONS, DIVE, SHOP_ITEMS, BAD, TEMPTER_IDS,
  ACHIEVEMENTS, LUCK_MAX_DROP, DATA_VERSION, STARTER_QUESTS, SAMPLE_REWARDS, DEFAULT_ATTRS, ATTR_MAX,
} from './data.js';
import { dayKey, addDays, diffDays, weekday, round, rand, randInt, pick, pickWeighted, uid, parseKey, lastDayOf, deepCopy } from './util.js';

const LOG_MAX = 2000; // FR-STA-012

// ---------------------------------------------------------------- 아이템
export const DEX_IDS = Object.keys(ITEMS).filter(id => !ITEMS[id].hidden && ITEMS[id].cat !== 'chest');
const DROP_POOL = [null, [], [], [], []];
const DIVE_POOL = [null, [], [], [], []];
for (const [id, it] of Object.entries(ITEMS)) {
  if (it.hidden || it.cat === 'chest' || it.cat === 'charm') continue;
  DROP_POOL[it.rarity].push(id);
  if (it.cat === 'fish' || it.cat === 'sea') DIVE_POOL[it.rarity].push(id);
}

/** 가방 키 → 표시 정보. 'r:ID'는 내가 만든 보상 */
export function itemInfo(S, key) {
  if (key.startsWith('r:')) {
    const r = S.rewards.find(x => x.id === key.slice(2)) || S.rewardArchive?.[key.slice(2)];
    return r ? { key, name: r.name, desc: r.desc || '내가 정한 보상', rarity: 0, cat: 'reward', icon: r.icon, reward: true, kind: r.kind || 'normal', minutes: r.minutes || 0, amount: r.amount || 0 }
      : { key, name: '사라진 보상', desc: '', rarity: 0, cat: 'reward', icon: 'ticket', reward: true };
  }
  const it = ITEMS[key];
  return it ? { key, ...it, icon: key } : { key, name: key, desc: '', rarity: 1, cat: 'collect', icon: 'shell' };
}

function rollFromPool(pool, weights) {
  let r = pickWeighted(weights.map((w, i) => (pool[i + 1].length ? w : 0))) + 1;
  return pick(pool[r]);
}
export const rollItem = (weights = RARITY.slice(1).map(x => x.weight)) => rollFromPool(DROP_POOL, weights);

export function grantItem(S, id, n = 1, now = Date.now()) {
  S.bag[id] = (S.bag[id] || 0) + n;
  if (id.startsWith('r:') || !ITEMS[id] || ITEMS[id].hidden || ITEMS[id].cat === 'chest') return { id, isNew: false };
  const d = S.dex[id];
  if (d) { d.count += n; return { id, isNew: false }; }
  S.dex[id] = { first: now, count: n, seen: false };
  return { id, isNew: true };
}
function takeItem(S, id, n = 1) {
  if ((S.bag[id] || 0) < n) return false;
  S.bag[id] -= n;
  if (S.bag[id] <= 0) delete S.bag[id];
  return true;
}

// ---------------------------------------------------------------- 레벨·능력치
export function levelInfo(total) {
  let lv = 1, need = 50, cur = total;
  while (cur >= need) { cur -= need; lv++; need = 50 + (lv - 1) * 25; }
  return { lv, cur, need };
}
export function attrInfo(total) {
  let lv = 1, need = 30, cur = total;
  while (cur >= need) { cur -= need; lv++; need = 30 + (lv - 1) * 15; }
  return { lv, cur, need };
}
/** 등록된 능력치 정의 (기본 7 + 사용자) */
export const attrList = S => S.attrDefs || DEFAULT_ATTRS;
export const attrDef = (S, id) => attrList(S).find(a => a.id === id) || { id, name: id, color: '#a39e93', icon: 'attr:str' };
export function addAttrDef(S, { name, icon, color }) {
  if (attrList(S).length >= ATTR_MAX) return null;
  const def = { id: 'c' + uid(), name, icon, color, builtin: false };
  S.attrDefs.push(def); S.attrs[def.id] = 0;
  return def;
}
export function removeAttrDef(S, id) {
  const d = attrDef(S, id);
  if (d.builtin) return false;
  S.attrDefs = S.attrDefs.filter(a => a.id !== id); delete S.attrs[id];
  for (const q of S.quests) q.attrs = q.attrs.filter(a => a !== id);
  for (const p of S.presets) p.attrs = (p.attrs || []).filter(a => a !== id);
  return true;
}
export const titleOf = lv => TITLES.find(([min]) => lv >= min)[1];
export const chestForLevel = lv => (lv % 10 === 0 ? 'chest_gold' : lv % 5 === 0 ? 'chest_silver' : 'chest_wood');

function bumpDay(S, day, field, n) {
  const d = (S.days[day] ||= { q: 0, exp: 0, coins: 0, dive: 0 });
  d[field] = (d[field] || 0) + n;
}
/** 경험치 지급(음수 가능). 새로 도달한 레벨마다 상자 지급 */
export function addExp(S, n, day) {
  const before = levelInfo(S.exp).lv;
  S.exp = Math.max(0, S.exp + n);
  if (day) bumpDay(S, day, 'exp', n);
  const after = levelInfo(S.exp).lv;
  const ups = [];
  for (let lv = before + 1; lv <= after; lv++) {
    if (lv <= S.rewardedLevel) continue;
    const chest = chestForLevel(lv);
    grantItem(S, chest);
    S.rewardedLevel = lv;
    ups.push({ lv, chest, title: titleOf(lv), titleChanged: titleOf(lv) !== titleOf(lv - 1) });
  }
  return ups;
}
export function addCoins(S, n, day) {
  S.coins = Math.max(0, S.coins + n);
  if (n > 0) S.stats.coinsEarned += n;
  if (day) bumpDay(S, day, 'coins', n);
}
export function addAttrExp(S, attr, n) {
  if (!attrList(S).some(a => a.id === attr)) return null; // 삭제된 능력치
  const before = attrInfo(S.attrs[attr] || 0).lv;
  S.attrs[attr] = Math.max(0, (S.attrs[attr] || 0) + n);
  const after = attrInfo(S.attrs[attr]).lv;
  return after > before ? { attr, lv: after } : null;
}

// ---------------------------------------------------------------- 퀘스트 판정
export const today = (S, now = new Date()) => dayKey(now, S.settings.dayStart);
export const doneCount = (S, day, qid) => S.done[day]?.[qid] || 0;

/** 그날 해야 하는 퀘스트인가 (5-4). 한 번 퀘스트는 끝나지 않았거나 그날 끝낸 경우 */
export function isScheduled(S, q, day) {
  const r = q.repeat;
  if (q.kind === 'bad' || q.archived || day < r.start) return false;
  switch (r.type) {
    case 'once': return !q.doneAt || q.doneDay === day;
    case 'daily': return true;
    case 'weekly': return r.days.includes(weekday(day));
    case 'interval': return diffDays(r.start, day) % r.every === 0;
    case 'monthly': { // 없는 날짜는 그 달 말일에 (FR-QST-017)
      const { y, m, d } = parseKey(day); const last = lastDayOf(y, m);
      return (r.dates || []).some(n => n === d || (d === last && n > last));
    }
    default: return false;
  }
}
export const isDone = (S, q, day) => (q.repeat.type === 'once' ? !!q.doneAt : doneCount(S, day, q.id) >= q.times);
export const todayQuests = (S, day) => S.quests.filter(q => isScheduled(S, q, day));
export const activeQuests = S => S.quests.filter(q => !q.archived && q.kind !== 'bad');
export const badQuests = S => S.quests.filter(q => !q.archived && q.kind === 'bad');

/** 다음에 해야 하는 날 (오늘 포함, 최대 60일 안) */
export function nextDay(S, q, day) {
  if (q.repeat.type === 'once') return q.doneAt ? null : day;
  for (let i = 0; i < 62; i++) { const d = addDays(day, i); if (isScheduled(S, q, d)) return d; }
  return null;
}

export function streakMult(streak) {
  for (const [min, m] of STREAK_BONUS) if (streak >= min) return m;
  return 1;
}
/** 보상 미리보기 (연속 보너스 적용 전) */
export function previewReward(q) {
  const d = DIFF[q.diff] || DIFF[2];
  return { exp: d.exp, coins: d.coins, attr: q.attrs.length ? d.attr : 0, drop: d.drop };
}

function newLog(S, entry) {
  S.log.unshift({ t: Date.now(), ...entry });
  if (S.log.length > LOG_MAX) S.log.length = LOG_MAX;
  return S.log[0];
}

/** 퀘스트 1회 완료 (FR-QST-008, FR-GRW-001~011) */
export function completeQuest(S, qid, now = Date.now()) {
  const q = S.quests.find(x => x.id === qid);
  if (!q || q.kind === 'bad') return null;
  const day = dayKey(new Date(now), S.settings.dayStart);
  if (!isScheduled(S, q, day) || isDone(S, q, day)) return null;

  const before = { streak: q.streak, best: q.best, luck: S.buffs.luck };
  const count = doneCount(S, day, qid) + 1;
  (S.done[day] ||= {})[qid] = count;
  const target = q.repeat.type === 'once' ? 1 : q.times;
  const finished = count >= target;
  if (q.repeat.type === 'once') { q.doneAt = now; q.doneDay = day; }
  else if (finished) { q.streak += 1; q.best = Math.max(q.best, q.streak); }

  const d = DIFF[q.diff];
  // 이번 완료로 목표를 채웠으면 이미 +1된 연속 기록 기준
  const mult = q.repeat.type === 'once' ? 1 : streakMult(q.streak);
  const exp = round(d.exp * mult), coins = round(d.coins * mult);
  const levelUps = addExp(S, exp, day);
  addCoins(S, coins, day);
  const attrs = {}, attrUps = [];
  for (const a of q.attrs) { const up = addAttrExp(S, a, d.attr); attrs[a] = d.attr; if (up) attrUps.push(up); }

  let chance = d.drop;
  if (S.buffs.luck > 0) { chance = Math.min(LUCK_MAX_DROP, chance * 2); S.buffs.luck--; }
  const items = [];
  if (rand() < chance) items.push(grantItem(S, rollItem(), 1, now));

  S.stats.quests++;
  if (q.slot === 'morning') S.stats.morning++;
  S.stats.bestStreak = Math.max(S.stats.bestStreak, q.best);
  bumpDay(S, day, 'q', 1);

  // 완벽한 하루: 오늘 퀘스트 3개 이상을 모두 완료
  let perfect = false;
  const list = todayQuests(S, day);
  if (!S.days[day].perfect && list.length >= 3 && list.every(x => isDone(S, x, day))) {
    S.days[day].perfect = true; S.stats.perfectDays++; perfect = true;
  }
  newLog(S, {
    type: 'quest', qid, day, text: `${q.name} 완료`, exp, coins, attrs, items: items.map(i => i.id),
    undo: { ...before, perfect, morning: q.slot === 'morning', once: q.repeat.type === 'once' },
  });
  const achievements = checkAchievements(S, day);
  return { kind: 'quest', quest: q, count, target, finished, exp, coins, attrs, items, mult, streak: q.streak, levelUps, attrUps, achievements, perfect };
}

/** 오늘 마지막 완료 1회 취소 (5-6). 업적·레벨업 상자는 회수하지 않음 */
export function undoQuest(S, qid, now = Date.now()) {
  const day = dayKey(new Date(now), S.settings.dayStart);
  const idx = S.log.findIndex(l => l.type === 'quest' && l.qid === qid && l.day === day && l.undo);
  if (idx < 0) return null;
  const l = S.log[idx];
  const q = S.quests.find(x => x.id === qid);
  const u = l.undo;
  addExp(S, -l.exp, day);
  const back = Math.min(l.coins, S.coins);
  S.coins -= back; S.stats.coinsEarned -= l.coins; bumpDay(S, day, 'coins', -l.coins);
  for (const [a, n] of Object.entries(l.attrs || {})) S.attrs[a] = Math.max(0, S.attrs[a] - n);
  for (const id of l.items || []) if (takeItem(S, id) && S.dex[id]) S.dex[id].count = Math.max(1, S.dex[id].count - 1);
  const c = doneCount(S, day, qid) - 1;
  if (c > 0) S.done[day][qid] = c; else if (S.done[day]) delete S.done[day][qid];
  if (q) {
    q.streak = u.streak; q.best = u.best;
    if (u.once) { q.doneAt = null; q.doneDay = null; }
  }
  S.buffs.luck = u.luck;
  S.stats.quests--; if (u.morning) S.stats.morning--;
  bumpDay(S, day, 'q', -1);
  if (u.perfect) { S.days[day].perfect = false; S.stats.perfectDays--; }
  S.log.splice(idx, 1);
  return { quest: q };
}

// ---------------------------------------------------------------- 정산 (5-5)
export function settle(S, day) {
  const yesterday = addDays(day, -1);
  if (!S.lastSettled) { S.lastSettled = yesterday; return null; }
  if (S.lastSettled >= yesterday) return null;
  let protectedDays = 0;
  const broken = new Set(), cleanBonus = [];
  for (let d = addDays(S.lastSettled, 1); d <= yesterday; d = addDays(d, 1)) {
    for (const q of badQuests(S)) { // 유혹: 그날 기록이 없으면 참기 보너스 (5-11)
      if (d < q.repeat.start || (S.slips?.[d]?.[q.id])) continue;
      const coins = BAD.bonusCoins[q.diff]; addCoins(S, coins, d);
      for (const a of q.attrs) addAttrExp(S, a, BAD.bonusAttr[q.diff]);
      q.cleanBest = Math.max(q.cleanBest || 0, cleanDays(S, q, addDays(d, 1)));
      newLog(S, { type: 'clean', qid: q.id, day: d, text: `〈${q.name}〉 참기 보너스`, coins, attrs: Object.fromEntries(q.attrs.map(a => [a, BAD.bonusAttr[q.diff]])) });
      cleanBonus.push({ name: q.name, coins });
    }
    const missed = S.quests.filter(q => q.repeat.type !== 'once' && q.streak > 0 && isScheduled(S, q, d) && doneCount(S, d, q.id) < q.times);
    if (!missed.length) continue;
    if (takeItem(S, 'charm')) {
      protectedDays++;
      newLog(S, { type: 'charm', text: `연속 기록 부적이 ${d.slice(5).replace('-', '.')}의 기록을 지켜줌` });
    } else {
      for (const q of missed) { q.streak = 0; broken.add(q.name); }
    }
  }
  S.lastSettled = yesterday;
  // 오래된 일별 완료 기록 정리 (60일)
  const cut = addDays(day, -60);
  for (const k of Object.keys(S.done)) if (k < cut) delete S.done[k];
  for (const k of Object.keys(S.slips || {})) if (k < cut) delete S.slips[k];
  checkAchievements(S, day);
  if (!protectedDays && !broken.size && !cleanBonus.length) return null;
  S.notice = { day, protectedDays, broken: [...broken], charmsLeft: S.bag.charm || 0, clean: cleanBonus.slice(-1)[0] || null, cleanCount: cleanBonus.length };
  return S.notice;
}

// ---------------------------------------------------------------- 상점·가방
export function canBuyShop(S, id) {
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it) return { ok: false };
  if (it.max && (S.bag[id] || 0) >= it.max) return { ok: false, reason: `최대 ${it.max}개` };
  if (S.coins < it.price) return { ok: false, reason: `🐚 ${it.price - S.coins} 부족`, short: it.price - S.coins };
  return { ok: true, price: it.price };
}
export function buyShop(S, id) {
  const c = canBuyShop(S, id);
  if (!c.ok) return null;
  S.coins -= c.price; S.stats.coinsSpent += c.price;
  grantItem(S, id);
  newLog(S, { type: 'buy', text: `${ITEMS[id].name} 구매`, coins: -c.price });
  return { id, price: c.price, achievements: checkAchievements(S) };
}
export function canBuyReward(S, r) {
  if (r.stock === 0) return { ok: false, reason: '품절' };
  if (S.coins < r.price) return { ok: false, reason: `🐚 ${r.price - S.coins} 부족`, short: r.price - S.coins };
  return { ok: true };
}
export function buyReward(S, rid) {
  const r = S.rewards.find(x => x.id === rid);
  if (!r || !canBuyReward(S, r).ok) return null;
  S.coins -= r.price; S.stats.coinsSpent += r.price; S.stats.bought++;
  if (r.stock != null) r.stock--;
  grantItem(S, 'r:' + rid);
  newLog(S, { type: 'buy', text: `${r.name} 구매`, coins: -r.price });
  return { reward: r, achievements: checkAchievements(S) };
}

/** 아이템별 가능한 행동 */
export function itemActions(info) {
  if (info.reward) return ['use'];
  if (info.cat === 'chest') return ['open'];
  if (info.cat === 'charm') return [];
  if (info.cat === 'potion') return ['use', 'sell'];
  if (info.cat === 'food') return ['eat', 'sell'];
  return ['sell'];
}

/** 보상·물약·음식 사용 */
export function useItem(S, key, now = Date.now()) {
  const info = itemInfo(S, key);
  if (!takeItem(S, key)) return null;
  const day = dayKey(new Date(now), S.settings.dayStart);
  const res = { kind: 'use', info, exp: 0, coins: 0, attrs: {}, items: [], levelUps: [], attrUps: [] };
  if (info.reward) {
    S.stats.used++;
    if (info.kind === 'time') S.stats.rewardMinutes = (S.stats.rewardMinutes || 0) + info.minutes;
    if (info.kind === 'money') S.stats.allowance = (S.stats.allowance || 0) + info.amount;
    newLog(S, { type: 'use', text: `${info.name} 사용`, minutes: info.kind === 'time' ? info.minutes : 0, amount: info.kind === 'money' ? info.amount : 0 });
  } else if (info.cat === 'potion') {
    const p = POTIONS[key] || { exp: 20 };
    if (p.exp) { res.exp = p.exp; res.levelUps = addExp(S, p.exp, day); }
    if (p.luck) { S.buffs.luck += p.luck; res.luck = p.luck; }
    if (p.attrExp) {
      const a = pick(attrList(S)).id; res.attrs[a] = p.attrExp;
      const up = addAttrExp(S, a, p.attrExp); if (up) res.attrUps.push(up);
    }
    newLog(S, { type: 'use', text: `${info.name} 사용`, exp: res.exp });
  } else if (info.cat === 'food') {
    res.exp = info.rarity * 5; res.levelUps = addExp(S, res.exp, day);
    newLog(S, { type: 'use', text: `${info.name} 먹기`, exp: res.exp });
  }
  res.achievements = checkAchievements(S, day);
  return res;
}

export function openChest(S, key, now = Date.now()) {
  const def = CHESTS[key];
  if (!def || !takeItem(S, key)) return null;
  const day = dayKey(new Date(now), S.settings.dayStart);
  const ids = [];
  for (let i = 0; i < def.count; i++) ids.push(rollItem(def.weights));
  if (def.guarantee && !ids.some(id => ITEMS[id].rarity >= def.guarantee)) {
    ids[ids.length - 1] = rollFromPool(DROP_POOL, RARITY.slice(1).map((x, i) => (i + 1 >= def.guarantee ? x.weight : 0)));
  }
  const items = ids.map(id => grantItem(S, id, 1, now));
  const coins = randInt(...def.coins);
  addCoins(S, coins, day);
  S.stats.chests++;
  newLog(S, { type: 'chest', text: `${ITEMS[key].name} 열기`, coins, items: ids });
  return { kind: 'chest', key, items, coins, achievements: checkAchievements(S, day) };
}

export const sellPrice = info => (info.reward || info.cat === 'chest' || info.cat === 'charm' ? 0 : RARITY[info.rarity].sell);
export function sellItem(S, key, n = 1) {
  const info = itemInfo(S, key);
  const price = sellPrice(info);
  n = Math.min(n, S.bag[key] || 0);
  if (!price || n < 1 || !takeItem(S, key, n)) return null;
  const coins = price * n;
  addCoins(S, coins, today(S));
  newLog(S, { type: 'sell', text: `${info.name} ${n}개 판매`, coins });
  return { info, n, coins };
}

// ---------------------------------------------------------------- 집중 다이빙 (5-8)
export function diveReward(minutes) {
  return { exp: round(minutes * DIVE.expPerMin), coins: round(minutes * DIVE.coinsPerMin), attr: round(minutes * DIVE.attrPerMin), rolls: Math.floor(minutes / DIVE.itemEvery) };
}
export function startDive(S, minutes, attr, questId, now = Date.now()) {
  S.dive = { start: now, minutes, attr: attr || null, questId: questId || null };
}
export function diveProgress(S, now = Date.now()) {
  if (!S.dive) return null;
  const total = S.dive.minutes * 60;
  const elapsed = Math.min(total, Math.max(0, Math.floor((now - S.dive.start) / 1000)));
  return { total, elapsed, left: total - elapsed, ratio: elapsed / total, depth: Math.round((elapsed / total) * S.dive.minutes * DIVE.depthPerMin), maxDepth: S.dive.minutes * DIVE.depthPerMin, done: elapsed >= total };
}
export function finishDive(S, now = Date.now()) {
  const p = diveProgress(S, now);
  if (!p || !p.done) return null;
  const { minutes, attr, questId, start } = S.dive;
  S.dive = null;
  const day = dayKey(new Date(start + minutes * 60e3), S.settings.dayStart);
  const r = diveReward(minutes);
  const levelUps = addExp(S, r.exp, day);
  addCoins(S, r.coins, day);
  const attrs = {}, attrUps = [];
  if (attr) { attrs[attr] = r.attr; const up = addAttrExp(S, attr, r.attr); if (up) attrUps.push(up); }
  const items = [];
  for (let i = 0; i < r.rolls; i++) if (rand() < DIVE.itemChance) items.push(grantItem(S, rollFromPool(DIVE_POOL, RARITY.slice(1).map(x => x.weight)), 1, now));
  S.stats.dives++; S.stats.diveMin += minutes;
  bumpDay(S, day, 'dive', minutes);
  newLog(S, { type: 'dive', text: `${minutes}분 다이빙 성공`, exp: r.exp, coins: r.coins, attrs, minutes, items: items.map(i => i.id) });
  let quest = null;
  if (questId) quest = completeQuest(S, questId, now);
  const achievements = [...checkAchievements(S, day), ...(quest?.achievements || [])];
  if (quest) quest.achievements = [];
  return { kind: 'dive', success: true, minutes, exp: r.exp, coins: r.coins, attrs, items, levelUps: [...levelUps, ...(quest?.levelUps || [])], attrUps: [...attrUps, ...(quest?.attrUps || [])], quest, achievements };
}
export function abandonDive(S) {
  if (!S.dive) return null;
  const { minutes } = S.dive;
  S.dive = null;
  newLog(S, { type: 'dive-fail', text: `${minutes}분 다이빙 포기` });
  return { kind: 'dive', success: false, minutes };
}

// ---------------------------------------------------------------- 유혹 (5-11)
/** 참은 일수: 마지막으로 해버린 날(없으면 만든 날) 다음 날부터 day까지 */
export function cleanDays(S, q, day) {
  const from = q.lastSlip || addDays(q.repeat.start, -1);
  return Math.max(0, diffDays(from, day));
}
export const slippedOn = (S, q, day) => !!S.slips?.[day]?.[q.id];
export function slipBad(S, qid, now = Date.now()) {
  const q = S.quests.find(x => x.id === qid);
  if (!q || q.kind !== 'bad') return null;
  const day = dayKey(new Date(now), S.settings.dayStart);
  const before = { lastSlip: q.lastSlip || null, cleanBest: q.cleanBest || 0, clean: cleanDays(S, q, day) };
  q.cleanBest = Math.max(q.cleanBest || 0, before.clean);
  const take = Math.min(S.coins, BAD.penalty[q.diff]);
  S.coins -= take; bumpDay(S, day, 'coins', -take);
  q.lastSlip = day; q.slips = (q.slips || 0) + 1;
  ((S.slips ||= {})[day] ||= {})[qid] = (S.slips[day][qid] || 0) + 1;
  S.stats.slips = (S.stats.slips || 0) + 1;
  newLog(S, { type: 'slip', qid, day, text: `〈${q.name}〉 해버림`, coins: -take, undo: before });
  return { kind: 'slip', quest: q, coins: take, clean: before.clean, best: q.cleanBest };
}
export function undoSlip(S, qid, now = Date.now()) {
  const day = dayKey(new Date(now), S.settings.dayStart);
  const i = S.log.findIndex(l => l.type === 'slip' && l.qid === qid && l.day === day && l.undo);
  if (i < 0) return null;
  const l = S.log[i], q = S.quests.find(x => x.id === qid);
  S.coins += -l.coins; bumpDay(S, day, 'coins', -l.coins);
  if (q) { q.lastSlip = l.undo.lastSlip; q.cleanBest = l.undo.cleanBest; q.slips = Math.max(0, (q.slips || 1) - 1); }
  const n = (S.slips[day][qid] || 1) - 1; if (n > 0) S.slips[day][qid] = n; else delete S.slips[day][qid];
  S.stats.slips = Math.max(0, (S.stats.slips || 1) - 1);
  S.log.splice(i, 1);
  return { quest: q };
}

// ---------------------------------------------------------------- 복제·보관·프리셋 (FR-QST-019~022, FR-MNG-002~004)
const TEMPLATE_KEYS = ['name', 'memo', 'diff', 'attrs', 'repeat', 'times', 'slot', 'icon', 'kind', 'monster'];
export function templateOf(q) {
  const t = {};
  for (const k of TEMPLATE_KEYS) if (q[k] !== undefined) t[k] = deepCopy(q[k]);
  if (t.repeat) delete t.repeat.start;
  return t;
}
export function duplicateDraft(q) { return { ...templateOf(q), name: `${q.name} 2`.slice(0, 30), due: null }; }
export function archiveQuest(S, qid, archived = true) {
  const q = S.quests.find(x => x.id === qid);
  if (!q) return null;
  q.archived = archived;
  if (archived) q.archivedAt = Date.now();
  else { q.streak = 0; q.repeat.start = today(S); q.lastSlip = q.kind === 'bad' ? addDays(today(S), -1) : q.lastSlip; q.doneAt = null; q.doneDay = null; }
  return q;
}
export function savePreset(S, src, cat = 'mine') { const p = { id: uid(), cat, ...templateOf(src), createdAt: Date.now() }; S.presets.push(p); return p; }

// ---------------------------------------------------------------- 업적 (5-9)
export function dexStats(S) {
  const got = DEX_IDS.filter(id => S.dex[id]).length;
  return { got, total: DEX_IDS.length, pct: Math.floor((got / DEX_IDS.length) * 100) };
}
export function achvContext(S) {
  const attrLvs = ATTR_IDS.map(a => attrInfo(S.attrs[a] || 0).lv);
  const allLvs = attrList(S).map(a => attrInfo(S.attrs[a.id] || 0).lv);
  return {
    best: Math.max(S.stats.bestStreak, ...S.quests.map(q => q.best), 0),
    lv: levelInfo(S.exp).lv,
    dexPct: dexStats(S).pct,
    attrMax: Math.max(...allLvs), attrMin: Math.min(...attrLvs),
    cleanBest: Math.max(0, ...S.quests.filter(q => q.kind === 'bad').map(q => Math.max(q.cleanBest || 0, cleanDays(S, q, today(S))))),
  };
}
export function achvProgress(S, a, ctx = achvContext(S)) {
  return Math.min(a.goal, a.v(S, ctx));
}
/** 새로 달성한 업적 → 조개 지급, 목록 반환 */
export function checkAchievements(S, day = today(S)) {
  const ctx = achvContext(S);
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (S.achv[a.id] || a.v(S, ctx) < a.goal) continue;
    S.achv[a.id] = Date.now();
    addCoins(S, a.coins, day);
    newLog(S, { type: 'achv', text: `업적 〈${a.name}〉 달성`, coins: a.coins });
    out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------- 상태 만들기
export function makeQuest(src, day) {
  const repeat = { type: 'daily', days: [], every: 2, dates: [], ...deepCopy(src.repeat || {}), start: src.repeat?.start || day };
  return {
    id: uid(), kind: src.kind || 'good', name: src.name, memo: src.memo || '', diff: src.diff || 2, attrs: [...(src.attrs || [])], icon: src.icon || null,
    monster: src.kind === 'bad' ? (src.monster || pick(TEMPTER_IDS)) : null, archived: false, cleanBest: 0, lastSlip: null, slips: 0,
    repeat, times: repeat.type === 'once' ? 1 : (src.times || 1), slot: src.slot || 'any', due: repeat.type === 'once' ? (src.due || null) : null,
    createdAt: Date.now(), streak: src.streak || 0, best: src.best || 0, doneAt: null, doneDay: null,
  };
}
export function makeReward(src) {
  return { id: uid(), name: src.name, desc: src.desc || '', price: src.price, icon: src.icon || 'gift', stock: src.stock ?? null, kind: src.kind || 'normal', minutes: src.minutes || 0, amount: src.amount || 0, createdAt: Date.now() };
}
export function newState({ name = '모험가', avatar = 'straw', quests = [], dayStart = 4 } = {}) {
  const now = Date.now();
  const S = {
    v: DATA_VERSION,
    profile: { name, avatar, createdAt: now },
    exp: 0, coins: 0, rewardedLevel: 1,
    attrs: Object.fromEntries(ATTR_IDS.map(a => [a, 0])), attrDefs: deepCopy(DEFAULT_ATTRS), presets: [], slips: {},
    quests: [], rewards: [], rewardArchive: {}, ddays: [],
    bag: {}, dex: {}, achv: {}, days: {}, done: {}, log: [],
    stats: { quests: 0, morning: 0, perfectDays: 0, dives: 0, diveMin: 0, coinsEarned: 0, coinsSpent: 0, bought: 0, used: 0, chests: 0, bestStreak: 0, ddays: 0, slips: 0, rewardMinutes: 0, allowance: 0 },
    buffs: { luck: 0 }, dive: null, lastSettled: null, celebrated: {}, notice: null, seenTalk: {},
    settings: { sound: true, theme: 'auto', dayStart, dplusFrom1: true, questSort: 'created', ddaySort: 'near', dashPeriod: 'week' },
    meta: { updatedAt: now, lastBackup: null, createdWith: '1.0.0' },
  };
  const day = dayKey(new Date(now), dayStart);
  S.lastSettled = addDays(day, -1);
  for (const q of quests) S.quests.push(makeQuest(q, day));
  return S;
}
export function starterState(profile, pickedIdx) {
  const S = newState({ ...profile, quests: pickedIdx.map(i => STARTER_QUESTS[i]) });
  for (const r of SAMPLE_REWARDS) S.rewards.push(makeReward(r));
  return S;
}
