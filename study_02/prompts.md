# 구현 프롬프트: 할 일 관리 앱 (study_02)

PRD.md 기반으로 구현을 5단계로 나눈 프롬프트 모음. 각 단계는 이전 단계 결과물 위에 쌓이며, 순서대로 하나씩 실행한다. 모든 단계에서 `PRD.md`를 기준 문서로 참조한다.

---

## 1단계 — 프로젝트 뼈대 + 데이터 저장소 (`storage.js`)

### 지시사항

`study_02/PRD.md`를 읽고 아래를 구현해라.

1. `study_02/index.html` 생성
   - `<head>`에 `style.css` 링크
   - `<body>`에 최소 골격만: 헤더(제목 + 날짜 표시용 자리), 진행률 바 자리, 입력 폼 자리, 필터 탭 자리, 할 일 목록 자리 — 실제 내용은 비워두고 id/class만 잡아둔다 (2~4단계에서 채움)
   - `<script>` 태그 4개를 **이 순서대로** 로드: `js/storage.js`, `js/todos.js`, `js/render.js`, `js/app.js`
   - ES 모듈(`type="module"`) 쓰지 않음 — `file://`로 더블클릭해서 바로 열려야 함
2. `study_02/style.css` 생성 — 기본 리셋과 레이아웃 변수(간격, 폰트)만. 세부 스타일은 4~5단계에서 채움
3. `study_02/js/storage.js` 생성 — PRD 3.2절 저장 형식(`todoApp.v1` 키, `{version: 1, todos: [...]}`)을 따르는 두 함수:
   - `loadTodos()` — localStorage에서 읽어 `todos` 배열 반환. 키가 없거나 JSON 파싱 실패 시 빈 배열 반환 + 콘솔 경고(5단계에서 배너로 연결할 훅으로 `console.warn` 사용)
   - `saveTodos(todos)` — `{version: 1, todos}` 형태로 저장. `try/catch`로 감싸 저장 실패(용량 초과 등) 시 콘솔 경고만 남기고 예외를 던지지 않음
   - 두 함수 모두 전역 스코프에 노출 (스크립트 태그 로드 방식이므로 `window.Storage = { loadTodos, saveTodos }` 같은 네임스페이스 객체로 묶어서 노출)

### 완료 조건

- `index.html`을 더블클릭해서 열면 에러 없이 빈 화면이 뜬다 (콘솔에 404나 스크립트 에러 없음)
- 브라우저 콘솔에서 `Storage.saveTodos([{id:'1', title:'test', category:'work', dueDate:null, done:false, createdAt:new Date().toISOString()}])` 실행 후 새로고침하면 `Storage.loadTodos()`가 그 항목을 그대로 반환한다
- localStorage에 잘못된 JSON(`localStorage.setItem('todoApp.v1', '{broken')`)을 넣고 새로고침해도 에러 없이 빈 배열이 반환된다

---

## 2단계 — 핵심 로직 (`todos.js`, 순수 함수)

### 지시사항

`study_02/js/todos.js`에 PRD 3.1절(데이터 모델), 4.1절(그룹 규칙), 5절(진행률 계산)을 구현한다. **DOM과 localStorage를 import/참조하지 않는다** — 입력을 받아 출력을 반환하는 순수 함수만 작성한다.

구현할 함수:

- `createTodo(title, category, dueDate)` — 새 할 일 객체 생성. `id`는 `crypto.randomUUID()`, `createdAt`은 현재 시각 ISO 문자열. `title`이 빈 문자열/공백만이면 `null` 반환 (호출부에서 거부 처리). 100자 초과 시 100자로 자르지 않고 그대로 거부(`null`)
- `toggleTodo(todos, id)` — 해당 id의 `done`을 반전시킨 **새 배열** 반환 (원본 불변)
- `updateTodo(todos, id, changes)` — 해당 id 항목에 `changes`(title/category/dueDate 일부)를 병합한 새 배열 반환
- `deleteTodo(todos, id)` — 해당 id를 제외한 새 배열 반환
- `groupByDueDate(todos, today)` — `today`(YYYY-MM-DD 문자열)를 기준으로 `{overdue, today, thisWeek, later, noDate}` 5개 배열로 분류. "이번 주"는 오늘 제외 ~ 이번 주 일요일까지. 각 그룹 내부는 원래 배열 순서(추가 순서) 유지
- `calculateProgress(todos, today)` — `dueDate !== null && dueDate <= today`인 항목만 집계해 `{done: n, total: m}` 반환. `total`이 0이어도 그대로 반환(호출부에서 0 분기 처리)
- `filterByCategory(todos, category)` — `category`가 `'all'`이면 그대로, 아니면 해당 카테고리만 반환

