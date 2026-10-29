// 모델 응답 문자열에서 JSON 꺼내기, 재료 목록 검증·정리

const CATEGORIES = ["채소", "과일", "육류", "해산물", "계란·유제품", "가공식품", "소스·양념", "음료", "기타"];
const CONFIDENCES = ["high", "medium", "low"];
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
const MAX_NAME_LENGTH = 30;

// 코드 블록, 추론 태그, 앞뒤 설명 문장을 걷어 내고 JSON 객체만 파싱
function extractJson(text) {
  if (typeof text !== "string") throw new Error("응답이 문자열이 아님");
  let s = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1];
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON 객체를 찾지 못함");
  return JSON.parse(s.slice(start, end + 1));
}

function cleanText(value, maxLength) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

// PRD 1단계 5.3: 이름 없는 항목 제거, 잘못된 분류·확신도 보정, 같은 이름 병합
function normalizeIngredients(data) {
  if (!data || !Array.isArray(data.ingredients)) throw new Error("ingredients가 배열이 아님");

  const byName = new Map();
  for (const raw of data.ingredients) {
    if (!raw || typeof raw !== "object") continue;
    const name = cleanText(raw.name, MAX_NAME_LENGTH);
    if (!name) continue;
    const item = {
      name,
      quantity: cleanText(raw.quantity, MAX_NAME_LENGTH) || null,
      category: CATEGORIES.includes(raw.category) ? raw.category : "기타",
      confidence: CONFIDENCES.includes(raw.confidence) ? raw.confidence : "medium"
    };
    const prev = byName.get(name);
    if (!prev) {
      byName.set(name, item);
    } else {
      if (CONFIDENCE_RANK[item.confidence] > CONFIDENCE_RANK[prev.confidence]) prev.confidence = item.confidence;
      if (!prev.quantity && item.quantity) prev.quantity = item.quantity;
    }
  }

  return {
    ingredients: [...byName.values()],
    notes: cleanText(data.notes, 300)
  };
}

module.exports = { extractJson, normalizeIngredients, cleanText, CATEGORIES, CONFIDENCES };
