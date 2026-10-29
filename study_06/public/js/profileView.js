// 3단계 화면 그리기: 프로필 메뉴, 프로필 편집 폼, 저장 목록, 저장 레시피 편집 컨트롤
const ProfileView = (function () {
  const el = RecipeView.el;

  function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  }

  // ===== 헤더 프로필 메뉴 =====

  function renderMenu(container, data, { onSwitch, onNew, onEdit }) {
    container.replaceChildren();
    for (const p of data.profiles) {
      const active = p.id === data.activeProfileId;
      const btn = el("button", { type: "button", class: "menu-item", role: "menuitemradio", "aria-checked": String(active) },
        el("span", { text: `${p.avatar} ${p.name}` }), el("span", { class: "menu-check", text: active ? "✓" : "" }));
      btn.addEventListener("click", () => onSwitch(p.id));
      container.append(btn);
    }
    if (data.profiles.length) container.append(el("hr", { class: "menu-sep" }));
    const add = el("button", { type: "button", class: "menu-item", role: "menuitem", text: "➕ 새 프로필" });
    add.addEventListener("click", onNew);
    container.append(add);
    if (data.activeProfileId) {
      const edit = el("button", { type: "button", class: "menu-item", role: "menuitem", text: "⚙ 현재 프로필 관리" });
      edit.addEventListener("click", onEdit);
      container.append(edit);
    }
  }

  // ===== 프로필 편집 폼 =====

  // 값 목록 + 추가 입력창 (싫어하는 재료, 기본 양념, 직접 입력 알레르기)
  function tagEditor({ id, values, placeholder, onChange }) {
    const wrap = el("div", { class: "tag-editor" });
    const list = el("div", { class: "chips" });
    const input = el("input", { type: "text", id, maxlength: "30", placeholder, autocomplete: "off" });
    const addBtn = el("button", { type: "button", class: "btn btn-small", text: "추가" });

    function draw() {
      list.replaceChildren(...values.map((v) => {
        const remove = el("button", { type: "button", class: "chip-icon chip-remove", "aria-label": `${v} 빼기`, text: "✕" });
        remove.addEventListener("click", () => { values.splice(values.indexOf(v), 1); onChange(); draw(); });
        return el("span", { class: "chip" }, el("span", { class: "chip-label", text: v }), remove);
      }));
    }
    function add() {
      const v = input.value.replace(/\s+/g, " ").trim().slice(0, 30);
      if (v && !values.includes(v)) { values.push(v); onChange(); draw(); }
      input.value = "";
      input.focus();
    }
    addBtn.addEventListener("click", add);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); add(); } });
    draw();
    wrap.append(list, el("div", { class: "tag-input" }, input, addBtn));
    return { node: wrap, redraw: draw };
  }

  function checkChips(name, options, selected, onToggle) {
    const box = el("div", { class: "check-chips" });
    for (const opt of options) {
      const input = el("input", { type: "checkbox", name, value: opt, class: "sr-only" });
      input.checked = selected.includes(opt);
      input.addEventListener("change", () => onToggle(opt, input.checked));
      box.append(el("label", { class: "check-chip" }, input, el("span", { text: opt })));
    }
    return box;
  }

  function fieldset(legend, ...children) {
    return el("fieldset", { class: "form-field" }, el("legend", { text: legend }), ...children);
  }

  /**
   * @param {HTMLElement} container
   * @param {{profile: object|null, profiles: object[], savedCount: number, onSave: Function, onCancel: Function, onDelete: Function}} opts
   */
  function renderForm(container, { profile, profiles, savedCount, onSave, onCancel, onDelete }) {
    const P = Profiles;
    const draft = {
      name: profile ? profile.name : "",
      avatar: profile ? profile.avatar : P.AVATARS[0],
      allergies: profile ? profile.allergies.slice() : [],
      dietType: profile ? profile.dietType : "none",
      dislikedIngredients: profile ? profile.dislikedIngredients.slice() : [],
      spiceLevel: profile ? profile.spiceLevel : 2,
      tools: profile ? profile.tools.slice() : P.TOOLS.slice(0, 4),
      pantry: profile ? profile.pantry.slice() : P.DEFAULT_PANTRY.slice(),
      defaultServings: profile ? profile.defaultServings : 2
    };
    const customAllergies = draft.allergies.filter((a) => !P.ALLERGENS.includes(a));
    const removedNotice = new Set();
    container.replaceChildren();

    // 이름
    const nameInput = el("input", { type: "text", id: "pf-name", maxlength: String(P.MAX_NAME), autocomplete: "off", placeholder: "예: 도경" });
    nameInput.value = draft.name;
    const nameError = el("p", { class: "field-error", id: "pf-name-error", role: "alert" });
    nameInput.setAttribute("aria-describedby", "pf-name-error");

    // 아바타
    const avatars = el("div", { class: "avatar-row", role: "radiogroup", "aria-label": "아바타" });
    function drawAvatars() {
      avatars.replaceChildren(...P.AVATARS.map((a) => {
        const b = el("button", { type: "button", class: "avatar", role: "radio", "aria-checked": String(a === draft.avatar), "aria-label": `아바타 ${a}`, text: a });
        b.addEventListener("click", () => { draft.avatar = a; drawAvatars(); });
        return b;
      }));
    }
    drawAvatars();

    // 기본 양념 (알레르기에 따라 자동 정리)
    const pantryNotice = el("p", { class: "field-note", role: "status" });
    const pantryEditor = tagEditor({ id: "pf-pantry", values: draft.pantry, placeholder: "양념 추가 (예: 버터)", onChange: () => {} });
    function syncPantry() {
      const allergies = [...draft.allergies];
      const { pantry, removed } = P.applyAllergyPantry(draft.pantry, allergies);
      removed.forEach((r) => removedNotice.add(r));
      draft.pantry.splice(0, draft.pantry.length, ...pantry);
      pantryEditor.redraw();
      pantryNotice.textContent = removedNotice.size ? `알레르기 때문에 ${[...removedNotice].join(", ")}을(를) 기본 양념에서 뺐어요.` : "";
    }

    // 알레르기
    const allergyChecks = checkChips("pf-allergy", P.ALLERGENS, draft.allergies, (opt, on) => {
      if (on && !draft.allergies.includes(opt)) draft.allergies.push(opt);
      if (!on) draft.allergies.splice(draft.allergies.indexOf(opt), 1);
      syncPantry();
    });
    const customEditor = tagEditor({
      id: "pf-allergy-custom", values: customAllergies, placeholder: "목록에 없는 알레르기 직접 입력",
      onChange: () => {
        const preset = draft.allergies.filter((a) => P.ALLERGENS.includes(a));
        draft.allergies.splice(0, draft.allergies.length, ...preset, ...customAllergies);
      }
    });

    // 식단
    const diet = el("div", { class: "radio-row" });
    for (const [value, label] of Object.entries(P.DIET_TYPES)) {
      const input = el("input", { type: "radio", name: "pf-diet", value });
      input.checked = draft.dietType === value;
      input.addEventListener("change", () => { draft.dietType = value; });
      diet.append(el("label", { class: "radio" }, input, el("span", { text: label })));
    }

    // 매운맛
    const spiceLabel = el("span", { class: "spice-label", text: P.SPICE_LABELS[draft.spiceLevel] });
    const spice = el("input", { type: "range", id: "pf-spice", min: "0", max: "3", step: "1", "aria-label": "매운맛 선호" });
    spice.value = String(draft.spiceLevel);
    spice.addEventListener("input", () => {
      draft.spiceLevel = Number(spice.value);
      spiceLabel.textContent = P.SPICE_LABELS[draft.spiceLevel];
      spice.setAttribute("aria-valuetext", P.SPICE_LABELS[draft.spiceLevel]);
    });

    // 조리 도구
    const tools = checkChips("pf-tools", P.TOOLS, draft.tools, (opt, on) => {
      if (on && !draft.tools.includes(opt)) draft.tools.push(opt);
      if (!on) draft.tools.splice(draft.tools.indexOf(opt), 1);
    });

    // 기본 인분
    const servings = el("select", { id: "pf-servings" });
    [1, 2, 3, 4].forEach((n) => servings.append(el("option", { value: String(n), text: `${n}인분` })));
    servings.value = String(draft.defaultServings);
    servings.addEventListener("change", () => { draft.defaultServings = Number(servings.value); });

    const disliked = tagEditor({ id: "pf-disliked", values: draft.dislikedIngredients, placeholder: "예: 오이", onChange: () => {} });

    // 버튼
    const saveBtn = el("button", { type: "button", class: "btn btn-primary", text: "저장" });
    const cancelBtn = el("button", { type: "button", class: "btn", text: "취소" });
    function validate() {
      const msg = P.validateName(nameInput.value, profiles, profile ? profile.id : null);
      nameError.textContent = nameInput.value.trim() === "" && !nameInput.dataset.touched ? "" : msg || "";
      saveBtn.disabled = Boolean(msg);
      return !msg;
    }
    nameInput.addEventListener("input", () => { nameInput.dataset.touched = "1"; draft.name = nameInput.value; validate(); });
    saveBtn.addEventListener("click", () => {
      draft.name = nameInput.value;
      if (!validate()) return;
      const err = onSave({ ...draft });
      if (err) nameError.textContent = err;
    });
    cancelBtn.addEventListener("click", onCancel);
    const actions = el("div", { class: "button-row form-actions" }, cancelBtn, saveBtn);

    // 삭제 (두 번 눌러 확인)
    if (profile) {
      const del = el("button", { type: "button", class: "btn btn-danger", text: "프로필 삭제" });
      let armTimer = null;
      del.addEventListener("click", () => {
        if (!del.dataset.armed) {
          del.dataset.armed = "1";
          del.textContent = savedCount ? `저장한 레시피 ${savedCount}개도 함께 삭제돼요. 한 번 더 누르면 삭제` : "한 번 더 누르면 삭제돼요";
          armTimer = setTimeout(() => { delete del.dataset.armed; del.textContent = "프로필 삭제"; }, 5000);
          return;
        }
        clearTimeout(armTimer);
        onDelete();
      });
      actions.prepend(del);
    }

    container.append(
      el("div", { class: "form-field" }, el("label", { for: "pf-name", text: "이름 (12자 이내)" }), nameInput, nameError),
      fieldset("아바타", avatars),
      fieldset("알레르기", el("p", { class: "field-note", text: "선택한 재료와 그 가공품은 레시피에 쓰지 않도록 요청하고, 들어가면 경고를 보여 줘요." }), allergyChecks, customEditor.node),
      fieldset("식단", diet),
      fieldset("싫어하는 재료 (가능하면 빼요)", disliked.node),
      fieldset("매운맛", el("div", { class: "spice-row" }, spice, spiceLabel)),
      fieldset("가지고 있는 조리 도구", tools),
      fieldset("기본 양념 (있다고 가정)", pantryNotice, pantryEditor.node),
      el("div", { class: "form-field" }, el("label", { for: "pf-servings", text: "기본 인분" }), servings),
      actions
    );
    syncPantry();
    validate();
    requestAnimationFrame(() => nameInput.focus());
  }

  // ===== 저장 목록 =====

  function stars(rating) {
    return rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "";
  }

  function renderSavedList(container, entries, { onOpen }) {
    container.replaceChildren(...entries.map((entry) => {
      const r = entry.recipe;
      const btn = el("button", { type: "button", class: "saved-item" },
        el("span", { class: "saved-title", text: r.title }),
        el("span", { class: "recipe-meta", text: RecipeView.metaText(r) }),
        el("span", { class: "saved-meta" },
          ...(entry.rating ? [el("span", { class: "stars", "aria-label": `별점 ${entry.rating}점`, text: stars(entry.rating) })] : []),
          ...(entry.cooked ? [el("span", { class: "cooked", text: "✓ 만들어 봤어요" })] : []),
          el("span", { text: `${formatDate(entry.savedAt)} 저장` })
        ),
        ...(entry.memo ? [el("span", { class: "saved-memo", text: `“${entry.memo}”` })] : [])
      );
      btn.addEventListener("click", () => onOpen(entry));
      return btn;
    }));
  }

  // ===== 레시피 dialog 위쪽 컨트롤 =====

  // 추천 레시피: 저장 토글
  function saveToggle(isSaved, onToggle) {
    const btn = el("button", { type: "button", class: `btn btn-small save-btn${isSaved ? " saved" : ""}`, "aria-pressed": String(isSaved), text: isSaved ? "♥ 저장됨" : "♡ 저장" });
    btn.addEventListener("click", onToggle);
    return btn;
  }

  // 저장한 레시피: 별점·만들어 봤어요·메모·삭제 (변경 즉시 저장)
  function savedControls(entry, { onUpdate, onDelete }) {
    const wrap = el("div", { class: "saved-controls" });
    const starRow = el("div", { class: "star-row", role: "radiogroup", "aria-label": "별점" });
    function drawStars(rating) {
      starRow.replaceChildren(...[1, 2, 3, 4, 5].map((n) => {
        const b = el("button", { type: "button", class: `star${rating && n <= rating ? " on" : ""}`, role: "radio", "aria-checked": String(rating === n), "aria-label": `${n}점`, text: rating && n <= rating ? "★" : "☆" });
        b.addEventListener("click", () => {
          const next = rating === n ? null : n; // 같은 별을 다시 누르면 별점 지우기
          onUpdate({ rating: next });
          drawStars(next);
        });
        return b;
      }));
    }
    drawStars(entry.rating);

    const cooked = el("input", { type: "checkbox", id: "saved-cooked" });
    cooked.checked = entry.cooked;
    cooked.addEventListener("change", () => onUpdate({ cooked: cooked.checked }));

    const memo = el("textarea", { id: "saved-memo", maxlength: "300", rows: "2", placeholder: "메모 (예: 간장 조금 줄이기)" });
    memo.value = entry.memo;
    let memoTimer = null;
    memo.addEventListener("input", () => { clearTimeout(memoTimer); memoTimer = setTimeout(() => onUpdate({ memo: memo.value }), 400); });
    memo.addEventListener("blur", () => { clearTimeout(memoTimer); onUpdate({ memo: memo.value }); });

    const del = el("button", { type: "button", class: "btn btn-small btn-danger", text: "삭제" });
    del.addEventListener("click", onDelete);

    wrap.append(
      el("div", { class: "saved-controls-row" }, starRow, el("label", { class: "cooked-label", for: "saved-cooked" }, cooked, " 만들어 봤어요"), del),
      el("label", { class: "sr-only", for: "saved-memo", text: "메모" }),
      memo
    );
    return wrap;
  }

  return { renderMenu, renderForm, renderSavedList, saveToggle, savedControls, formatDate };
})();
