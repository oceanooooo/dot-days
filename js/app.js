// 앱 시작·화면 이동·하단 탭 (유저플로우 2장 '앱 시작')
import { store, DEMO } from './store.js';
import { today, settle } from './game.js';
import { APP_VERSION } from './data.js';
import { html, str, addDays } from './util.js';
import { setBaseScreen, overlayOpen, toast, uiIcon } from './ui.js';
import { setSoundEnabled, unlockAudio } from './sound.js';
import { syncNow, scheduleSync, pushOnLeave, isConnected } from './sync.js';
import { startPage } from './views/onboarding.js';
import { villagePage, renderStage, resetStageTalk } from './views/village.js';
import { questsPage } from './views/quests.js';
import { rewardsPage, generalPage, bagPage } from './views/shop.js';
import { divePage, tick as diveTick } from './views/dive.js';
import { mePage, achievementsPage, dexPage, recordsPage } from './views/me.js';
import { ddayListPage, ddayCalcPage } from './views/dday.js';
import { settingsPage, dataPage, askConflict } from './views/settings.js';
import { dashboardPage, historyPage } from './views/insights.js';
import { managePage, presetsPage, archivePage, attrsPage } from './views/manage.js';
import { openQuestEditor } from './views/quests.js';

const ROUTES = {
  start: startPage, village: villagePage, quests: questsPage,
  shop: rewardsPage, 'shop/general': generalPage, 'shop/bag': bagPage, dive: divePage,
  me: mePage, 'me/achievements': achievementsPage, 'me/dex': dexPage, 'me/records': recordsPage,
  dday: ddayListPage, 'dday/calc': ddayCalcPage, settings: settingsPage, 'settings/data': dataPage,
  'me/dashboard': dashboardPage, 'me/history': historyPage,
  manage: managePage, 'manage/presets': presetsPage, 'manage/archive': archivePage, 'manage/attrs': attrsPage,
};
const TABS = [['village', 'home', '마을'], ['quests', 'quest', '퀘스트'], ['shop', 'shop', '상점'], ['dive', 'dive', '다이빙'], ['me', 'me', '모험가']];

const routeKey = () => { const k = location.hash.replace(/^#\/?/, '').split('?')[0]; return ROUTES[k] ? k : 'village'; };
let curKey = '', curPage = null;
const scrollMemo = {};

function render() {
  const S = store.S;
  let key = routeKey();
  if (!S && key !== 'start') { history.replaceState(null, '', '#/start'); key = 'start'; }
  if (S && key === 'start' && !DEMO) { history.replaceState(null, '', '#/village'); key = 'village'; }
  if (S?.dive && key !== 'dive') { history.replaceState(null, '', '#/dive'); key = 'dive'; } // 다이빙 중에는 다이빙 화면 고정
  const page = ROUTES[key];
  const changed = key !== curKey;
  if (changed) { if (curKey) scrollMemo[curKey] = scrollY; curPage?.unmounted?.(); }

  const body = document.body;
  body.dataset.route = key.split('/')[0];
  body.classList.toggle('fullscreen', !!page.fullscreen);
  body.classList.toggle('has-stage', !!S && !page.fullscreen);

  const main = document.getElementById('main');
  main.innerHTML = str(page.render(S));
  if (S && !page.fullscreen) renderStage(S);
  renderTabs(page.tab);
  page.mounted?.(main);
  setBaseScreen(page.screen);
  document.title = key === 'village' || !S ? '도트 데이즈' : `${main.querySelector('.page-title')?.textContent || ''} · 도트 데이즈`;

  if (changed) {
    curKey = key; curPage = page;
    scrollTo(0, page.tab === 'shop' ? 0 : scrollMemo[key] || 0); // 상점 탭 전환은 맨 위부터 (FR-SHP-001)
    if (key !== 'village') main.querySelector('.page-title')?.focus({ preventScroll: true });
  }
}
function renderTabs(cur) {
  document.getElementById('tabbar').innerHTML = str(html`${TABS.map(([k, icon, label]) =>
    html`<a class="tab ${cur === k ? 'on' : ''}" href="#/${k}" title="${label} (단축키 ${TABS.findIndex(t => t[0] === k) + 1})" ${cur === k ? html`aria-current="page"` : ''}>${uiIcon(icon, 24)}<span>${label}</span></a>`)}<p class="kbd-hint">1~5 탭 이동<br>N 새 퀘스트</p>`);
}

let pending = false;
const scheduleRender = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; render(); }); };

/** 하루가 바뀌었으면 정산 (FR-GRW-012) */
function dailyCheck() {
  const S = store.S;
  if (!S) return;
  const day = today(S);
  if (!S.lastSettled || S.lastSettled < addDays(day, -1)) { store.update(S2 => settle(S2, day), { noTouch: true }); resetStageTalk(); }
}

async function boot() {
  if (DEMO) { const demo = await import('./demo.js'); demo.seedDemo(); window.__dd = demo; }
  else store.load();
  if (store.S) { setSoundEnabled(store.S.settings.sound); dailyCheck(); }

  store.on(opts => {
    if (opts.saveError) toast('저장 공간이 부족해요. 백업 후 오래된 기록을 정리해 주세요', { icon: 'info', ms: 5000 });
    if (opts.replaced) { setSoundEnabled(store.S?.settings.sound ?? true); resetStageTalk(); }
    if (!opts.silent) scheduleRender();
    if (!opts.noTouch && !opts.replaced && !opts.silent && store.S) scheduleSync(askConflict);
  });
  addEventListener('hashchange', render);
  // PC 키보드 단축키 (NFR-PLT-006): 1~5 탭 이동, N 새 퀘스트
  addEventListener('keydown', e => {
    if (!store.S || store.S.dive || overlayOpen() || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const i = '12345'.indexOf(e.key);
    if (i >= 0) { location.hash = '#/' + TABS[i][0]; e.preventDefault(); }
    else if (e.key === 'n' || e.key === 'N' || e.key === 'ㅜ') { openQuestEditor(); e.preventDefault(); }
  });
  render();
  diveTick(); // 앱이 꺼진 사이 다이빙이 끝났으면 결과 표시 (FR-DIV-003)

  addEventListener('pointerdown', unlockAudio, { once: true });
  addEventListener('keydown', unlockAudio, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pushOnLeave(); return; }
    dailyCheck(); diveTick();
    if (isConnected()) syncNow({ onConflict: askConflict }).then(r => { if (r === 'pulled') toast('다른 기기의 기록을 받아왔어요', { icon: 'cloud_sync' }); });
    scheduleRender();
  });
  addEventListener('pagehide', pushOnLeave);
  setInterval(() => { dailyCheck(); }, 60000);

  if (!DEMO && isConnected()) syncNow({ onConflict: askConflict }).then(r => { if (r === 'pulled') toast('다른 기기의 기록을 받아왔어요', { icon: 'cloud_sync' }); });
  if (!DEMO) registerSW();
}

// ---------------------------------------------------------------- 오프라인·업데이트 (NFR-OFF-001, 002)
function registerSW() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    try { sessionStorage.setItem('dd-updated', '1'); } catch { /* 무시 */ }
    if (store.S?.dive || overlayOpen()) { toast('새 버전이 준비됐어요. 다음에 열 때 적용돼요', { icon: 'info' }); return; }
    reloading = true;
    location.reload();
  });
  try {
    if (sessionStorage.getItem('dd-updated')) { sessionStorage.removeItem('dd-updated'); toast(`새 버전이 적용됐어요 (v${APP_VERSION})`, { icon: 'sparkle' }); }
  } catch { /* 무시 */ }
}

boot();
