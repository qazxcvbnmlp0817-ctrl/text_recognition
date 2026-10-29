const test = require("node:test");
const assert = require("node:assert/strict");
const Profiles = require("../public/js/profiles");
const Saved = require("../public/js/saved");
const FridgeStore = require("../public/js/store");
const { checkRecipe, allergenIngredients, describeAllergy } = require("../lib/allergyCheck");
const { buildPreferenceRules } = require("../prompts/recipe");

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; }
  };
};
let seq = 0;
const ids = () => `id${++seq}`;
const recipe = (title, over = {}) => ({
  title, steps: ["썬다", "볶는다"], usedIngredients: [{ name: "두부", amount: "" }], missingIngredients: [],
  seasonings: [], cookingTimeMinutes: 20, difficulty: "easy", ...over
});

// ===== 알레르기 검사 =====

test("알레르기: 동의어·가공품 검출 (새우젓→새우, 두부→대두, 마요네즈→계란)", () => {
  const r = recipe("김치찌개", {
    usedIngredients: [{ name: "두부" }, { name: "새우젓" }],
    seasonings: ["마요네즈 1큰술"]
  });
  assert.deepEqual(checkRecipe(r, ["새우", "대두", "난류(계란)"]), ["새우젓(새우)", "두부(대두)", "마요네즈(계란)"]);
});

test("알레르기: 없으면 경고 없음, 조리 순서 속 '노릇하게'의 '게'는 오탐하지 않음", () => {
  const r = recipe("두부부침", { steps: ["두부를 노릇하게 굽는다", "접시에 담게 한다"] });
  assert.deepEqual(checkRecipe(r, []), []);
  assert.deepEqual(checkRecipe(r, ["게"]), []);
  assert.deepEqual(checkRecipe(recipe("게살볶음밥", { usedIngredients: [{ name: "게맛살" }] }), ["게"]), ["게맛살(게)"]);
});

test("알레르기: 직접 입력한 항목은 이름 그대로 검사", () => {
  assert.deepEqual(checkRecipe(recipe("키위 샐러드", { usedIngredients: [{ name: "키위" }] }), ["키위"]), ["키위"]);
});

