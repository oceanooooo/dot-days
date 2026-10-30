// 게임 상수. 기능명세서(02_요구사항/기능명세서.md) 5장과 반드시 같은 값으로 유지

export const APP_VERSION = '1.1.0';
export const DATA_VERSION = 2;

/** 5-1 퀘스트 보상 (index = 난이도 1~5) */
export const DIFF = [
  null,
  { name: '쉬움', exp: 10, coins: 5, attr: 10, drop: 0.05 },
  { name: '보통', exp: 25, coins: 10, attr: 25, drop: 0.10 },
  { name: '어려움', exp: 50, coins: 20, attr: 50, drop: 0.20 },
  { name: '매우 어려움', exp: 75, coins: 30, attr: 75, drop: 0.28 },
  { name: '전설', exp: 100, coins: 40, attr: 100, drop: 0.35 },
];
/** 연속 보너스: [최소 연속, 배수] 큰 것부터 */
export const STREAK_BONUS = [[30, 2.0], [14, 1.5], [7, 1.25], [3, 1.1]];
export const LUCK_USES = 5;
export const LUCK_MAX_DROP = 0.7;

/** 4-4 희귀도 (index = 1~4) */
export const RARITY = [
  null,
  { name: '보통', weight: 70, sell: 2, cls: 'r1' },
  { name: '희귀', weight: 22, sell: 8, cls: 'r2' },
  { name: '영웅', weight: 7, sell: 25, cls: 'r3' },
  { name: '전설', weight: 1, sell: 80, cls: 'r4' },
];

/** 5-12 기본 능력치 7개 (이름·아이콘·색은 바꿀 수 있고 삭제 불가). icon: 'attr:id' 또는 아이콘 라이브러리 키 */
export const DEFAULT_ATTRS = [
  { id: 'str', name: '체력', color: '#e8675e', icon: 'attr:str', hint: '운동, 수면, 건강', builtin: true },
  { id: 'int', name: '지력', color: '#3f8fb8', icon: 'attr:int', hint: '공부, 독서, 업무', builtin: true },
  { id: 'cha', name: '매력', color: '#d9808a', icon: 'attr:cha', hint: '관계, 연락, 자기관리', builtin: true },
  { id: 'grit', name: '끈기', color: '#2f9a92', icon: 'attr:grit', hint: '절제, 아침 루틴, 습관', builtin: true },
  { id: 'art', name: '감성', color: '#8a68b8', icon: 'attr:art', hint: '창작, 취미, 감상', builtin: true },
  { id: 'life', name: '생활', color: '#c9a46c', icon: 'attr:life', hint: '집안일, 정리', builtin: true },
  { id: 'wealth', name: '재력', color: '#ebb43f', icon: 'attr:wealth', hint: '돈 관리, 저축, 부업', builtin: true },
];
export const ATTR_IDS = DEFAULT_ATTRS.map(a => a.id); // 기본 능력치 ID (업적 기준)
export const ATTR_MAX = 12;
export const ATTR_COLORS = ['#e8675e', '#ef9a52', '#ebb43f', '#6aaa64', '#3f8fb8', '#275d86', '#8a68b8', '#d9808a', '#8f6a45', '#6e6a72'];

/** 3-1 시간대 (to는 24시를 넘을 수 있음: 저녁 18~28 = 18시~다음날 4시) */
export const SLOTS = {
  morning: { name: '아침', from: 4, to: 12 },
  afternoon: { name: '오후', from: 12, to: 18 },
  evening: { name: '저녁', from: 18, to: 28 },
  any: { name: '언제나' },
};
export const SLOT_IDS = Object.keys(SLOTS);

export const REPEAT_NAMES = { once: '한 번', daily: '매일', weekly: '요일 지정', interval: 'N일마다', monthly: '매월' };

/** 5-11 유혹(하면 안 되는 것): index = 난이도 1~5 */
export const BAD = {
  penalty: [0, 5, 10, 20, 30, 40],
  bonusCoins: [0, 2, 4, 6, 8, 10],
  bonusAttr: [0, 5, 10, 15, 20, 25],
};
export const TEMPTER_IDS = ['slime', 'ghost', 'imp'];

/** 5-3 레벨업 칭호 [최소 레벨, 칭호] 큰 것부터 */
export const TITLES = [[50, '전설의 모험가'], [30, '물빛 마을의 영웅'], [20, '파도 위의 여행자'], [10, '바닷가 탐험가'], [5, '마을 심부름꾼'], [1, '새내기 모험가']];

