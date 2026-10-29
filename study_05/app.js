// 상식퀴즈 화면 제어 (게임 진행, 결과, 리더보드, 대시보드)
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const data = new LocalDataManager();
  const DIFFICULTY_LABEL = { all: "전체", easy: "쉬움", medium: "보통", hard: "어려움" };

  const state = {
    mode: "full",
    category: CATEGORIES[0],
    difficulty: "all",
    playerName: "",
    questions: [],
    index: 0,
    answers: [],
    scoreManager: new ScoreManager(),
    hintsLeft: MAX_HINTS,
    hintUsedThisQ: false,
    answered: false,
    active: false,
    paused: false,
    qStart: 0,
    pausedTotal: 0,
    pauseStart: null,
    timerId: null,
    lastResult: null
  };

  const ui = { lbBoard: "full", lbPeriod: "allTime", metric: "totalScore", dbPlayer: null };
  let settings = data.getSettings();

  // ===== 공통 도우미 =====

  // textContent로만 내용을 넣어 이름 등 사용자 입력이 HTML로 해석되지 않게 함
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function modeLabel(entry) {
    if (entry.mode === "category") return `카테고리 도전 · ${entry.category}`;
    return GAME_MODES[entry.mode].label;
  }

  function boardOf(entry) {
    return entry.mode === "category" ? entry.category : entry.mode;
  }

  let toastTimer = null;
  function toast(message) {
    const t = $("toast");
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.toggle("active", s.id === `screen-${name}`);
    });
    if (name === "start") renderStartInfo();
    if (name === "leaderboard") renderLeaderboard();
    if (name === "dashboard") renderDashboard();
    window.scrollTo(0, 0);
    if (name !== "quiz") {
      const heading = document.querySelector(`#screen-${name} h1`);
      if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
    }
  }

  // ===== 테마 · 사운드 =====

  function effectiveTheme() {
    const forced = document.documentElement.getAttribute("data-theme");
    if (forced) return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
    const dark = effectiveTheme() === "dark";
    $("theme-toggle").textContent = dark ? "☀️" : "🌙";
    $("theme-toggle").setAttribute("aria-label", dark ? "라이트 모드로 전환" : "다크 모드로 전환");
  }

  function applySound() {
    $("sound-toggle").textContent = settings.sound ? "🔊" : "🔇";
    $("sound-toggle").setAttribute("aria-pressed", String(settings.sound));
  }

  let audioCtx = null;
  function playSound(type) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { correct: [660, 880], wrong: [220, 165], hint: [520], end: [523, 659, 784] }[type];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const t = audioCtx.currentTime + i * 0.12;
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (e) { /* 오디오를 지원하지 않으면 무시 */ }
  }

  // ===== 시작 화면 =====

  function selectedMode() {
    return document.querySelector('input[name="mode"]:checked').value;
  }

  function renderStartInfo() {
    const mode = selectedMode();
    const category = $("category-select").value;
    const difficulty = $("difficulty-select").value;
    $("category-select").disabled = mode !== "category";

    const pool = getQuestionsByCategory(mode === "category" ? category : "전체", difficulty);
    const count = buildQuestionSet(mode, pool, CATEGORIES).length;
    const expected = GAME_MODES[mode].questions;
    const name = $("player-name").value.trim() || "플레이어";
    const board = mode === "category" ? category : mode;
    const best = data.getBestScore((h) => h.playerName === name && matchesBoard(h, board));

    let text = `출제 문제 ${count}개`;
    if (count < expected) text += ` (선택한 난이도의 문제가 부족해 ${expected}개보다 적게 출제됩니다)`;
    text += best ? ` · 이 모드 내 최고 기록 ${best}점` : "";
    $("start-info").textContent = text;
    $("start-btn").disabled = count === 0;
  }

  // ===== 게임 진행 =====

  function initGame() {
    state.playerName = $("player-name").value.trim() || "플레이어";
    settings.playerName = state.playerName;
    data.saveSettings({ playerName: state.playerName });

    state.mode = selectedMode();
    state.category = $("category-select").value;
    state.difficulty = $("difficulty-select").value;

    const pool = getQuestionsByCategory(state.mode === "category" ? state.category : "전체", state.difficulty);
    state.questions = buildQuestionSet(state.mode, pool, CATEGORIES);
    if (!state.questions.length) {
      toast("출제할 문제가 없습니다. 난이도를 바꿔 보세요.");
      return;
    }

    state.index = 0;
    state.answers = [];
    state.scoreManager.reset();
    state.hintsLeft = MAX_HINTS;
    state.active = true;
    state.paused = false;
    $("time-bar").hidden = !GAME_MODES[state.mode].timeLimit;

    showScreen("quiz");
    loadQuestion();
  }

  function currentQuestion() {
    return state.questions[state.index];
  }

  function optionButtons() {
    return [...$("options").children];
  }

  function loadQuestion() {
    const q = currentQuestion();
    const total = state.questions.length;
    state.answered = false;
    state.hintUsedThisQ = false;

    $("progress-text").textContent = `${state.index + 1} / ${total}`;
    const pct = Math.round((state.index / total) * 100);
    $("progress-fill").style.width = `${pct}%`;
    document.querySelector(".progress-bar").setAttribute("aria-valuenow", String(pct));

    $("category-badge").textContent = q.category;
    $("difficulty-badge").textContent = DIFFICULTY_LABEL[q.difficulty];
    $("question-text").textContent = q.question;

    const options = $("options");
    options.replaceChildren();
    q.options.forEach((text, i) => {
      const btn = el("button", { type: "button", class: "option" },
        el("span", { class: "option-key", "aria-hidden": "true", text: String(i + 1) }),
        el("span", { text })
      );
      btn.addEventListener("click", () => handleAnswer(i));
      options.append(btn);
    });

    $("feedback").hidden = true;
    updateHud();
    updateHintButton();
    $("pause-btn").disabled = false;
    startTimer();
    $("question-text").focus({ preventScroll: true });
  }

  function updateHud() {
    const sm = state.scoreManager;
    $("score-text").textContent = sm.totalScore;
    const chip = $("combo-chip");
    chip.hidden = sm.streak < 2;
    $("combo-text").textContent = sm.streak;
  }

  function updateHintButton() {
    $("hint-count").textContent = state.hintsLeft;
    $("hint-btn").disabled = state.answered || state.hintUsedThisQ || state.hintsLeft <= 0;
  }

  // ----- 타이머 (일시정지 시간은 제외) -----

  function elapsedSeconds() {
    const now = performance.now();
    const paused = state.pausedTotal + (state.pauseStart !== null ? now - state.pauseStart : 0);
    return Math.max(0, (now - state.qStart - paused) / 1000);
  }

  function startTimer() {
    stopTimer();
    state.qStart = performance.now();
    state.pausedTotal = 0;
    state.pauseStart = null;
    state.timerId = setInterval(tick, 100);
    tick();
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  function tick() {
    const t = elapsedSeconds();
    const limit = GAME_MODES[state.mode].timeLimit;
    if (limit) {
      const left = Math.max(0, limit - t);
      $("timer-text").textContent = left.toFixed(1);
      $("time-fill").style.width = `${(left / limit) * 100}%`;
      $("timer-chip").classList.toggle("urgent", left <= 5);
      if (left <= 0) handleAnswer(null); // 시간 초과
    } else {
      $("timer-text").textContent = t.toFixed(1);
      $("timer-chip").classList.remove("urgent");
    }
  }

  // ----- 답변 처리 -----

  // selected: 선택지 인덱스, 시간 초과면 null
  function handleAnswer(selected) {
    if (!state.active || state.answered || state.paused) return;
    if (selected !== null && optionButtons()[selected].disabled) return; // 힌트로 제거된 선택지

    state.answered = true;
    stopTimer();

    const q = currentQuestion();
    const limit = GAME_MODES[state.mode].timeLimit;
    let timeSpent = elapsedSeconds();
    if (limit) timeSpent = Math.min(timeSpent, limit);
    timeSpent = Math.round(timeSpent * 10) / 10;

    const isCorrect = selected === q.correctAnswer;
    const { points, breakdown, streak } = state.scoreManager.record(isCorrect, timeSpent, state.hintUsedThisQ);
    const answer = {
      question: q,
      category: q.category,
      selected,
      isCorrect,
      timeSpent,
      points,
      hintUsed: state.hintUsedThisQ,
      timedOut: selected === null
    };
    state.answers.push(answer);
    showFeedback(answer, breakdown, streak);
  }

  function showFeedback(answer, breakdown, streak) {
    const q = answer.question;
    const buttons = optionButtons();
    buttons.forEach((btn) => { btn.disabled = true; });
    buttons[q.correctAnswer].classList.add("correct");
    if (!answer.isCorrect && answer.selected !== null) buttons[answer.selected].classList.add("wrong");

    const fb = $("feedback");
    fb.classList.toggle("is-correct", answer.isCorrect);
    fb.classList.toggle("is-wrong", !answer.isCorrect);

    if (answer.isCorrect) {
      $("feedback-title").textContent = streak >= 3 ? `⭕ 정답입니다! 🔥 ${streak}연속` : "⭕ 정답입니다!";
      const parts = [`기본 ${breakdown.base}`];
      if (breakdown.time) parts.push(`시간 +${breakdown.time}`);
      if (breakdown.noHint) parts.push(`노힌트 +${breakdown.noHint}`);
      if (breakdown.combo) parts.push(`콤보 +${breakdown.combo}`);
      $("feedback-points").textContent = `+${answer.points}점 (${parts.join(" · ")}) · ${answer.timeSpent}초`;
      playSound("correct");
    } else {
      $("feedback-title").textContent = answer.timedOut ? "⏰ 시간 초과!" : "❌ 오답입니다";
      $("feedback-points").textContent = `정답: ${q.options[q.correctAnswer]}`;
      playSound("wrong");
    }
    $("feedback-explanation").textContent = q.explanation;

    const isLast = state.index === state.questions.length - 1;
    $("next-btn").textContent = isLast ? "결과 보기 →" : "다음 문제 →";
    fb.hidden = false;

    updateHud();
    if (streak >= 2) {
      const chip = $("combo-chip");
      chip.classList.remove("pop");
      void chip.offsetWidth; // 애니메이션 재시작
      chip.classList.add("pop");
    }
    updateHintButton();
    $("next-btn").focus({ preventScroll: true });
    fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function nextQuestion() {
    if (!state.active || !state.answered || state.paused) return;
    state.index++;
    if (state.index >= state.questions.length) endGame();
    else loadQuestion();
  }

  // ----- 힌트 · 일시정지 -----

  function useHint() {
    if (!state.active || state.answered || state.paused || state.hintUsedThisQ || state.hintsLeft <= 0) return;
    const buttons = optionButtons();
    for (const i of pickHintRemovals(currentQuestion())) {
      buttons[i].disabled = true;
      buttons[i].classList.add("removed");
      buttons[i].setAttribute("aria-label", `${currentQuestion().options[i]} (힌트로 제거됨)`);
    }
    state.hintsLeft--;
    state.hintUsedThisQ = true;
    updateHintButton();
    playSound("hint");
    const firstLeft = buttons.find((b) => !b.disabled);
    if (firstLeft) firstLeft.focus();
  }

  function pauseGame() {
    if (!state.active || state.paused) return;
    state.paused = true;
    if (!state.answered) state.pauseStart = performance.now();
    $("pause-overlay").hidden = false;
    $("resume-btn").focus();
  }

  function resumeGame() {
    if (!state.paused) return;
    if (state.pauseStart !== null) {
      state.pausedTotal += performance.now() - state.pauseStart;
      state.pauseStart = null;
    }
    state.paused = false;
    $("pause-overlay").hidden = true;
    (state.answered ? $("next-btn") : $("pause-btn")).focus();
  }

  function quitGame() {
    state.active = false;
    state.paused = false;
    stopTimer();
    $("pause-overlay").hidden = true;
    showScreen("start");
  }

  // ----- 게임 종료 -----

  function endGame() {
    state.active = false;
    stopTimer();

    const result = buildResult(state.answers, {
      mode: state.mode,
      category: state.mode === "category" ? state.category : null,
      difficulty: state.difficulty,
      playerName: state.playerName
    });

    const board = boardOf(result);
    const mine = (h) => h.playerName === state.playerName && matchesBoard(h, board);
    const hadPrevious = data.getGameHistory().some(mine);
    const prevBest = data.getBestScore(mine);

    const entry = data.saveGameResult(result);
    const ranked = getLeaderboard(data.getGameHistory(), { board }).find((r) => r.id === entry.id);

    state.lastResult = entry;
    ui.lbBoard = board;
    renderResult(entry, state.answers, {
      newBest: hadPrevious && result.totalScore > prevBest,
      rank: ranked ? ranked.rank : null
    });
    $("progress-fill").style.width = "100%";
    showScreen("result");
    playSound("end");
  }

  // ===== 결과 화면 =====

  function renderBars(container, categoryStats) {
    container.replaceChildren();
    const fills = [];
    for (const cat of CATEGORIES) {
      const s = categoryStats[cat];
      if (!s || !s.total) continue;
      const pct = Math.round((s.correct / s.total) * 100);
      const fill = el("div", { class: "bar-fill" });
      fills.push([fill, pct]);
      container.append(el("div", { class: "bar-row" },
        el("span", { class: "bar-label", text: cat }),
        el("div", { class: "bar-track", role: "img", "aria-label": `${cat} 정답률 ${pct}%` }, fill),
        el("span", { class: "bar-value", text: `${s.correct}/${s.total} (${pct}%)` })
      ));
    }
    if (!fills.length) container.append(el("p", { class: "empty", text: "기록이 없습니다." }));
    requestAnimationFrame(() => fills.forEach(([f, pct]) => { f.style.width = `${pct}%`; }));
  }

  function renderResult(result, answers, { newBest, rank }) {
    $("result-mode").textContent = `${modeLabel(result)} · 난이도 ${DIFFICULTY_LABEL[result.difficulty]} · ${result.playerName}`;
    $("result-score").textContent = result.totalScore;
    $("result-correct").textContent = `${result.correctAnswers}/${result.totalQuestions}`;
    $("result-accuracy").textContent = `${result.accuracy}%`;
    $("result-time").textContent = `${result.averageResponseTime}초`;
    $("result-streak").textContent = `${result.longestStreak}연속`;

    const badges = [];
    if (newBest) badges.push("🎉 개인 최고 기록 갱신!");
    if (rank) badges.push(`🏅 이 모드 전체 순위 ${rank}위`);
    $("result-badge").hidden = !badges.length;
    $("result-badge").textContent = badges.join("  ");

    renderBars($("result-categories"), result.categoryStats);

    const wrong = answers.filter((a) => !a.isCorrect);
    $("wrong-count").textContent = wrong.length;
    $("wrong-list-wrap").hidden = !wrong.length;
    const list = $("wrong-list");
    list.replaceChildren();
    for (const a of wrong) {
      const q = a.question;
      list.append(el("li", {},
        el("div", { text: q.question }),
        el("div", { class: "picked", text: a.timedOut ? "내 답: 시간 초과" : `내 답: ${q.options[a.selected]}` }),
        el("div", { class: "answer", text: `정답: ${q.options[q.correctAnswer]}` })
      ));
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = el("textarea", { readonly: "", style: "position:fixed;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  function shareResult() {
    const r = state.lastResult;
    if (!r) return;
    const text = [
      `🧠 상식퀴즈 — ${modeLabel(r)} (난이도 ${DIFFICULTY_LABEL[r.difficulty]})`,
      `🏅 ${r.totalScore}점 | 정답 ${r.correctAnswers}/${r.totalQuestions} (${r.accuracy}%)`,
      `🔥 최장 연속 ${r.longestStreak} | ⏱ 평균 ${r.averageResponseTime}초`
    ].join("\n");
    copyText(text)
      .then(() => toast("결과를 클립보드에 복사했어요"))
      .catch(() => toast("복사에 실패했어요"));
  }

  // ===== 리더보드 =====

  function renderLeaderboard() {
    const select = $("lb-board");
    if (!select.options.length) {
      select.append(el("option", { value: "full", text: "🎯 전체 도전" }));
      select.append(el("option", { value: "speed", text: "⚡ 스피드 퀴즈" }));
      for (const cat of CATEGORIES) select.append(el("option", { value: cat, text: `📚 카테고리 · ${cat}` }));
    }
    select.value = ui.lbBoard;
    document.querySelectorAll("[data-period]").forEach((tab) => {
      tab.setAttribute("aria-selected", String(tab.dataset.period === ui.lbPeriod));
    });

    const rows = getLeaderboard(data.getGameHistory(), { board: ui.lbBoard, period: ui.lbPeriod });
    const body = $("lb-body");
    body.replaceChildren();
    const medals = ["🥇", "🥈", "🥉"];
    for (const r of rows) {
      const tr = el("tr", r.playerName === settings.playerName ? { class: "me" } : {},
        el("td", {}, el("span", { class: "rank-medal", text: medals[r.rank - 1] || String(r.rank) })),
        el("td", { text: r.playerName }),
        el("td", { text: `${r.totalScore}점` }),
        el("td", { text: `${r.accuracy}%` }),
        el("td", { text: DIFFICULTY_LABEL[r.difficulty] || "-" }),
        el("td", { text: formatDate(r.timestamp) })
      );
      body.append(tr);
    }
    $("lb-empty").hidden = rows.length > 0;
    body.closest("table").hidden = rows.length === 0;
  }

  // ===== 대시보드 =====

  function renderDashboard() {
    const history = data.getGameHistory();
    const names = [...new Set(history.map((h) => h.playerName))];
    const select = $("db-player");
    select.replaceChildren(el("option", { value: "", text: "모든 플레이어" }));
    names.forEach((n) => select.append(el("option", { value: n, text: n })));
    if (ui.dbPlayer === null) ui.dbPlayer = names.includes(settings.playerName) ? settings.playerName : "";
    if (ui.dbPlayer && !names.includes(ui.dbPlayer)) ui.dbPlayer = "";
    select.value = ui.dbPlayer;

    const mine = ui.dbPlayer ? history.filter((h) => h.playerName === ui.dbPlayer) : history;
    const stats = computeStats(mine);

    $("db-plays").textContent = `${stats.playCount}회`;
    $("db-best").textContent = `${stats.bestScore}점`;
    $("db-accuracy").textContent = `${stats.accuracy}%`;
    $("db-streak").textContent = `${stats.longestStreak}연속`;

    document.querySelectorAll("[data-metric]").forEach((tab) => {
      tab.setAttribute("aria-selected", String(tab.dataset.metric === ui.metric));
    });
    renderGrowthChart($("growth-chart"), stats.timeline.slice(-30), ui.metric);
    renderBars($("db-categories"), stats.categoryStats);

    const body = $("db-recent");
    body.replaceChildren();
    for (const h of mine.slice().reverse().slice(0, 10)) {
      body.append(el("tr", {},
        el("td", { text: formatDate(h.timestamp) }),
        el("td", { text: modeLabel(h) }),
        el("td", { text: `${h.totalScore}점` }),
        el("td", { text: `${h.correctAnswers}/${h.totalQuestions}` }),
        el("td", { text: `${h.accuracy}%` })
      ));
    }
    $("db-empty").hidden = mine.length > 0;
    body.closest("table").hidden = mine.length === 0;
  }

  function niceMax(v) {
    const step = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / step) * step;
  }

  // 단일 계열 선 그래프 (SVG) + 마우스 호버 툴팁
  function renderGrowthChart(container, timeline, metric) {
    container.replaceChildren();
    if (!timeline.length) {
      container.append(el("div", { class: "chart-empty", text: "게임을 플레이하면 기록 추이가 여기에 표시됩니다." }));
      return;
    }

    const NS = "http://www.w3.org/2000/svg";
    const svgEl = (tag, attrs) => {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      return node;
    };

    const W = 640, H = 240;
    const m = { t: 14, r: 16, b: 28, l: 44 };
    const unit = metric === "accuracy" ? "%" : "점";
    const values = timeline.map((d) => d[metric]);
    const maxV = metric === "accuracy" ? 100 : niceMax(Math.max(...values, 10));
    const n = timeline.length;
    const x = (i) => (n === 1 ? (m.l + W - m.r) / 2 : m.l + (i * (W - m.l - m.r)) / (n - 1));
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / maxV);

    const svg = svgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": `최근 ${n}게임 ${metric === "accuracy" ? "정답률" : "점수"} 추이: 최저 ${Math.min(...values)}${unit}, 최고 ${Math.max(...values)}${unit}`
    });

    for (let i = 0; i <= 4; i++) {
      const v = (maxV / 4) * i;
      svg.append(svgEl("line", { class: "grid-line", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
      const label = svgEl("text", { class: "axis-text", x: m.l - 8, y: y(v) + 4, "text-anchor": "end" });
      label.textContent = `${Math.round(v)}${unit}`;
      svg.append(label);
    }

    // x축: 게임 회차 라벨을 최대 6개만 표시
    const labelEvery = Math.max(1, Math.ceil(n / 6));
    timeline.forEach((_, i) => {
      if (i % labelEvery !== 0 && i !== n - 1) return;
      const label = svgEl("text", { class: "axis-text", x: x(i), y: H - 8, "text-anchor": "middle" });
      label.textContent = `${i + 1}회`;
      svg.append(label);
    });

    const crosshair = svgEl("line", { class: "crosshair", y1: m.t, y2: H - m.b, visibility: "hidden" });
    svg.append(crosshair);
    if (n > 1) {
      svg.append(svgEl("path", { class: "line", d: values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ") }));
    }
    const dots = values.map((v, i) => {
      const dot = svgEl("circle", { class: "dot", cx: x(i), cy: y(v), r: 4 });
      svg.append(dot);
      return dot;
    });

    // 점보다 넓은 히트 영역
    const hit = svgEl("rect", { x: m.l - 10, y: 0, width: W - m.l - m.r + 20, height: H, fill: "transparent" });
    svg.append(hit);

    const tip = el("div", { class: "chart-tooltip", hidden: "" });
    container.append(svg, tip);

    function show(i) {
      const d = timeline[i];
      const scale = svg.clientWidth / W;
      crosshair.setAttribute("x1", x(i));
      crosshair.setAttribute("x2", x(i));
      crosshair.setAttribute("visibility", "visible");
      dots.forEach((dot, j) => dot.classList.toggle("active", j === i));
      tip.replaceChildren(
        el("b", { text: `${d[metric]}${unit}` }),
        el("div", { text: `${i + 1}회 · ${modeLabel(d)}` }),
        el("div", { text: formatDate(d.timestamp) })
      );
      tip.style.left = `${x(i) * scale}px`;
      tip.style.top = `${y(values[i]) * scale}px`;
      tip.hidden = false;
    }

    function hide() {
      crosshair.setAttribute("visibility", "hidden");
      dots.forEach((dot) => dot.classList.remove("active"));
      tip.hidden = true;
    }

    hit.addEventListener("pointermove", (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      let nearest = 0;
      for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i;
      show(nearest);
    });
    hit.addEventListener("pointerleave", hide);
  }

  let clearArmTimer = null;
  function handleClear() {
    const btn = $("clear-btn");
    if (!btn.dataset.armed) {
      btn.dataset.armed = "1";
      btn.textContent = "정말 삭제할까요? 한 번 더 누르면 삭제됩니다";
      clearArmTimer = setTimeout(resetClearButton, 4000);
      return;
    }
    clearTimeout(clearArmTimer);
    data.clearHistory();
    resetClearButton();
    ui.dbPlayer = null;
    renderDashboard();
    toast("모든 기록을 삭제했어요");
  }

  function resetClearButton() {
    const btn = $("clear-btn");
    delete btn.dataset.armed;
    btn.textContent = "기록 전체 삭제";
  }

  // ===== 키보드 · 이벤트 =====

  function trapFocus(e) {
    const focusables = [$("resume-btn"), $("quit-btn")];
    const idx = focusables.indexOf(document.activeElement);
    e.preventDefault();
    const next = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx + 1) % focusables.length;
    focusables[next].focus();
  }

  function onKeyDown(e) {
    if (e.target.matches("input, select, textarea")) return;
    if (!state.active || !$("screen-quiz").classList.contains("active")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (state.paused) {
      if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); resumeGame(); }
      else if (e.key === "Tab") trapFocus(e);
      return;
    }

    // e.code를 써서 한글 입력 상태에서도 단축키가 동작하게 함
    const digit = /^(Digit|Numpad)([1-4])$/.exec(e.code);
    if (digit && !state.answered) {
      e.preventDefault();
      handleAnswer(Number(digit[2]) - 1);
    } else if (e.code === "KeyH") {
      useHint();
    } else if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      pauseGame();
    } else if ((e.code === "Enter" || e.code === "NumpadEnter") && state.answered && document.activeElement !== $("next-btn")) {
      e.preventDefault();
      nextQuestion();
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        // 게임 중에 메뉴를 누르면 먼저 일시정지 (그만두기는 일시정지 창에서)
        if (state.active) { pauseGame(); return; }
        showScreen(btn.dataset.nav);
      });
    });

    document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", renderStartInfo));
    $("category-select").addEventListener("change", renderStartInfo);
    $("difficulty-select").addEventListener("change", renderStartInfo);
    $("player-name").addEventListener("input", renderStartInfo);
    $("player-name").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) initGame(); });
    $("start-btn").addEventListener("click", initGame);

    $("hint-btn").addEventListener("click", useHint);
    $("pause-btn").addEventListener("click", pauseGame);
    $("resume-btn").addEventListener("click", resumeGame);
    $("quit-btn").addEventListener("click", quitGame);
    $("next-btn").addEventListener("click", nextQuestion);

    $("retry-btn").addEventListener("click", initGame);
    $("share-btn").addEventListener("click", shareResult);

    $("lb-board").addEventListener("change", (e) => { ui.lbBoard = e.target.value; renderLeaderboard(); });
    document.querySelectorAll("[data-period]").forEach((tab) => {
      tab.addEventListener("click", () => { ui.lbPeriod = tab.dataset.period; renderLeaderboard(); });
    });

    $("db-player").addEventListener("change", (e) => { ui.dbPlayer = e.target.value; renderDashboard(); });
    document.querySelectorAll("[data-metric]").forEach((tab) => {
      tab.addEventListener("click", () => { ui.metric = tab.dataset.metric; renderDashboard(); });
    });
    $("clear-btn").addEventListener("click", handleClear);

    $("theme-toggle").addEventListener("click", () => {
      const next = effectiveTheme() === "dark" ? "light" : "dark";
      settings.theme = next;
      data.saveSettings({ theme: next });
      applyTheme(next);
    });
    $("sound-toggle").addEventListener("click", () => {
      settings.sound = !settings.sound;
      data.saveSettings({ sound: settings.sound });
      applySound();
      playSound("correct");
    });

    document.addEventListener("keydown", onKeyDown);
    // 다른 탭으로 이동하면 자동 일시정지
    document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme(settings.theme));
  }

  function init() {
    // 문제가 추가되어도 맞도록 개수는 데이터에서 계산
    $("question-total").textContent = `${CATEGORIES.join(" · ")}, 총 ${QUESTIONS.length}문제`;
    const catSelect = $("category-select");
    CATEGORIES.forEach((c) => catSelect.append(el("option", { value: c, text: c })));
    $("player-name").value = settings.playerName || "";
    applyTheme(settings.theme);
    applySound();
    bindEvents();
    renderStartInfo();
  }

  init();
})();