test("알레르기: 냉장고 재료에서 걸리는 것 찾기, 프롬프트 설명", () => {
  assert.deepEqual(allergenIngredients(["계란", "대파", "새우", "두부"], ["난류(계란)", "새우"]), ["계란", "새우"]);
  assert.match(describeAllergy("새우"), /^새우\(새우젓/);
  assert.equal(describeAllergy("키위"), "키위");
});

test("선호 규칙: 알레르기는 필수, 식단·매운맛·도구 반영, 비어 있으면 규칙 없음", () => {
  const rules = buildPreferenceRules({ allergies: ["새우"], dietType: "vegan", dislikedIngredients: ["오이"], spiceLevel: 0, tools: ["전자레인지"] }, describeAllergy);
  const text = rules.join("\n");
  assert.match(text, /알레르기\(필수\).*새우/);
  assert.match(text, /비건/);
  assert.match(text, /오이/);
  assert.match(text, /전혀 맵지 않게/);
  assert.match(text, /전자레인지만 있다/);
  assert.deepEqual(buildPreferenceRules({ allergies: [], dietType: "none", dislikedIngredients: [], spiceLevel: null, tools: [] }), []);
});

// ===== 프로필 =====

test("프로필: 이름 공백·12자 초과·중복(대소문자 무시) 거부", () => {
  const existing = [{ id: "a", name: "Dokyung" }];
  assert.ok(Profiles.createProfile({ name: "   " }, existing).error);
  assert.ok(Profiles.createProfile({ name: "가".repeat(13) }, existing).error);
  assert.ok(Profiles.createProfile({ name: "dokyung" }, existing).error);
  assert.equal(Profiles.validateName("Dokyung", existing, "a"), null); // 자기 자신은 괜찮음
});

test("프로필: 기본값 채우기, 잘못된 값 보정", () => {
  const { profile } = Profiles.createProfile({ name: " 도경 ", dietType: "외계식", spiceLevel: 9, defaultServings: 0, avatar: "X" }, [], new Date("2026-10-29T00:00:00Z"), ids);
  assert.equal(profile.name, "도경");
  assert.equal(profile.dietType, "none");
  assert.equal(profile.spiceLevel, 2);
  assert.equal(profile.defaultServings, 2);
  assert.equal(profile.avatar, Profiles.AVATARS[0]);
  assert.deepEqual(profile.pantry, Profiles.DEFAULT_PANTRY);
  assert.equal(profile.createdAt, "2026-10-29T00:00:00.000Z");
});

test("프로필: 대두·밀 알레르기면 기본 양념에서 간장 자동 제외", () => {
  const r = Profiles.createProfile({ name: "콩", allergies: ["대두"] }, [], new Date(), ids);
  assert.ok(!r.profile.pantry.includes("간장"));
  assert.deepEqual(r.removedPantry, ["간장"]);
  const r2 = Profiles.applyAllergyPantry(["소금", "간장", "고추장"], ["밀"]);
  assert.deepEqual(r2, { pantry: ["소금"], removed: ["간장", "고추장"] });
});

test("프로필 삭제 시 그 프로필의 저장 레시피도 함께 삭제, 활성 프로필 전환", () => {
  const data = {
    ...FridgeStore.emptyData(),
    profiles: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    activeProfileId: "a",
    savedRecipes: [{ id: "r1", profileId: "a" }, { id: "r2", profileId: "b" }]
  };
  const next = Profiles.deleteProfile(data, "a");
  assert.deepEqual(next.profiles.map((p) => p.id), ["b"]);
  assert.deepEqual(next.savedRecipes.map((r) => r.id), ["r2"]);
  assert.equal(next.activeProfileId, "b");
  assert.equal(Profiles.deleteProfile(next, "b").activeProfileId, null);
});

test("추천 요청에는 이름 등을 빼고 선호 정보만", () => {
  const { profile } = Profiles.createProfile({ name: "도경", allergies: ["새우"] }, [], new Date(), ids);
  const prefs = Profiles.toPreferences(profile);
  assert.deepEqual(Object.keys(prefs).sort(), ["allergies", "dietType", "dislikedIngredients", "pantry", "spiceLevel", "tools"]);
  assert.equal(Profiles.toPreferences(null), null);
});

// ===== 저장 레시피 =====

test("저장: 같은 프로필에서 이름·조리 순서가 같으면 중복 저장 안 함, 경고 필드는 저장 안 함", () => {
  let data = FridgeStore.emptyData();
  const r = { ...recipe("두부조림"), allergyWarnings: ["두부(대두)"] };
  const first = Saved.saveRecipe(data, { profileId: "a", recipe: r }, new Date(), ids);
  data = first.data;
  assert.equal("allergyWarnings" in first.entry.recipe, false);
  const second = Saved.saveRecipe(data, { profileId: "a", recipe: { ...r, title: "두부 조림" } }, new Date(), ids);
  assert.equal(second.duplicate, true);
  const other = Saved.saveRecipe(data, { profileId: "b", recipe: r }, new Date(), ids);
  assert.equal(other.duplicate, false);
  assert.equal(other.data.savedRecipes.length, 2);
});

test("저장: 삭제 후 되돌리기는 원래 자리로", () => {
  let data = FridgeStore.emptyData();
  for (const t of ["A", "B", "C"]) data = Saved.saveRecipe(data, { profileId: "p", recipe: recipe(t) }, new Date(), ids).data;
  const target = data.savedRecipes[1];
  const { data: after, removed, index } = Saved.removeSaved(data, target.id);
  assert.deepEqual(after.savedRecipes.map((r) => r.recipe.title), ["A", "C"]);
  const restored = Saved.restoreSaved(after, removed, index);
  assert.deepEqual(restored.savedRecipes.map((r) => r.recipe.title), ["A", "B", "C"]);
});

test("저장: 메모 300자 제한, 별점 1~5만, 만들어 봤어요", () => {
  let data = Saved.saveRecipe(FridgeStore.emptyData(), { profileId: "p", recipe: recipe("A") }, new Date(), ids).data;
  const id = data.savedRecipes[0].id;
  data = Saved.updateSaved(data, id, { memo: "가".repeat(400), rating: 4, cooked: true });
  assert.equal(data.savedRecipes[0].memo.length, 300);
  assert.equal(data.savedRecipes[0].rating, 4);
  assert.equal(data.savedRecipes[0].cooked, true);
  assert.equal(Saved.updateSaved(data, id, { rating: 7 }).savedRecipes[0].rating, null);
});

test("검색: 공백 무시, 재료·메모 포함 / 정렬 3종", () => {
  const list = [
    { recipe: recipe("돼지고기 두부조림", { cookingTimeMinutes: 30 }), memo: "", rating: 3, savedAt: "2026-10-01" },
    { recipe: recipe("계란말이", { usedIngredients: [{ name: "대파" }], cookingTimeMinutes: 10 }), memo: "간장 줄이기", rating: null, savedAt: "2026-10-03" },
    { recipe: recipe("김치찌개", { cookingTimeMinutes: null }), memo: "", rating: 5, savedAt: "2026-10-02" }
  ];
  assert.deepEqual(Saved.search(list, "두부 조림").map((r) => r.recipe.title), ["돼지고기 두부조림"]);
  assert.deepEqual(Saved.search(list, "대파").map((r) => r.recipe.title), ["계란말이"]);
  assert.deepEqual(Saved.search(list, "간장").map((r) => r.recipe.title), ["계란말이"]);
  assert.equal(Saved.search(list, "  ").length, 3);
  assert.deepEqual(Saved.sortList(list, "recent").map((r) => r.recipe.title), ["계란말이", "김치찌개", "돼지고기 두부조림"]);
  assert.deepEqual(Saved.sortList(list, "rating").map((r) => r.recipe.title), ["김치찌개", "돼지고기 두부조림", "계란말이"]);
  assert.deepEqual(Saved.sortList(list, "time").map((r) => r.recipe.title), ["계란말이", "돼지고기 두부조림", "김치찌개"]);
});

// ===== 저장소 =====

const validData = () => ({
  version: 1, activeProfileId: "a",
  profiles: [{ id: "a", name: "도경", allergies: [], pantry: [] }],
  savedRecipes: [{ id: "r1", profileId: "a", recipe: recipe("A"), savedAt: "2026-10-29" }]
});

test("저장소: 저장 후 다시 읽기 (새로고침)", () => {
  const storage = memoryStorage();
  assert.equal(FridgeStore.save(storage, validData()), true);
  const { data, warning } = FridgeStore.load(storage);
  assert.equal(warning, null);
  assert.equal(data.savedRecipes[0].recipe.title, "A");
  assert.equal(data.savedRecipes[0].memo, "");
});

test("저장소: 손상된 데이터는 원본을 보관하고 빈 상태로 시작", () => {
  const storage = memoryStorage({ [FridgeStore.KEY]: "{깨짐" });
  const { data, warning } = FridgeStore.load(storage, new Date("2026-10-29T01:02:03Z"));
  assert.equal(warning, "corrupt");
  assert.equal(data.profiles.length, 0);
  assert.equal(storage.data[`${FridgeStore.KEY}.corrupt-2026-10-29T01:02:03.000Z`], "{깨짐");
  assert.equal(storage.data[FridgeStore.KEY], "{깨짐"); // 사용자가 알기 전에 덮어쓰지 않음
});

test("저장소: 일부 항목만 오류면 그 항목만 버림, 없는 활성 프로필은 첫 프로필로", () => {
  const raw = validData();
  raw.activeProfileId = "없음";
  raw.profiles.push({ id: "b" }); // 이름 없음
  raw.savedRecipes.push({ id: "r2", profileId: "a", recipe: { title: "순서 없음" } }, { id: "r3", profileId: "없는프로필", recipe: recipe("B") });
  const { data, warning, dropped } = FridgeStore.load(memoryStorage({ [FridgeStore.KEY]: JSON.stringify(raw) }));
  assert.equal(warning, "partial");
  assert.equal(dropped, 3);
  assert.equal(data.activeProfileId, "a");
  assert.deepEqual(data.savedRecipes.map((r) => r.id), ["r1"]);
});

test("저장소: 저장 실패(용량 초과 등)는 false", () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); } };
  assert.equal(FridgeStore.save(storage, validData()), false);
});

