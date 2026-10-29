const test = require("node:test");
const assert = require("node:assert/strict");
const { extractJson, normalizeIngredients } = require("../lib/parseJson");

test("코드 블록으로 감싼 응답", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
});

test("앞뒤에 설명 문장이 붙은 응답", () => {
  assert.deepEqual(extractJson('네, 결과입니다:\n{"a":{"b":2}}\n도움이 되었길 바라요.'), { a: { b: 2 } });
});

test("추론 태그 안의 중괄호는 무시", () => {
  assert.deepEqual(extractJson('<think>형식은 {x} 같은</think>{"ok":true}'), { ok: true });
});

test("완전히 깨진 응답은 예외", () => {
  assert.throws(() => extractJson("죄송하지만 사진을 볼 수 없어요."));
  assert.throws(() => extractJson('{"a": '));
  assert.throws(() => extractJson(null));
});

test("재료 정리: 잘못된 분류·확신도 보정, 빈 이름 제거, 공백 정리", () => {
  const r = normalizeIngredients({
    ingredients: [
      { name: "  대파 ", quantity: "2대", category: "채소", confidence: "high" },
      { name: "", category: "채소" },
      { name: "수상한 것", category: "외계 식품", confidence: "very" },
      null,
      "문자열"
    ],
    notes: "  어두움 "
  });
  assert.deepEqual(r.ingredients, [
    { name: "대파", quantity: "2대", category: "채소", confidence: "high" },
    { name: "수상한 것", quantity: null, category: "기타", confidence: "medium" }
  ]);
  assert.equal(r.notes, "어두움");
});

test("같은 이름은 하나로 합치고 더 높은 확신도·있는 양을 유지", () => {
  const r = normalizeIngredients({
    ingredients: [
      { name: "계란", quantity: null, category: "계란·유제품", confidence: "low" },
      { name: "계란", quantity: "6개", category: "계란·유제품", confidence: "high" }
    ]
  });
  assert.equal(r.ingredients.length, 1);
  assert.equal(r.ingredients[0].confidence, "high");
  assert.equal(r.ingredients[0].quantity, "6개");
  assert.equal(r.notes, "");
});

test("ingredients가 배열이 아니면 예외", () => {
  assert.throws(() => normalizeIngredients({ ingredients: "계란" }));
  assert.throws(() => normalizeIngredients(null));
});
