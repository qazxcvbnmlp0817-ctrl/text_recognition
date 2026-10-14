// The only stateful module. Holds `state`, wires up DOM events, and is the
// only place that calls both todos.js (compute) and storage.js (persist)
// before asking render.js to redraw.

(function () {
  "use strict";

  const todoListEl = document.getElementById("todo-list");
  const progressEl = document.getElementById("progress");
  const filterTabsEl = document.getElementById("filter-tabs");
  const errorBannerEl = document.getElementById("error-banner");
  const todayLabelEl = document.getElementById("today-label");
  const addFormEl = document.getElementById("add-form");
  const titleInputEl = document.getElementById("title-input");
  const categoryInputEl = document.getElementById("category-input");
  const dueDateInputEl = document.getElementById("due-date-input");
  const titleErrorEl = document.getElementById("title-error");

  const state = {
    todos: [],
    activeCategory: "all",
    editingId: null,
  };

  function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const TODAY = todayString();

  function todayKoreanLabel() {
    const [y, m, d] = TODAY.split("-").map(Number);
    return `${y}년 ${m}월 ${d}일`;
  }

  // Wraps a TodoStorage call to detect whether it logged a console.warn
  // (i.e. corrupted data, unreadable storage, or a failed write), without
  // storage.js having to change its return contract or know about the UI.
  function withWarningDetection(fn) {
    let warned = false;
    const originalWarn = console.warn;
    console.warn = function (...args) {
      warned = true;
      originalWarn.apply(console, args);
    };
    let result;
    try {
      result = fn();
    } finally {
      console.warn = originalWarn;
    }
    return { result, hadWarning: warned };
  }

  function persist() {
    const { hadWarning } = withWarningDetection(() => TodoStorage.saveTodos(state.todos));
    if (hadWarning) {
      Render.renderErrorBanner(errorBannerEl, "할 일을 저장하지 못했습니다. 저장 공간을 확인해 주세요.");
    }
  }

  function rerender() {
    const filtered = Todos.filterByCategory(state.todos, state.activeCategory);
    const grouped = Todos.groupByDueDate(filtered, TODAY);
    Render.renderGroups(todoListEl, grouped, TODAY, state.editingId);

    const progress = Todos.calculateProgress(state.todos, TODAY);
    Render.renderProgress(progressEl, progress);

    Render.renderFilterTabs(filterTabsEl, state.activeCategory);
  }

  function resetAddForm() {
    titleInputEl.value = "";
    categoryInputEl.value = "study";
    dueDateInputEl.value = "";
    titleInputEl.classList.remove("field-invalid");
    titleErrorEl.hidden = true;
  }

  function handleAddSubmit(event) {
    event.preventDefault();
    const dueDate = dueDateInputEl.value || null;
    const newTodo = Todos.createTodo(titleInputEl.value, categoryInputEl.value, dueDate);
    if (newTodo === null) {
      titleInputEl.classList.add("field-invalid");
      titleErrorEl.hidden = false;
      return;
    }
    state.todos = [...state.todos, newTodo];
    persist();
    resetAddForm();
    rerender();
  }

  function handleListClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action) return;
    const id = target.dataset.id;

    if (action === "toggle") {
      state.todos = Todos.toggleTodo(state.todos, id);
      persist();
      rerender();
    } else if (action === "delete") {
      if (!confirm("이 할 일을 삭제할까요?")) return;
      state.todos = Todos.deleteTodo(state.todos, id);
      if (state.editingId === id) state.editingId = null;
      persist();
      rerender();
    } else if (action === "edit") {
      state.editingId = id;
      rerender();
    } else if (action === "cancel") {
      state.editingId = null;
      rerender();
    } else if (action === "save") {
      const row = target.closest(".todo-row");
      const titleField = row.querySelector('[data-field="title"]');
      const categoryField = row.querySelector('[data-field="category"]');
      const dueDateField = row.querySelector('[data-field="dueDate"]');
      const trimmedTitle = titleField.value.trim();
      if (trimmedTitle.length === 0 || trimmedTitle.length > 100) {
        titleField.classList.add("field-invalid");
        return;
      }
      state.todos = Todos.updateTodo(state.todos, id, {
        title: trimmedTitle,
        category: categoryField.value,
        dueDate: dueDateField.value || null,
      });
      state.editingId = null;
      persist();
      rerender();
    }
  }

  function handleFilterClick(event) {
    const category = event.target.dataset.category;
    if (!category) return;
    state.activeCategory = category;
    rerender();
  }

  function init() {
    todayLabelEl.textContent = todayKoreanLabel();

    const { result: loadedTodos, hadWarning } = withWarningDetection(() => TodoStorage.loadTodos());
    state.todos = loadedTodos;
    if (hadWarning) {
      Render.renderErrorBanner(
        errorBannerEl,
        "저장된 데이터 중 일부를 읽지 못해 제외했습니다. (손상된 데이터는 자동으로 덮어쓰지 않습니다)"
      );
    }

    addFormEl.addEventListener("submit", handleAddSubmit);
    titleInputEl.addEventListener("input", () => {
      titleInputEl.classList.remove("field-invalid");
      titleErrorEl.hidden = true;
    });
    todoListEl.addEventListener("click", handleListClick);
    filterTabsEl.addEventListener("click", handleFilterClick);

    rerender();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
