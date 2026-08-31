# iFlow Sentinel Frontend

SAP Integration Suite(Cloud Integration) 아티팩트의 규칙 점검 결과를 조회·관리하는 Vue 3 기반 대시보드입니다.

## 기술 스택

- Vue 3 (`<script setup>`, Composition API)
- Vite 8, TypeScript
- Vue Router 4
- Tailwind CSS 4
- lucide-vue-next (아이콘)

## 프로젝트 구조

```
src/
  views/            # 페이지 단위 컴포넌트 (라우트에 매핑)
  components/       # 재사용 가능한 UI 컴포넌트
  composables/      # useAuth, useTaskHub 등 공용 로직
  services/api.ts   # 백엔드 API 호출 레이어
  router/           # Vue Router 설정 및 인증 가드
  types/            # 공용 타입 정의
  utils/            # 스키마 트리 등 유틸리티
```

## 주요 화면 (라우트)

| 경로 | 화면 |
|---|---|
| `/login` | 로그인 |
| `/overview` | 대시보드 개요 |
| `/landscape` | 테넌트/프로젝트 랜드스케이프 (기본 진입 화면) |
| `/rulesets` | 규칙(Rule) 관리 |
| `/run` | 점검 실행 |
| `/report` | 점검 결과 리포트 |
| `/library` | 아티팩트 라이브러리 |
| `/parser-explorer` | 파서 결과 탐색 |
| `/artifact-tracker` | 아티팩트 배포 상태 추적 |
| `/property-explorer` | 프로퍼티 탐색 |
| `/message-reprocess` | 실패 메시지 재처리 |

`/login`을 제외한 모든 화면은 로그인이 필요하며, [src/router/index.ts](src/router/index.ts)의 네비게이션 가드가 인증 여부를 검사합니다.

## 사전 준비

- Node.js (LTS 권장)
- 백엔드 API 서버 (`iflow-sentinel-backend`, 기본 포트 8888)

## 로컬 실행

```bash
npm install
npm run dev
```

`.env` / `.env.production`에서 백엔드 API 주소 등 환경변수를 설정합니다.

## 빌드 / 미리보기

```bash
npm run build      # vue-tsc 타입 체크 + vite build
npm run preview    # 빌드 결과 로컬 미리보기
```

## Docker 빌드

```bash
docker build -t iflow-sentinel-frontend .
```

Nginx([nginx.conf](nginx.conf))로 정적 파일을 서빙합니다.

## 관련 문서

- [.agents/AGENTS.md](.agents/AGENTS.md) — 더미 데이터/API 레이어 분리, Tailwind 사용, 컴포넌트 분리 등 개발 컨벤션
- [references/API.md](references/API.md) — 백엔드 API 명세 (프론트엔드 참고용 사본)
