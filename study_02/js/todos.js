// Pure logic for todo items: no DOM access, no localStorage access.
// Every function here takes data in and returns new data out.

(function (global) {
  "use strict";

  function createTodo(title, category, dueDate) {
    const trimmed = typeof title === "string" ? title.trim() : "";
    if (trimmed.length === 0 || trimmed.length > 100) {
      return null;
    }
    return {
      id: crypto.randomUUID(),
      title: trimmed,
      category,
      dueDate: dueDate || null,
      done: false,
      createdAt: new Date().toISOString(),
    };
  }

  function toggleTodo(todos, id) {
    return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  }

  function updateTodo(todos, id, changes) {
    return todos.map((t) => (t.id === id ? { ...t, ...changes } : t));
  }

  function deleteTodo(todos, id) {
    return todos.filter((t) => t.id !== id);
  }

  // Parses "YYYY-MM-DD" as a UTC midnight Date, avoiding local-timezone shifts.
  function parseDateUTC(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  function formatDateUTC(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Finds the date string of the Sunday ending "this week" (today's week).
  // If today is itself Sunday, returns today (so "this week" range becomes empty).
  function thisWeekSunday(today) {
    const todayDate = parseDateUTC(today);
    const daysUntilSunday = (7 - todayDate.getUTCDay()) % 7;
    const sunday = new Date(todayDate);
    sunday.setUTCDate(todayDate.getUTCDate() + daysUntilSunday);
    return formatDateUTC(sunday);
  }

  function groupByDueDate(todos, today) {
    const sunday = thisWeekSunday(today);
    const groups = { overdue: [], today: [], thisWeek: [], later: [], noDate: [] };
    for (const t of todos) {
      if (t.dueDate === null) {
        groups.noDate.push(t);
      } else if (t.dueDate < today) {
        groups.overdue.push(t);
      } else if (t.dueDate === today) {
        groups.today.push(t);
      } else if (t.dueDate <= sunday) {
        groups.thisWeek.push(t);
      } else {
        groups.later.push(t);
      }
    }
    return groups;
  }

  function calculateProgress(todos, today) {
    const due = todos.filter((t) => t.dueDate !== null && t.dueDate <= today);
    const done = due.filter((t) => t.done).length;
    return { done, total: due.length };
  }

  function filterByCategory(todos, category) {
    return category === "all" ? todos : todos.filter((t) => t.category === category);
  }

  global.Todos = {
    createTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    groupByDueDate,
    calculateProgress,
    filterByCategory,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
