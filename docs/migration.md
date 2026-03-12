# Migration Design

## 0. 새 세션 시작 지침

이 절은 `새로운 대화` 에서 LLM 이 이 문서 하나만 읽고 바로 구현을 시작할 수 있도록 만든 실행 규칙이다.
새 세션의 사용자가 아래 한 줄만 입력하더라도, LLM 은 이 절을 기준으로 해석한다.

`C:\dev\1227\mejai3\mejai\docs\migration.md 파일을 확인하고 구현을 시작해주세요`

### 0.1 위 한 줄 명령의 해석 규칙

새 세션의 LLM 은 위 명령을 받으면 아래를 사용자 승인으로 간주한다.

- 이 문서를 현재 작업의 단일 기준 문서로 사용한다.
- 이 문서의 `2.3 Supabase / DB 수정 금지 정책`, `2.4 실행 정책 및 수정 통제`, `2.5 초기 구현 화이트리스트 제안`, `10.1 widget 관련 canonical 매핑`, `13. 꼭 필요한 기능이 빠지지 않게 하는 검증 게이트`, `16. 실행 체크리스트 및 테스트 기록` 을 실제 구현 규칙으로 적용한다.
- writable 권한이 확보되어 있으면 `2.5 초기 구현 화이트리스트 제안` 범위 안에서 바로 구현을 시작한다.

단, 아래 두 경우는 예외다.

- `C:\dev\1227\mejai3\mejaiMigration` 에 쓰기 권한이 없으면 구현을 시작하지 않고, 새 세션 재오픈을 요청한다.
- 구현 중 화이트리스트 밖 파일 수정이 필요해지면 즉시 중단하고 사용자 승인을 요청한다.

### 0.2 새 세션에서 제일 먼저 확인할 것

1. `C:\dev\1227\mejai3\mejaiMigration` 이 writable root 에 포함되어 있는지 확인한다.
2. `C:\dev\1227\mejai3\mejai` 는 읽기 가능하고, 가능하면 같이 writable root 에 포함되어 있는지 확인한다.
3. `supabase` MCP 가 조회 전용으로 사용 가능한지 확인한다.
4. `chrome-devtools` MCP 로 `http://localhost:3000/` 또는 기존 widget 화면 접근이 가능한지 확인한다.

권한이 맞지 않으면 구현을 시작하지 않는다.

권장 새 세션 환경:

- `cwd = C:\dev\1227\mejai3`
- writable roots:
- `C:\dev\1227\mejai3\mejai`
- `C:\dev\1227\mejai3\mejaiMigration`

### 0.3 새 세션의 첫 구현 범위

새 세션의 첫 구현 목표는 `전체 서비스 이식` 이 아니라 `widget-first 독립 프로젝트 성립` 이다.
즉, 첫 패스에서 반드시 구현해야 하는 범위는 아래다.

- `C:\dev\1227\mejai3\mejaiMigration` 에 독립 Next.js 프로젝트 bootstrap 생성
- 기존 `/` 랜딩 복사
- 새 `/dashboard` 생성
- 기존 `/app/conversation` 을 대체하는 `/dashboard/widget`
- 기존 `/app/install` 을 대체하는 `/dashboard/install`
- 기존 `/embed/[key]` 와 동등한 `/embed/[key]`
- widget 관련 API 와 runtime chat API
- widget 이 쓰는 shared conversation UI / design components
- `org_id` 비의존화를 위한 widget runtime 경로 수정

첫 패스에서 `반드시 구현해야 하는 대상` 이 아닌 것:

- `/app/laboratory` 계열 전체
- `/app/eval`
- `/onboarding`
- `/runtime/principles` UI
- governance 운영 API
- `/call/[token]`
- 루트 `/admin`

### 0.4 새 세션의 시작 순서

새 세션의 LLM 은 아래 순서로 바로 실행한다.

1. 이 문서를 끝까지 읽는다.
2. 현재 이해 내용을 짧은 목록으로 사용자에게 보여준다.
3. writable 권한이 맞으면 `2.5 초기 구현 화이트리스트 제안` 범위를 근거로 구현에 착수한다.
4. `docs/diff` 와 동등한 방식으로 변경 직전 상태를 기록한다.
5. `mejaiMigration` bootstrap 을 만든 뒤, landing -> dashboard -> widget settings/install/embed -> widget APIs -> runtime 순으로 이식한다.
6. 각 단계마다 `chrome-devtools` MCP 와 `supabase` MCP 조회로 baseline 및 동작을 검증한다.
7. build 가능 시 `npm run build` 를 실행하고, archive 문자열 잔존 여부를 검색한다.

### 0.5 새 세션에서 질문해야 하는 경우

다음 경우가 아니면 `무엇을 할까요?` 같은 질문 없이 바로 구현을 시작한다.

- `mejaiMigration` 에 쓰기 권한이 없음
- 화이트리스트 밖 파일 수정 필요
- 문서 내 명시되지 않은 신규 keep surface 발견
- baseline 과 실제 구현 충돌로 인해 archive/keep 판정이 다시 필요

### 0.6 새 세션에서 구현 완료 전 반드시 통과해야 하는 최소 기준

- `/` 가 기존 랜딩과 동등하게 렌더링됨
- `/dashboard` 가 생성됨
- `/dashboard/widget` 이 기존 `/app/conversation` 의 핵심 기능을 유지함
- `/dashboard/install` 이 기존 `/app/install?tab=widget` 의 핵심 기능을 유지함
- `/embed/[key]` 가 기존 widget UI 와 동등하게 동작함
- `/api/widget/chat` 또는 동등한 widget chat 경로가 동작함
- archive 대상 route/API 호출이 keep flow 에서 사라짐
- DB 수정 없이 동작함
- `org_id` 컬럼이 DB 에 남아 있어도 서비스 코드가 widget 대화에서 이를 필수 전제로 삼지 않음

## 1. 목표

- 현재 프로젝트 `C:\dev\1227\mejai3\mejai` 를 직접 정리/축소하는 것이 아니라, `C:\dev\1227\mejai3\mejaiMigration` 에서 새 프로젝트를 독립적으로 재구축한다.
- `http://localhost:3000/` 는 현재 랜딩 페이지를 그대로 복사한다.
- 기존 `http://localhost:3000/app` 대신 새 운영 진입점 `http://localhost:3000/dashboard` 를 만든다.
- 최종 목표는 `C:\dev\1227\mejai3\mejai` 폴더를 삭제한 뒤에도 `mejaiMigration` 단독으로 꼭 필요한 기능이 정상 동작하는 상태를 만드는 것이다.
- 본 문서는 GitHub, branch, PR, remote 저장소 전략을 고려하지 않는다. 이전, 비교, 보관, 검증은 모두 로컬 파일 시스템 기준으로 수행한다.

