// 레시피 카드·상세 화면 그리기 (상태를 바꾸지 않고 DOM만 만듦)
const RecipeView = (function () {
  const DIFFICULTY_LABEL = { easy: "쉬움", medium: "보통", hard: "어려움" };

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    node.append(...children);
    return node;
  }

  function metaText(recipe) {
    const parts = [];
    parts.push(recipe.cookingTimeMinutes ? `⏱ ${recipe.cookingTimeMinutes}분` : "⏱ 시간 정보 없음");
    parts.push(DIFFICULTY_LABEL[recipe.difficulty] || "보통");
    if (recipe.servings) parts.push(`${recipe.servings}인분`);
    if (recipe.cuisine) parts.push(recipe.cuisine);
    return parts.join(" · ");
  }

  function ingredientText(i) {
    return i.amount ? `${i.name} ${i.amount}` : i.name;
  }

  /**
   * @param {object} recipe
   * @param {{onOpen: Function, actions?: Node[]}} opts actions: 카드 아래쪽에 붙일 추가 버튼 (3단계 저장 버튼 등)
   */
  function card(recipe, { onOpen, actions = [] }) {
    const missing = recipe.missingIngredients || [];
    const article = el("article", { class: `recipe-card${recipe.needsMore ? " needs-more" : ""}` });

    if (recipe.allergyWarnings && recipe.allergyWarnings.length) {
      article.append(el("p", { class: "allergy-banner", text: `⚠ 알레르기 재료(${recipe.allergyWarnings.join(", ")})가 들어 있을 수 있어요` }));
    }
    article.append(
      el("h3", { class: "recipe-title", text: recipe.title }),
      el("p", { class: "recipe-meta", text: metaText(recipe) })
    );
    if (recipe.summary) article.append(el("p", { class: "recipe-summary", text: recipe.summary }));

    article.append(el("p", { class: "recipe-stock" },
      el("span", { class: "have", text: `냉장고 재료 ${recipe.fridgeIngredientCount ?? recipe.usedIngredients.length}개 사용` })
    ));
    if (missing.length) {
      article.append(el("p", { class: "recipe-missing", text: `부족 ${missing.length}개: ${missing.map((m) => m.name).join(", ")}` }));
    }
    if (recipe.needsMore) article.append(el("p", { class: "tag-warn", text: "재료가 더 필요해요" }));

    const open = el("button", { type: "button", class: "btn btn-small", text: "자세히 보기" });
    open.addEventListener("click", () => onOpen(recipe));
    article.append(el("div", { class: "card-actions" }, open, ...actions));
    return article;
  }

  function renderCards(container, recipes, opts) {
    container.replaceChildren(...recipes.map((r) => card(r, { onOpen: opts.onOpen, actions: opts.actionsFor ? opts.actionsFor(r) : [] })));
  }

  // 상세 내용 (dialog 본문). 조리 순서 체크는 요리하면서 따라가기용이라 저장하지 않음
  function detail(recipe) {
    const frag = document.createDocumentFragment();
    if (recipe.allergyWarnings && recipe.allergyWarnings.length) {
      frag.append(el("p", { class: "allergy-banner", text: `⚠ 알레르기 재료(${recipe.allergyWarnings.join(", ")})가 들어 있을 수 있어요` }));
    }
    frag.append(el("p", { class: "recipe-meta", text: metaText(recipe) }));
    if (recipe.summary) frag.append(el("p", { text: recipe.summary }));

    const ingredients = el("ul", { class: "ingredient-list" });
    for (const i of recipe.usedIngredients) ingredients.append(el("li", { class: "have" }, el("span", { class: "dot", "aria-hidden": "true", text: "●" }), ` ${ingredientText(i)}`));
    for (const i of recipe.missingIngredients) {
      ingredients.append(el("li", { class: "missing" },
        el("span", { class: "dot", "aria-hidden": "true", text: "○" }),
        ` ${ingredientText(i)} `,
        el("span", { class: "tag-missing", text: i.optional ? "부족 · 없어도 됨" : "부족" })
      ));
    }
    frag.append(el("h3", { class: "detail-heading", text: "재료" }), ingredients);

    if (recipe.seasonings && recipe.seasonings.length) {
      frag.append(el("h3", { class: "detail-heading", text: "양념" }), el("p", { class: "seasonings", text: recipe.seasonings.join(" · ") }));
    }

    const steps = el("ol", { class: "steps" });
    recipe.steps.forEach((text, i) => {
      const id = `step-${i}-${Math.random().toString(36).slice(2, 7)}`;
      steps.append(el("li", {}, el("input", { type: "checkbox", id }), el("label", { for: id, text })));
    });
    frag.append(el("h3", { class: "detail-heading", text: "조리 순서" }), steps);

    if (recipe.tips) frag.append(el("p", { class: "tips", text: `💡 ${recipe.tips}` }));
    frag.append(el("p", { class: "disclaimer", text: "AI가 만든 레시피예요. 알레르기가 있다면 실제 재료의 성분 표시를 꼭 확인하세요." }));
    return frag;
  }

  return { renderCards, detail, metaText, DIFFICULTY_LABEL, el };
})();
