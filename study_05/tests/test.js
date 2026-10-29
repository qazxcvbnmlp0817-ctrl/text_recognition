// 실행: node tests/test.js
const assert = require("node:assert/strict");
const { QUESTIONS, CATEGORIES, getQuestionsByCategory } = require("../questions.js");
const {
  GAME_MODES, ScoreManager, buildQuestionSet, pickHintRemovals, buildResult
} = require("../score.js");
const {
  LocalDataManager, createMemoryStorage, getLeaderboard, buildLeaderboard, computeStats
} = require("../storage.js");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
}

// 재현 가능한 난수
function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

console.log("문제 데이터");
// /quiz-add로 문제가 늘어날 수 있으므로 최소 개수만 확인 (전체 도전 모드는 카테고리별 10문제 필요)
test("카테고리별 20문제 이상, 모든 문제가 4개 카테고리 중 하나", () => {
  assert.ok(QUESTIONS.length >= 80);
  for (const c of CATEGORIES) assert.ok(getQuestionsByCategory(c).length >= 20, c);
  const sum = CATEGORIES.reduce((n, c) => n + getQuestionsByCategory(c).length, 0);
  assert.equal(sum, QUESTIONS.length);
});
test("id는 1부터 빈 번호 없이 이어짐 (/quiz-range 범위 지정용)", () => {
  const ids = QUESTIONS.map((q) => q.id).sort((a, b) => a - b);
  ids.forEach((id, i) => assert.equal(id, i + 1));
});
test("id 중복 없음, 선택지 4개, 정답 인덱스 유효, 선택지 중복 없음", () => {
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.equal(q.options.length, 4, `id ${q.id}`);
    assert.equal(new Set(q.options).size, 4, `id ${q.id}`);
    assert.ok(q.correctAnswer >= 0 && q.correctAnswer < 4, `id ${q.id}`);
    assert.ok(["easy", "medium", "hard"].includes(q.difficulty), `id ${q.id}`);
    assert.ok(CATEGORIES.includes(q.category), `id ${q.id}`);
    assert.ok(q.explanation && q.question);
  }
});
test("난이도 필터", () => {
  const hard = getQuestionsByCategory("전체", "hard");
  assert.ok(hard.length > 0 && hard.every((q) => q.difficulty === "hard"));
  const histEasy = getQuestionsByCategory("한국사", "easy");
  assert.ok(histEasy.every((q) => q.category === "한국사" && q.difficulty === "easy"));
});

console.log("점수 계산");
test("스펙 공식: 정답 기본10 + 시간3 + 노힌트2 + 콤보", () => {
  const sm = new ScoreManager();
  assert.equal(sm.calculateScore(true, 5, 1, false), 15);
  assert.equal(sm.calculateScore(true, 10, 1, false), 12); // 10초는 보너스 없음
  assert.equal(sm.calculateScore(true, 5, 1, true), 13);
  assert.equal(sm.calculateScore(true, 12, 1, true), 10);
  assert.equal(sm.calculateScore(true, 5, 3, false), 17);
  assert.equal(sm.calculateScore(true, 5, 5, false), 20);
  assert.equal(sm.calculateScore(true, 5, 10, false), 25);
  assert.equal(sm.calculateScore(false, 1, 9, false), 0);
});
test("record: 연속 정답과 최장 연속, 오답 시 콤보 초기화", () => {
  const sm = new ScoreManager();
  const pts = [true, true, true, false, true].map((c) => sm.record(c, 12, true).points);
  assert.deepEqual(pts, [10, 10, 12, 0, 10]);
  assert.equal(sm.totalScore, 42);
  assert.equal(sm.longestStreak, 3);
  assert.equal(sm.streak, 1);
});

console.log("게임 모드");
test("전체 도전: 40문제, 카테고리별 10문제, 카테고리 순서", () => {
  const set = buildQuestionSet("full", getQuestionsByCategory("전체"), CATEGORIES, seeded(1));
  assert.equal(set.length, 40);
  assert.equal(new Set(set.map((q) => q.id)).size, 40);
  CATEGORIES.forEach((c, i) => {
    assert.ok(set.slice(i * 10, i * 10 + 10).every((q) => q.category === c), c);
  });
});
test("카테고리 도전: 해당 카테고리 10문제", () => {
  const set = buildQuestionSet("category", getQuestionsByCategory("과학"), CATEGORIES, seeded(2));
  assert.equal(set.length, 10);
  assert.ok(set.every((q) => q.category === "과학"));
});
test("스피드: 20문제, 문제당 15초", () => {
  const set = buildQuestionSet("speed", getQuestionsByCategory("전체"), CATEGORIES, seeded(3));
  assert.equal(set.length, 20);
  assert.equal(new Set(set.map((q) => q.id)).size, 20);
  assert.equal(GAME_MODES.speed.timeLimit, 15);
});
test("문제가 부족한 난이도면 있는 만큼만 출제", () => {
  const pool = getQuestionsByCategory("문화·예술", "hard");
  assert.equal(buildQuestionSet("category", pool, CATEGORIES).length, pool.length);
});

console.log("힌트");
test("오답 2개만 제거, 정답은 절대 제거 안 함", () => {
  for (const q of QUESTIONS) {
    const r = pickHintRemovals(q);
    assert.equal(r.length, 2);
    assert.equal(new Set(r).size, 2);
    assert.ok(!r.includes(q.correctAnswer));
  }
});