## 2. 핵심 원칙

- 삭제 단위는 개별 페이지가 아니라 `서비스 표면(surface)` 과 `기능군(slice)` 이다.
- 이전 대상은 현재 코드 전체가 아니라 `필수 기능만 포함한 독립 제품` 이다.
- 기존 `mejai` 코드는 새 프로젝트의 런타임 의존성이 되면 안 된다.
- `page.tsx` 는 라우트 엔트리만 맡고, 실제 구현은 `src/features/...` 로 분리한다.
- 불필요한 범위는 먼저 사용자와 함께 확정하고, 그 후에만 제외/삭제한다.
- `꼭 필요한 기능이 빠지는 사고` 를 막기 위해 `SurfaceCatalog -> IntentCatalog -> Reachability 검증` 순서를 강제한다.
- 현재 서비스에서 남겨야 할 핵심 대화 기능은 `위젯 대화(widget conversation)` 이다.
- 서비스 내 체험 대화도 laboratory 가 아니라 `위젯 대화` 기준으로 통일한다.
- 어떤 페이지가 archive 대상이어도, 그 페이지 구현에 쓰였던 공통 컴포넌트가 keep 표면에서 계속 쓰이면 그 컴포넌트는 archive 대상이 아니다.

## 2.1 현재까지 합의된 사용자 결정

이 문서에서 아래 항목은 이미 사용자와 합의된 결정으로 본다.

- `위젯 대화` 는 keep 이다.
- 현재 서비스 내 체험 대화도 `위젯 대화` 로 구현한다.
- `http://localhost:3000/app/laboratory` 페이지의 대화와 기능은 archive 대상이다.
- 단, `app/laboratory` 를 구현하기 위해 사용된 디자인 컴포넌트 중 `위젯 대화` 에서 그대로 쓰이는 컴포넌트는 keep 이다.
- `http://localhost:3000/app/eval` 페이지는 archive 대상이다.
- `http://localhost:3000/onboarding` 페이지와 그 등록 흐름은 archive 대상이다.
- `org_id` 를 필수로 요구하는 현재 런타임 계약은 유지하지 않는다.
- `org_id` 의 필수성 제거는 migration 중 별도의 계약 변경 작업으로 수행한다.

## 2.2 사용자 체크용 분류판

아래 목록은 사용자가 직접 체크하고, 코멘트를 붙이고, 추가 지시를 줄 수 있도록 유지한다.

### 남길 것으로 확정된 대상

- [x] 랜딩 페이지 `/`
- [x] 새 운영 진입점 `/dashboard`
- [x] 위젯 대화 기능군 전체
- [x] 서비스 내 체험 대화용 widget conversation 진입면
- [x] `/app/conversation` widget 템플릿 상세 설정 관리 페이지
- [x] `/app/install` widget 설치/배포 설정 페이지
- [x] `/embed/[key]` 실제 widget 대화 실행 경로
- [x] widget 이 실제 사용하는 shared conversation UI
- [x] widget 이 실제 사용하는 design components
- [x] `POST /api/runtime/chat`
- [x] `src/app/api/runtime/chat/policies/principles.ts` 런타임 정책 파일
- [x] `/api/runtime/governance/config` 현재 `/app/conversation` 의 `ChatSettingsPanel` 이 직접 사용하는 설정 API
- [x] 인증 관련 최소 진입면
- [x] `org_id` 를 더 이상 필수로 사용하지 않도록 바꾸는 코드 계약 변경

### 배제할 것으로 확정된 대상

- [x] `/app/laboratory` 페이지 자체
- [x] `/api/laboratory/*`
- [x] laboratory 전용 controller/transport/log/transcript 흐름
- [x] `/app/eval`
- [x] `/onboarding`
- [x] org_id 생성/등록/연결 UI 흐름
- [x] org_id 가 없으면 등록을 막는 기존 온보딩 전제
- [x] `/runtime/principles` 페이지 UI
- [x] `/api/runtime/governance/*` 중 `config` 를 제외한 proposal/review/self-heal/admin 운영 API
- [x] 루트 `/admin` 랜딩 편집기
- [x] `/call/[token]` 통화용 실시간 입력 경로
- [x] call 전용 websocket 흐름과 화면 계약
- [x] governance 전용 운영 UI 와 self-update 흐름

### 미확정 대상

- 현재 기준으로 없음
- 신규 표면이 발견되었는데 keep 연관성이 즉시 판정되지 않으면 그때만 `decision_required` 로 추가한다.

## 2.3 Supabase / DB 수정 금지 정책

이 정책은 설계 단계와 구현 단계 모두에서 강제한다.

