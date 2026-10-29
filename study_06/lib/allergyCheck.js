// 3단계: 레시피에 알레르기 재료가 있는지 검사 (AI가 지시를 놓칠 수 있어 서버에서 한 번 더 확인)
// 놓치는 것보다 과하게 경고하는 쪽을 택함. 다만 "게"처럼 흔한 글자는 단어 단위로만 찾음

const ALLERGEN_KEYWORDS = {
  "난류(계란)": ["계란", "달걀", "메추리알", "마요네즈", "노른자", "흰자"],
  "우유": ["우유", "치즈", "버터", "생크림", "휘핑크림", "요거트", "요구르트", "분유", "연유"],
  "메밀": ["메밀"],
  "땅콩": ["땅콩"],
  "대두": ["대두", "콩", "두부", "된장", "간장", "두유", "청국장", "유부", "고추장", "춘장"],
  "밀": ["밀가루", "통밀", "부침가루", "튀김가루", "빵가루", "빵", "국수", "라면", "파스타", "스파게티", "우동", "만두피", "간장", "고추장", "춘장"],
  "고등어": ["고등어"],
  "게": ["꽃게", "대게", "킹크랩", "게살", "게맛살", "크래미"],
  "새우": ["새우", "새우젓", "대하", "칵테일새우"],
  "돼지고기": ["돼지", "삼겹살", "목살", "앞다리살", "뒷다리살", "항정살", "베이컨", "햄", "소시지", "스팸", "족발"],
  "복숭아": ["복숭아"],
  "토마토": ["토마토", "케첩", "케찹"],
  "아황산류": ["아황산", "와인", "건포도", "건과일"],
  "호두": ["호두"],
  "닭고기": ["닭", "치킨"],
  "쇠고기": ["쇠고기", "소고기", "차돌", "양지", "우둔", "사태", "한우"],
  "오징어": ["오징어"],
  "조개류": ["조개", "바지락", "모시조개", "홍합", "굴소스", "생굴", "굴전", "전복", "가리비", "꼬막", "재첩"],
  "잣": ["잣"]
};

// 목록에 없는 알레르기(직접 입력)는 그 이름 자체를 키워드로
function keywordsFor(allergy) {
  return ALLERGEN_KEYWORDS[allergy] || [allergy];
}

// 알레르기 이름을 사람이 읽는 짧은 이름으로: "난류(계란)" → "계란"
function shortName(allergy) {
  const m = allergy.match(/\(([^)]+)\)/);
  return m ? m[1] : allergy;
}

function recipeTexts(recipe) {
  return [
    ...recipe.usedIngredients.map((i) => i.name),
    ...recipe.missingIngredients.map((i) => i.name),
    ...(recipe.seasonings || []),
    ...recipe.steps
  ];
}

/** @returns {string[]} 예: ["새우젓(새우)", "두부(대두)"] */
function checkRecipe(recipe, allergies) {
  const warnings = [];
  const texts = recipeTexts(recipe);
  for (const allergy of allergies) {
    // 긴 키워드부터 찾아서 "새우"보다 구체적인 "새우젓"으로 알려 줌
    const keywords = keywordsFor(allergy).slice().sort((a, b) => b.length - a.length);
    const keyword = keywords.find((k) => texts.some((t) => t.includes(k)));
    if (keyword) {
      const label = shortName(allergy);
      warnings.push(keyword === label ? label : `${keyword}(${label})`);
    }
  }
  return warnings;
}

// 냉장고 재료 중 알레르기에 걸리는 것 (프롬프트에서 미리 뺌)
function allergenIngredients(ingredients, allergies) {
  return ingredients.filter((name) => allergies.some((a) => keywordsFor(a).some((k) => name.includes(k))));
}

// 프롬프트용: "새우(새우젓, 대하 등 포함)"
function describeAllergy(allergy) {
  const label = shortName(allergy);
  const others = keywordsFor(allergy).filter((k) => k !== label).slice(0, 4);
  return others.length ? `${label}(${others.join(", ")} 등 포함)` : label;
}

module.exports = { checkRecipe, allergenIngredients, describeAllergy, keywordsFor, ALLERGEN_KEYWORDS };
