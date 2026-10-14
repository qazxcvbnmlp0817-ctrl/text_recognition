// localStorage read/write only. Owns the "todoApp.v1" key and its envelope.
// Never throws on corrupt/missing data: returns an empty list and logs instead.

(function (global) {
  "use strict";

  const STORAGE_KEY = "todoApp.v1";

  function isValidTodo(t) {
    return (
      t &&
      typeof t.id === "string" &&
      typeof t.title === "string" &&
      ["work", "personal", "study"].includes(t.category) &&
      (t.dueDate === null || typeof t.dueDate === "string") &&
      typeof t.done === "boolean" &&
      typeof t.createdAt === "string"
    );
  }

  function loadTodos() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("TodoStorage: stored data is not valid JSON, starting empty.", e);
      return [];
    }
    if (!parsed || !Array.isArray(parsed.todos)) {
      console.warn("TodoStorage: stored data has an unexpected shape, starting empty.");
      return [];
    }
    return parsed.todos.filter((t) => {
      const valid = isValidTodo(t);
      if (!valid) {
        console.warn("TodoStorage: dropping invalid todo entry.", t);
      }
      return valid;
    });
  }

  function saveTodos(todos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, todos }));
    } catch (e) {
      console.warn("TodoStorage: failed to save (storage full or unavailable).", e);
    }
  }

  // Named TodoStorage (not "Storage") to avoid shadowing the browser's
  // built-in window.Storage interface.
  global.TodoStorage = { loadTodos, saveTodos };
})(typeof globalThis !== "undefined" ? globalThis : this);
