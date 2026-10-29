// 냉장고 셰프 서버: 정적 파일 제공 + OpenRouter 프록시 (API 키는 서버에만 보관)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
if (process.argv.includes("--mock")) process.env.MOCK_AI = "1";

const express = require("express");
const { chatWithFallback, parseModelList, AiError } = require("./lib/openrouter");
const { extractJson, normalizeIngredients } = require("./lib/parseJson");
const { buildRecognizeMessages } = require("./prompts/recognize");
const { buildRecipeMessages, buildPreferenceRules, sanitizeList, DEFAULT_PANTRY } = require("./prompts/recipe");
const { checkRecipe, allergenIngredients, describeAllergy } = require("./lib/allergyCheck");
const { normalizeRecipes } = require("./lib/validateRecipe");

// 1순위 모델이 한도(429)에 걸리면 대체 모델로 넘어감
const VISION_MODELS = parseModelList(
  process.env.VISION_MODEL || "google/gemma-4-31b-it:free",
  process.env.VISION_FALLBACK_MODELS ?? "nvidia/nemotron-3.5-super-vl:free"
);
const RECIPE_MODELS = parseModelList(
  process.env.RECIPE_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
  process.env.RECIPE_FALLBACK_MODELS ?? "google/gemma-4-31b-it:free"
);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

function badRequest(code, message, status = 400) {
  return new AiError(code, message, status);
}

// 모델 호출 → JSON 파싱·검증. 파싱 실패(또는 빈 응답) 시 같은 요청 1회 재시도
// normalize가 예외를 던지면 형식 오류로 보고 재시도
async function callForJson({ models, messages, temperature, maxTokens, timeoutMs, normalize }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let reply;
    try {
      reply = await chatWithFallback({ models, messages, temperature, maxTokens, timeoutMs });
    } catch (err) {
      if (err.code === "BAD_MODEL_OUTPUT" && attempt === 0) continue;
      throw err;
    }
    try {
      return { result: normalize(extractJson(reply.content)), model: reply.model };
    } catch (err) {
      console.warn(`[parse] ${reply.model} 응답 해석 실패 (${attempt + 1}회): ${err.message}\n${reply.content.slice(0, 500)}`);
    }
  }
  throw new AiError("BAD_MODEL_OUTPUT", "결과를 읽지 못했어요. 다시 시도해 주세요.", 502);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mock: process.env.MOCK_AI === "1", models: { vision: VISION_MODELS, recipe: RECIPE_MODELS } });
});

app.post("/api/recognize", async (req, res) => {
  const image = req.body && req.body.image;
  if (typeof image !== "string" || !IMAGE_PATTERN.test(image)) {
    throw badRequest("INVALID_IMAGE", "이미지 파일(JPG, PNG, WEBP)만 올릴 수 있어요.");
  }
  const base64Length = image.length - image.indexOf(",") - 1;
  if (base64Length * 0.75 > MAX_IMAGE_BYTES) {
    throw badRequest("IMAGE_TOO_LARGE", "사진이 너무 커요. 더 작은 사진으로 올려 주세요.", 413);
  }

  const { result, model } = await callForJson({
    models: VISION_MODELS,
    messages: buildRecognizeMessages(image),
    temperature: 0.2,
    maxTokens: 2000,
    timeoutMs: 60000,
    normalize: normalizeIngredients
  });
  res.json({ ...result, model });
});

const OPTION_VALUES = {
  maxTimeMinutes: [15, 30, 60, null],
  difficulty: ["easy", "medium", null],
  cuisine: ["한식", "양식", "중식", "일식", null]
};

// 2단계 요청 검증 → 프롬프트에 넣을 안전한 값만 남김
function parseRecipeRequest(body) {
  if (!body || !Array.isArray(body.ingredients)) {
    throw badRequest("INVALID_INGREDIENTS", "재료를 1개 이상 골라 주세요.");
  }
  const ingredients = sanitizeList(body.ingredients, 50);
  if (!ingredients.length) throw badRequest("INVALID_INGREDIENTS", "재료를 1개 이상 골라 주세요.");

  const raw = body.options || {};
  const pick = (key) => (OPTION_VALUES[key].includes(raw[key] ?? null) ? raw[key] ?? null : null);
  const servings = Number.isInteger(raw.servings) && raw.servings >= 1 && raw.servings <= 4 ? raw.servings : 2;
  const options = { servings, maxTimeMinutes: pick("maxTimeMinutes"), difficulty: pick("difficulty"), cuisine: pick("cuisine") };

  const excludeTitles = sanitizeList(body.excludeTitles, 15, 60);
  return { ingredients, options, excludeTitles, preferences: parsePreferences(body.preferences) };
}

