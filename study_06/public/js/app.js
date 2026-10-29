// 냉장고 셰프 화면 제어 (1단계 인식 · 2단계 추천 · 3단계 프로필/저장)
(function () {
  "use strict";

  const CATEGORIES = ["채소", "과일", "육류", "해산물", "계란·유제품", "가공식품", "소스·양념", "음료", "기타"];
  const MAX_EXCLUDE = 15;
  const $ = (id) => document.getElementById(id);
  const el = RecipeView.el;

  const state = {
    imageDataUrl: null,
    ingredients: [], // { id, name, quantity, category, confidence, enabled }
    notes: "",
    recognizing: false,
    editingId: null,
    recipes: [],
    shownTitles: [], // "다른 레시피 추천" 때 제외할 이름들
    recipeLoading: false,
    view: "main",
    editingProfileId: null, // null이면 새 프로필
    pendingImport: null,
    dialogRecipe: null // 지금 dialog에 열린 추천 레시피 (저장 버튼 갱신용)
  };
  let nextId = 1;

  // ===== 저장소 =====

  function getStorage() {
    try {
      const s = window.localStorage;
      s.getItem("__probe__");
      return s;
    } catch (e) {
      const mem = {};
      return { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
    }
  }
  const storage = getStorage();
  const loaded = FridgeStore.load(storage);
  let appData = loaded.data;

  function showBanner(message) {
    const b = $("storage-banner");
    b.replaceChildren(el("span", { text: message }));
    const close = el("button", { type: "button", class: "banner-close", "aria-label": "알림 닫기", text: "✕" });
    close.addEventListener("click", () => { b.hidden = true; });
    b.append(close);
    b.hidden = false;
  }

  function commit(nextData) {
    appData = nextData;
    if (!FridgeStore.save(storage, appData)) {
      showBanner("저장 공간이 부족하거나 저장할 수 없는 환경이에요. 오래된 레시피를 지우거나 내보내기로 백업해 주세요. (지금 화면에서는 계속 쓸 수 있어요)");
    }
    renderHeader();
  }

  const currentProfile = () => Profiles.activeProfile(appData);

  // ===== 공통 =====

  let toastTimer = null;
  function toast(message, action) {
    const t = $("toast");
    t.replaceChildren(el("span", { text: message }));
    if (action) {
      const btn = el("button", { type: "button", text: action.label });
      btn.addEventListener("click", () => { t.hidden = true; action.run(); });
      t.append(btn);
    }
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, action ? 5000 : 2500);
  }

  function setStatus(id, message, kind = "") {
    const s = $(id);
    s.textContent = message;
    s.className = `status ${kind}`;
  }

  function showView(name) {
    state.view = name;
    for (const v of ["main", "profile", "saved"]) $(`view-${v}`).hidden = v !== name;
    closeMenu();
    window.scrollTo(0, 0);
    if (name === "saved") { renderSaved(); $("saved-title").focus({ preventScroll: true }); }
    if (name === "main") renderMain();
  }

  // ===== 헤더 · 프로필 메뉴 =====

  function renderHeader() {
    const p = currentProfile();
    $("profile-btn").textContent = p ? `${p.avatar} ${p.name} ▾` : "👤 프로필 ▾";
    $("saved-count").textContent = p ? Saved.listFor(appData, p.id).length : 0;
    ProfileView.renderMenu($("profile-menu"), appData, {
      onSwitch: switchProfile,
      onNew: () => openProfileForm(null),
      onEdit: () => openProfileForm(appData.activeProfileId)
    });
  }

  function toggleMenu() {
    const open = $("profile-menu").hidden;
    $("profile-menu").hidden = !open;
    $("profile-btn").setAttribute("aria-expanded", String(open));
    if (open) { const first = $("profile-menu").querySelector("button"); if (first) first.focus(); }
  }

  function closeMenu() {
    $("profile-menu").hidden = true;
    $("profile-btn").setAttribute("aria-expanded", "false");
  }

  function switchProfile(id) {
    commit({ ...appData, activeProfileId: id });
    closeMenu();
    const p = currentProfile();
    if (p) $("opt-servings").value = String(p.defaultServings);
    toast(`${p.avatar} ${p.name} 프로필로 바꿨어요.`);
    if (state.view === "saved") renderSaved();
    renderMain();
  }

  // ===== 1단계: 사진 입력 =====

  async function handleFile(file) {
    if (!file || state.recognizing) return;
    setStatus("upload-status", "사진을 준비하는 중…", "loading");
    try {
      state.imageDataUrl = await ImageTools.toResizedDataUrl(file);
    } catch (err) {
      state.imageDataUrl = null;
      setStatus("upload-status", err.message, "error");
      renderUpload();
      return;
    }
    setStatus("upload-status", "");
    renderUpload();
    $("recognize-btn").focus();
  }

  function renderUpload() {
    const hasImage = Boolean(state.imageDataUrl);
    $("preview").hidden = !hasImage;
    if (hasImage) $("preview").src = state.imageDataUrl;
    $("drop-guide").hidden = hasImage;
    $("change-photo-btn").hidden = !hasImage;
    $("recognize-btn").disabled = !hasImage || state.recognizing;
    $("change-photo-btn").disabled = state.recognizing;
    $("recognize-btn").textContent = state.recognizing ? "인식하는 중…" : "재료 인식하기";
  }

  async function recognize() {
    if (!state.imageDataUrl || state.recognizing) return;
    state.recognizing = true;
    renderUpload();
    setStatus("upload-status", "사진을 살펴보는 중… (최대 1분 정도 걸려요)", "loading");
    try {
      const result = await Api.recognize(state.imageDataUrl);
      state.ingredients = result.ingredients.map((item) => ({ ...item, id: nextId++, enabled: true }));
      state.notes = result.notes || "";
      state.recipes = [];
      state.shownTitles = [];
      setStatus("upload-status", `재료 ${state.ingredients.length}개를 찾았어요.`);
      renderIngredients();
      renderRecipes();
      $("ingredients-title").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setStatus("upload-status", err.message, "error");
    } finally {
      state.recognizing = false;
      renderUpload();
    }
  }

  // ===== 1단계: 재료 목록 =====

  function enabledNames() {
    return state.ingredients.filter((i) => i.enabled).map((i) => i.name);
  }

  function renderIngredients() {
    $("ingredients-card").hidden = false;
    $("options-card").hidden = false;
    $("ingredient-count").textContent = state.ingredients.length;
    $("empty-ingredients").hidden = state.ingredients.length > 0;
    $("notes").hidden = !state.notes;
    $("notes").textContent = state.notes ? `ⓘ ${state.notes}` : "";

    const groups = $("ingredient-groups");
    groups.replaceChildren();
    for (const category of CATEGORIES) {
      const items = state.ingredients.filter((i) => i.category === category);
      if (!items.length) continue;
      const chips = el("div", { class: "chips" });
      items.forEach((item) => chips.append(renderChip(item)));
      groups.append(el("div", { class: "group" }, el("h3", { class: "group-title", text: category }), chips));
    }
    renderOptionsInfo();
  }

  function renderChip(item) {
    if (state.editingId === item.id) {
      const input = el("input", { class: "chip-edit", type: "text", maxlength: "30", "aria-label": `${item.name} 이름 고치기` });
      input.value = item.name;
      const finish = (save) => {
        if (state.editingId !== item.id) return;
        const name = input.value.replace(/\s+/g, " ").trim();
        if (save && name) item.name = name;
        state.editingId = null;
        renderIngredients();
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); finish(true); }
        if (e.key === "Escape") finish(false);
      });
      input.addEventListener("blur", () => finish(true));
      requestAnimationFrame(() => { input.focus(); input.select(); });
      return el("span", { class: "chip" }, input);
    }

    const low = item.confidence === "low";
    const nameBtn = el("button", {
      type: "button", class: "chip-name", "aria-pressed": String(item.enabled),
      title: item.enabled ? "눌러서 이번 추천에서 빼기" : "눌러서 다시 넣기"
    },
      el("span", { class: "check", "aria-hidden": "true", text: item.enabled ? "✓" : "" }),
      el("span", { text: item.name }),
      ...(low ? [el("span", { class: "unsure", text: "?", "aria-label": "확실하지 않음" })] : []),
      ...(item.quantity ? [el("span", { class: "qty", text: item.quantity })] : [])
    );
    nameBtn.addEventListener("click", () => { item.enabled = !item.enabled; renderIngredients(); });

    const editBtn = el("button", { type: "button", class: "chip-icon", "aria-label": `${item.name} 이름 고치기`, text: "✎" });
    editBtn.addEventListener("click", () => { state.editingId = item.id; renderIngredients(); });

    const removeBtn = el("button", { type: "button", class: "chip-icon chip-remove", "aria-label": `${item.name} 삭제`, text: "✕" });
    removeBtn.addEventListener("click", () => {
      state.ingredients = state.ingredients.filter((i) => i.id !== item.id);
      renderIngredients();
    });
    return el("span", { class: `chip${low ? " low" : ""}${item.enabled ? "" : " off"}` }, nameBtn, editBtn, removeBtn);
  }

  function addIngredient(e) {
    e.preventDefault();
    const name = $("add-name").value.replace(/\s+/g, " ").trim();
    if (!name) return;
    if (state.ingredients.some((i) => i.name === name)) {
      toast(`'${name}'은(는) 이미 있어요.`);
      return;
    }
    state.ingredients.push({ id: nextId++, name, quantity: null, category: $("add-category").value, confidence: "high", enabled: true });
    $("add-name").value = "";
    renderIngredients();
    $("add-name").focus();
  }

  // ===== 2단계: 레시피 추천 =====

  function readOptions() {
    const num = (v) => (v ? Number(v) : null);
    return {
      servings: Number($("opt-servings").value),
      maxTimeMinutes: num($("opt-time").value),
      difficulty: $("opt-difficulty").value || null,
      cuisine: $("opt-cuisine").value || null
    };
  }

  function profileSummary(p) {
    const parts = [];
    if (p.allergies.length) parts.push(`알레르기 ${p.allergies.join(", ")}`);
    if (p.dietType !== "none") parts.push(Profiles.DIET_TYPES[p.dietType]);
    if (p.dislikedIngredients.length) parts.push(`싫어함 ${p.dislikedIngredients.join(", ")}`);
    parts.push(`매운맛 ${Profiles.SPICE_LABELS[p.spiceLevel]}`);
    return parts.join(" · ");
  }

  function renderOptionsInfo() {
    const p = currentProfile();
    const pantry = p ? p.pantry : Profiles.DEFAULT_PANTRY;
    $("profile-info").hidden = !p;
    $("profile-info").textContent = p ? `${p.avatar} ${p.name} 프로필 반영: ${profileSummary(p)}` : "";
    $("pantry-info").textContent = pantry.length ? `ⓘ 기본 양념(${pantry.join(", ")})은 있다고 가정해요.` : "ⓘ 기본 양념이 없다고 가정해요.";
    const count = enabledNames().length;
    const off = state.ingredients.length - count;
    $("selected-info").textContent = off ? `재료 ${count}개로 추천해요. (${off}개는 이번에 뺐어요)` : `재료 ${count}개로 추천해요.`;
    $("to-recipes-btn").disabled = count === 0 || state.recipeLoading;
    $("more-recipes-btn").disabled = count === 0 || state.recipeLoading;
    $("to-recipes-btn").textContent = state.recipeLoading ? "레시피를 고민하는 중…" : "레시피 추천받기";
  }

  async function requestRecipes(more) {
    const ingredients = enabledNames();
    if (!ingredients.length || state.recipeLoading) return;
    state.recipeLoading = true;
    renderOptionsInfo();
    setStatus("recipe-status", "레시피를 고민하는 중… (최대 1분 30초 정도 걸려요)", "loading");
    try {
      const excludeTitles = more ? state.shownTitles.slice(-MAX_EXCLUDE) : [];
      const body = { ingredients, options: readOptions(), excludeTitles };
      const prefs = Profiles.toPreferences(currentProfile());
      if (prefs) body.preferences = prefs;
      const result = await Api.recipes(body);
      state.recipes = result.recipes;
      state.shownTitles = [...(more ? state.shownTitles : []), ...result.recipes.map((r) => r.title)];
      const excluded = result.excludedForAllergy || [];
      setStatus("recipe-status", `레시피 ${result.recipes.length}개를 찾았어요.${excluded.length ? ` 알레르기 때문에 ${excluded.join(", ")}은(는) 빼고 추천했어요.` : ""}`);
      renderRecipes();
      $("recipes-title").focus({ preventScroll: true });
      $("recipes-card").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setStatus("recipe-status", err.message, "error");
    } finally {
      state.recipeLoading = false;
      renderOptionsInfo();
    }
  }

  function renderRecipes() {
    $("recipes-card").hidden = state.recipes.length === 0;
    RecipeView.renderCards($("recipe-list"), state.recipes, {
      onOpen: openRecipe,
      actionsFor: (recipe) => {
        const p = currentProfile();
        const saved = Boolean(p && Saved.findSaved(appData, p.id, recipe));
        return [ProfileView.saveToggle(saved, () => toggleSave(recipe))];
      }
    });
  }

  function renderMain() {
    $("onboarding").hidden = appData.profiles.length > 0 || appData.onboardingDismissed;
    if (!$("options-card").hidden) renderOptionsInfo();
    renderRecipes();
  }

  // ===== 3단계: 레시피 저장 =====

  function promptProfile(message) {
    toast(message, { label: "프로필 만들기", run: () => { closeDialog(); openProfileForm(null); } });
  }

  function toggleSave(recipe) {
    const p = currentProfile();
    if (!p) return promptProfile("프로필을 만들면 레시피를 저장할 수 있어요.");
    const existing = Saved.findSaved(appData, p.id, recipe);
    if (existing) {
      deleteSaved(existing);
    } else {
      const { data } = Saved.saveRecipe(appData, { profileId: p.id, recipe, sourceIngredients: enabledNames() });
      commit(data);
      toast(`'${recipe.title}'을(를) 저장했어요.`);
    }
    renderRecipes();
    if (state.dialogRecipe === recipe) renderDialogActions();
  }

  function deleteSaved(entry) {
    const { data, removed, index } = Saved.removeSaved(appData, entry.id);
    if (!removed) return;
    commit(data);
    toast(`'${removed.recipe.title}'을(를) 삭제했어요.`, {
      label: "되돌리기",
      run: () => {
        commit(Saved.restoreSaved(appData, removed, index));
        renderRecipes();
        if (state.view === "saved") renderSaved();
      }
    });
    if (state.view === "saved") renderSaved();
  }

  // ===== 레시피 상세 (dialog) =====

  function renderDialogActions() {
    const p = currentProfile();
    const recipe = state.dialogRecipe;
    const saved = Boolean(p && Saved.findSaved(appData, p.id, recipe));
    $("dialog-actions").replaceChildren(ProfileView.saveToggle(saved, () => toggleSave(recipe)));
  }

  function openRecipe(recipe) {
    state.dialogRecipe = recipe;
    $("dialog-title").textContent = recipe.title;
    renderDialogActions();
    $("dialog-body").replaceChildren(RecipeView.detail(recipe));
    $("recipe-dialog").showModal();
    $("dialog-body").scrollTop = 0;
  }

  function openSaved(entry) {
    state.dialogRecipe = null;
    $("dialog-title").textContent = entry.recipe.title;
    $("dialog-actions").replaceChildren(ProfileView.savedControls(entry, {
      onUpdate: (patch) => { commit(Saved.updateSaved(appData, entry.id, patch)); renderSaved(); },
      onDelete: () => { closeDialog(); deleteSaved(entry); }
    }));
    $("dialog-body").replaceChildren(RecipeView.detail(entry.recipe));
    $("recipe-dialog").showModal();
  }

  function closeDialog() {
    if ($("recipe-dialog").open) $("recipe-dialog").close();
    state.dialogRecipe = null;
  }

  // ===== 3단계: 프로필 편집 =====

  function openProfileForm(profileId) {
    state.editingProfileId = profileId;
    const profile = profileId ? appData.profiles.find((p) => p.id === profileId) : null;
    $("profile-form-title").textContent = profile ? `${profile.avatar} ${profile.name} 프로필 관리` : "새 프로필";
    showView("profile");
    ProfileView.renderForm($("profile-form-body"), {
      profile,
      profiles: appData.profiles,
      savedCount: profile ? Saved.listFor(appData, profile.id).length : 0,
      onSave: (input) => {
        const r = profile ? Profiles.updateProfile(profile, input, appData.profiles) : Profiles.createProfile(input, appData.profiles);
        if (r.error) return r.error;
        commit(Profiles.upsertProfile(appData, r.profile));
        $("opt-servings").value = String(r.profile.defaultServings);
        showView("main");
        toast(profile ? "프로필을 저장했어요." : `${r.profile.avatar} ${r.profile.name} 프로필을 만들었어요.`);
        return null;
      },
      onCancel: () => showView("main"),
      onDelete: () => {
        commit(Profiles.deleteProfile(appData, profile.id));
        showView("main");
        toast(`${profile.name} 프로필을 삭제했어요.`);
      }
    });
  }

  // ===== 3단계: 저장 목록 =====

  function renderSaved() {
    const p = currentProfile();
    const all = p ? Saved.listFor(appData, p.id) : [];
    const shown = Saved.sortList(Saved.search(all, $("saved-search").value), $("saved-sort").value);
    $("saved-list-count").textContent = all.length;
    ProfileView.renderSavedList($("saved-list"), shown, { onOpen: openSaved });
    const empty = $("saved-empty");
    empty.hidden = shown.length > 0;
    empty.textContent = !p ? "프로필을 만들면 레시피를 저장할 수 있어요." : all.length ? "검색 결과가 없어요." : "아직 저장한 레시피가 없어요. 추천 레시피에서 ♡를 눌러 보세요.";
    $("export-btn").disabled = appData.profiles.length === 0;
  }

  function exportData() {
    const blob = new Blob([FridgeStore.exportJson(appData)], { type: "application/json" });
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const a = el("a", { href: URL.createObjectURL(blob), download: `fridge-chef-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("백업 파일을 내려받았어요.");
  }

  async function startImport(file) {
    const panel = $("import-panel");
    panel.hidden = false;
    let parsed;
    try {
      parsed = FridgeStore.parseImport(await file.text());
    } catch (err) {
      panel.replaceChildren(el("p", { class: "status error", text: err.message }));
      return;
    }
    state.pendingImport = parsed;
    const { data, dropped } = parsed;
    const overwrite = el("button", { type: "button", class: "btn btn-small btn-danger", text: "덮어쓰기" });
    const merge = el("button", { type: "button", class: "btn btn-small btn-primary", text: "합치기" });
    const cancel = el("button", { type: "button", class: "btn btn-small", text: "취소" });
    merge.addEventListener("click", () => {
      const r = FridgeStore.mergeData(appData, data);
      commit(r.data);
      finishImport(`프로필 ${r.addedProfiles}개, 레시피 ${r.addedRecipes}개를 추가했어요.`);
    });
    overwrite.addEventListener("click", () => {
      if (!overwrite.dataset.armed) {
        overwrite.dataset.armed = "1";
        overwrite.textContent = "지금 데이터가 모두 지워져요. 한 번 더 누르면 덮어쓰기";
        return;
      }
      commit(FridgeStore.overwriteData(appData, data));
      finishImport("파일 내용으로 바꿨어요.");
    });
    cancel.addEventListener("click", () => finishImport(null));
    panel.replaceChildren(
      el("p", { text: `파일 내용: 프로필 ${data.profiles.length}개, 레시피 ${data.savedRecipes.length}개${dropped ? ` (읽지 못한 항목 ${dropped}개는 건너뜀)` : ""}` }),
      el("div", { class: "button-row" }, merge, overwrite, cancel)
    );
  }

  function finishImport(message) {
    state.pendingImport = null;
    $("import-panel").hidden = true;
    $("import-panel").replaceChildren();
    if (message) toast(message);
    renderSaved();
    renderMain();
  }

  // ===== 이벤트 =====

  function bindEvents() {
    $("file-input").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
    $("camera-input").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
    $("change-photo-btn").addEventListener("click", () => $("file-input").click());
    $("recognize-btn").addEventListener("click", recognize);
    $("add-form").addEventListener("submit", addIngredient);
    $("to-recipes-btn").addEventListener("click", () => requestRecipes(false));
    $("more-recipes-btn").addEventListener("click", () => requestRecipes(true));

    $("dialog-close").addEventListener("click", closeDialog);
    $("recipe-dialog").addEventListener("click", (e) => { if (e.target === $("recipe-dialog")) closeDialog(); });
    $("recipe-dialog").addEventListener("close", () => { state.dialogRecipe = null; });

    document.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.nav)));
    document.querySelectorAll('[data-action="new-profile"]').forEach((b) => b.addEventListener("click", () => openProfileForm(null)));
    $("onboarding-later").addEventListener("click", () => { commit({ ...appData, onboardingDismissed: true }); renderMain(); });

    $("profile-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) closeMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("profile-menu").hidden) { closeMenu(); $("profile-btn").focus(); } });

    $("saved-search").addEventListener("input", renderSaved);
    $("saved-sort").addEventListener("change", renderSaved);
    $("export-btn").addEventListener("click", exportData);
    $("import-input").addEventListener("change", (e) => { if (e.target.files[0]) startImport(e.target.files[0]); e.target.value = ""; });

    const dz = $("dropzone");
    ["dragenter", "dragover"].forEach((type) => dz.addEventListener(type, (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    }));
    ["dragleave", "drop"].forEach((type) => dz.addEventListener(type, () => dz.classList.remove("dragover")));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      handleFile(e.dataTransfer.files[0]);
    });
  }

  function init() {
    CATEGORIES.forEach((c) => $("add-category").append(el("option", { value: c, text: c })));
    $("add-category").value = "기타";
    const p = currentProfile();
    if (p) $("opt-servings").value = String(p.defaultServings);
    bindEvents();
    renderUpload();
    renderHeader();
    renderMain();

    const warnings = {
      corrupt: "저장된 데이터가 손상되어 빈 상태로 시작했어요. 원래 데이터는 따로 보관해 두었어요.",
      newer: "더 새 버전 앱에서 저장한 데이터라 읽지 못했어요. 원래 데이터는 따로 보관해 두었어요.",
      partial: `저장된 항목 중 ${loaded.dropped}개를 읽지 못해 건너뛰었어요.`,
      unavailable: "이 브라우저에서는 데이터를 저장할 수 없어요 (시크릿 모드 등). 새로고침하면 사라져요."
    };
    if (loaded.warning) showBanner(warnings[loaded.warning]);
  }

  init();
})();
