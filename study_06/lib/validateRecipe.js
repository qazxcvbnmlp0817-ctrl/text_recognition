// 2단계: 레시피 JSON 검증·정리, 부족한 재료 재계산

const { cleanText } = require("./parseJson");

const DIFFICULTIES = ["easy", "medium", "hard"];
const MAX_RECIPES = 3;

const squash = (s) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

// 이름 비교: 공백 제거 후 포함 관계. 한 글자 이름(예: "물", "파")은 오탐을 막기 위해 완전히 같을 때만 인정
function makeMatcher(names) {
  const list = names.map(squash).filter(Boolean);
  return (name) => {
    const n = squash(name);
    if (!n) return false;
    return list.some((f) => f === n || (f.length >= 2 && n.length >= 2 && (f.includes(n) || n.includes(f))));
  };
}

function cleanIngredientList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => (typeof x === "string" ? { name: x } : x))
    .filter((x) => x && typeof x === "object")
    .map((x) => ({ name: cleanText(x.name, 30), amount: cleanText(x.amount, 30), optional: x.optional === true }))
    .filter((x) => x.name);
}

function cleanStringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value.map((s) => cleanText(s, maxLength)).filter(Boolean).slice(0, maxItems);
}

function dedupeByName(list) {
  const seen = new Set();
  return list.filter((i) => {
    const key = squash(i.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toPositiveInt(value, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

function normalizeRecipe(raw, { inFridge, inPantry }) {
  if (!raw || typeof raw !== "object") return null;
  const title = cleanText(raw.title, 60);
  // 화면에서 번호를 붙이므로 모델이 붙인 "1.", "2)", "Step 3:" 같은 앞 번호는 지움
  const steps = cleanStringList(raw.steps, 20, 400)
    .map((s) => s.replace(/^(?:step\s*)?\d+\s*[.):]\s*/i, "").trim())
    .filter(Boolean);
  if (!title || !steps.length || !Array.isArray(raw.usedIngredients)) return null;

  // 모델이 냉장고에 없는 재료를 "사용 재료"에 넣는 경우가 있어 서버에서 다시 나눔
  const used = [];
  const missing = [];
  for (const item of cleanIngredientList(raw.usedIngredients)) {
    (inFridge(item.name) || inPantry(item.name) ? used : missing).push(item);
  }
  for (const item of cleanIngredientList(raw.missingIngredients)) {
    if (inPantry(item.name)) continue; // 기본 양념은 부족한 재료가 아님
    (inFridge(item.name) ? used : missing).push(item);
  }
  const usedIngredients = dedupeByName(used);
  const missingIngredients = dedupeByName(missing).filter((m) => !usedIngredients.some((u) => squash(u.name) === squash(m.name)));

  return {
    title,
    summary: cleanText(raw.summary, 120),
    cookingTimeMinutes: toPositiveInt(raw.cookingTimeMinutes, 600),
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : "medium",
    servings: toPositiveInt(raw.servings, 20),
    cuisine: cleanText(raw.cuisine, 20),
    usedIngredients,
    missingIngredients,
    fridgeIngredientCount: usedIngredients.filter((i) => inFridge(i.name)).length,
    seasonings: cleanStringList(raw.seasonings, 20, 60),
    steps,
    tips: cleanText(raw.tips, 300),
    needsMore: missingIngredients.length >= 3
  };
}

/**
 * PRD 2단계 6장. 유효한 레시피가 하나도 없으면 예외 (→ 호출 쪽에서 재시도)
 * @param {object} data 모델이 돌려준 JSON
 * @param {{fridge: string[], pantry: string[]}} ctx
 */
function normalizeRecipes(data, { fridge, pantry }) {
  if (!data || !Array.isArray(data.recipes)) throw new Error("recipes가 배열이 아님");
  const ctx = { inFridge: makeMatcher(fridge), inPantry: makeMatcher(pantry) };

  const seenTitles = new Set();
  const recipes = [];
  for (const raw of data.recipes) {
    const recipe = normalizeRecipe(raw, ctx);
    if (!recipe || seenTitles.has(squash(recipe.title))) continue;
    seenTitles.add(squash(recipe.title));
    recipes.push(recipe);
  }
  if (!recipes.length) throw new Error("유효한 레시피가 없음");

  // 재료가 많이 부족한 레시피는 뒤로 (버리지는 않음)
  const ordered = [...recipes.filter((r) => !r.needsMore), ...recipes.filter((r) => r.needsMore)];
  return ordered.slice(0, MAX_RECIPES);
}

module.exports = { normalizeRecipes, normalizeRecipe, makeMatcher, DIFFICULTIES };
