// OpenRouter chat completions 공통 호출 함수 (1·2단계에서 함께 사용)

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const RETRY_DELAYS_MS = [2000, 5000]; // 429를 받으면 2초, 5초 뒤 최대 2회 재시도
// 이 에러들은 모델 문제일 가능성이 커서 다음 대체 모델로 넘어감
const FALLBACK_CODES = ["RATE_LIMITED", "MODEL_UNAVAILABLE", "UPSTREAM_ERROR", "BAD_MODEL_OUTPUT"];

class AiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// OpenRouter 상태 코드를 화면에 보여줄 에러로 변환 (API 키 등 민감 정보는 담지 않음)
function toAiError(status) {
  switch (status) {
    case 401:
    case 403:
      return new AiError("CONFIG_ERROR", "서버 설정 문제로 AI를 호출할 수 없어요.", 500);
    case 402:
      return new AiError("CONFIG_ERROR", "AI 사용 한도(크레딧)가 부족해요.", 500);
    case 429:
      return new AiError("RATE_LIMITED", "요청이 많아요. 잠시 후 다시 시도해 주세요.", 429);
    case 404:
      return new AiError("MODEL_UNAVAILABLE", "AI 모델을 지금 쓸 수 없어요.", 502);
    case 408:
    case 504:
      return new AiError("TIMEOUT", "응답이 늦어요. 다시 시도해 주세요.", 504);
    default:
      return new AiError("UPSTREAM_ERROR", "AI 서버에서 오류가 났어요. 다시 시도해 주세요.", 502);
  }
}

/**
 * 모델 하나를 호출한다. retry429가 true면 429에 한해 재시도한다.
 * @returns {Promise<string>} 모델이 돌려준 message.content 문자열
 */
async function chatCompletion({ model, messages, temperature = 0.2, maxTokens, timeoutMs = 60000, retry429 = true }) {
  if (process.env.MOCK_AI === "1") {
    return require("./mock").respond(model, messages);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AiError("CONFIG_ERROR", "서버 설정 문제로 AI를 호출할 수 없어요.", 500);

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "Fridge Chef"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          // 추론형 모델이 생각하는 데 토큰을 다 써서 답이 잘리는 것을 막음 (지원하지 않는 모델은 무시)
          reasoning: { enabled: false }
        }),
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === "AbortError") throw new AiError("TIMEOUT", "응답이 늦어요. 다시 시도해 주세요.", 504);
      throw new AiError("NETWORK_ERROR", "AI 서버에 연결하지 못했어요.", 502);
    } finally {
      clearTimeout(timer);
    }

    const body = await res.json().catch(() => ({}));
    // OpenRouter는 HTTP 200이어도 본문에 error를 담아 보낼 때가 있음
    const status = body.error ? Number(body.error.code) || res.status : res.status;
    const choice = body.choices && body.choices[0];
    const content = choice && choice.message && choice.message.content;

    if (res.ok && !body.error) {
      if (typeof content === "string" && content.trim()) return content;
      console.warn(`[openrouter] ${model} 빈 응답 (finish_reason: ${choice && choice.finish_reason})`);
      throw new AiError("BAD_MODEL_OUTPUT", "결과를 읽지 못했어요. 다시 시도해 주세요.", 502);
    }

    if (status === 429 && retry429 && attempt < RETRY_DELAYS_MS.length) {
      console.warn(`[openrouter] ${model} 429, ${RETRY_DELAYS_MS[attempt]}ms 뒤 재시도`);
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    const detail = body.error && body.error.message ? String(body.error.message).slice(0, 200) : "";
    console.error(`[openrouter] ${model} 실패: HTTP ${res.status}, code ${status} ${detail}`);
    throw toAiError(status);
  }
}

/**
 * models 순서대로 시도한다. 앞 모델이 한도·모델 오류면 기다리지 않고 바로 다음 모델로 넘어가고,
 * 마지막 모델에서만 429 재시도를 한다.
 * @returns {Promise<{content: string, model: string}>}
 */
async function chatWithFallback({ models, ...options }) {
  const list = models.filter(Boolean);
  for (let i = 0; i < list.length; i++) {
    const isLast = i === list.length - 1;
    try {
      const content = await chatCompletion({ ...options, model: list[i], retry429: isLast });
      return { content, model: list[i] };
    } catch (err) {
      if (isLast || !FALLBACK_CODES.includes(err.code)) throw err;
      console.warn(`[openrouter] ${list[i]} ${err.code} → 대체 모델 ${list[i + 1]} 사용`);
    }
  }
  throw new AiError("CONFIG_ERROR", "사용할 AI 모델이 설정되지 않았어요.", 500);
}

// "a, b,c" 형식의 환경 변수를 모델 목록으로
function parseModelList(primary, fallbacks) {
  return [primary, ...String(fallbacks || "").split(",")].map((s) => (s || "").trim()).filter(Boolean);
}

module.exports = { chatCompletion, chatWithFallback, parseModelList, AiError, toAiError, RETRY_DELAYS_MS, FALLBACK_CODES };
