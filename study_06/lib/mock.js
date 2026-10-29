// MOCK_AI=1일 때 OpenRouter 대신 돌려주는 고정 응답 (API 키·요청 한도 없이 화면 흐름 확인용)

const RECOGNIZE_RESPONSE = `\`\`\`json
{
  "ingredients": [
    {"name": "계란", "quantity": "약 6개", "category": "계란·유제품", "confidence": "high"},
    {"name": "우유", "quantity": "1팩", "category": "계란·유제품", "confidence": "high"},
    {"name": "대파", "quantity": "2대", "category": "채소", "confidence": "high"},
    {"name": "양파", "quantity": "1개", "category": "채소", "confidence": "medium"},
    {"name": "당근", "quantity": null, "category": "채소", "confidence": "low"},
    {"name": "두부", "quantity": "1모", "category": "가공식품", "confidence": "high"},
    {"name": "돼지고기 앞다리살", "quantity": "약 300g", "category": "육류", "confidence": "medium"},
    {"name": "김치", "quantity": "반 통", "category": "가공식품", "confidence": "high"}
  ],
  "notes": "아래 칸은 어두워서 잘 보이지 않음 (예시 응답)"
}
\`\`\``;

// 제외할 레시피 요청이 오면 다른 이름을 돌려주도록 두 벌 준비
const RECIPE_SETS = [
  [
    { title: "돼지고기 두부조림", summary: "짭조름한 양념에 졸인 밥도둑 반찬", cookingTimeMinutes: 25, difficulty: "easy", servings: 2, cuisine: "한식",
      usedIngredients: [{ name: "두부", amount: "1모" }, { name: "돼지고기 앞다리살", amount: "200g" }, { name: "대파", amount: "1대" }],
      missingIngredients: [{ name: "청양고추", amount: "1개", optional: true }],
      seasonings: ["간장 3큰술", "설탕 1큰술", "다진 마늘 1큰술", "고춧가루 1큰술"],
      steps: ["두부는 1cm 두께로 썰어 키친타월로 물기를 뺀다.", "팬에 식용유를 두르고 중불에서 두부를 앞뒤로 3분씩 굽는다.", "돼지고기를 넣고 겉면이 익을 때까지 볶는다.", "양념과 물 100ml를 넣고 약불에서 10분간 졸인 뒤 대파를 올린다."],
      tips: "두부를 먼저 구우면 졸일 때 잘 부서지지 않아요." },
    { title: "대파 계란말이", summary: "폭신하고 달큰한 기본 반찬", cookingTimeMinutes: 15, difficulty: "easy", servings: 2, cuisine: "한식",
      usedIngredients: [{ name: "계란", amount: "4개" }, { name: "대파", amount: "1/2대" }, { name: "당근", amount: "약간" }],
      missingIngredients: [],
      seasonings: ["소금 약간", "식용유 1큰술"],
      steps: ["계란을 풀고 잘게 썬 대파와 당근, 소금을 넣는다.", "약불로 달군 팬에 계란물 1/3을 붓고 반쯤 익으면 돌돌 만다.", "남은 계란물을 나눠 부으며 같은 방법으로 말아 완성한다."],
      tips: "불을 약하게 유지해야 겉이 타지 않아요." },
    { title: "김치찌개", summary: "냉장고 단골 재료로 끓이는 얼큰한 찌개", cookingTimeMinutes: 30, difficulty: "easy", servings: 2, cuisine: "한식",
      usedIngredients: [{ name: "김치", amount: "2컵" }, { name: "돼지고기", amount: "100g" }, { name: "두부", amount: "1/2모" }, { name: "양파", amount: "1/2개" }, { name: "새우젓", amount: "1작은술" }],
      missingIngredients: [],
      seasonings: ["고춧가루 1큰술", "다진 마늘 1큰술"],
      steps: ["냄비에 돼지고기와 김치를 넣고 중불에서 5분간 볶는다.", "물 500ml를 붓고 끓어오르면 양파와 고춧가루를 넣는다.", "두부를 넣고 10분 더 끓인다."],
      tips: "신 김치일수록 맛이 깊어져요." }
  ],
  [
    { title: "두부 스크램블", summary: "계란 대신 두부로 만드는 담백한 아침", cookingTimeMinutes: 10, difficulty: "easy", servings: 1, cuisine: "양식",
      usedIngredients: [{ name: "두부", amount: "1/2모" }, { name: "양파", amount: "1/4개" }],
      missingIngredients: [],
      seasonings: ["소금 약간", "후추 약간"],
      steps: ["두부를 손으로 으깬다.", "팬에 양파를 볶다가 두부를 넣고 수분이 날아갈 때까지 볶는다.", "소금과 후추로 간한다."],
      tips: "강황 가루를 조금 넣으면 색이 예뻐요." },
    { title: "제육볶음", summary: "매콤달콤한 돼지고기 볶음", cookingTimeMinutes: 25, difficulty: "medium", servings: 2, cuisine: "한식",
      usedIngredients: [{ name: "돼지고기 앞다리살", amount: "300g" }, { name: "양파", amount: "1/2개" }, { name: "대파", amount: "1대" }],
      missingIngredients: [{ name: "고추장", amount: "2큰술" }],
      seasonings: ["간장 1큰술", "설탕 1큰술", "고춧가루 1큰술", "다진 마늘 1큰술"],
      steps: ["고기에 양념을 넣고 10분간 재운다.", "센불에서 고기를 볶다가 양파와 대파를 넣고 5분 더 볶는다."],
      tips: "마지막에 참기름을 두르면 고소해요." },
    { title: "우유 계란찜", summary: "부드러운 일본식 계란찜", cookingTimeMinutes: 20, difficulty: "easy", servings: 2, cuisine: "일식",
      usedIngredients: [{ name: "계란", amount: "3개" }, { name: "우유", amount: "150ml" }],
      missingIngredients: [],
      seasonings: ["소금 약간"],
      steps: ["계란과 우유, 소금을 섞어 체에 거른다.", "그릇에 담아 랩을 씌우고 김이 오른 찜기에서 약불로 12분 찐다."],
      tips: "체에 거르면 표면이 매끈해져요." }
  ]
];

function respond(model, messages) {
  const system = String((messages[0] && messages[0].content) || "");
  if (!system.includes("요리사")) return Promise.resolve(RECOGNIZE_RESPONSE);
  const user = String((messages[1] && messages[1].content) || "");
  const set = user.includes("제외할 레시피") ? RECIPE_SETS[1] : RECIPE_SETS[0];
  return Promise.resolve("```json\n" + JSON.stringify({ recipes: set }) + "\n```");
}

module.exports = { respond, RECOGNIZE_RESPONSE, RECIPE_SETS };