- Supabase MCP 는 `조회 전용(read-only)` 으로만 사용한다.
- LLM 이 Supabase 를 통해 DB 데이터나 스키마를 직접 수정하는 행위는 금지한다.
- 금지 대상에는 `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, migration 적용, schema 변경, 데이터 backfill 이 모두 포함된다.
- `org_id` 제거 작업은 `DB 컬럼 삭제` 가 아니라, `서비스 코드가 org_id 를 더 이상 사용하지 않게 바꾸는 작업` 으로 정의한다.
- 즉, migration 동안 `org_id` 컬럼과 기존 데이터는 DB 에 그대로 남아 있어야 한다.
- 먼저 서비스 코드에서 `org_id` 비의존 상태를 만들고, 실제 서비스에서 해당 컬럼이 전혀 사용되지 않는 것이 확인된 뒤에만 DB 변경을 별도 단계로 검토한다.
- DB 변경이 필요해지더라도 LLM 이 직접 실행하지 않는다.
- DB 변경이 필요하면 SQL 초안만 문서 또는 응답으로 제공하고, 실제 실행은 사용자가 직접 수행한다.
- MCP 검증이 필요할 때도 DB 수정이 아니라 `조회`, `상태 확인`, `읽기 검증` 만 수행한다.

## 2.4 실행 정책 및 수정 통제

이 절은 설계 단계와 구현 단계 모두에서 100% 준수한다. 아래 조항은 요약 규칙이 아니라 실제 실행 규칙이다.

### 2.4.1 수정 전 이해확정 절차

- 수정 적용 전, 현재 요청에 대한 이해 내용을 목록으로 정리한다.
- 정리된 이해 내용에 대해 사용자와 실행 의도가 일치하는지 확인한다.
- 사용자 확정 없이 임의로 구현이나 범위 확장을 시작하지 않는다.
- 이미 확정된 문서 결정이 있더라도, 새 기능군 추가/제거처럼 범위를 바꾸는 경우에는 다시 이해확정을 거친다.

### 2.4.2 변경 기록 및 롤백 보장

- 코드 또는 문서를 수정하는 경우, 수정 직전 상태를 반드시 `C:\dev\1227\mejai3\mejai\docs\diff` 아래에 기록한다.
- 기록은 수정된 파일 전체 또는 수정 구간을 충분히 복원할 수 있는 형태여야 한다.
- 기록 누락 상태에서는 다음 수정 단계로 진행하지 않는다.
- 롤백 기준은 GitHub 가 아니라 로컬 백업 파일이다.

### 2.4.3 확정 범위 외 수정 금지

- 사용자가 확정한 범위를 넘어서는 변경은 수행하지 않는다.
- 범위 확장이 필요하면 이유와 예상 수정 파일을 먼저 제안하고, 사용자 승인 후에만 진행한다.
- 인코딩, UI, 계약 변경처럼 영향 범위가 큰 수정은 특히 범위 외 변경을 금지한다.

### 2.4.4 수정 허용 화이트리스트 운영 규칙

- 수정 허용 화이트리스트는 `파일 단위` 로만 제안/승인한다.
- 폴더 단위 제안은 금지한다.
- 화이트리스트 밖 파일 수정이 필요하면 즉시 중단하고 사용자 승인을 받는다.
- 구현 착수 전에는 설계 내용에 맞춰 예상 수정 파일을 LLM 이 먼저 제안하고, 사용자 승인 후에만 화이트리스트를 확장한다.
- 현재 문서 정리 단계에서 승인된 파일은 아래 두 경로뿐이다.
- `C:\dev\1227\mejai3\mejai\docs\migration.md`
- `C:\dev\1227\mejai3\mejai\docs\diff\migration.md.*.before`

### 2.4.5 MCP 테스트 의무

- 매 실행마다 `supabase` MCP 와 `chrome-devtools` MCP 로 현재 판단 또는 수정 의도가 맞는지 확인한다.
- Supabase MCP 는 조회만 사용한다.
- DB 변경이 필요한 경우에도 MCP 로 실행하지 않고 SQL 초안만 제공한다.
- `chrome-devtools` MCP 는 현재 로컬 서비스의 실제 경로/화면/동작 연결을 확인하는 데 사용한다.
- 수행한 테스트와 결과는 문서 하단의 `실행 체크리스트 및 테스트 기록` 에 남긴다.

## 2.5 초기 구현 화이트리스트 제안

아래 목록은 `mejaiMigration` 첫 구현 단계에서 수정 또는 생성이 예상되는 파일의 초기 제안안이다.
이 목록은 `파일 단위` 제안이며, 사용자 승인 전에는 실제 구현 화이트리스트로 확정하지 않는다.
목록 밖 파일 수정이 필요하면 이유와 함께 별도 승인을 다시 받는다.

### 2.5.1 새 프로젝트 bootstrap 파일

- `C:\dev\1227\mejai3\mejaiMigration\package.json`
- `C:\dev\1227\mejai3\mejaiMigration\tsconfig.json`
- `C:\dev\1227\mejai3\mejaiMigration\next.config.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\layout.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\app\page.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\app\dashboard\page.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\app\dashboard\widget\page.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\app\dashboard\install\page.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\app\embed\[key]\page.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\public\widget.js`

### 2.5.2 widget 관련 API 파일

- `C:\dev\1227\mejai3\mejaiMigration\app\api\user-profile\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\runtime\chat\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\runtime\governance\config\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget\init\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget\history\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget\chat\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget\event\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget\sessions\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget-templates\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget-templates\[id]\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget-templates\[id]\chat-policy\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\widget-instances\route.ts`
- `C:\dev\1227\mejai3\mejaiMigration\app\api\kb\samples\route.ts`

### 2.5.3 feature / shared UI / runtime 파일

- `C:\dev\1227\mejai3\mejaiMigration\src\features\landing\LandingPage.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\features\dashboard\DashboardHomePage.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\features\widget\WidgetSettingsPage.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\features\widget\WidgetInstallPage.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\features\widget\WidgetEmbedPage.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\shared\conversation-ui\ChatSettingsPanel.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\shared\conversation-ui\ConversationThread.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\shared\conversation-ui\WidgetConversationLayout.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\shared\design-system\widget\WidgetUI.parts.tsx`
- `C:\dev\1227\mejai3\mejaiMigration\src\catalogs\surfaceCatalog.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\catalogs\intentCatalog.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\conversation\pageFeaturePolicy.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\widgetRuntimeConfig.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\widgetTemplateMeta.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\widgetToken.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\runtimeFlags.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\serverAuth.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\lib\supabaseAdmin.ts`
- `C:\dev\1227\mejai3\mejaiMigration\src\features\runtime\chat\policies\principles.ts`

### 2.5.4 승인 전제

- 위 목록은 `초기 제안안` 이다.
- 사용자가 이 목록을 확인해 승인하기 전에는 `mejaiMigration` 실제 구현 화이트리스트로 간주하지 않는다.
- landing 정적 asset 복사에 필요한 개별 파일은 별도 inventory 후 다시 파일 단위로 제안한다.

## 3. 왜 단순 삭제가 위험한가

현재 레포는 페이지/라우트 수보다 실제 운영 노출면이 훨씬 작고, 숨은 참조가 남아 있어 `화면 하나씩 삭제` 방식이 안전하지 않다.

### 현재 구조에서 확인된 위험

- UI 페이지는 35개, API 라우트는 72개인데 실제 운영 메뉴는 `src/components/AppSidebar.tsx` 기준 약 14개 수준이다.
- 서비스가 스스로 안내하는 핵심 흐름은 `src/components/HelpPanel.tsx` 기준 `통화/세션 -> KB -> 규칙 -> 후속 지원 -> 설정` 이다.
- 숨은 페이지 중 일부는 dead route가 아니라 공유 구현체다.
- `src/app/app/agents/page.tsx` 와 `src/app/app/kb/page.tsx` 가 `src/app/app/agents-kb/page.tsx` 를 직접 import한다.
- 관리 화면도 비슷하게 결합돼 있다.
- `src/app/app/admin/page.tsx` 가 `src/app/app/design-system/page.tsx` 의 구현을 직접 가져온다.
- redirect 전용 페이지와 stale 경로가 남아 있다.
- `src/app/app/settings/page.tsx` 는 숨은 `/app/conversation` 으로 우회한다.
- `/app/audit`, `/app/team`, `/app/admin/design-system` 은 redirect 전용이다.
- `src/components/AppShell.tsx` 에는 실제 화면이 없는 `/app/analytics` 매핑이 남아 있다.
- 런타임 intent 정의가 단일 소스가 아니다.
- `intentContractRuntime.ts`, `intentCapabilityRuntime.ts`, `intentSlotPolicy.ts`, `runtimeOrchestrator.ts` 에 같은 축이 중복된다.

이 구조에서는 개별 파일 삭제보다 `표면 -> 기능군 -> 참조 그래프` 순서가 먼저다.

## 4. 이번 마이그레이션의 기본 전략

이번 이전은 `기존 프로젝트 축소` 가 아니라 `새 독립 프로젝트 구축` 이다. 따라서 기준은 다음과 같다.

- 기존 `mejai` 는 분석 원본(source baseline) 으로만 사용한다.
- 새 서비스는 `mejaiMigration` 에서만 빌드/실행/배포 가능한 구조로 만든다.
- `/app` 구조는 그대로 복제하지 않고 `/dashboard` 구조로 재설계한다.
- 기존 코드에서 필요한 부분만 추출하되, 숨은 페이지/우회 경로/데모 기능을 끌고 오지 않는다.
- 삭제 대신 로컬 보관본을 남기고, 새 프로젝트 작업 트리에는 죽은 코드를 남기지 않는다.

## 5. "불필요한" 범위를 먼저 확정하는 절차

이번 작업에서 `불필요한` 은 개발자가 단독으로 판정하지 않는다. 아래 절차를 거쳐 확정한다.

### 5.1 확정 단위

다음 단위로만 판정한다.

- 서비스 표면: 사용자가 직접 접근하거나 외부 시스템이 호출하는 라우트/API 계약
- 기능군: 하나의 목적을 위해 함께 움직이는 페이지/API/컴포넌트/정책/런타임 로직 집합
- 런타임 intent: 주문변경, 환불, 배송조회, 재입고 등 대화 기능 계약

### 5.2 판정 상태

SurfaceCatalog 에 각 항목을 아래 상태로 둔다.

- `keep`: 새 프로젝트에 반드시 이식
- `deprecate`: 즉시 이식하지 않지만 직접 접근/호출이 남아 있는지 관찰 또는 호환 처리 필요
- `archive`: 새 프로젝트에 포함하지 않음
- `decision_required`: 현재 정보만으로 삭제 여부를 확정할 수 없음. 사용자 확인 후 `keep/deprecate/archive` 로 변경

### 5.3 "불필요한" 판정 기준

다음 중 하나라도 해당하면 기본적으로 `keep` 쪽으로 본다.

- 핵심 운영 흐름에 포함된다
- 외부 계약 URL/API 이다
- 인증, 온보딩, 세션, 데이터 조회/수정의 필수 경로다
- 런타임 핵심 intent 를 지원한다
- 다른 keep 기능이 직접 호출한다
- archive 대상 페이지에서 왔더라도 keep 기능이 실제로 재사용하는 공통 컴포넌트/유틸이다

다음에 해당하면 기본적으로 `archive` 후보로 본다.

- 데모/디자인 시스템/실험/내부 검증 용도다
- redirect 전용이다
- placeholder/mock 성격이다
- 메뉴에 없고 실제 운영 계약도 아니다
- keep 기능 없이도 독립 가치가 없다

새로운 표면을 발견했는데 keep 기능과의 직접 연결 여부가 즉시 입증되지 않으면 `decision_required` 로 둔다.

### 5.4 사용자와 함께 확정할 산출물

마이그레이션 착수 전 아래 표를 먼저 완성한다.

| Surface ID | 현재 경로/계약 | 직접 사용자/호출자 | 핵심 흐름 포함 여부 | 새 프로젝트 필요 여부 | 상태 |
| --- | --- | --- | --- | --- | --- |
| landing | `/` | 외부 방문자 | 예 | 예 | keep |
| dashboard-core | `/dashboard` 예정 | 운영자 | 예 | 예 | keep |
| widget-suite | `/app/conversation`, `/app/install`, `/embed/[key]`, `widget*` | 운영자, 체험 사용자, 외부 위젯 호출자 | 예 | 예 | keep |
| conversation-ui-shared | laboratory 와 widget 이 함께 쓰는 대화 UI 컴포넌트 | 내부 구현 | 예 | 예 | keep |
| laboratory-surface | `/app/laboratory`, `/api/laboratory/*` | 내부 운영/실험 | 아니오 | 아니오 | archive |
| eval-surface | `/app/eval` | 내부 placeholder | 아니오 | 아니오 | archive |
| onboarding-org-scope | `/onboarding`, org_id 등록 흐름 | 내부 등록 흐름 | 아니오 | 아니오 | archive |
| runtime-org-contract | org_id 필수 런타임/프로필/가드 로직 | 내부 계약 | 아니오 | 예, 단 계약 변경 필요 | keep |
| runtime-principles-policy | `src/app/api/runtime/chat/policies/principles.ts` | widget runtime 내부 | 예 | 예 | keep |
| governance-config-bridge | `/api/runtime/governance/config` | `/app/conversation` 설정면 | 예 | 예, 현행 의존 유지 동안 필요 | keep |
| runtime-principles-ui | `/runtime/principles` | 내부 운영 | 아니오 | 아니오 | archive |
| governance-admin-suite | `/api/runtime/governance/*` 중 `config` 제외 | 내부 운영 | 아니오 | 아니오 | archive |
| landing-admin-root | `/admin` | 내부 운영 | 아니오 | 아니오 | archive |
| call-surface | `/call/[token]` | 통화용 입력 사용자 | 아니오 | 아니오 | archive |

이 표에서 `decision_required` 가 남아 있으면 해당 기능군은 삭제도 이식도 확정하지 않는다. 현재 문서 기준으로는 미확정 항목이 없다.
`runtime-org-contract` 의 keep 의미는 DB 컬럼 유지가 아니라, 코드 계약을 `org_id 비의존` 으로 바꾸는 작업이 필요하다는 뜻이다.

## 6. 초안 기준의 Surface 분류

현재 코드베이스를 기준으로 한 1차 초안은 아래와 같다.

### 기본 유지 후보

- 랜딩/인증/회원가입/검증/비밀번호 재설정
- `/dashboard`
- `/dashboard/calls`
- `/dashboard/contacts`
- `/dashboard/review`
- `/dashboard/kb`
- `/dashboard/rules`
- 최소 설정
- 위젯 대화 기능군
- 기존 `/app/conversation` 이 담당하던 widget 템플릿 상세 설정 기능
- 기존 `/app/install` 이 담당하던 widget 설치/배포 기능
- 기존 `/embed/[key]` 가 담당하던 widget 실행 계약
- 서비스 내 체험 대화용 위젯 대화 진입면
- widget 이 사용하는 공유 conversation UI / design components
- `POST /api/runtime/chat`
- `src/app/api/runtime/chat/policies/principles.ts`
- `/api/runtime/governance/config` 현행 설정면 의존 계약

### 구조 분리 후 유지 또는 통합 대상

- 기존 `/app/agents-kb` 구현체
- 기존 `/app/agents`, `/app/kb`

설명:

- 이 경로는 그대로 가져오는 대상이 아니라, 필요한 `KB/에이전트 관리 기능` 만 `src/features/...` 로 추출 후 재구성해야 한다.
- laboratory 에서 보이던 대화 UI 중 widget 이 실제 사용하는 공통 컴포넌트는 `shared conversation ui` 로 분리 후 유지한다.

### 즉시 archive 후보

- `/app/audit`
- `/app/team`
- `/app/admin/design-system`
- `/app/eval`
- `/app/laboratory`
- `/api/laboratory/*`
- `/app/design-system`
- `/onboarding`
- org_id 등록/연결 흐름
- stale `/app/analytics` 참조

설명:

- redirect 전용, demo, placeholder, stale 참조는 새 프로젝트에 포함하지 않는다.
- laboratory page 자체는 archive 대상이지만, 그 안에서 widget 이 재사용하는 컴포넌트는 archive 로 묶지 않는다.
- onboarding page 와 org_id 등록 흐름은 archive 대상이지만, 이를 제거하기 위해 runtime 계약 변경이 선행돼야 한다.

### 코드 확인 후 archive 로 확정된 항목

- `/runtime/principles`
- `/api/runtime/governance/*` 중 `config` 를 제외한 운영 API
- 루트 `/admin`
- `/call/[token]`

설명:

- `/runtime/principles` 경로는 widget runtime 필수 경로가 아니라 governance UI 페이지다.
- widget runtime 이 실제 사용하는 것은 `src/app/api/runtime/chat/policies/principles.ts` 이다.
- `/api/runtime/governance/config` 는 현재 `/app/conversation` 의 `ChatSettingsPanel` 이 직접 조회/저장하므로 keep 로 남긴다.
- `/call/[token]` 은 shared conversation UI 를 일부 재사용하지만, widget conversation 의 필수 표면은 아니다.

### 필수 계약 변경 대상

- runtime 의 `org_id` 필수 가정 제거
- profile/access/onboarding 가드에서 `org_id` 를 전제로 하는 흐름 제거
- 위젯 대화가 `org_id` 없이도 동작하도록 세션/권한/설정 로직 재정의

주의:

- 위 작업은 애플리케이션 코드 계약 변경이며, DB 컬럼 삭제나 데이터 수정 작업을 포함하지 않는다.

## 7. Catalog 설계

새 프로젝트에서 코드 이전 전에 두 개의 중앙 카탈로그를 만든다.

### 7.1 SurfaceCatalog

기능 ID별로 아래를 한곳에서 선언한다.

- `status`: `keep | deprecate | archive | decision_required`
- `pages`
- `apis`
- `components`
- `hooks`
- `runtimeIntents`
- `externalContracts`
- `replacementRoutes`
- `ownerDecision`
- `notes`

예시:

```ts
type SurfaceStatus = "keep" | "deprecate" | "archive" | "decision_required";

type SurfaceCatalogItem = {
  id: string;
  status: SurfaceStatus;
  pages: string[];
  apis: string[];
  components: string[];
  hooks: string[];
  runtimeIntents: string[];
  externalContracts: string[];
  replacementRoutes?: Record<string, string>;
  notes?: string;
};
```

### 7.2 IntentCatalog

주문변경/환불/배송조회/재입고 같은 intent 는 여기서만 정의한다.

- `intentId`
- `label`
- `requiredSlots`
- `capabilities`
- `requiredTools`
- `allowedSurfaces`
- `status`

기존의 다음 중복 정의는 새 프로젝트에서 IntentCatalog 로 단일화한다.

- `intentContractRuntime.ts`
- `intentCapabilityRuntime.ts`
- `intentSlotPolicy.ts`
- `runtimeOrchestrator.ts`

## 8. 기능군(slice) 기준 분리 및 삭제 규칙

삭제는 개별 페이지가 아니라 관련 호출부를 포함한 기능군 단위로만 수행한다.

### widget 기능군은 유지 대상이다

- `/app/conversation`
- `/app/install`
- `/embed/[key]`
- `src/app/api/widget/*`
- `src/app/api/widget-templates/*`
- `src/app/api/widget-instances/*`
- `src/app/api/public-widgets/*`
- `src/app/api/conversation/pages/register/*`
- widget 관련 설정 패널, policy utils, runtime config
- widget 이 실제 사용하는 conversation UI 컴포넌트
- widget 대화에 필요한 runtime/policy/intents
- `src/app/api/runtime/chat/policies/principles.ts`
- `/api/runtime/governance/config` 현재 widget 설정면의 직접 의존

원칙:

- 서비스 내 체험 대화도 widget 기능군으로 수렴한다.
- laboratory 가 아니라 widget 을 기준 구현으로 삼는다.

### laboratory 기능군은 archive 대상이다

- `/app/laboratory`
- `src/app/api/laboratory/*`
- laboratory transport/hook/controller
- laboratory transcript/log 연동
- laboratory 전용 transcript copy 정책

단, 아래는 archive 대상이 아니다.

- widget 이 사용하는 공통 conversation UI 컴포넌트
- widget 이 사용하는 design-system 대화 레이아웃
- widget 이 사용하는 message renderer, formatter, policy helper

즉, laboratory 는 `route/API/controller` 기준으로 버리고, `shared conversation ui` 는 widget 소속으로 재분류한다.

### onboarding + org_id 기능군은 archive/계약변경 대상이다

- `/onboarding`
- org_id 생성/선택/연결 UI
- org_id 없으면 막히는 등록 흐름

단, 아래는 별도 계약 변경으로 유지해야 한다.

- widget 대화 runtime
- 인증 이후 최소 접근 제어
- org_id 제거 후에도 필요한 사용자/세션 식별 로직

### eval 기능군은 archive 대상이다

- `/app/eval`
- eval page 에 연결된 placeholder 데이터/표시 로직

설명:

- 실제 평가를 수행하지 않는 placeholder 이므로 새 프로젝트에 포함하지 않는다.

### governance / principles 기능군은 분리해서 판정한다

유지 대상:

- `src/app/api/runtime/chat/policies/principles.ts`
- `/api/runtime/governance/config`

배제 대상:

- `/runtime/principles`
- `src/app/api/runtime/governance/*` 중 `config` 를 제외한 경로
- proposal/performance/policy 관리 패널
- governance 전용 self-heal/proposal/review 로직

설명:

- `principles` 라는 이름이 같아도 `widget runtime 정책 파일` 과 `governance 운영 페이지` 는 동일 대상이 아니다.
- 현재 `/app/conversation` 이 `ChatSettingsPanel` 을 통해 `/api/runtime/governance/config` 를 직접 사용하므로 이 엔드포인트는 keep 표면에 포함한다.

### call 기능군은 archive 대상이다

- `/call/[token]`
- call 전용 websocket 입력 흐름
- call 전용 상태/입력 UI 계약

단, 아래는 archive 대상이 아니다.

- widget 도 함께 사용하는 공통 `ConversationThread`
- widget 이 재사용하는 design-system 대화 컴포넌트

## 9. 새 프로젝트 구조 원칙

새 프로젝트는 다음 구조를 기본으로 한다.

```text
C:\dev\1227\mejai3\mejaiMigration
  app/
    page.tsx
    dashboard/
    login/
    signup/
    verify/
    forgot/
    call/
    embed/
    api/
  src/
    features/
      landing/
      auth/
      dashboard/
      calls/
      contacts/
      review/
      kb/
      rules/
      settings/
      widget/
      runtime/
    shared/
      conversation-ui/
    catalogs/
      surfaceCatalog.ts
      intentCatalog.ts
```

구조 규칙:

- `page.tsx` 는 feature 구현을 import만 한다.
- feature 구현은 다른 route `page.tsx` 를 직접 import하지 않는다.
- 공통 구현은 `src/features/...` 또는 `src/shared/...` 로 이동한다.
- 새 프로젝트는 기존 `mejai` 의 경로를 relative import 또는 file copy 참조로 사용하지 않는다.

## 10. 라우트 전환 기준

기존 `/app` 을 그대로 살리지 않고 `/dashboard` 로 재배치한다.

### 10.1 widget 관련 canonical 매핑

- 기존 `/app` 메인 홈 -> 새 `/dashboard`
- 기존 `/app/conversation` -> 새 `/dashboard/widget`
- 기존 `/app/install?tab=widget|quickstart|env` -> 새 `/dashboard/install?tab=widget|quickstart|env`
- 기존 `/embed/[key]` -> 새 `/embed/[key]` 유지

주의:

- `UI 동일성` 검증에서 허용되는 차이는 위 canonical route 명칭 전환뿐이다.
- `/app/...` 문구가 설명 텍스트로 남아 있는 경우에는 새 canonical 경로에 맞게 바꿔야 한다.
- archive 대상 메뉴와 링크가 사라지는 것은 허용된 차이지만, widget UI 구조와 상호작용이 바뀌는 것은 허용하지 않는다.

### 새 메인 메뉴

- `/dashboard`
- `/dashboard/calls`
- `/dashboard/contacts`
- `/dashboard/review`
- `/dashboard/kb`
- `/dashboard/rules`
- `/dashboard/settings`

### 대화 기능 전환 원칙

- 서비스 내 체험 대화는 `/app/laboratory` 방식으로 복원하지 않는다.
- 서비스 내 체험 대화가 필요하면 widget conversation 기반 진입면으로 제공한다.
- laboratory 전용 page/controller/api 는 새 프로젝트에 두지 않는다.

### 호환 처리 원칙

- keep 로 확정된 기존 `/app/*` 경로는 새 프로젝트에서 `/dashboard/*` 로 canonical redirect 또는 안내 redirect 를 제공할 수 있다.
- archive 로 확정된 기존 경로는 새 프로젝트에 억지로 살리지 않는다.
- redirect-only, demo, placeholder 경로는 새 프로젝트에서 복원하지 않는다.

## 11. 실행 단계

### Phase 0. 로컬 기준선 확보

- 현재 `mejai` 프로젝트의 주요 화면/라우트/API 목록을 캡처한다.
- 필수 환경 변수 목록을 정리한다.
- 필요 시 `C:\dev\1227\mejai3\_localArchive\mejai_baseline_YYYYMMDD` 와 같이 로컬 보관본을 만든다.

### Phase 1. 범위 확정

- SurfaceCatalog 초안을 작성한다.
- `decision_required` 항목을 사용자와 함께 `keep/deprecate/archive` 로 확정한다.
- 확정 전에는 해당 기능군을 삭제도 이식도 하지 않는다.
- 현재 확정된 항목은 widget keep, `/app/conversation` keep, `/app/install` keep, `/embed/[key]` keep, laboratory archive, eval archive, onboarding archive, `/runtime/principles` archive, `/call/[token]` archive, org_id 필수성 제거다.

### Phase 2. 공유 구현 분리

- 기존 프로젝트에서 어떤 feature가 어떤 route에 묶여 있는지 분리한다.
- 특히 아래는 새 프로젝트에서 직접 분리 대상이다.
- `agents-kb`
- `design-system`
- 필요 시 `conversation`

### Phase 3. 새 독립 프로젝트 생성

- `C:\dev\1227\mejai3\mejaiMigration` 에 새 프로젝트를 만든다.
- 자체 `package.json`, `src`, `public`, `.env` 체계를 갖춘다.
- 기존 프로젝트를 참조하는 import/config/script 를 두지 않는다.

### Phase 4. keep 표면만 이식

- 랜딩 복사
- 인증
- `/dashboard` shell
- 통화/세션
- 고객
- 리뷰 큐
- KB
- 규칙
- 최소 설정
- widget conversation
- widget 이 사용하는 shared conversation ui
- 핵심 런타임 계약

### Phase 5. intent 단일화

- IntentCatalog 를 만든다.
- intent 관련 계약/라벨/capability/tool 허용 여부는 모두 여기서 파생되게 바꾼다.
- 사용하지 않는 intent 는 새 프로젝트에 넣지 않는다.

### Phase 5.1. org_id 계약 제거

- runtime 에서 `org_id` 를 필수 입력처럼 요구하는 로직을 식별한다.
- widget conversation 이 `org_id` 없이도 동작하도록 세션/권한/데이터 접근 계약을 재정의한다.
- onboarding 제거 이후에도 필요한 최소 사용자 식별만 남긴다.
- 이 단계에서는 DB 의 `org_id` 컬럼, 기존 row, schema 를 수정하지 않는다.
- Supabase MCP 는 조회에만 사용하고, DB 변경이 필요하면 SQL 제안만 남긴다.

### Phase 6. deprecate 처리

- `deprecate` 표면은 새 프로젝트에서 직접 이식하지 않는다.
- 대신 필요 시 다음 중 하나로 처리한다.
- `/dashboard` 로 redirect
- 설명 페이지 제공
- 404 또는 410 처리
- 접근 로그 기록

### Phase 7. archive 확정

- Reachability 그래프에서 keep/deprecate 에 연결되지 않는 코드만 archive 처리한다.
- archive 대상은 새 프로젝트에 복사하지 않는다.
- 필요 시 로컬 참조용 보관본만 남긴다.

### Phase 8. 최종 전환

- `mejaiMigration` 단독으로 실행/빌드/동작을 확인한다.
- 기존 `mejai` 폴더명을 변경하거나 삭제한 상태에서 재검증한다.
- 모든 검증 통과 후 기존 `C:\dev\1227\mejai3\mejai` 폴더를 삭제한다.

## 12. Reachability 검증

필수 기능 누락을 막기 위해 `살아남는 표면` 에서 시작하는 참조 그래프를 만든다.

### 시작점

- keep 로 확정된 페이지
- keep 로 확정된 API
- keep 로 확정된 외부 계약
- keep 로 확정된 runtime intent

### 추적 대상

- import 관계
- API 호출 문자열
- route 이동 문자열
- 설정 패널에서 유도하는 숨은 경로
- runtime intent -> tool/capability/handler 연결

### 판정 규칙

- keep/deprecate 에 도달 가능한 코드는 남긴다.
- archive 만 참조하는 코드는 제외 후보로 본다.
- 공유 구현체는 먼저 분리하고 나서 다시 판정한다.

## 13. 꼭 필요한 기능이 빠지지 않게 하는 검증 게이트

다음 조건을 모두 만족해야만 기존 프로젝트 삭제 가능 상태로 본다.

### 빌드/정적 검증

- `mejaiMigration` 에서 `npm install` 성공
- `mejaiMigration` 에서 `npm run build` 성공
- archive 로 분류된 route/API 문자열이 keep 코드에 남아 있지 않음
- 기존 `mejai` 절대/상대 경로 참조가 없음
- 코드 레벨에서 `org_id` 필수 가정이 제거되었음
- DB 변경 없이도 서비스가 동작함

### 핵심 흐름 검증

- `/` 랜딩이 기존과 동일하게 렌더링됨
- `/dashboard` 진입 가능
- `/dashboard/calls` 동작
- `/dashboard/contacts` 동작
- `/dashboard/review` 동작
- `/dashboard/kb` 동작
- `/dashboard/rules` 동작
- `/dashboard/settings` 동작
- widget conversation 체험 진입 가능
- widget 템플릿 상세 설정면이 동작함
- widget 설치/배포 설정면이 동작함
- `/embed/[key]` 또는 그에 준하는 widget 진입 계약이 동작함
- `POST /api/runtime/chat` 정상 응답
- 현재 설정면 의존이 유지되는 동안 `/api/runtime/governance/config` 조회/저장이 widget 설정을 깨뜨리지 않음
- `org_id` 없이도 핵심 widget 대화가 시작 가능

### MCP 기반 archive 제외 검증

- archive 대상으로 확정된 route/API 를 새 프로젝트에서 제거한 뒤에도 widget 관련 MCP 테스트가 모두 통과해야 한다.
- widget flow 중 `404`, `500`, `WIDGET_NOT_FOUND`, blank panel, hydration 오류, 무한 로딩이 발생하면 실패다.
- widget flow 중 제거 대상 경로(`/app/laboratory`, `/api/laboratory/*`, `/app/eval`, `/onboarding`, `/runtime/principles`, `/api/runtime/governance/*` 중 `config` 제외, `/call/[token]`, `/admin`) 요청이 발생하면 실패다.
- keep 코드에서 archive 대상 문자열이 남아 있으면 실패다.

### MCP 기반 intent 회귀 검증

`설계된 모든 대화가 가능하다` 의 의미는 현재 환경에서 가능한 범위까지 각 intent 가 `비정상 종료 없이`, `기존과 동일한 UI 단계` 로 진행된다는 뜻이다.
외부 연동 부재로 실제 business mutation 이 불가능한 경우에도, 현재 서비스와 같은 graceful fallback 응답이 나오면 통과로 본다.

검증 대상 intent:

- `general`
- `faq`
- `shipping_inquiry`
- `order_change`
- `refund_request`
- `restock_inquiry`
- `restock_subscribe`
- `admin_login`

각 intent 공통 통과 조건:

- `/api/widget/chat` 또는 해당 runtime route 가 `200` 또는 현재 서비스와 동등한 제어 가능한 응답을 반환한다.
- 대화 입력창, 전송 버튼, 탭 전환, message renderer 가 깨지지 않는다.
- bot 응답이 비어 있지 않다.
- archive 대상 API 로 우회 호출하지 않는다.
- 현재 서비스와 비교했을 때 대화 단계, prompt 성격, 선택지 UI 가 의미 있게 후퇴하지 않는다.

### MCP 기반 UI 동등성 검증

baseline 은 현재 서비스에서 아래 화면으로 캡처한다.

- `http://localhost:3000/app/conversation`
- `http://localhost:3000/app/install?tab=widget`
- `http://localhost:3000/embed/...&tab=chat`
- `http://localhost:3000/embed/...&tab=list`
- `http://localhost:3000/embed/...&tab=policy`

비교 항목:

- 제목, 탭, 주요 버튼, 입력창, 정책 패널, 설치 코드 영역, preview 영역의 존재 여부
- chat/list/policy 탭 구조
- preview iframe 또는 동등한 preview surface 의 존재 여부
- message bubble, textarea, send button, tab switch, selector 류의 위치와 동작
- `Widget`, `Quickstart`, `Env` 탭 구조
- policy 탭의 `사용자 KB입력란`, `LLM 선택`, `MCP 프로바이더 선택`, `MCP 액션 선택` 노출 여부

허용되는 차이:

- `/app/...` 문구가 `/dashboard/...` 로 바뀌는 것
- archive 대상 메뉴가 사라지는 것
- `org_id` 제거 작업으로 인해 내부 식별 방식이 달라지는 것

허용되지 않는 차이:

- widget 관련 panel 이 사라지는 것
- 버튼/입력창/탭 구조가 줄어드는 것
- preview, install code, policy selector 동작이 사라지는 것
- 동일 입력에서 현재보다 더 이른 단계에서 에러가 나는 것

### 독립성 검증

- `C:\dev\1227\mejai3\mejai` 폴더명을 임시 변경해도 새 프로젝트가 실행됨
- `C:\dev\1227\mejai3\mejai` 폴더를 삭제해도 필요한 asset/config/import 가 깨지지 않음
- DB 에 `org_id` 컬럼이 남아 있어도 서비스 코드가 이를 사용하지 않음

## 14. 로컬 보관 정책

GitHub 를 쓰지 않으므로 archive/복구 기준은 로컬 보관본만 사용한다.

- 기존 원본 보관: `C:\dev\1227\mejai3\_localArchive\mejai_baseline_YYYYMMDD`
- 기능군별 참고 보관: `C:\dev\1227\mejai3\_localArchive\slices\...`
- 새 프로젝트 작업 트리에는 archive 코드를 남기지 않는다.

원칙:

- 복구 가능성을 이유로 새 프로젝트에 죽은 코드를 남기지 않는다.
- 복구 필요 시 로컬 보관본에서만 확인한다.

## 15. 이번 문서 기준의 최종 방향

- `/app` 전체를 복제하지 않는다.
- `/dashboard` 중심의 최소 운영 제품으로 다시 만든다.
- 핵심 대화 기능은 laboratory 가 아니라 widget conversation 으로 수렴한다.
- `불필요한` 범위는 기능군 기준으로 먼저 확정한다.
- 현재 문서 기준으로 미확정 기능군은 없다. 새 항목이 발견되면 keep 연관성이 입증되기 전까지 `decision_required` 로 둔다.
- migration 중에도 `필수 기능 누락 방지` 를 위해 SurfaceCatalog, IntentCatalog, Reachability 검증을 먼저 수행한다.
- laboratory page, eval page, onboarding/org_id 등록 흐름은 제외하되, widget 이 의존하는 shared conversation ui 는 반드시 유지한다.
- `/app/conversation`, `/app/install`, `/embed/[key]`, `src/app/api/runtime/chat/policies/principles.ts`, `/api/runtime/governance/config` 는 keep 기준으로 다룬다.
- `/runtime/principles`, 루트 `/admin`, `/call/[token]`, governance 운영 API 는 archive 기준으로 다룬다.
- runtime 의 `org_id` 필수 계약은 새 프로젝트에서 제거 대상으로 본다.
- 최종적으로 `mejaiMigration` 단독으로 서비스가 성립해야만 기존 `mejai` 삭제를 허용한다.

## 16. 실행 체크리스트 및 테스트 기록

### 체크리스트

- [x] 문서 수정 전 백업 파일을 `docs/diff` 에 기록함
- [x] `미확정 대상` 을 코드 확인 기준으로 재판정함
- [x] Supabase MCP 를 조회 전용으로만 사용함
- [x] Chrome DevTools MCP 로 현재 로컬 서비스 화면을 확인함
- [x] DB 수정은 수행하지 않음
- [x] `mejaiMigration` 초기 구현 화이트리스트 초안을 파일 단위로 작성함
- [x] widget UI 동등성 검증 대상 화면을 baseline 기준으로 정리함
- [x] widget intent 회귀 검증 기준을 문서에 추가함

### 테스트 기록

#### 2026-03-12 문서 분류 업데이트

- Supabase MCP
- `public` 스키마 테이블 목록을 조회해 widget 관련 테이블(`B_chat_widgets`, `B_chat_widget_instances`)이 실제로 존재함을 읽기 전용으로 확인했다.
- `information_schema.columns` 조회로 현재 DB 스키마를 읽기 전용으로 확인했고, 이 과정에서 어떤 DB 수정도 수행하지 않았다.
- Chrome DevTools MCP
- `http://localhost:3000/app/conversation` 페이지를 열어 현재 서비스가 실행 중임을 확인했다.
- 해당 화면이 `위젯 관리 (Conversation)` 으로 렌더링되고, 템플릿 관리와 설치 코드 생성 UI 를 직접 제공함을 확인했다.
- 화면 내부 preview iframe 이 `http://localhost:3000/embed/...` 경로를 직접 생성하는 것을 확인했다.
- 결론
- `/app/conversation`, `/app/install`, `/embed/[key]` 는 widget 기능군과 직접 연결되어 keep 로 분류한다.
- `/runtime/principles` UI, 루트 `/admin`, `/call/[token]`, governance 운영 API 는 widget 핵심 표면과 직접 연결되지 않아 archive 로 분류한다.

#### 2026-03-12 widget baseline 및 contract 확인

- Chrome DevTools MCP
- `http://localhost:3000/app/install?tab=widget` 에서 `Widget / Quickstart / Env` 탭, 템플릿 선택, overrides 입력, 설치 코드, preview URL 이 노출되는 것을 확인했다.
- `http://localhost:3000/embed/...&tab=chat` 에서 `로그 설정`, 입력창, `전송` 버튼, `대화/리스트/정책` 탭이 노출되는 것을 확인했다.
- `http://localhost:3000/embed/...&tab=list` 에서 `과거 대화 목록` 과 empty-state UI 를 확인했다.
- `http://localhost:3000/embed/...&tab=policy` 에서 `사용자 KB입력란`, `LLM 선택`, `MCP 프로바이더 선택`, `MCP 액션 선택` UI 를 확인했다.
- `http://localhost:3000/embed/...&tab=chat` 에서 `환불하고 싶어요` 입력 후 `/api/widget/chat` 이 `200` 으로 응답하고, 현재 환경에서는 외부 연동 부재를 설명하는 graceful fallback 응답이 반환되는 것을 확인했다.
- Supabase MCP
- `A_iam_user_access_maps` 컬럼 조회로 `org_id` 컬럼이 실제 DB 에 남아 있음을 읽기 전용으로 확인했다.
- 코드 확인
- `src/app/api/widget/chat/route.ts` 가 현재 `A_iam_user_access_maps.org_id` 를 읽어 widget runtime payload 에 반영하고 있으므로, `org_id` 제거는 여전히 `코드 계약 변경` 단계가 필요하다.
- 정적 검색 확인
- 현재 레포에는 archive 대상 문자열이 `AppSidebar`, `middleware`, `pageFeaturePolicy`, laboratory transport/client, settings redirect 등 여러 위치에 남아 있음을 확인했다.
- 결론
- 배제 작업은 route 삭제만으로 끝낼 수 없고, widget keep surface 에서 archive 참조가 완전히 사라질 때까지 문자열/호출/설정 패널 수준으로 제거 검증이 필요하다.
- widget 동등성 검증은 `chat`, `list`, `policy`, `install`, `settings` 다섯 표면을 baseline 으로 비교해야 한다.
