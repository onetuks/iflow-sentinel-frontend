# AGENT.md (Frontend)

> 이 파일은 Claude Code와 Gemini CLI 양쪽에서 공용으로 사용하는 에이전트 지침서입니다.
> 프로젝트 루트에 `AGENT.md`로 두고, 아래처럼 심볼릭 링크(또는 복사본)를 만들어두면
> 두 도구가 각자의 관례 파일명으로도 동일한 내용을 읽습니다.
>
> ```bash
> ln -s AGENT.md CLAUDE.md
> ln -s AGENT.md GEMINI.md
> ```

## 프로젝트 개요

Vue 3 + Tailwind CSS 기반 프론트엔드 프로젝트입니다.
현재는 백엔드가 준비되지 않았거나 병행 개발 중인 단계로, **더미 데이터로 화면을 먼저 완성**하고
추후 실제 백엔드 API로 무리 없이 교체하는 것을 목표로 합니다.

담당자(세영님)는 백엔드(Java/Spring) 경험은 많지만 프론트엔드는 익숙하지 않으므로,
에이전트는 항상 **쉽고 읽기 편한 코드**를 우선하고, 불필요하게 고급 패턴이나 추상화를 넣지 않습니다.

## 기술 스택

- Vue 3 (Composition API 권장, 단 너무 복잡해지면 Options API도 허용)
- Tailwind CSS
- (상태관리는 별도 지시가 없으면 Pinia 등 추가 라이브러리 없이 `ref`/`reactive`로 우선 해결)

## 핵심 규칙

### 1. 더미 데이터는 `db.ts`에 응집

- 모든 목업/더미 데이터는 `src/db.ts` (또는 `src/mocks/db.ts`) 한 곳에 모아둡니다.
- 컴포넌트나 다른 파일에 데이터를 직접 하드코딩하지 않습니다.
- 데이터 구조(타입/인터페이스)도 가능하면 `db.ts`와 같은 곳에서 정의해서, 나중에 백엔드 API 응답 스펙과
  비교하기 쉽게 합니다.

```ts
// src/db.ts 예시
export interface Todo {
  id: number
  title: string
  done: boolean
}

export const todos: Todo[] = [
  { id: 1, title: '샘플 할 일', done: false },
]
```

### 2. API 레이어를 통해서만 `db.ts` 접근

- 컴포넌트는 `db.ts`를 **직접 import 하지 않습니다.**
- 반드시 `src/api/*.ts` 형태의 API 함수를 통해서 데이터를 가져오고, 그 함수 내부에서만 `db.ts`를 참조합니다.
- 지금은 함수 내부 구현이 `db.ts`를 읽는 것뿐이지만, **나중에 실제 백엔드 fetch 호출로 교체될 자리**라는 것을
  항상 염두에 둡니다. 그래서 함수 시그니처는 실제 API 호출처럼(파라미터, 반환 Promise 등) 설계합니다.

```ts
// src/api/todos.ts 예시
import { todos } from '@/db'
import type { Todo } from '@/db'

// TODO: 추후 실제 백엔드가 준비되면 아래 fetch 호출로 교체
// return fetch('/api/todos').then(res => res.json())
export async function getTodos(): Promise<Todo[]> {
  return Promise.resolve(todos)
}
```

- 컴포넌트에서는 이렇게 사용합니다.

```ts
import { getTodos } from '@/api/todos'

const todos = ref<Todo[]>([])
onMounted(async () => {
  todos.value = await getTodos()
})
```

### 3. Tailwind CSS 사용

- 스타일은 기본적으로 Tailwind 유틸리티 클래스로 작성합니다.
- 커스텀 CSS가 꼭 필요한 경우가 아니면 별도 `.css` 파일이나 `<style>` 블록을 만들지 않습니다.
- 반복되는 클래스 조합이 많아지면, 별도 CSS 클래스로 뽑기보다는 작은 컴포넌트로 분리하는 것을 우선 고려합니다.

### 4. Vue 컴포넌트는 논리적으로 잘 분리

- 하나의 컴포넌트가 너무 많은 역할(데이터 조회 + 목록 렌더링 + 상세 표시 + 폼 처리 등)을 하지 않도록 나눕니다.
- 예: `TodoPage.vue`(페이지, 데이터 로딩 담당) → `TodoList.vue`(목록) → `TodoItem.vue`(개별 항목) → `TodoForm.vue`(입력 폼)
- 페이지 컴포넌트(`views/` 또는 `pages/`)와 재사용 UI 컴포넌트(`components/`)를 디렉토리로 구분합니다.
- 컴포넌트 분리 기준을 코드 안에 주석으로 남기지 않아도 되지만, 파일/폴더 이름만 보고도 역할을 알 수 있게 짓습니다.

### 5. 쉬운 코드 작성 원칙

- 담당자가 프론트엔드에 익숙하지 않다는 점을 항상 고려합니다.
- 다음을 지양합니다: 불필요한 고급 TypeScript 제네릭, 과도한 커스텀 훅/컴포저블 추상화, 이해하기 어려운
  한 줄 압축 코드(예: 중첩 삼항연산자, 체이닝 남용).
- 변수/함수 이름은 역할이 바로 보이도록 명확하게 짓습니다.
- 새로운 개념(예: `computed`, `watch`, 컴포저블 등)을 처음 도입할 때는 코드 상단에 짧은 주석으로
  "왜 이걸 쓰는지" 한 줄만 남겨줍니다. (과한 설명 X, 딱 필요한 만큼만)

## 폴더 구조 예시

```
src/
  db.ts              # 더미 데이터 응집
  api/               # db.ts를 참조하는 API 함수들 (추후 실제 백엔드 호출로 교체될 자리)
    todos.ts
  components/        # 재사용 가능한 작은 UI 컴포넌트
    TodoItem.vue
    TodoForm.vue
  views/             # 페이지 단위 컴포넌트
    TodoPage.vue
  App.vue
  main.ts
```

## 작업 시 체크리스트 (에이전트 자가 점검용)

- [ ] 더미 데이터를 컴포넌트나 다른 파일에 직접 넣지 않았는가? → `db.ts`로 이동
- [ ] 컴포넌트가 `db.ts`를 직접 import하지 않고, `api/` 함수를 거쳤는가?
- [ ] 스타일이 Tailwind 유틸리티 클래스로 작성되었는가?
- [ ] 컴포넌트 하나가 너무 많은 역할을 하고 있지 않은가?
- [ ] 초심자가 읽기에 너무 어려운 문법/패턴이 들어가지 않았는가?

## 향후 계획 (참고용)

- 실제 백엔드가 준비되면 `src/api/*.ts` 내부 구현만 fetch/axios 호출로 교체합니다.
  컴포넌트 코드는 변경되지 않는 것이 목표이므로, API 함수의 파라미터/반환 타입은 지금부터 신중하게 설계합니다.