const DIET_TYPES = ["none", "vegetarian", "vegan", "pescatarian"];

// 3단계: 프로필 선호 정보 (없으면 null → 2단계와 똑같이 동작)
function parsePreferences(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    allergies: sanitizeList(raw.allergies, 30),
    dietType: DIET_TYPES.includes(raw.dietType) ? raw.dietType : "none",
    dislikedIngredients: sanitizeList(raw.dislikedIngredients, 30),
    spiceLevel: Number.isInteger(raw.spiceLevel) && raw.spiceLevel >= 0 && raw.spiceLevel <= 3 ? raw.spiceLevel : null,
    tools: sanitizeList(raw.tools, 30),
    pantry: Array.isArray(raw.pantry) ? sanitizeList(raw.pantry, 30) : null
  };
}

const flaggedCount = (recipes) => recipes.filter((r) => r.allergyWarnings.length).length;

app.post("/api/recipes", async (req, res) => {
  const { ingredients: allIngredients, options, excludeTitles, preferences } = parseRecipeRequest(req.body);
  const allergies = preferences ? preferences.allergies : [];
  const pantry = preferences && preferences.pantry ? preferences.pantry : DEFAULT_PANTRY;

  // 알레르기에 걸리는 냉장고 재료는 프롬프트에서 미리 뺌
  const excludedForAllergy = allergenIngredients(allIngredients, allergies);
  const ingredients = allIngredients.filter((i) => !excludedForAllergy.includes(i));
  if (!ingredients.length) {
    throw badRequest("ALL_EXCLUDED", "알레르기 재료를 빼고 나니 남은 재료가 없어요.");
  }
  const rules = preferences ? buildPreferenceRules(preferences, describeAllergy) : [];

  const generate = (extraRules) => callForJson({
    models: RECIPE_MODELS,
    messages: buildRecipeMessages({ ingredients, options, excludeTitles, pantry, extraRules }),
    temperature: 0.7,
    maxTokens: 4000,
    timeoutMs: 90000,
    normalize: (data) => normalizeRecipes(data, { fridge: ingredients, pantry }).map((r) => ({
      ...r,
      allergyWarnings: checkRecipe(r, allergies)
    }))
  });

  let { result, model } = await generate(rules);
  // 3개 중 2개 이상이 알레르기 검사에 걸리면 한 번 더 강하게 요청하고, 덜 걸린 쪽을 씀
  if (allergies.length && flaggedCount(result) >= 2) {
    try {
      const retry = await generate([...rules, "앞선 답에 알레르기 재료가 들어갔다. 알레르기 재료와 그 가공품이 하나도 없는 요리만 다시 골라라."]);
      if (flaggedCount(retry.result) < flaggedCount(result)) ({ result, model } = retry);
    } catch (err) {
      console.warn(`[recipes] 알레르기 재추천 실패: ${err.code || err.message}`);
    }
  }
  res.json({ recipes: result, model, pantry, excludedForAllergy });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "없는 API예요." } });
});

// 에러 응답 형식: { error: { code, message } }
app.use((err, req, res, next) => {
  if (err instanceof AiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "IMAGE_TOO_LARGE", message: "사진이 너무 커요. 더 작은 사진으로 올려 주세요." } });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "요청 형식이 올바르지 않아요." } });
  }
  console.error("[server]", err);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "서버에서 오류가 났어요." } });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, (err) => {
    // Express 5는 포트 충돌 같은 시작 오류를 콜백 인자로 넘김
    if (err) {
      console.error(err.code === "EADDRINUSE"
        ? `포트 ${port}를 이미 쓰고 있어요. 다른 서버를 끄거나 .env의 PORT를 바꿔 주세요.`
        : `서버를 시작하지 못했어요: ${err.message}`);
      process.exit(1);
    }
    const mode = process.env.MOCK_AI === "1" ? " (MOCK_AI: 예시 응답 모드)" : "";
    console.log(`냉장고 셰프 실행 중: http://localhost:${port}${mode}`);
    if (!process.env.OPENROUTER_API_KEY && process.env.MOCK_AI !== "1") {
      console.warn("경고: OPENROUTER_API_KEY가 없어요. .env 파일을 확인하세요.");
    }
  });
}

module.exports = { app, callForJson };