### 완료 조건

- `study_02/js/todos.test.html` 작성 — 위 7개 함수 각각에 대해 최소 2개 이상의 assert를 돌리고 통과/실패를 화면에 목록으로 출력한다. 반드시 아래 경계 케이스를 포함:
  - `groupByDueDate`: 어제/오늘/내일/이번 주 일요일/다음 주 월요일/`dueDate: null` 각각이 올바른 그룹에 들어가는지
  - `calculateProgress`: `total`이 0인 경우, 마감일이 미래뿐인 경우(0/0 아닌 0/0 처리 확인), 지난 항목도 분모에 포함되는지
  - `createTodo`: 빈 문자열, 공백만, 101자 입력 시 `null` 반환
- `todos.test.html`을 브라우저로 열었을 때 모든 테스트가 통과로 표시된다

---

## 3단계 — 화면 렌더링 (`render.js`)

### 지시사항

`study_02/js/render.js`에 "상태를 받아 DOM을 그리는" 함수만 작성한다. **상태를 변경하지 않는다** — 이벤트 리스너도 여기서 달지 않는다(4단계에서 `app.js`가 담당).

구현할 함수 (모두 `window.Render = {...}` 네임스페이스로 노출):

- `renderProgress(container, progress)` — PRD 5절 형식대로 진행률 바와 `n/m (p%)` 텍스트 렌더링. `progress.total === 0`이면 바 대신 "오늘 할 일이 없습니다" 표시
- `renderGroups(container, grouped, today)` — PRD 4.1절 순서(지남→오늘→이번 주→이후→날짜 없음)로 그룹 헤더 + 항목 렌더링. 항목이 0개인 그룹은 헤더까지 생략. 각 할 일 행은 체크박스 + 제목 + 카테고리 배지 + 마감일 + 수정(✏)/삭제(✕) 버튼을 포함하고, 각 인터랙티브 요소에 `data-id="{todo.id}"` 속성을 달아 4단계에서 이벤트 위임으로 바인딩할 수 있게 한다
- `renderDoneState(row, done)` — 완료 항목에 PRD 4.2절대로 취소선 + 흐림 클래스 토글
- `renderFilterTabs(container, activeCategory)` — 전체/업무/개인/공부 탭 렌더링, 현재 선택된 탭에 active 클래스
- `renderErrorBanner(container, message)` / `clearErrorBanner(container)` — PRD 7절 에러 배너용 (5단계에서 연결)

### 완료 조건

- `app.js`가 아직 없어도, 브라우저 콘솔에서 `Render.renderGroups(document.querySelector('#todo-list'), {overdue:[], today:[testTodo], thisWeek:[], later:[], noDate:[]}, '2026-10-14')`를 직접 호출하면 화면에 해당 그룹과 항목이 올바르게 그려진다
- 완료(`done:true`)인 테스트 항목을 넣고 그리면 취소선 스타일이 보인다
- 빈 그룹은 헤더가 DOM에 생성되지 않는다 (개발자도구로 확인)

---

## 4단계 — 상태 관리 및 이벤트 연결 (`app.js`)

### 지시사항

`study_02/js/app.js`에서 `storage.js`/`todos.js`/`render.js`를 조립한다. PRD 6.1절 데이터 흐름을 그대로 따른다:

```
사용자 이벤트 → todos.js 순수 함수로 새 배열 계산
            → app.js의 state 갱신 → storage.save() → render.js 전체 재렌더
```

구현할 내용:

