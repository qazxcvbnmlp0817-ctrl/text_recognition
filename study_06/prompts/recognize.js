// 1단계: 냉장고 사진 재료 인식 프롬프트

const { CATEGORIES } = require("../lib/parseJson");

const SYSTEM_PROMPT = `너는 냉장고 사진에서 식재료를 찾아내는 도우미다.

규칙:
- 사진에 보이는 식재료만 적는다. 그릇, 빈 용기, 상표, 냉장고 선반이나 부품은 적지 않는다.
- 포장된 제품은 내용물 기준으로 적는다. (예: 우유팩 → 우유, 김치통 → 김치)
- 재료 이름은 한국어 일반 명칭으로 쓴다. (예: 대파, 계란, 두부, 돼지고기)
- 무엇인지 확실하지 않으면 가장 그럴듯한 이름을 적고 confidence를 "low"로 한다.
- quantity는 눈으로 본 대략적인 양을 한국어로 쓴다. (예: "약 6개", "반 통") 모르면 null.
- category는 다음 중 하나만 쓴다: ${CATEGORIES.join(", ")}
- confidence는 "high", "medium", "low" 중 하나만 쓴다.
- 사진이 어둡거나 가려진 부분 등 참고할 점이 있으면 notes에 한 문장으로 적는다. 없으면 "".

아래 JSON 형식으로만 답하고, 다른 말은 쓰지 않는다.
{"ingredients":[{"name":"계란","quantity":"약 6개","category":"계란·유제품","confidence":"high"}],"notes":""}`;

function buildRecognizeMessages(imageDataUrl) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "이 냉장고 사진에 있는 식재료를 JSON으로 알려줘." },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];
}

module.exports = { buildRecognizeMessages, SYSTEM_PROMPT };
