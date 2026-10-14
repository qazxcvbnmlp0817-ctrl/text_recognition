# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal todo app for managing ~10-20 tasks per day. Runs directly in the browser via `file://` (double-click `index.html`, no server, no build step). Data persists across reloads via `localStorage`.

Full requirements and rationale live in `PRD.md`. Implementation is broken into five ordered steps in `prompts.md` — follow that order; later steps assume earlier modules exist (e.g. `render.js` depends on `todos.js`'s pure functions, `app.js` wires all three together).

**Current status:** only `PRD.md` and `prompts.md` exist — no application code has been written yet. When implementing, work through `prompts.md` step by step rather than building everything at once.

## Commands

- Run the app: open `index.html` directly in a browser (double-click or drag in) — no server needed.
- Run the logic tests: open `js/todos.test.html` directly in a browser; it asserts against `todos.js`'s pure functions and prints pass/fail inline (no test runner/CLI).

## Tech Stack

Vanilla HTML/CSS/JavaScript only — no frameworks, no build tools, no package manager, no ES modules (modules would require a local server, which breaks the `file://` double-click requirement). Scripts are loaded via plain `<script>` tags in a fixed order.

## Architecture

Four scripts, loaded in this order from `index.html`, each exposing its functions on a global namespace object (`Storage`, `Todos`, `Render`) since there are no ES module imports:

- `js/storage.js` — `localStorage` read/write only. Owns the `todoApp.v1` key and the `{version, todos}` envelope. Never throws on corrupt/missing data — returns an empty list and logs instead.
- `js/todos.js` — pure functions only (no DOM, no `localStorage`): create/update/delete/toggle a todo, group todos by due date (overdue/today/this week/later/no date), and compute progress. Because these are pure, they're the thing `todos.test.html` exercises directly.
- `js/render.js` — DOM rendering only. Takes state in, writes DOM out, never mutates state and never attaches event listeners (that's `app.js`'s job). Interactive elements get `data-id` attributes so `app.js` can bind via event delegation.
- `js/app.js` — the only stateful module. Holds `state` (`todos`, `activeCategory`, `editingId`), wires up DOM events, and is the only place that calls both `todos.js` (compute) and `storage.js` (persist) before asking `render.js` to redraw.

**Data flow is one-directional and always full-rerender (no diffing):** user event → `todos.js` pure function produces a new array → `app.js` updates `state` → `storage.js` persists it → `render.js` redraws everything from the new state. This keeps "state always matches what's on screen" as a single invariant instead of tracking incremental DOM patches.

**Key domain rule:** a todo's `dueDate` can be `null`. Progress (the "오늘 할 일" bar) only ever counts todos where `dueDate` is non-null and `<= today` — category filtering changes what's *displayed* but never changes that denominator. See `PRD.md` section 5 if this needs to change.

## Code Style

- All code and comments in English (matches `study_01` convention).
- camelCase for JavaScript identifiers.