/** 5-7 잡화점 */
export const SHOP_ITEMS = [
  { id: 'chest_wood', price: 80, effect: '열면 아이템 2개 + 조개 10~30' },
  { id: 'chest_silver', price: 250, effect: '열면 아이템 3개 + 조개 30~60' },
  { id: 'potion_red', price: 50, effect: '마시면 경험치 +30' },
  { id: 'potion_green', price: 120, effect: '다음 완료 5회 아이템 드롭 확률 2배' },
  { id: 'charm', price: 150, effect: '놓친 하루의 연속 기록을 자동으로 지켜줌', max: 3 },
];

export const CHESTS = {
  chest_wood: { count: 2, weights: [70, 22, 7, 1], coins: [10, 30] },
  chest_silver: { count: 3, weights: [40, 40, 16, 4], coins: [30, 60] },
  chest_gold: { count: 4, weights: [0, 50, 38, 12], coins: [80, 150], guarantee: 3 },
};
export const CHEST_OPEN = { chest_wood: 'chest_wood_open', chest_silver: 'chest_silver_open', chest_gold: 'chest_gold_open' };

export const POTIONS = {
  potion_red: { exp: 30, text: '경험치 +30' },
  potion_blue: { exp: 80, text: '경험치 +80' },
  potion_gold: { exp: 200, text: '경험치 +200' },
  potion_green: { luck: LUCK_USES, text: '다음 완료 5회 드롭 확률 2배' },
  potion_purple: { attrExp: 60, text: '무작위 능력치 경험치 +60' },
};

/** 5-8 다이빙 */
/** 5-7 보상 종류: 추천 가격 */
export const REWARD_KIND = { normal: '일반', time: '시간', money: '용돈' };
export const PRICE_PER_30MIN = 40, PRICE_PER_1000WON = 60;
export const REWARD_PRESETS = [
  { name: '용돈 1,000원', kind: 'money', amount: 1000, price: 60, icon: 'coin_stack' },
  { name: '용돈 5,000원', kind: 'money', amount: 5000, price: 300, icon: 'banknote' },
  { name: '용돈 10,000원', kind: 'money', amount: 10000, price: 600, icon: 'money_bag' },
  { name: '자유 시간 30분', kind: 'time', minutes: 30, price: 40, icon: 'alarm_clock' },
  { name: '자유 시간 1시간', kind: 'time', minutes: 60, price: 80, icon: 'hourglass' },
  { name: '자유 시간 2시간', kind: 'time', minutes: 120, price: 160, icon: 'gamepad' },
  { name: '늦잠 30분', kind: 'time', minutes: 30, price: 60, icon: 'feather' },
  { name: '달콤한 간식', kind: 'normal', price: 60, icon: 'popsicle' },
  { name: '배달 음식', kind: 'normal', price: 400, icon: 'sushi' },
  { name: '갖고 싶던 물건', kind: 'normal', price: 1000, icon: 'gift' },
];

export const DIVE = { minutes: [15, 25, 45, 60], expPerMin: 0.8, coinsPerMin: 0.6, attrPerMin: 0.8, itemEvery: 15, itemChance: 0.4, depthPerMin: 2 };

export const PRESET_CATS = [['health', '건강'], ['study', '공부·일'], ['life', '생활'], ['mind', '마음'], ['social', '관계'], ['money', '재정'], ['bad', '유혹']];
export const CAT_NAMES = { food: '음식', potion: '물약', gem: '보석', sea: '바다', fish: '물고기', tool: '도구', collect: '수집품', chest: '상자', charm: '부적' };
export const ICON_CATS = ['food', 'potion', 'gem', 'sea', 'fish', 'tool', 'collect'];