test("가져오기: JSON 아님 / 더 새 버전 / 정상", () => {
  assert.throws(() => FridgeStore.parseImport("hello"), { code: "NOT_JSON" });
  assert.throws(() => FridgeStore.parseImport(JSON.stringify({ ...validData(), version: 2 })), { code: "NEWER" });
  assert.equal(FridgeStore.parseImport(FridgeStore.exportJson(validData())).data.profiles.length, 1);
});

test("가져오기 합치기: 같은 id는 건너뛰고 이름 충돌은 (2)", () => {
  const current = { ...validData(), onboardingDismissed: true };
  const incoming = {
    ...FridgeStore.emptyData(),
    profiles: [{ id: "a", name: "도경" }, { id: "c", name: "도경" }, { id: "d", name: "엄마" }],
    savedRecipes: [{ id: "r1", profileId: "a", recipe: recipe("A") }, { id: "r9", profileId: "c", recipe: recipe("Z") }]
  };
  const { data, addedProfiles, addedRecipes } = FridgeStore.mergeData(current, incoming);
  assert.deepEqual(data.profiles.map((p) => p.name), ["도경", "도경 (2)", "엄마"]);
  assert.equal(addedProfiles, 2);
  assert.equal(addedRecipes, 1);
  assert.equal(data.onboardingDismissed, true);
});

test("가져오기 덮어쓰기: 파일 내용으로 교체", () => {
  const incoming = { ...FridgeStore.emptyData(), profiles: [{ id: "z", name: "Z" }], activeProfileId: "z" };
  const data = FridgeStore.overwriteData({ ...validData(), onboardingDismissed: true }, incoming);
  assert.deepEqual(data.profiles.map((p) => p.id), ["z"]);
  assert.equal(data.savedRecipes.length, 0);
  assert.equal(data.onboardingDismissed, true);
});
