// 로컬 스토리지 저장, 리더보드, 통계 계산

const HISTORY_KEY = "gameHistory";
const SETTINGS_KEY = "quizSettings";

// localStorage를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 메모리 저장소로 대체
function createMemoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; }
  };
}

function getDefaultStorage() {
  try {
    const s = window.localStorage;
    const probe = "__quiz_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch (e) {
    return createMemoryStorage();
  }
}

class LocalDataManager {
  constructor(storage) {
    this.storage = storage || getDefaultStorage();
  }

  readJSON(key, fallback) {
    try {
      const raw = this.storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  writeJSON(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  getGameHistory() {
    const history = this.readJSON(HISTORY_KEY, []);
    return Array.isArray(history) ? history : [];
  }

  saveGameResult(result, now = new Date()) {
    const history = this.getGameHistory();
    const entry = {
      ...result,
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now.toISOString()
    };
    history.push(entry);
    this.writeJSON(HISTORY_KEY, history);
    return entry;
  }

  // 조건(filter 함수)에 맞는 기록 중 최고 점수, 기록이 없으면 0
  getBestScore(filter = () => true) {
    const scores = this.getGameHistory().filter(filter).map((h) => h.totalScore);
    return scores.length ? Math.max(...scores) : 0;
  }

  clearHistory() {
    try {
      this.storage.removeItem(HISTORY_KEY);
    } catch (e) { /* 무시 */ }
  }

  getSettings() {
    return { playerName: "", theme: null, sound: false, ...this.readJSON(SETTINGS_KEY, {}) };
  }

  saveSettings(patch) {
    this.writeJSON(SETTINGS_KEY, { ...this.getSettings(), ...patch });
  }
}

// ===== 리더보드 =====

// board: "full" | "speed" | 카테고리 이름 (카테고리 도전 모드 기록)
function matchesBoard(entry, board) {
  if (board === "full" || board === "speed") return entry.mode === board;
  return entry.mode === "category" && entry.category === board;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// period: "daily"(오늘) | "weekly"(최근 7일) | "allTime"
function matchesPeriod(entry, period, now = new Date()) {
  const t = new Date(entry.timestamp);
  if (period === "daily") return t >= startOfDay(now) && t <= now;
  if (period === "weekly") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return t >= from && t <= now;
  }
  return true;
}

// 점수 → 정답률 → 먼저 달성한 기록 순으로 정렬
function compareEntries(a, b) {
  return (
    b.totalScore - a.totalScore ||
    b.accuracy - a.accuracy ||
    new Date(a.timestamp) - new Date(b.timestamp)
  );
}

// 플레이어별 최고 기록만 남겨 상위 limit명 반환
function getLeaderboard(history, { board, period = "allTime", now = new Date(), limit = 10 }) {
  const bestByPlayer = new Map();
  for (const entry of history) {
    if (!matchesBoard(entry, board) || !matchesPeriod(entry, period, now)) continue;
    const name = entry.playerName || "플레이어";
    const prev = bestByPlayer.get(name);
    if (!prev || compareEntries(entry, prev) < 0) bestByPlayer.set(name, entry);
  }
  return [...bestByPlayer.values()]
    .sort(compareEntries)
    .slice(0, limit)
    .map((entry, i) => ({ rank: i + 1, ...entry }));
}

// 스펙의 리더보드 구조 (모드 하나에 대한 기간별 + 카테고리별 순위)
function buildLeaderboard(history, board, categories, now = new Date()) {
  const byCategory = {};
  for (const cat of categories) byCategory[cat] = getLeaderboard(history, { board: cat, now });
  return {
    daily: getLeaderboard(history, { board, period: "daily", now }),
    weekly: getLeaderboard(history, { board, period: "weekly", now }),
    allTime: getLeaderboard(history, { board, period: "allTime", now }),
    byCategory
  };
}

// ===== 통계 =====

function computeStats(history) {
  const playCount = history.length;
  const categoryStats = {};
  let totalCorrect = 0;
  let totalQuestions = 0;

  for (const h of history) {
    totalCorrect += h.correctAnswers;
    totalQuestions += h.totalQuestions;
    for (const [cat, s] of Object.entries(h.categoryStats || {})) {
      const agg = categoryStats[cat] || (categoryStats[cat] = { correct: 0, total: 0 });
      agg.correct += s.correct;
      agg.total += s.total;
    }
  }

  const sorted = history.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    playCount,
    bestScore: playCount ? Math.max(...history.map((h) => h.totalScore)) : 0,
    totalCorrect,
    totalQuestions,
    // 전체 문항 기준 정답률 (게임별 정답률의 단순 평균이 아님)
    accuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    longestStreak: playCount ? Math.max(...history.map((h) => h.longestStreak || 0)) : 0,
    categoryStats,
    timeline: sorted.map((h) => ({
      timestamp: h.timestamp,
      totalScore: h.totalScore,
      accuracy: h.accuracy,
      mode: h.mode,
      category: h.category
    }))
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LocalDataManager, createMemoryStorage,
    matchesBoard, matchesPeriod, getLeaderboard, buildLeaderboard, computeStats
  };
}
