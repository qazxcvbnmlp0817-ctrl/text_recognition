// fetch를 가짜로 바꿔 OpenRouter 에러 처리·재시도 검증 (실제 API는 호출하지 않음)
const test = require("node:test");
const assert = require("node:assert/strict");
const openrouter = require("../lib/openrouter");

const realFetch = global.fetch;
test.afterEach(() => { global.fetch = realFetch; delete process.env.MOCK_AI; });

function fakeResponses(list) {
  let calls = 0;
  global.fetch = async () => {
    const r = list[Math.min(calls++, list.length - 1)];
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
  return () => calls;
}

const ok = (content) => ({ status: 200, body: { choices: [{ message: { content } }] } });
const args = { model: "m", messages: [], timeoutMs: 1000 };

test("정상 응답은 content 문자열", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  fakeResponses([ok("안녕")]);
  assert.equal(await openrouter.chatCompletion(args), "안녕");
});

test("429는 재시도 후 성공", async (t) => {
  process.env.OPENROUTER_API_KEY = "test";
  t.mock.method(global, "setTimeout", (fn) => { fn(); return 0; }); // 재시도 대기 생략
  const calls = fakeResponses([{ status: 429, body: { error: { code: 429, message: "rate" } } }, ok("성공")]);
  assert.equal(await openrouter.chatCompletion(args), "성공");
  assert.equal(calls(), 2);
});

test("429가 계속되면 최대 3회 호출 후 RATE_LIMITED", async (t) => {
  process.env.OPENROUTER_API_KEY = "test";
  t.mock.method(global, "setTimeout", (fn) => { fn(); return 0; });
  const calls = fakeResponses([{ status: 429, body: { error: { code: 429, message: "rate" } } }]);
  await assert.rejects(openrouter.chatCompletion(args), { code: "RATE_LIMITED", status: 429 });
  assert.equal(calls(), 3);
});

test("HTTP 200이지만 본문에 error가 있으면 에러로 처리", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  fakeResponses([{ status: 200, body: { error: { code: 404, message: "No endpoints" } } }]);
  await assert.rejects(openrouter.chatCompletion(args), { code: "MODEL_UNAVAILABLE" });
});

test("401은 CONFIG_ERROR이고 메시지에 키가 없음", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-secret";
  fakeResponses([{ status: 401, body: { error: { code: 401, message: "bad key" } } }]);
  await assert.rejects(openrouter.chatCompletion(args), (err) => err.code === "CONFIG_ERROR" && !err.message.includes("sk-or"));
});

test("키가 없으면 호출 없이 CONFIG_ERROR", async () => {
  delete process.env.OPENROUTER_API_KEY;
  const calls = fakeResponses([ok("x")]);
  await assert.rejects(openrouter.chatCompletion(args), { code: "CONFIG_ERROR" });
  assert.equal(calls(), 0);
});

test("빈 content는 BAD_MODEL_OUTPUT", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  fakeResponses([ok("   ")]);
  await assert.rejects(openrouter.chatCompletion(args), { code: "BAD_MODEL_OUTPUT" });
});

test("대체 모델: 1순위가 429면 기다리지 않고 바로 2순위 사용", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  const seen = [];
  global.fetch = async (url, init) => {
    const model = JSON.parse(init.body).model;
    seen.push(model);
    if (model === "a") return { ok: false, status: 429, json: async () => ({ error: { code: 429, message: "rate" } }) };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "from b" } }] }) };
  };
  const r = await openrouter.chatWithFallback({ models: ["a", "b"], messages: [], timeoutMs: 1000 });
  assert.deepEqual(r, { content: "from b", model: "b" });
  assert.deepEqual(seen, ["a", "b"]);
});

test("대체 모델: 키 오류(CONFIG_ERROR)는 다음 모델로 넘어가지 않음", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  const calls = fakeResponses([{ status: 401, body: { error: { code: 401, message: "bad" } } }]);
  await assert.rejects(openrouter.chatWithFallback({ models: ["a", "b"], messages: [], timeoutMs: 1000 }), { code: "CONFIG_ERROR" });
  assert.equal(calls(), 1);
});

test("요청 본문에 추론 끄기 옵션 포함", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  let body;
  global.fetch = async (url, init) => { body = JSON.parse(init.body); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }; };
  await openrouter.chatCompletion(args);
  assert.deepEqual(body.reasoning, { enabled: false });
});

test("모델 목록 환경 변수 파싱", () => {
  assert.deepEqual(openrouter.parseModelList("a", " b, c ,"), ["a", "b", "c"]);
  assert.deepEqual(openrouter.parseModelList("a", ""), ["a"]);
});
