// localStorage 읽기/쓰기, 손상 데이터 방어, 내보내기/가져오기
const FridgeStore = (function () {
  const KEY = "fridgeChef.v1";
  const VERSION = 1;

  class ImportError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }

  function emptyData() {
    return { version: VERSION, activeProfileId: null, profiles: [], savedRecipes: [], onboardingDismissed: false };
  }

  const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

  function isValidProfile(p) {
    return p && typeof p === "object" && typeof p.id === "string" && typeof p.name === "string" && p.name.trim() !== "";
  }

  function fixProfile(p) {
    const arr = (v) => (isStringArray(v) ? v : []);
    return {
      ...p,
      allergies: arr(p.allergies),
      dislikedIngredients: arr(p.dislikedIngredients),
      tools: arr(p.tools),
      pantry: arr(p.pantry),
      dietType: typeof p.dietType === "string" ? p.dietType : "none",
      spiceLevel: Number.isInteger(p.spiceLevel) ? p.spiceLevel : 2,
      defaultServings: Number.isInteger(p.defaultServings) ? p.defaultServings : 2
    };
  }

  function isValidSaved(r) {
    const rec = r && r.recipe;
    return r && typeof r.id === "string" && typeof r.profileId === "string" && rec && typeof rec.title === "string" &&
      isStringArray(rec.steps) && Array.isArray(rec.usedIngredients);
  }

  // 형식이 틀린 항목만 버리고 나머지는 살림. 버린 개수를 함께 돌려줌
  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ImportError("INVALID", "데이터 형식이 올바르지 않아요.");
    if (typeof raw.version !== "number") throw new ImportError("INVALID", "데이터 형식이 올바르지 않아요.");
    if (raw.version > VERSION) throw new ImportError("NEWER", "더 새 버전 앱에서 만든 데이터예요.");

    const rawProfiles = Array.isArray(raw.profiles) ? raw.profiles : [];
    const profiles = [];
    for (const p of rawProfiles) {
      if (isValidProfile(p) && !profiles.some((x) => x.id === p.id)) profiles.push(fixProfile(p));
    }
    const ids = new Set(profiles.map((p) => p.id));
    const rawSaved = Array.isArray(raw.savedRecipes) ? raw.savedRecipes : [];
    const savedRecipes = rawSaved
      .filter((r) => isValidSaved(r) && ids.has(r.profileId))
      .map((r) => ({ memo: "", rating: null, cooked: false, sourceIngredients: [], ...r }));

    const dropped = rawProfiles.length - profiles.length + rawSaved.length - savedRecipes.length;
    const activeProfileId = ids.has(raw.activeProfileId) ? raw.activeProfileId : profiles[0] ? profiles[0].id : null;
    return {
      data: { version: VERSION, activeProfileId, profiles, savedRecipes, onboardingDismissed: raw.onboardingDismissed === true },
      dropped
    };
  }

  /**
   * @returns {{data: object, warning: null | "corrupt" | "newer" | "partial", dropped: number}}
   * 손상된 원본은 지우지 않고 별도 키로 옮겨 보관
   */
  function load(storage, now = new Date()) {
    let raw;
    try {
      raw = storage.getItem(KEY);
    } catch (e) {
      return { data: emptyData(), warning: "unavailable", dropped: 0 };
    }
    if (raw === null) return { data: emptyData(), warning: null, dropped: 0 };
    try {
      const { data, dropped } = sanitize(JSON.parse(raw));
      return { data, warning: dropped ? "partial" : null, dropped };
    } catch (err) {
      try {
        storage.setItem(`${KEY}.corrupt-${now.toISOString()}`, raw);
      } catch (e) { /* 보관도 실패하면 무시 */ }
      return { data: emptyData(), warning: err.code === "NEWER" ? "newer" : "corrupt", dropped: 0 };
    }
  }

  function save(storage, data) {
    try {
      storage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function exportJson(data) {
    const { onboardingDismissed, ...rest } = data;
    return JSON.stringify(rest, null, 2);
  }

  /** @returns {{data: object, dropped: number}} */
  function parseImport(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new ImportError("NOT_JSON", "이 파일은 읽을 수 없어요.");
    }
    return sanitize(raw);
  }

  function uniqueName(name, taken) {
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; ; n++) {
      const candidate = `${name} (${n})`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  // 합치기: id가 같은 항목은 건너뛰고, 프로필 이름이 겹치면 "이름 (2)"로 바꿔 추가
  function mergeData(current, incoming) {
    const profileIds = new Set(current.profiles.map((p) => p.id));
    const taken = new Set(current.profiles.map((p) => p.name.toLowerCase()));
    const addedProfiles = [];
    for (const p of incoming.profiles) {
      if (profileIds.has(p.id)) continue;
      const name = uniqueName(p.name, taken);
      taken.add(name.toLowerCase());
      addedProfiles.push({ ...p, name });
    }
    const savedIds = new Set(current.savedRecipes.map((r) => r.id));
    const addedRecipes = incoming.savedRecipes.filter((r) => !savedIds.has(r.id));
    const profiles = [...current.profiles, ...addedProfiles];
    return {
      data: {
        ...current,
        profiles,
        savedRecipes: [...current.savedRecipes, ...addedRecipes],
        activeProfileId: current.activeProfileId || (profiles[0] ? profiles[0].id : null)
      },
      addedProfiles: addedProfiles.length,
      addedRecipes: addedRecipes.length
    };
  }

  function overwriteData(current, incoming) {
    return { ...incoming, onboardingDismissed: current.onboardingDismissed };
  }

  return { KEY, VERSION, ImportError, emptyData, sanitize, load, save, exportJson, parseImport, mergeData, overwriteData };
})();

if (typeof module !== "undefined" && module.exports) module.exports = FridgeStore;