console.log("결과 분석");
test("정답 수, 정답률, 카테고리 통계, 평균 시간, 최장 연속", () => {
  const answers = [
    { category: "한국사", isCorrect: true, timeSpent: 5, points: 15, hintUsed: false },
    { category: "한국사", isCorrect: true, timeSpent: 7, points: 15, hintUsed: false },
    { category: "과학", isCorrect: false, timeSpent: 15, points: 0, hintUsed: true },
    { category: "과학", isCorrect: true, timeSpent: 3.2, points: 15, hintUsed: false }
  ];
  const r = buildResult(answers, { mode: "full" });
  assert.equal(r.totalScore, 45);
  assert.equal(r.correctAnswers, 3);
  assert.equal(r.totalQuestions, 4);
  assert.equal(r.accuracy, 75);
  assert.deepEqual(r.categoryStats, { 한국사: { correct: 2, total: 2 }, 과학: { correct: 1, total: 2 } });
  assert.equal(r.averageResponseTime, 7.6);
  assert.equal(r.longestStreak, 2);
  assert.equal(r.hintsUsed, 1);
  assert.equal(r.mode, "full");
});

console.log("저장 · 순위 · 통계");
function entry(name, score, accuracy, iso, mode = "full", category = null) {
  return {
    playerName: name, totalScore: score, accuracy, timestamp: iso, mode, category,
    correctAnswers: accuracy / 10, totalQuestions: 10, longestStreak: 2,
    categoryStats: { 한국사: { correct: accuracy / 10, total: 10 } }
  };
}
test("저장 후 다시 읽기 (새로고침 시뮬레이션), 최고 점수", () => {
  const storage = createMemoryStorage();
  const dm = new LocalDataManager(storage);
  assert.equal(dm.getBestScore(), 0);
  dm.saveGameResult({ totalScore: 120, mode: "full" });
  dm.saveGameResult({ totalScore: 300, mode: "full" });
  const reloaded = new LocalDataManager(storage);
  assert.equal(reloaded.getGameHistory().length, 2);
  assert.ok(reloaded.getGameHistory()[0].timestamp);
  assert.equal(reloaded.getBestScore(), 300);
});
test("손상된 저장 데이터는 빈 기록으로 처리", () => {
  const storage = createMemoryStorage();
  storage.setItem("gameHistory", "{깨진 JSON");
  assert.deepEqual(new LocalDataManager(storage).getGameHistory(), []);
});
test("리더보드: 플레이어별 최고 기록, 점수→정답률→먼저 달성 순, 상위 10명", () => {
  const h = [
    entry("A", 100, 50, "2026-10-29T01:00:00Z"),
    entry("A", 200, 60, "2026-10-29T02:00:00Z"),
    entry("B", 200, 80, "2026-10-29T03:00:00Z"),
    entry("C", 200, 80, "2026-10-29T00:30:00Z"),
    entry("D", 999, 90, "2026-10-29T01:00:00Z", "speed")
  ];
  for (let i = 0; i < 12; i++) h.push(entry(`P${i}`, 10 + i, 10, "2026-10-28T00:00:00Z"));
  const lb = getLeaderboard(h, { board: "full", now: new Date("2026-10-29T05:00:00Z") });
  assert.equal(lb.length, 10);
  assert.deepEqual(lb.slice(0, 3).map((r) => r.playerName), ["C", "B", "A"]);
  assert.deepEqual(lb.map((r) => r.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(!lb.some((r) => r.playerName === "D"));
});
test("기간 필터: 오늘 / 최근 7일 / 전체", () => {
  const now = new Date(2026, 9, 29, 15, 0);
  const h = [
    entry("오늘", 10, 10, new Date(2026, 9, 29, 9, 0).toISOString()),
    entry("엿새전", 20, 10, new Date(2026, 9, 23, 9, 0).toISOString()),
    entry("열흘전", 30, 10, new Date(2026, 9, 19, 9, 0).toISOString())
  ];
  const names = (p) => getLeaderboard(h, { board: "full", period: p, now }).map((r) => r.playerName);
  assert.deepEqual(names("daily"), ["오늘"]);
  assert.deepEqual(names("weekly"), ["엿새전", "오늘"]);
  assert.deepEqual(names("allTime"), ["열흘전", "엿새전", "오늘"]);
});
test("카테고리별 순위는 카테고리 도전 기록만", () => {
  const h = [
    entry("A", 50, 50, "2026-10-29T01:00:00Z", "category", "과학"),
    entry("B", 70, 70, "2026-10-29T01:00:00Z", "category", "지리"),
    entry("C", 90, 90, "2026-10-29T01:00:00Z", "full")
  ];
  const lb = buildLeaderboard(h, "full", CATEGORIES, new Date("2026-10-29T05:00:00Z"));
  assert.deepEqual(lb.byCategory["과학"].map((r) => r.playerName), ["A"]);
  assert.deepEqual(lb.byCategory["지리"].map((r) => r.playerName), ["B"]);
  assert.deepEqual(lb.allTime.map((r) => r.playerName), ["C"]);
});
test("통계: 플레이 횟수, 전체 정답률, 카테고리 누적, 시간순 타임라인", () => {
  const h = [entry("A", 200, 80, "2026-10-29T02:00:00Z"), entry("A", 100, 40, "2026-10-28T02:00:00Z")];
  const s = computeStats(h);
  assert.equal(s.playCount, 2);
  assert.equal(s.bestScore, 200);
  assert.equal(s.accuracy, 60);
  assert.deepEqual(s.categoryStats["한국사"], { correct: 12, total: 20 });
  assert.deepEqual(s.timeline.map((t) => t.totalScore), [100, 200]);
  assert.equal(computeStats([]).bestScore, 0);
});

console.log(`\n${passed}개 통과${process.exitCode ? ", 실패 있음" : ""}`);