/** 5-9 업적 30종. value(S, ctx) → 현재 값, goal → 목표 */
export const ACHIEVEMENTS = [
  { id: 'quest_1', name: '첫 걸음', desc: '퀘스트 1회 완료', goal: 1, coins: 20, icon: 'feather', v: (S) => S.stats.quests },
  { id: 'quest_10', name: '부지런한 손', desc: '퀘스트 10회 완료', goal: 10, coins: 30, icon: 'clover', v: (S) => S.stats.quests },
  { id: 'quest_50', name: '마을의 일꾼', desc: '퀘스트 50회 완료', goal: 50, coins: 60, icon: 'shovel', v: (S) => S.stats.quests },
  { id: 'quest_100', name: '백 번의 파도', desc: '퀘스트 100회 완료', goal: 100, coins: 100, icon: 'conch', v: (S) => S.stats.quests },
  { id: 'quest_500', name: '루틴 마스터', desc: '퀘스트 500회 완료', goal: 500, coins: 300, icon: 'trophy', v: (S) => S.stats.quests },
  { id: 'streak_3', name: '작은 습관', desc: '한 퀘스트 연속 3일', goal: 3, coins: 30, icon: 'sunflower', v: (S, c) => c.best },
  { id: 'streak_7', name: '일주일의 약속', desc: '한 퀘스트 연속 7일', goal: 7, coins: 60, icon: 'wind_chime', v: (S, c) => c.best },
  { id: 'streak_30', name: '한 달의 여름', desc: '한 퀘스트 연속 30일', goal: 30, coins: 200, icon: 'firework', v: (S, c) => c.best },
  { id: 'streak_100', name: '끝나지 않는 여름', desc: '한 퀘스트 연속 100일', goal: 100, coins: 500, icon: 'star_fragment', v: (S, c) => c.best },
  { id: 'level_5', name: '성장의 시작', desc: '레벨 5 달성', goal: 5, coins: 50, icon: 'straw_hat', v: (S, c) => c.lv },
  { id: 'level_10', name: '바닷가 탐험가', desc: '레벨 10 달성', goal: 10, coins: 100, icon: 'compass', v: (S, c) => c.lv },
  { id: 'level_20', name: '파도 위의 여행자', desc: '레벨 20 달성', goal: 20, coins: 200, icon: 'telescope', v: (S, c) => c.lv },
  { id: 'level_30', name: '물빛 마을의 영웅', desc: '레벨 30 달성', goal: 30, coins: 400, icon: 'crown', v: (S, c) => c.lv },
  { id: 'dive_1', name: '첫 잠수', desc: '다이빙 1회 성공', goal: 1, coins: 20, icon: 'diving_mask', v: (S) => S.stats.dives },
  { id: 'dive_10', name: '숙련 다이버', desc: '다이빙 10회 성공', goal: 10, coins: 80, icon: 'oxygen_tank', v: (S) => S.stats.dives },
  { id: 'dive_600', name: '심해의 주인', desc: '다이빙 누적 600분', goal: 600, coins: 300, icon: 'pearl', v: (S) => S.stats.diveMin },
  { id: 'buy_1', name: '첫 쇼핑', desc: '나의 보상 1회 구매', goal: 1, coins: 10, icon: 'ticket', v: (S) => S.stats.bought },
  { id: 'use_10', name: '쉬는 것도 실력', desc: '보상 10회 사용', goal: 10, coins: 50, icon: 'uchiwa', v: (S) => S.stats.used },
  { id: 'chest_10', name: '보물 사냥꾼', desc: '상자 10개 열기', goal: 10, coins: 80, icon: 'key_gold', v: (S) => S.stats.chests },
  { id: 'dex_25', name: '수집가', desc: '도감 25% 채우기', goal: 25, coins: 80, icon: 'book', v: (S, c) => c.dexPct },
  { id: 'dex_50', name: '박물학자', desc: '도감 50% 채우기', goal: 50, coins: 150, icon: 'scroll', v: (S, c) => c.dexPct },
  { id: 'dex_100', name: '물빛 도감 완성', desc: '도감 100% 채우기', goal: 100, coins: 500, icon: 'treasure_map', v: (S, c) => c.dexPct },
  { id: 'dday_1', name: '기다림의 설렘', desc: '디데이 1개 등록', goal: 1, coins: 20, icon: 'letter', v: (S) => S.stats.ddays },
  { id: 'attr_10', name: '한 우물', desc: '능력치 하나 Lv.10', goal: 10, coins: 100, icon: 'gem_blue', v: (S, c) => c.attrMax },
  { id: 'attr_all5', name: '균형 잡힌 모험가', desc: '기본 능력치 7개 모두 Lv.5', goal: 5, coins: 150, icon: 'gem_purple', v: (S, c) => c.attrMin },
  { id: 'perfect_1', name: '완벽한 하루', desc: '오늘 퀘스트(3개 이상) 모두 완료', goal: 1, coins: 30, icon: 'medal', v: (S) => S.stats.perfectDays },
  { id: 'perfect_7', name: '완벽한 일주일', desc: '완벽한 하루 누적 7회', goal: 7, coins: 100, icon: 'bell', v: (S) => S.stats.perfectDays },
  { id: 'early_30', name: '아침형 모험가', desc: '아침 퀘스트 30회 완료', goal: 30, coins: 80, icon: 'barley_tea', v: (S) => S.stats.morning },
  { id: 'clean_7', name: '유혹을 이긴 일주일', desc: '유혹 하나를 7일 연속 참기', goal: 7, coins: 80, icon: 'clover', v: (S, c) => c.cleanBest },
  { id: 'clean_30', name: '단단한 마음', desc: '유혹 하나를 30일 연속 참기', goal: 30, coins: 300, icon: 'medal', v: (S, c) => c.cleanBest },
];