1. 모듈 로드 시 `Storage.loadTodos()`로 초기 `state = { todos: [...], activeCategory: 'all' }` 구성
2. `rerender()` 함수 — 현재 `state`를 기준으로 `Todos.filterByCategory` → `Todos.groupByDueDate` → `Render.renderGroups`, 그리고 `Todos.calculateProgress`(필터와 무관하게 전체 `state.todos` 기준) → `Render.renderProgress`, `Render.renderFilterTabs`를 순서대로 호출
3. 추가 폼 제출 이벤트 — `Todos.createTodo` 호출, `null`이면 PRD 7절대로 입력창 강조 + 안내 문구, 성공하면 `state.todos`에 추가 → `Storage.saveTodos` → `rerender()`
4. 체크박스 클릭(이벤트 위임, `data-id` 사용) — `Todos.toggleTodo` → 저장 → 재렌더
5. 삭제 버튼 클릭 — `confirm()` 확인 후 `Todos.deleteTodo` → 저장 → 재렌더
6. 수정 버튼 클릭 — 해당 행을 편집 모드로 전환(제목/카테고리/마감일 입력 필드로 교체), 저장 시 `Todos.updateTodo` → 저장 → 재렌더, 취소 시 편집 모드만 해제(상태 변경 없음). 동시에 두 행이 편집 모드에 들어가지 않도록 `state.editingId` 하나만 유지
7. 필터 탭 클릭 — `state.activeCategory` 변경 → 재렌더(저장은 하지 않음 — 필터는 영속화 대상 아님)

### 완료 조건

- PRD 8절 수동 체크리스트 중 아래를 직접 실행해 확인한다:
  - 할 일 추가 → 새로고침 → 데이터 유지
  - 완료 토글 → 오늘 진행률 즉시 반영
  - 편집 중 취소 → 원래 값 복원
  - 삭제 확인창에서 취소 → 항목 유지
  - 카테고리 필터 전환 → 진행률 숫자 불변
- 빈 제목으로 추가 시도 시 추가되지 않고 안내 문구가 뜬다

---

## 5단계 — 에러 처리 마무리, 스타일링, 전체 검증

### 지시사항

1. `storage.js`의 콘솔 경고 훅을 `app.js`에 연결 — 로드 실패/저장 실패 시 PRD 7절대로 `Render.renderErrorBanner`로 화면 상단에 배너 표시. 손상된 데이터로 인해 빈 목록이 됐을 때 사용자가 배너를 닫기 전까지는 `saveTodos`를 호출하지 않아 원본 데이터를 덮어쓰지 않도록 한다 (손상 확인 전 자동 저장 금지)
2. `study_02/style.css` 마무리 — PRD 4절 화면 구성(헤더, 진행률 바, 입력 폼, 필터 탭, 그룹 헤더, "지남" 그룹 강조 표시, 완료 항목 취소선/흐림, 편집 모드 입력 필드 스타일) 전부 반영. 반응형까지는 요구되지 않음(데스크톱 브라우저 기준)
3. `<input type="date">`, `title`의 `maxlength="100"` 등 PRD 7절 표의 입력 제약을 HTML 속성으로 최종 점검
4. PRD 8절 수동 체크리스트 전체(1단계~4단계에서 다룬 항목 포함)를 처음부터 끝까지 한 번 더 실행하고, 아래 항목도 추가로 확인:
   - `localStorage.setItem('todoApp.v1', '{broken')` 후 새로고침 → 에러 배너 표시 + 앱이 멈추지 않음
   - 저장된 항목 중 하나에서 `category` 필드를 지운 뒤 새로고침 → 그 항목만 제외되고 나머지는 정상 로드
5. `study_02/js/todos.test.html`을 다시 열어 모든 테스트가 여전히 통과하는지 재확인 (4~5단계 변경으로 순수 함수 시그니처가 깨지지 않았는지)

### 완료 조건

- PRD 8절의 수동 체크리스트 전 항목 통과
- `todos.test.html`의 모든 테스트 통과
- `index.html`을 더블클릭으로 열었을 때(서버 없이) 모든 기능이 정상 동작
- 브라우저 콘솔에 에러/경고가 의도된 것(손상 데이터 테스트 등) 외에는 없음
