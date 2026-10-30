// 상태 저장소: 기기 저장(localStorage), 형식 변환, 백업 파일, 복원 지점 (FR-DAT-001~003, 009, 010)
import { DATA_VERSION } from './data.js';
import { newState } from './game.js';
import { deepCopy, keyOf } from './util.js';

const KEY = 'dotdays:v1';
const RESTORE_KEY = 'dotdays:restore';

// 체험용 화면설계서(프로토타입)에서는 ?demo 로 열어 기기 저장소를 쓰지 않음
export const DEMO = new URLSearchParams(location.search).has('demo');
const mem = {};
const storage = {
  get(k) { if (DEMO) return mem[k] ?? null; try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { if (DEMO) { mem[k] = v; return true; } try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { if (DEMO) { delete mem[k]; return; } try { localStorage.removeItem(k); } catch { /* 무시 */ } },
};
export const localGet = k => storage.get(k);
export const localSet = (k, v) => storage.set(k, v);
export const localDel = k => storage.del(k);

/** 빠진 필드를 기본값으로 채움 (이전 형식 데이터·부분 데이터 대비) */
function fill(target, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (target[k] === undefined) target[k] = deepCopy(v);
    else if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') fill(target[k], v);
  }
  return target;
}
export function migrate(data) {
  const from = data.v || 1;
  const S = fill(data, newState({ name: data.profile?.name, avatar: data.profile?.avatar }));
  if (from < 2) { // v1 → v2 (FR-DAT-011): 난이도 4단계→5단계, 퀘스트 종류·보관 필드
    for (const q of S.quests) {
      if (q.diff === 4) q.diff = 5;
      q.kind ||= 'good'; q.archived ??= false; q.icon ??= null;
      q.repeat.dates ||= [];
    }
    for (const r of S.rewards) { r.kind ||= 'normal'; r.minutes ||= 0; r.amount ||= 0; }
  }
  // 기본 능력치(재력 등)가 빠져 있으면 추가
  for (const d of newState().attrDefs) if (!S.attrDefs.some(a => a.id === d.id)) S.attrDefs.push(d);
  for (const d of S.attrDefs) S.attrs[d.id] ??= 0;
  S.v = DATA_VERSION;
  return S;
}

export const store = {
  S: null,
  listeners: new Set(),
  saveFailed: false,
  load() {
    const raw = storage.get(KEY);
    if (!raw) return (this.S = null);
    try { this.S = migrate(JSON.parse(raw)); } catch { this.S = null; }
    return this.S;
  },
  save() {
    if (!this.S) return;
    const ok = storage.set(KEY, JSON.stringify(this.S));
    this.saveFailed = !ok;
    if (!ok) this.emit({ saveError: true });
  },
  /** 상태를 바꾸는 유일한 통로: fn이 S를 고친 뒤 저장·알림 */
  update(fn, opts = {}) {
    const r = fn(this.S);
    if (!opts.noTouch) this.S.meta.updatedAt = Date.now();
    this.save();
    this.emit(opts);
    return r;
  },
  set(S, opts = {}) { this.S = S; this.save(); this.emit(opts); },
  clear() { storage.del(KEY); this.S = null; this.emit({}); },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(info) { for (const fn of this.listeners) fn(info); },
};

// ---------------------------------------------------------------- 백업 파일 (9-1)
export function packBackup(S, kind = 'backup') {
  return { app: 'dot-days', kind, v: DATA_VERSION, savedAt: new Date().toISOString(), data: S };
}
export function unpackBackup(obj) {
  if (!obj || obj.app !== 'dot-days' || !obj.data || !obj.data.profile || !Array.isArray(obj.data.quests)) return null;
  return migrate(deepCopy(obj.data));
}
export function backupFileName(date = new Date()) {
  return `dot-days-backup-${keyOf(date).replace(/-/g, '')}.json`;
}
export async function exportBackup(S) {
  const text = JSON.stringify(packBackup(S), null, 1);
  const name = backupFileName();
  const file = new File([text], name, { type: 'application/json' });
  // 공유 시트가 있는 기기(iPhone·iPad·Android)는 공유로 전달
  if (navigator.canShare?.({ files: [file] }) && /iPhone|iPad|Android|Macintosh.*Mobile/.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: '도트 데이즈 백업' }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
export function readBackupFile(file) {
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => { try { resolve(unpackBackup(JSON.parse(fr.result))); } catch { resolve(null); } };
    fr.onerror = () => resolve(null);
    fr.readAsText(file);
  });
}

// ---------------------------------------------------------------- 복원 지점 (FR-DAT-010)
export function saveRestorePoint(S, reason) {
  if (!S) return;
  storage.set(RESTORE_KEY, JSON.stringify({ savedAt: Date.now(), reason, data: S }));
}
export function getRestorePoint() {
  try { return JSON.parse(storage.get(RESTORE_KEY)); } catch { return null; }
}
export function clearRestorePoint() { storage.del(RESTORE_KEY); }
