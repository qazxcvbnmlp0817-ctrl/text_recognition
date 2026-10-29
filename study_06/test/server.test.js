// MOCK_AI 모드로 서버 API를 실제 HTTP로 호출해 검증
process.env.MOCK_AI = "1";
const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../server");

let server;
let base;
test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const TINY_JPEG = "data:image/jpeg;base64," + Buffer.from("fake-jpeg-bytes").toString("base64");

test("POST /api/recognize: 정상 응답은 검증된 재료 목록", async () => {
  const res = await post("/api/recognize", { image: TINY_JPEG });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.ingredients.length > 0);
  assert.ok(data.ingredients.every((i) => i.name && i.category && i.confidence));
  assert.ok(data.model);
  assert.equal(JSON.stringify(data).includes("sk-or-"), false);
});

test("POST /api/recognize: 이미지가 아니면 400", async () => {
  for (const image of [undefined, "hello", "data:application/pdf;base64,AAAA", "data:image/gif;base64,AAAA"]) {
    const res = await post("/api/recognize", { image });
    assert.equal(res.status, 400, String(image));
    assert.equal((await res.json()).error.code, "INVALID_IMAGE");
  }
});

test("POST /api/recognize: 4MB 초과는 413", async () => {
  const big = "data:image/jpeg;base64," + "A".repeat(4.5 * 1024 * 1024 * 4 / 3);
  const res = await post("/api/recognize", { image: big });
  assert.equal(res.status, 413);
});

test("잘못된 JSON 본문은 400", async () => {
  const res = await fetch(base + "/api/recognize", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(res.status, 400);
});

test("정적 파일 제공", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /냉장고 셰프/);
});

test("POST /api/recipes: 레시피 3개, 부족한 재료 재계산 적용", async () => {
  const res = await post("/api/recipes", {
    ingredients: ["계란", "대파", "양파", "당근", "두부", "돼지고기 앞다리살", "김치"],
    options: { servings: 2, maxTimeMinutes: 30, difficulty: "easy", cuisine: "한식" }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.recipes.length, 3);
  const stew = data.recipes.find((r) => r.title === "김치찌개");
  assert.deepEqual(stew.missingIngredients.map((i) => i.name), ["새우젓"]); // 사용 재료에 섞여 있던 것
  assert.ok(data.pantry.includes("소금"));
});

test("POST /api/recipes: 제외 목록을 보내면 다른 레시피", async () => {
  const res = await post("/api/recipes", { ingredients: ["두부", "계란"], options: {}, excludeTitles: ["돼지고기 두부조림", "대파 계란말이", "김치찌개"] });
  const data = await res.json();
  assert.ok(!data.recipes.some((r) => r.title === "김치찌개"));
});

test("POST /api/recipes: 재료가 없거나 형식이 틀리면 400", async () => {
  for (const body of [{}, { ingredients: [] }, { ingredients: ["", "  "] }, { ingredients: "두부" }]) {
    const res = await post("/api/recipes", body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test("POST /api/recipes: 알레르기 재료는 프롬프트에서 빼고, 걸린 레시피에 경고", async () => {
  const res = await post("/api/recipes", {
    ingredients: ["계란", "두부", "김치", "돼지고기"],
    options: {},
    preferences: { allergies: ["새우", "난류(계란)"], dietType: "none", dislikedIngredients: [], spiceLevel: 2, tools: [], pantry: ["소금"] }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.excludedForAllergy, ["계란"]);
  assert.deepEqual(data.pantry, ["소금"]);
  const stew = data.recipes.find((r) => r.title === "김치찌개");
  assert.ok(stew.allergyWarnings.includes("새우젓(새우)"));
  assert.ok(data.recipes.every((r) => Array.isArray(r.allergyWarnings)));
});

test("POST /api/recipes: 알레르기로 재료가 모두 빠지면 400", async () => {
  const res = await post("/api/recipes", { ingredients: ["새우"], preferences: { allergies: ["새우"] } });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "ALL_EXCLUDED");
});
