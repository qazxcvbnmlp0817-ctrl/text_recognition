// 프로필 추가·수정·삭제 (순수 함수: DOM·localStorage를 모름)
const Profiles = (function () {
  // 식품 알레르기 표시 대상 (구현 시점 기준 19종, 식약처 최신 목록과 대조 필요)
  const ALLERGENS = [
    "난류(계란)", "우유", "메밀", "땅콩", "대두", "밀", "고등어", "게", "새우", "돼지고기",
    "복숭아", "토마토", "아황산류", "호두", "닭고기", "쇠고기", "오징어", "조개류", "잣"
  ];
  const DIET_TYPES = {
    none: "제한 없음",
    vegetarian: "채식 (계란·유제품 허용)",
    vegan: "비건",
    pescatarian: "페스코 (해산물 허용)"
  };
  const TOOLS = ["가스레인지/인덕션", "프라이팬", "냄비", "전자레인지", "오븐", "에어프라이어", "밥솥", "믹서기"];
  const AVATARS = ["🍳", "🥗", "🍜", "🧁", "🍙", "🥘", "🍕", "🐻"];
  const SPICE_LABELS = ["안 매움", "약간 매움", "보통", "아주 매움"];
  const DEFAULT_PANTRY = ["소금", "후추", "설탕", "식용유", "간장", "식초", "다진 마늘", "참기름", "고춧가루", "물"];
  // 알레르기가 있으면 기본 양념에서 자동으로 빼는 항목
  const PANTRY_ALLERGY = {
    "대두": ["간장", "된장", "고추장"],
    "밀": ["간장", "고추장"],
    "난류(계란)": ["마요네즈"],
    "우유": ["버터"]
  };
  const MAX_NAME = 12;

  const clean = (s, max = 30) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  function cleanList(list, maxItems = 30) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
      const s = clean(item);
      if (s && !out.includes(s)) out.push(s);
      if (out.length >= maxItems) break;
    }
    return out;
  }

  // 오류 문구 또는 null
  function validateName(name, profiles, selfId = null) {
    const n = clean(name, 100);
    if (!n) return "이름을 입력해 주세요.";
    if (n.length > MAX_NAME) return `이름은 ${MAX_NAME}자까지 쓸 수 있어요.`;
    if (profiles.some((p) => p.id !== selfId && p.name.toLowerCase() === n.toLowerCase())) return "같은 이름의 프로필이 있어요.";
    return null;
  }

  function applyAllergyPantry(pantry, allergies) {
    const blocked = new Set(allergies.flatMap((a) => PANTRY_ALLERGY[a] || []));
    return {
      pantry: pantry.filter((p) => !blocked.has(p)),
      removed: pantry.filter((p) => blocked.has(p))
    };
  }

  // 폼 입력값을 저장 가능한 필드로 정리 (이름 제외)
  function cleanFields(input) {
    const allergies = cleanList(input.allergies);
    const pantryInput = Array.isArray(input.pantry) ? cleanList(input.pantry) : DEFAULT_PANTRY.slice();
    const { pantry, removed } = applyAllergyPantry(pantryInput, allergies);
    const spice = Number(input.spiceLevel);
    const servings = Number(input.defaultServings);
    return {
      fields: {
        avatar: AVATARS.includes(input.avatar) ? input.avatar : AVATARS[0],
        allergies,
        dietType: Object.hasOwn(DIET_TYPES, input.dietType) ? input.dietType : "none",
        dislikedIngredients: cleanList(input.dislikedIngredients),
        spiceLevel: Number.isInteger(spice) && spice >= 0 && spice <= 3 ? spice : 2,
        tools: cleanList(input.tools),
        pantry,
        defaultServings: Number.isInteger(servings) && servings >= 1 && servings <= 4 ? servings : 2
      },
      removedPantry: removed
    };
  }

  const newId = () => "p_" + (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  /** @returns {{profile?: object, removedPantry?: string[], error?: string}} */
  function createProfile(input, profiles, now = new Date(), idFn = newId) {
    const error = validateName(input.name, profiles);
    if (error) return { error };
    const { fields, removedPantry } = cleanFields(input);
    const iso = now.toISOString();
    return { profile: { id: idFn(), name: clean(input.name, MAX_NAME), ...fields, createdAt: iso, updatedAt: iso }, removedPantry };
  }

  function updateProfile(profile, input, profiles, now = new Date()) {
    const error = validateName(input.name, profiles, profile.id);
    if (error) return { error };
    const { fields, removedPantry } = cleanFields(input);
    return { profile: { ...profile, name: clean(input.name, MAX_NAME), ...fields, updatedAt: now.toISOString() }, removedPantry };
  }

  function upsertProfile(data, profile) {
    const exists = data.profiles.some((p) => p.id === profile.id);
    return {
      ...data,
      profiles: exists ? data.profiles.map((p) => (p.id === profile.id ? profile : p)) : [...data.profiles, profile],
      activeProfileId: profile.id
    };
  }

  // 프로필을 지우면 그 프로필의 저장 레시피도 함께 지움
  function deleteProfile(data, id) {
    const profiles = data.profiles.filter((p) => p.id !== id);
    return {
      ...data,
      profiles,
      savedRecipes: data.savedRecipes.filter((r) => r.profileId !== id),
      activeProfileId: data.activeProfileId === id ? (profiles[0] ? profiles[0].id : null) : data.activeProfileId
    };
  }

  function activeProfile(data) {
    return data.profiles.find((p) => p.id === data.activeProfileId) || null;
  }

  // 레시피 추천 요청에 보낼 정보만 (이름 등은 서버로 보내지 않음)
  function toPreferences(profile) {
    if (!profile) return null;
    const { allergies, dietType, dislikedIngredients, spiceLevel, tools, pantry } = profile;
    return { allergies, dietType, dislikedIngredients, spiceLevel, tools, pantry };
  }

  return {
    ALLERGENS, DIET_TYPES, TOOLS, AVATARS, SPICE_LABELS, DEFAULT_PANTRY, MAX_NAME,
    validateName, applyAllergyPantry, createProfile, updateProfile, upsertProfile, deleteProfile, activeProfile, toPreferences, cleanList
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Profiles;
