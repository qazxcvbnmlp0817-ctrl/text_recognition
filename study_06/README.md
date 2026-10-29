# 냉장고 셰프 (study_06)

냉장고 사진에서 재료를 인식하고, 그 재료로 만들 수 있는 레시피를 추천하는 웹 애플리케이션입니다. 요구사항은 `PRD_step1.md` ~ `PRD_step3.md`에 있습니다.

## 실행

```bash
npm install
# .env 작성 (.env.example 참고, OPENROUTER_API_KEY 필수)
npm start          # http://localhost:3000
npm run mock       # API 키·요청 한도 없이 예시 응답으로 화면만 확인
npm test           # 단위·API 테스트 (AI를 실제로 호출하지 않음)
```

포트를 바꾸려면 `.env`의 `PORT`를 고칩니다.

## 단계별 기능

| 단계 | 기능 |
|---|---|
| 1. 재료 인식 | 사진 선택/드래그/카메라 → 브라우저에서 1024px로 축소 → AI가 재료 목록(양, 분류, 확신도) 인식 → 이름 고치기, 삭제, 직접 추가 |
| 2. 레시피 추천 | 재료를 켜고 끄기, 인분·시간·난이도·요리 종류 선택 → 레시피 3개 → 상세 보기(조리 순서 체크) → 다른 레시피 추천 |
| 3. 프로필·저장 | 프로필 여러 개(알레르기, 식단, 싫어하는 재료, 매운맛, 조리 도구, 기본 양념) → 추천에 반영 + 알레르기 2차 검사 경고 → 레시피 저장, 별점, 메모, 만들어 봤어요 → 검색·정렬 → JSON 내보내기/가져오기 |

## AI 모델 (OpenRouter 무료 모델)

| 용도 | 1순위 | 대체 모델 |
|---|---|---|
| 재료 인식 | `google/gemma-4-31b-it:free` | `nvidia/nemotron-3.5-super-vl:free` |
| 레시피 생성 | `nvidia/nemotron-3-ultra-550b-a55b:free` | `google/gemma-4-31b-it:free` |

- 1순위 모델이 한도(429)에 걸리거나 쓸 수 없으면 기다리지 않고 바로 대체 모델로 넘어갑니다. 마지막 모델에서만 2초·5초 간격으로 재시도합니다.
- 모델은 `.env`의 `VISION_MODEL`, `VISION_FALLBACK_MODELS`, `RECIPE_MODEL`, `RECIPE_FALLBACK_MODELS`로 바꿀 수 있습니다 (쉼표로 여러 개).
- 무료 모델은 요청 수 제한이 있고 예고 없이 내려갈 수 있습니다.

## 구조

```
server.js              Express: 정적 파일 + /api/recognize, /api/recipes (API 키는 서버에만)
lib/openrouter.js      OpenRouter 호출, 에러 변환, 429 재시도, 대체 모델
lib/parseJson.js       모델 응답에서 JSON 추출, 재료 목록 정리
lib/validateRecipe.js  레시피 검증, 부족한 재료 재계산
lib/allergyCheck.js    알레르기 키워드(동의어·가공품) 검사
lib/mock.js            MOCK_AI 예시 응답
prompts/               재료 인식·레시피 프롬프트
public/js/             화면 (image, api, recipes, profiles, saved, store, profileView, app)
test/                  node --test 테스트
```

- 프로필과 저장 레시피는 브라우저 localStorage(`fridgeChef.v1`)에만 저장되고 서버로 보내지 않습니다. 추천 요청 때 알레르기·식단 같은 선호 정보만 보냅니다.
- 알레르기 검사는 완벽하지 않습니다. 실제 재료의 성분 표시를 꼭 확인하세요.