/** 5-10 추천 퀘스트 (pick = 기본 선택) */
export const STARTER_QUESTS = [
  { name: '물 마시기', diff: 1, attrs: ['str'], repeat: { type: 'daily' }, times: 6, slot: 'any', pick: true },
  { name: '이불 정리하기', diff: 1, attrs: ['life'], repeat: { type: 'daily' }, times: 1, slot: 'morning' },
  { name: '아침 스트레칭 5분', diff: 1, attrs: ['str', 'grit'], repeat: { type: 'daily' }, times: 1, slot: 'morning' },
  { name: '독서 20분', diff: 2, attrs: ['int'], repeat: { type: 'daily' }, times: 1, slot: 'afternoon', pick: true },
  { name: '30분 산책', diff: 2, attrs: ['str'], repeat: { type: 'daily' }, times: 1, slot: 'afternoon' },
  { name: '운동 1시간', diff: 3, attrs: ['str', 'grit'], repeat: { type: 'weekly', days: [1, 3, 5] }, times: 1, slot: 'evening' },
  { name: '일기 쓰기', diff: 1, attrs: ['art'], repeat: { type: 'daily' }, times: 1, slot: 'evening', pick: true },
  { name: '내일 할 일 정리', diff: 1, attrs: ['grit', 'life'], repeat: { type: 'daily' }, times: 1, slot: 'evening' },
  { name: '소중한 사람에게 안부 연락', diff: 1, attrs: ['cha'], repeat: { type: 'weekly', days: [0] }, times: 1, slot: 'any' },
];

export const SAMPLE_REWARDS = [
  { name: '유튜브 30분', desc: '보고 싶던 영상 마음껏', kind: 'time', minutes: 30, price: 40, icon: 'headphones' },
  { name: '달콤한 간식', desc: '아이스크림이나 과자 하나', price: 60, icon: 'popsicle' },
  { name: '게임 1시간', desc: '죄책감 없이 게임하기', kind: 'time', minutes: 60, price: 150, icon: 'gamepad' },
  { name: '카페에서 쉬기', desc: '좋아하는 음료 한 잔', price: 200, icon: 'barley_tea' },
  { name: '배달 음식', desc: '오늘 저녁은 시켜 먹기', price: 400, icon: 'sushi' },
  { name: '용돈 5,000원', desc: '나를 위한 작은 용돈', kind: 'money', amount: 5000, price: 300, icon: 'banknote' },
];
export const PRICE_GUIDE = [['소소한', 45], ['중간', 150], ['큰', 400], ['특별한', 1000]];

export const AVATAR_IDS = ['straw', 'diver', 'ranger', 'keeper'];

/** 8-1 몽글이 대사 */
export const TIPS = [
  '작은 퀘스트도 퀘스트야! 물 한 잔부터 시작하자.',
  '연속 기록 부적은 잡화점에서 팔아. 바쁜 날을 대비해 하나쯤!',
  '다이빙을 하면 바다 아이템을 찾을 수 있어.',
  '능력치는 퀘스트에 연결해야 자라. 퀘스트를 수정해 봐.',
  '디데이는 모험가 메뉴에서 관리할 수 있어.',
  '조개가 쌓였다면 상점에서 나를 위한 보상을 사 보자.',
  '상자는 가방에서 열 수 있어. 뭐가 나올까?',
  '오늘 못 했어도 괜찮아. 조개는 사라지지 않아.',
  '도감의 ??? 칸은 아직 만나지 못한 친구들이야.',
  '설정에서 백업해 두면 기록을 잃어버릴 걱정이 없어.',
];
export const REWARD_CHEERS = ['마음껏 즐겨! 열심히 한 너의 몫이야.', '쉬는 것도 모험의 일부야.', '충전 완료되면 또 같이 모험하자!'];

