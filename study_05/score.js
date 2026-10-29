// 점수 계산, 게임 모드, 문제 구성, 결과 분석 (DOM에 의존하지 않는 순수 로직)

const GAME_MODES = {
  full: { label: "전체 도전", questions: 40, timeLimit: null },
  category: { label: "카테고리 도전", questions: 10, timeLimit: null },
  speed: { label: "스피드 퀴즈", questions: 20, timeLimit: 15 } // 문제당 15초
};

const MAX_HINTS = 3;          // 게임당 힌트 횟수
const TIME_BONUS_LIMIT = 10;  // 이 시간(초) 안에 맞히면 시간 보너스

class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalScore = 0;
    this.streak = 0;
    this.longestStreak = 0;
  }

  // 연속 정답 콤보 보너스: 3연속 +2, 5연속 +5, 10연속 +10
  getConsecutiveBonus(consecutiveCorrect) {
    if (consecutiveCorrect >= 10) return 10;
    if (consecutiveCorrect >= 5) return 5;
    if (consecutiveCorrect >= 3) return 2;
    return 0;
  }

  // 점수 항목별 내역 (피드백 화면 표시용)
  getBreakdown(isCorrect, timeSpent, consecutiveCorrect, hintUsed) {
    if (!isCorrect) return { base: 0, time: 0, noHint: 0, combo: 0 };
    return {
      base: 10,
      time: timeSpent < TIME_BONUS_LIMIT ? 3 : 0,
      noHint: hintUsed ? 0 : 2,
      combo: this.getConsecutiveBonus(consecutiveCorrect)
    };
  }

  calculateScore(isCorrect, timeSpent, consecutiveCorrect, hintUsed) {
    const b = this.getBreakdown(isCorrect, timeSpent, consecutiveCorrect, hintUsed);
    return b.base + b.time + b.noHint + b.combo;
  }

  // 답변 하나를 반영하고 획득 점수와 내역을 돌려줌
  // consecutiveCorrect는 이번 정답을 포함한 연속 정답 수
  record(isCorrect, timeSpent, hintUsed) {
    this.streak = isCorrect ? this.streak + 1 : 0;
    this.longestStreak = Math.max(this.longestStreak, this.streak);
    const breakdown = this.getBreakdown(isCorrect, timeSpent, this.streak, hintUsed);
    const points = breakdown.base + breakdown.time + breakdown.noHint + breakdown.combo;
    this.totalScore += points;
    return { points, breakdown, streak: this.streak };
  }
}

function shuffle(array, rng = Math.random) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 모드에 맞게 출제할 문제 목록 구성
// pool: 카테고리·난이도 필터가 이미 적용된 문제 목록
function buildQuestionSet(modeKey, pool, categories, rng = Math.random) {
  const mode = GAME_MODES[modeKey];
  if (modeKey === "full") {
    // 카테고리마다 같은 수(40 / 4 = 10)를 뽑아 카테고리 순서대로 출제
    const perCategory = Math.floor(mode.questions / categories.length);
    return categories.flatMap((cat) =>
      shuffle(pool.filter((q) => q.category === cat), rng).slice(0, perCategory)
    );
  }
  return shuffle(pool, rng).slice(0, mode.questions);
}

// 힌트: 오답 중 2개를 무작위로 골라 인덱스를 반환
function pickHintRemovals(question, rng = Math.random) {
  const wrong = question.options
    .map((_, i) => i)
    .filter((i) => i !== question.correctAnswer);
  return shuffle(wrong, rng).slice(0, 2);
}

// answers: [{ category, isCorrect, timeSpent, points, hintUsed }]
function buildResult(answers, meta = {}) {
  const totalQuestions = answers.length;
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const totalScore = answers.reduce((sum, a) => sum + a.points, 0);
  const totalTime = answers.reduce((sum, a) => sum + a.timeSpent, 0);

  const categoryStats = {};
  for (const a of answers) {
    const stat = categoryStats[a.category] || (categoryStats[a.category] = { correct: 0, total: 0 });
    stat.total++;
    if (a.isCorrect) stat.correct++;
  }

  let streak = 0;
  let longestStreak = 0;
  for (const a of answers) {
    streak = a.isCorrect ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }

  return {
    totalScore,
    correctAnswers,
    totalQuestions,
    accuracy: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    categoryStats,
    averageResponseTime: totalQuestions ? Math.round((totalTime / totalQuestions) * 10) / 10 : 0,
    longestStreak,
    hintsUsed: answers.filter((a) => a.hintUsed).length,
    ...meta
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GAME_MODES, MAX_HINTS, TIME_BONUS_LIMIT,
    ScoreManager, shuffle, buildQuestionSet, pickHintRemovals, buildResult
  };
}
