// 저장한 레시피 추가·삭제·수정·검색·정렬 (순수 함수)
const Saved = (function () {
  const squash = (s) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

  // 이름과 조리 순서가 완전히 같으면 같은 레시피로 봄
  function recipeKey(recipe) {
    return [squash(recipe.title), ...recipe.steps.map(squash)].join("|");
  }

  function listFor(data, profileId) {
    return data.savedRecipes.filter((r) => r.profileId === profileId);
  }

  function findSaved(data, profileId, recipe) {
    const key = recipeKey(recipe);
    return listFor(data, profileId).find((r) => recipeKey(r.recipe) === key);
  }

  const newId = () => "r_" + (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  /** @returns {{data: object, entry: object, duplicate: boolean}} */
  function saveRecipe(data, { profileId, recipe, sourceIngredients = [] }, now = new Date(), idFn = newId) {
    const existing = findSaved(data, profileId, recipe);
    if (existing) return { data, entry: existing, duplicate: true };
    const { allergyWarnings, ...cleanRecipe } = recipe; // 경고는 추천 당시 프로필 기준이라 저장하지 않음
    const entry = {
      id: idFn(),
      profileId,
      recipe: cleanRecipe,
      sourceIngredients: sourceIngredients.slice(0, 50),
      memo: "",
      rating: null,
      cooked: false,
      savedAt: now.toISOString()
    };
    return { data: { ...data, savedRecipes: [...data.savedRecipes, entry] }, entry, duplicate: false };
  }

  function removeSaved(data, id) {
    const index = data.savedRecipes.findIndex((r) => r.id === id);
    if (index < 0) return { data, removed: null, index: -1 };
    const savedRecipes = data.savedRecipes.slice();
    const [removed] = savedRecipes.splice(index, 1);
    return { data: { ...data, savedRecipes }, removed, index };
  }

  // "되돌리기": 지운 자리에 다시 넣음
  function restoreSaved(data, entry, index) {
    if (data.savedRecipes.some((r) => r.id === entry.id)) return data;
    const savedRecipes = data.savedRecipes.slice();
    savedRecipes.splice(Math.min(Math.max(index, 0), savedRecipes.length), 0, entry);
    return { ...data, savedRecipes };
  }

  function updateSaved(data, id, patch) {
    return {
      ...data,
      savedRecipes: data.savedRecipes.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r };
        if ("memo" in patch) next.memo = String(patch.memo ?? "").slice(0, 300);
        if ("rating" in patch) next.rating = Number.isInteger(patch.rating) && patch.rating >= 1 && patch.rating <= 5 ? patch.rating : null;
        if ("cooked" in patch) next.cooked = Boolean(patch.cooked);
        return next;
      })
    };
  }

  // 이름·사용 재료·부족 재료·메모 검색 (공백 무시)
  function search(list, query) {
    const q = squash(query);
    if (!q) return list;
    return list.filter((r) => {
      const hay = [
        r.recipe.title,
        ...r.recipe.usedIngredients.map((i) => i.name),
        ...(r.recipe.missingIngredients || []).map((i) => i.name),
        r.memo
      ].map(squash).join(" ");
      return hay.includes(q);
    });
  }

  const byRecent = (a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0);
  const nullsLast = (a, b, pick, dir) => {
    const x = pick(a), y = pick(b);
    if (x === y) return 0;
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    return dir * (x - y);
  };

  // mode: "recent" 최근 저장순 | "rating" 별점순 | "time" 조리 시간순
  function sortList(list, mode) {
    const copy = list.slice();
    if (mode === "rating") return copy.sort((a, b) => nullsLast(a, b, (r) => r.rating, -1) || byRecent(a, b));
    if (mode === "time") return copy.sort((a, b) => nullsLast(a, b, (r) => r.recipe.cookingTimeMinutes, 1) || byRecent(a, b));
    return copy.sort(byRecent);
  }

  return { recipeKey, listFor, findSaved, saveRecipe, removeSaved, restoreSaved, updateSaved, search, sortList };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Saved;
