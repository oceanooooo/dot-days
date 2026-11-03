// 사이트 지도: 화면 이름·아이콘·상위 화면 (REQ-06 메뉴 접근성)
// 현재 위치 표시, 전체 메뉴(MO-COM-006), PC 레일 보조 메뉴, 문서 제목이 모두 이 표 하나를 씀
export const SITE = {
  village: { title: '마을', icon: 'home' },
  quests: { title: '퀘스트', icon: 'quest' },
  shop: { title: '상점', icon: 'shop' },
  'shop/general': { title: '잡화점', icon: 'gift', parent: 'shop' },
  'shop/bag': { title: '가방', icon: 'bag', parent: 'shop' },
  dive: { title: '다이빙', icon: 'dive' },
  me: { title: '모험가', icon: 'me' },
  'me/dashboard': { title: '대시보드', icon: 'dashboard', parent: 'me', desc: '기간별 요약·추이' },
  'me/calendar': { title: '달력', icon: 'calendar', parent: 'me', desc: '월별 완료 달력' },
  'me/history': { title: '히스토리', icon: 'history', parent: 'me', desc: '활동 기록 검색' },
  'me/records': { title: '기록·통계', icon: 'chart', parent: 'me', desc: '누적 기록·잔디' },
  'me/achievements': { title: '업적', icon: 'trophy', parent: 'me' },
  'me/dex': { title: '도감', icon: 'dex', parent: 'me' },
  dday: { title: '디데이', icon: 'calendar', parent: 'me' },
  'dday/calc': { title: '디데이 계산기', icon: 'timer', parent: 'dday' },
  manage: { title: '관리', icon: 'tools', parent: 'me' },
  'manage/presets': { title: '퀘스트 프리셋', icon: 'preset', parent: 'manage' },
  'manage/archive': { title: '보관함', icon: 'archive', parent: 'manage' },
  'manage/attrs': { title: '능력치 관리', icon: 'chart', parent: 'manage' },
  settings: { title: '설정', icon: 'gear', parent: 'me' },
  'settings/data': { title: '데이터·동기화', icon: 'cloud_sync', parent: 'settings' },
};

/** 전체 메뉴 묶음 */
export const MENU_GROUPS = [
  ['바로 가기', ['village', 'quests', 'shop', 'dive', 'me']],
  ['현황', ['me/dashboard', 'me/calendar', 'me/history', 'me/records']],
  ['성장·수집', ['me/achievements', 'me/dex', 'shop/bag', 'shop/general']],
  ['도구', ['dday', 'dday/calc', 'manage/presets', 'manage/archive', 'manage/attrs', 'manage']],
  ['설정', ['settings', 'settings/data']],
];

/** 현황 화면 묶음 (같은 단계에서 바로 옮겨 다님) */
export const INSIGHT_TABS = [['me/dashboard', '요약'], ['me/calendar', '달력'], ['me/history', '히스토리'], ['me/records', '누적']];

/** PC 레일 아래 보조 메뉴 */
export const RAIL_SUB = ['me/dashboard', 'me/history', 'dday', 'manage', 'settings'];

export const currentKey = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'village';

/** 위에서부터 현재 화면까지의 경로 [키…] */
export function trail(key) {
  const out = [];
  for (let k = key; k && SITE[k]; k = SITE[k].parent) out.unshift(k);
  return out;
}
