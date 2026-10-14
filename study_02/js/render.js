// DOM rendering only. Takes state in, writes DOM out. Never mutates state,
// never attaches event listeners (app.js owns all event wiring).

(function (global) {
  "use strict";

  const CATEGORY_LABELS = { work: "업무", personal: "개인", study: "공부" };
  const GROUP_DEFS = [
    { key: "overdue", label: "지남 ⚠", className: "group-overdue" },
    { key: "today", label: "오늘", className: "group-today" },
    { key: "thisWeek", label: "이번 주", className: "group-this-week" },
    { key: "later", label: "이후", className: "group-later" },
    { key: "noDate", label: "날짜 없음", className: "group-no-date" },
  ];

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key === "className") node.className = value;
        else if (key.startsWith("data-")) node.setAttribute(key, value);
        else node[key] = value;
      }
    }
    for (const child of children || []) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  function text(tag, className, str) {
    return el(tag, { className, textContent: str }, []);
  }

  // Applies/removes the "done" look (strikethrough + dim) on a rendered row.
  // Exists as its own function so the done-visual is defined in exactly one
  // place, even though the app always goes through a full renderGroups() pass.
  function renderDoneState(row, done) {
    row.classList.toggle("todo-row--done", !!done);
  }

  function renderReadOnlyRow(todo) {
    const checkbox = el("input", {
      type: "checkbox",
      className: "todo-checkbox",
      checked: todo.done,
      "data-id": todo.id,
      "data-action": "toggle",
    });
    const title = text("span", "todo-title", todo.title);
    const badge = text("span", `todo-badge todo-badge--${todo.category}`, CATEGORY_LABELS[todo.category] || todo.category);
    const due = text("span", "todo-due", todo.dueDate || "");
    const editBtn = el("button", {
      type: "button",
      className: "todo-action todo-action--edit",
      textContent: "✏",
      "data-id": todo.id,
      "data-action": "edit",
    });
    const deleteBtn = el("button", {
      type: "button",
      className: "todo-action todo-action--delete",
      textContent: "✕",
      "data-id": todo.id,
      "data-action": "delete",
    });

    const row = el("li", { className: "todo-row", "data-id": todo.id }, [
      checkbox,
      title,
      badge,
      due,
      editBtn,
      deleteBtn,
    ]);
    renderDoneState(row, todo.done);
    return row;
  }

  function renderEditRow(todo) {
    const titleInput = el("input", {
      type: "text",
      className: "todo-edit-title",
      value: todo.title,
      maxLength: 100,
      "data-id": todo.id,
      "data-field": "title",
    });
    const categorySelect = el("select", { className: "todo-edit-category", "data-id": todo.id, "data-field": "category" }, [
      el("option", { value: "work", textContent: "업무", selected: todo.category === "work" }, []),
      el("option", { value: "personal", textContent: "개인", selected: todo.category === "personal" }, []),
      el("option", { value: "study", textContent: "공부", selected: todo.category === "study" }, []),
    ]);
    const dueInput = el("input", {
      type: "date",
      className: "todo-edit-due",
      value: todo.dueDate || "",
      "data-id": todo.id,
      "data-field": "dueDate",
    });
    const saveBtn = el("button", {
      type: "button",
      className: "todo-action todo-action--save",
      textContent: "저장",
      "data-id": todo.id,
      "data-action": "save",
    });
    const cancelBtn = el("button", {
      type: "button",
      className: "todo-action todo-action--cancel",
      textContent: "취소",
      "data-id": todo.id,
      "data-action": "cancel",
    });

    return el("li", { className: "todo-row todo-row--editing", "data-id": todo.id }, [
      titleInput,
      categorySelect,
      dueInput,
      saveBtn,
      cancelBtn,
    ]);
  }

  // Renders every due-date group in a fixed order; a group with no items
  // is skipped entirely (its header is not created).
  // editingId (optional): if a todo in the list matches this id, it is
  // rendered as an editable row instead of a read-only one.
  function renderGroups(container, grouped, today, editingId) {
    container.innerHTML = "";
    for (const { key, label, className } of GROUP_DEFS) {
      const items = grouped[key] || [];
      if (items.length === 0) continue;

      container.appendChild(text("h2", `group-header ${className}`, label));
      const list = el("ul", { className: "group-list" }, []);
      for (const todo of items) {
        list.appendChild(todo.id === editingId ? renderEditRow(todo) : renderReadOnlyRow(todo));
      }
      container.appendChild(list);
    }
  }

  function renderProgress(container, progress) {
    container.innerHTML = "";
    if (progress.total === 0) {
      container.appendChild(text("p", "progress-empty", "오늘 할 일이 없습니다"));
      return;
    }
    const pct = Math.round((progress.done / progress.total) * 100);
    const label = text("span", "progress-label", `오늘 할 일   ${progress.done}/${progress.total} (${pct}%)`);
    const barOuter = el("div", { className: "progress-bar" }, [
      el("div", { className: "progress-bar-fill", style: `width: ${pct}%` }, []),
    ]);
    container.appendChild(label);
    container.appendChild(barOuter);
  }

  function renderFilterTabs(container, activeCategory) {
    for (const tab of container.querySelectorAll(".filter-tab")) {
      tab.classList.toggle("filter-tab--active", tab.dataset.category === activeCategory);
    }
  }

  function renderErrorBanner(container, message) {
    container.textContent = message;
    container.hidden = false;
  }

  function clearErrorBanner(container) {
    container.textContent = "";
    container.hidden = true;
  }

  global.Render = {
    renderGroups,
    renderProgress,
    renderDoneState,
    renderFilterTabs,
    renderErrorBanner,
    clearErrorBanner,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