/** 5-13 기본 퀘스트 프리셋 (FR-MNG-002). repeat 생략 = 매일 */
const P = (cat, name, diff, attrs, extra = {}) => ({ cat, name, diff, attrs, slot: 'any', times: 1, repeat: { type: 'daily' }, ...extra });
export const PRESETS = [
  P('health', '물 마시기', 1, ['str'], { times: 6, icon: 'v:cup:blue-pastel' }),
  P('health', '아침 스트레칭 5분', 1, ['str', 'grit'], { slot: 'morning' }),
  P('health', '30분 산책', 2, ['str'], { slot: 'afternoon' }),
  P('health', '운동 1시간', 3, ['str', 'grit'], { slot: 'evening', repeat: { type: 'weekly', days: [1, 3, 5] } }),
  P('health', '영양제 챙기기', 1, ['str'], { slot: 'morning', icon: 'v:candy:orange-vivid' }),
  P('health', '12시 전에 잠들기', 2, ['str', 'grit'], { slot: 'evening', icon: 'moon' }),
  P('health', '건강검진 예약', 3, ['str'], { repeat: { type: 'once' } }),
  P('study', '독서 20분', 2, ['int'], { slot: 'afternoon', icon: 'book' }),
  P('study', '영어 단어 20개', 2, ['int', 'grit'], { slot: 'morning' }),
  P('study', '자격증 공부 1시간', 3, ['int'], { repeat: { type: 'weekly', days: [1, 2, 3, 4, 5] } }),
  P('study', '업무 회고 쓰기', 2, ['int'], { slot: 'evening', repeat: { type: 'weekly', days: [5] } }),
  P('study', '받은 메일 정리', 1, ['int', 'life'], { slot: 'morning', repeat: { type: 'weekly', days: [1, 2, 3, 4, 5] } }),
  P('life', '이불 정리하기', 1, ['life'], { slot: 'morning' }),
  P('life', '설거지', 1, ['life'], { slot: 'evening' }),
  P('life', '분리수거', 1, ['life'], { repeat: { type: 'weekly', days: [3] } }),
  P('life', '방 청소', 2, ['life'], { repeat: { type: 'weekly', days: [6] } }),
  P('life', '화분 물 주기', 1, ['life', 'art'], { repeat: { type: 'interval', every: 3 }, icon: 'sunflower' }),
  P('life', '내일 할 일 정리', 1, ['grit', 'life'], { slot: 'evening' }),
  P('mind', '일기 쓰기', 1, ['art'], { slot: 'evening' }),
  P('mind', '명상 10분', 1, ['grit'], { slot: 'morning', icon: 'v:marble:purple-pastel' }),
  P('mind', '감사한 일 3가지', 1, ['art', 'cha'], { slot: 'evening', icon: 'v:heart:pink-pastel' }),
  P('mind', '그림 그리기 30분', 2, ['art'], { repeat: { type: 'weekly', days: [0, 6] } }),
  P('mind', '좋아하는 음악 듣기', 1, ['art'], { icon: 'headphones' }),
  P('social', '소중한 사람에게 안부 연락', 1, ['cha'], { repeat: { type: 'weekly', days: [0] } }),
  P('social', '가족과 저녁 식사', 2, ['cha'], { slot: 'evening', repeat: { type: 'weekly', days: [0] } }),
  P('social', '친구 생일 챙기기', 2, ['cha'], { repeat: { type: 'once' }, icon: 'v:balloon:red-pastel' }),
  P('social', '스킨케어', 1, ['cha'], { slot: 'evening' }),
  P('money', '가계부 쓰기', 1, ['wealth'], { slot: 'evening', icon: 'wallet' }),
  P('money', '저축 이체하기', 2, ['wealth', 'grit'], { repeat: { type: 'monthly', dates: [25] }, icon: 'piggy_bank' }),
  P('money', '카드값 확인', 2, ['wealth'], { repeat: { type: 'monthly', dates: [10] }, icon: 'banknote' }),
  P('money', '고정 지출 점검', 3, ['wealth', 'int'], { repeat: { type: 'monthly', dates: [1] } }),
  P('money', '무지출 데이', 3, ['wealth', 'grit'], { repeat: { type: 'weekly', days: [3] }, icon: 'v:check:green-vivid' }),
  P('bad', '야식 먹기', 2, ['str'], { kind: 'bad', monster: 'slime' }),
  P('bad', '자기 전 휴대폰 1시간', 2, ['grit'], { kind: 'bad', monster: 'imp' }),
  P('bad', '충동구매', 3, ['wealth'], { kind: 'bad', monster: 'imp' }),
  P('bad', '늦잠 자기', 2, ['grit'], { kind: 'bad', monster: 'ghost' }),
  P('bad', '군것질', 1, ['str'], { kind: 'bad', monster: 'slime' }),
  P('bad', '미루기', 2, ['grit', 'int'], { kind: 'bad', monster: 'ghost' }),
  P('bad', '흡연·음주', 4, ['str'], { kind: 'bad', monster: 'imp' }),
  P('bad', '쇼츠 보며 시간 버리기', 2, ['grit'], { kind: 'bad', monster: 'ghost' }),
].map((p, i) => ({ id: 'base' + i, builtin: true, ...p }));
