# `/app/chat` 대화 모니터링 페이지 설계서

작성일: 2026-03-15  
대상 경로: `http://localhost:3000/app/chat`  
관련 진입점: `http://localhost:3000/app` 좌측 네비게이션 `온보딩 > 대화하기`  
이번 문서 작성 범위: 설계 문서만 작성. 이번 턴에서는 앱 코드 수정 없음.

## 1. 문서 목적

이 문서는 아래 목표를 실제 구현 가능한 수준으로 고정하기 위한 실행 설계 문서다.

1. `/app` 좌측 네비게이션 `온보딩` 그룹에 `대화하기` 버튼을 추가한다.
2. `/app/chat` 페이지를 만들어 `/app/create?tab=chat` 에서 생성한 대화창 인스턴스의 실제 대화 현황을 운영자가 확인할 수 있게 한다.
3. 좌측에는 필터, 성과 요약, 대화 리스트를 두고 우측에는 현재 `/app/create` 의 `전역 프리뷰 > 위젯 UI 프리뷰` 와 같은 시각 언어의 읽기 전용 위젯 프리뷰를 둔다.
4. 템플릿, 인스턴스, 대화 리스트 프리셋 기준으로 필터링하고, 현재 출력된 항목에 대한 성과를 집계한다.
5. 설계뿐 아니라 후속 구현 시 반드시 지켜야 할 실행 정책, 화이트리스트, diff 백업, MCP 테스트 절차를 문서 안에 고정한다.

## 2. 목표 해석과 1차 범위 확정

이번 설계에서 요구사항을 아래처럼 해석한다.

1. `대화창`은 `B_chat_widget_instances` 행을 의미한다.
2. `대화 현황`은 실제 위젯 세션 테이블 `D_conv_sessions` 와 턴 테이블 `D_conv_turns` 를 기준으로 본다.
3. `템플릿별` 필터는 `D_conv_sessions.metadata.template_id` 를 기준으로 한다.
4. `인스턴스별` 필터는 `D_conv_sessions.metadata.widget_instance_id` 를 기준으로 한다.
5. `대화 리스트 별` 필터는 현재 스키마에 별도 list 엔터티가 없으므로 1차 구현에서는 저장된 세션 프리셋으로 정의한다.
6. 우측 프리뷰는 실제 `/embed/...` 위젯 페이지를 iframe 으로 보여 주되, 모니터링 페이지에서는 읽기 전용이어야 한다.
7. 1차 구현에서는 DB 스키마 변경 없이 화면과 API 레이어만으로 완성한다.
8. 1차 구현에서 세션이 orphan 상태이거나 프리뷰 토큰을 만들 수 없는 경우에는 우측 패널에서 raw transcript fallback 을 제공한다.

`대화 리스트` 프리셋은 아래처럼 정의한다.

- `all`: 전체
- `live`: `ended_at is null`
- `closed`: `ended_at is not null`
- `rated`: `satisfaction is not null`
- `unrated`: `satisfaction is null`
- `low_satisfaction`: `satisfaction <= 2`
- `needs_review`: `E_ops_review_queue_items.session_id` 가 존재하는 세션
- `orphan_ref`: 템플릿/인스턴스 참조가 누락된 세션. 관리자 전용 진단 프리셋

## 3. 현재 상태 확인 결과

### 3.1 현재 UI/라우팅

현재 코드 기준 확인 결과는 아래와 같다.

- `src/components/AppSidebar.tsx`
  - `온보딩` 그룹에 현재 `생성하기`, `설치하기`만 있다.
  - `대화하기` 링크는 아직 없다.
- `src/components/AppShell.tsx`
  - `/app/create` 와 `/app/install` 은 타이틀 매핑이 있으나 `/app/chat` 은 없다.
- `src/app/app/create/page.tsx`
  - `CreateWorkspacePage` 를 진입점으로 사용한다.
- `src/components/create/CreateWorkspacePage.tsx`
  - 현재 탭은 `template | chat | agents | kb | api | mcp` 이다.
- `src/components/create/CreateChatTab.tsx`
  - `/api/widget-instances`, `/api/widget-instances/[id]`, `/api/widget-templates` 를 사용해 대화창 인스턴스를 생성/수정/삭제한다.
- `src/components/create/CreateWorkspacePreviewRail.tsx`
  - `전역 프리뷰`, `런처 위치 프리뷰`, `위젯 UI 프리뷰` 를 이미 구현하고 있다.
  - 현재 설계에서 우측 프리뷰 UI의 기준점은 이 컴포넌트다.

### 3.2 현재 API 계약

현재 존재하는 관련 계약은 아래와 같다.

- `GET /api/widget-instances`
  - 대화창 인스턴스 목록 조회
  - `template_id`, `is_active` 필터 지원
  - 응답에 `can_edit`, `can_delete`, `creation_path` 가 포함된다.
- `POST /api/widget-instances`
  - 대화창 인스턴스 생성
- `PATCH /api/widget-instances/[id]`
  - 대화창 인스턴스 수정
  - `rotate_key` 지원
- `DELETE /api/widget-instances/[id]`
  - soft delete 방식으로 `is_active=false`
- `POST /api/widget/init`
  - 위젯 토큰 발급
  - 기존 세션 `session_id` 를 seed 로 받아 해당 세션을 그대로 다시 연다.
- `GET /api/widget/history`
  - 토큰에 포함된 `session_id` 기준 대화 이력 조회
  - `session_id` query override 는 `visitor_id` 가 없으면 거절한다.
- `GET /api/widget/sessions`
  - 토큰의 `visitor_id` 와 템플릿/인스턴스 기준 세션 목록 조회

현재 없는 계약은 아래와 같다.

- 운영 콘솔용 `/app/chat` 전용 대화 모니터링 집계 API
- 세션 필터 옵션, 성과 집계, 리스트 행, 우측 fallback transcript 를 한 번에 다루는 전용 계약

### 3.3 DB 구조와 실제 데이터 관찰

`supabase` MCP 로 확인한 현재 핵심 테이블과 실제 수치는 아래와 같다.

- `public.B_chat_widget_instances`: 0 rows
- `public.B_chat_widgets`: 3 rows
- `public.D_conv_sessions`: 1517 rows
- `public.D_conv_turns`: 677 rows
- `public.E_ops_review_queue_items`: 0 rows

추가 확인 결과:

- `D_conv_sessions` 에서 `nullif(trim(metadata->>'widget_instance_id'), '') is not null` 인 세션 수: 1309
- `D_conv_sessions` 에서 `template_id` 는 있으나 `widget_instance_id` 는 없는 세션 수: 8
- 세션 메타데이터에 등장하는 distinct `widget_instance_id`: 18개
- 세션 메타데이터의 `widget_instance_id` 가 현재 `B_chat_widget_instances` 와 매칭되지 않는 orphan 세션 수: 1309
- 세션 메타데이터의 `template_id` 가 현재 `B_chat_widgets` 와 매칭되지 않는 orphan 템플릿 세션 수: 92
- `D_conv_sessions.satisfaction is not null` 인 세션 수: 3
- `D_conv_sessions.satisfaction` 평균: `3.33`

중요한 함정:

1. `metadata ? 'widget_instance_id'` 는 값이 `null` 이어도 `true` 가 될 수 있다.
2. 따라서 집계와 필터는 반드시 `nullif(trim(metadata->>'widget_instance_id'), '')` 기준으로 해야 한다.
3. 현재 데이터에는 orphan 세션이 많으므로, `/app/chat` 는 반드시 left join + fallback label + transcript fallback 을 지원해야 한다.

### 3.4 우측 프리뷰 가능 조건

현재 위젯 히스토리/프리뷰 계약을 보면 아래 조건이 성립한다.

1. 세션 메타데이터에 `widget_instance_id` 가 들어 있는 세션은 instance mode 토큰으로 열어야 한다.
2. 같은 세션을 template mode 로 열면 `/api/widget/history` 에서 `SESSION_WIDGET_MISMATCH` 로 거절된다.
3. 따라서 instance 세션의 인스턴스 행과 public key 가 사라진 경우 실제 위젯 iframe 프리뷰는 재생할 수 없다.
4. template-only 세션은 템플릿 row 와 public key 만 있으면 iframe 프리뷰가 가능하다.
5. 모니터링 페이지 우측 패널은 `iframe preview 가능` 과 `raw transcript fallback` 두 모드를 모두 가져야 한다.

## 4. 실행 정책 (필수 준수)

아래 정책은 본 설계의 후속 구현 또는 수정에서 100% 준수한다.

### 4.1 수정 허용 화이트리스트 제안

현재 요구사항을 구현하기 위해 1차로 허용할 파일은 아래로 한정한다.  
아래 목록은 제안안이며, 사용자 명시적 확정 전에는 코드 수정에 착수하지 않는다.

| 파일 | 구분 | 수정 목적 |
|---|---|---|
| `src/components/AppSidebar.tsx` | 기존 | `온보딩 > 대화하기` 링크 추가 |
| `src/components/AppShell.tsx` | 기존 | `/app/chat` 페이지 타이틀 매핑 추가 |
| `src/app/app/chat/page.tsx` | 신규 | `/app/chat` 라우트 진입점 생성 |
| `src/components/chat/ChatWorkspacePage.tsx` | 신규 | `/app/chat` 전체 컨테이너, 필터 상태, 좌우 레이아웃 |
| `src/components/chat/ChatMonitoringSummary.tsx` | 신규 | 성과 카드 렌더링 |
| `src/components/chat/ChatMonitoringPreviewPanel.tsx` | 신규 | 우측 프리뷰 패널, iframe/fallback 분기 |
| `src/components/widget/WidgetConversationPreviewCard.tsx` | 신규 | `위젯 UI 프리뷰` 공통 하위 컴포넌트 |
| `src/components/create/CreateWorkspacePreviewRail.tsx` | 기존 | 공통 preview card 재사용으로 중복 제거 |
| `src/lib/conversation/server/chatMonitoring.ts` | 신규 | 세션 메타데이터 정규화, 필터링, 집계, preview target 해석 |
| `src/lib/widgetConversationPreview.ts` | 신규 | 읽기 전용 preview overrides, iframe src 조립 helper |
| `src/app/api/chat-monitor/route.ts` | 신규 | 필터 옵션, 성과 요약, 세션 리스트 제공 |
| `src/app/api/chat-monitor/[sessionId]/route.ts` | 신규 | 선택 세션 상세, fallback transcript 제공 |

화이트리스트 운영 규칙:

1. 위 파일 외 수정이 필요하면 즉시 중단한다.
2. 추가 후보는 파일 단위로만 제안한다.
3. 폴더 전체 허용, 범용 리팩터링, 무관한 타입 정리, 스타일 청소는 금지한다.
4. 새 파일도 whitelist 항목으로 명시된 경우에만 생성한다.

### 4.2 수정 전 이해확정 절차

후속 구현 시작 전 아래 이해 항목을 번호 목록으로 사용자에게 다시 제시하고, 사용자 명시적 확정을 받은 뒤에만 수정한다.

1. `/app/chat` 라우트를 새로 만든다.
2. 좌측 네비게이션 `온보딩` 그룹에 `대화하기` 링크를 추가한다.
3. 데이터 원본은 `D_conv_sessions`, `D_conv_turns`, `D_conv_sessions.metadata.template_id`, `D_conv_sessions.metadata.widget_instance_id` 이다.
4. `대화 리스트` 는 별도 테이블이 아니라 세션 프리셋 필터다.
5. 우측 패널은 `CreateWorkspacePreviewRail` 의 `위젯 UI 프리뷰` 와 동일한 시각 언어를 재사용하되 읽기 전용이어야 한다.
6. orphan 세션은 숨기지 않고 표기하되, iframe 프리뷰가 안 되면 fallback transcript 로 본다.
7. 1차 구현은 DB schema 변경 없이 진행한다.
8. 화이트리스트 외 파일은 수정하지 않는다.

사용자가 아래와 같이 확정하기 전에는 코드 수정 금지:

```text
위 8개 이해 항목이 맞습니다. 이 화이트리스트 범위로 구현하세요.
```

### 4.3 변경 기록 및 롤백 보장

코드 수정 시 아래 절차를 반드시 수행한다.

1. 수정 직전 파일 상태를 `C:\dev\1227\mejai3\mejai\docs\diff` 아래에 저장한다.
2. 기존 파일은 전체 파일 또는 수정 구간을 포함한 `.before` 파일로 남긴다.
3. 신규 파일은 `.absent.before` 파일을 만든다.
4. 파일명은 아래 형식을 따른다.

```text
YYYYMMDD-HHMMSS__src__components__AppSidebar.tsx.before
YYYYMMDD-HHMMSS__src__app__app__chat__page.tsx.absent.before
```

5. 한 파일당 한 개의 직전 상태 백업이 있어야 한다.
6. 백업이 누락되면 다음 수정 단계로 넘어가지 않는다.
7. 수정 후에는 변경한 영역을 다시 열어 괄호/타입/닫힘 상태를 검증한다.

### 4.4 확정 범위 외 수정 금지

아래 행위는 금지한다.

1. `/app/create` 전체 레이아웃 리디자인
2. `/app/install`, `/app/embed`, `widget` 런타임 전체 리팩터링
3. unrelated 타입 정리
4. orphan 데이터 정리를 위한 임의 DB 수정
5. `CreateWorkspacePreviewRail` 와 비슷한 preview UI를 복사해 새로 만드는 것

반드시 지켜야 할 원칙:

1. 공통 preview UI 는 `src/components` 하위의 단일 컴포넌트로 정의하고 재사용한다.
2. 세션 메타데이터 해석과 필터 집계는 route 안에서 제각각 구현하지 않고 shared helper 로 모은다.
3. UI 문제를 특정 세션 케이스 예외처리로 막지 말고, preview target contract 와 fallback contract 를 먼저 정의한 뒤 그 계약대로 구현한다.

### 4.5 DB 변경 원칙

1. 1차 구현은 DB DDL 없이 진행한다.
2. 새로운 view, function, index, column 이 필요해지면 임의로 적용하지 않는다.
3. 필요한 SQL 을 문서 또는 응답에 작성해 사용자에게 전달하고, 사용자가 직접 실행하도록 안내한다.
4. DB 구조를 바꾸지 않는 선에서 Node 레이어 집계와 기존 API 재사용을 우선한다.

### 4.6 MCP 테스트 의무

매 실행마다 아래를 수행한다.

1. `supabase` MCP
   - 테이블/컬럼/실데이터 분포를 확인한다.
   - 이번 기능에서 필요한 참조 키가 실제로 어떤 값으로 들어 있는지 검증한다.
2. `chrome-devtools` MCP
   - `/app` 에서 `대화하기` 링크 노출 여부
   - `/app/chat` 진입 여부
   - 템플릿/인스턴스/리스트 필터 작동 여부
   - 좌측 성과 카드와 리스트 갱신 여부
   - 우측 iframe preview 또는 fallback transcript 동작 여부

테스트 기록 규칙:

1. 문서 하단 `체크리스트` 와 `테스트 기록` 에 남긴다.
2. 실패한 경우 에러 원인을 구체적으로 남긴다.
3. MCP 도구 자체가 막혀 있으면 그 사실과 재시도 필요 여부를 기록한다.

## 5. 정보 구조 설계

### 5.1 라우트

- 기본 경로: `/app/chat`
- 쿼리 상태:
  - `templateId=<uuid|all>`
  - `instanceId=<uuid|all>`
  - `list=<all|live|closed|rated|unrated|low_satisfaction|needs_review|orphan_ref>`
  - `sessionId=<uuid>`
  - `previewTab=<chat|list|policy|login>`

기본값:

- `templateId=all`
- `instanceId=all`
- `list=all`
- `previewTab=chat`
- `sessionId` 는 현재 필터 결과의 첫 번째 세션 ID

정책:

1. 필터 상태와 선택 세션 상태는 반드시 URL 과 동기화한다.
2. 새로고침 후에도 같은 세션과 같은 preview tab 이 유지되어야 한다.
3. `instanceId` 가 특정 값이면 `templateId` 는 해당 인스턴스의 템플릿으로 자동 정합시킨다.

### 5.2 페이지 레이아웃

레이아웃은 `/app/create` 와 동일한 시각 언어를 유지한다.

- 컨테이너: `px-5 py-6 md:px-8`
- 최대폭: `mx-auto w-full max-w-7xl`
- 상단: 제목 + 설명
- 중단: 필터 바
- 하단: 2열
  - 좌측: 성과 카드 + 세션 리스트
  - 우측: 위젯 프리뷰 패널

데스크톱 비율:

- 좌측 `minmax(560px, 1.05fr)`
- 우측 `minmax(420px, 0.95fr)`

모바일:

- 세로 스택
- 선택 세션이 바뀌면 우측 패널 상단으로 자연스럽게 스크롤

### 5.3 좌측 영역 구성

좌측 영역은 아래 순서로 고정한다.

1. 필터 바
2. 성과 카드 4~6개
3. 세션 리스트 카드

권장 성과 카드:

1. `대화 수`
2. `진행 중`
3. `평균 만족도`
4. `만족도 응답률`
5. `평균 턴 수`
6. `후속 지원 요청`

세션 리스트 기본 정렬:

- `coalesce(last_turn_at, started_at) desc`

세션 리스트 권장 컬럼:

1. `세션`
2. `템플릿`
3. `인스턴스`
4. `상태`
5. `만족도`
6. `턴 수`
7. `최근 활동`

### 5.4 우측 영역 구성

우측 패널은 아래 블록으로 구성한다.

1. 선택 세션 헤더
   - 세션 코드
   - 시작 시각 / 종료 시각
   - 템플릿 배지
   - 인스턴스 배지
   - preview 가능 여부 배지
2. `위젯 UI 프리뷰`
   - `chat | list | policy | login` 탭 버튼
   - iframe preview 또는 fallback transcript
3. 세션 메타 요약
   - 만족도
   - outcome
   - orphan 여부
   - review queue 여부

## 6. 공통 UI 재사용 원칙

중복 정의를 막기 위해 아래 규칙을 따른다.

1. 새로운 preview frame 은 `src/components/widget/WidgetConversationPreviewCard.tsx` 하나로 정의한다.
2. `CreateWorkspacePreviewRail.tsx` 의 현재 우측 `위젯 UI 프리뷰` 블록은 위 공통 컴포넌트를 사용하도록 바꾼다.
3. `/app/chat` 우측 패널도 같은 공통 컴포넌트를 사용한다.
4. 좌측 세션 리스트는 가능하면 기존 `CreateListTable` 을 재사용한다.
5. 2열 카드 골격은 `Card`, `PanelCard`, `StateBanner`, `Button`, `SelectPopover` 를 우선 사용한다.

즉, `/app/chat` 를 위해 preview UI 를 복사해서 두 벌 유지하는 방식은 금지한다.

## 7. 데이터 계약 설계

### 7.1 세션 정규화 계약

`src/lib/conversation/server/chatMonitoring.ts` 에 아래 공통 함수를 둔다.

1. `extractSessionWidgetRefs(metadata)`
   - 입력: `D_conv_sessions.metadata`
   - 출력: `{ templateId: string | null, instanceId: string | null, visitorId: string | null }`
   - 핵심 규칙: `nullif(trim(value), '')` 정규화
2. `resolveConversationListPreset(session, reviewQueue)`
   - 입력: 세션 row, review queue flag
   - 출력: `all | live | closed | rated | unrated | low_satisfaction | needs_review | orphan_ref` 중 하나 이상
3. `resolvePreviewTarget(sessionRefs, templateMap, instanceMap)`
   - 출력:
     - `mode: "instance" | "template" | "fallback"`
     - `canPreview: boolean`
     - `reason: "ok" | "instance_missing" | "template_missing" | "public_key_missing" | "widget_mismatch" | "unknown"`
4. `buildChatMonitorSummary(rows)`
   - 현재 필터 결과에 대한 요약 지표 계산

### 7.2 `/api/chat-monitor` 응답 계약

`GET /api/chat-monitor`

query:

- `templateId`
- `instanceId`
- `list`
- `cursor` 또는 `offset`
- `limit`

response 제안:

```ts
type ChatMonitorOverviewResponse = {
  filters: {
    templates: Array<{
      id: string;
      label: string;
      session_count: number;
      missing: boolean;
    }>;
    instances: Array<{
      id: string;
      label: string;
      template_id: string | null;
      session_count: number;
      missing: boolean;
      active: boolean | null;
    }>;
    lists: Array<{
      id: string;
      label: string;
      session_count: number;
      admin_only?: boolean;
    }>;
  };
  summary: {
    session_count: number;
    live_count: number;
    closed_count: number;
    satisfaction_avg: number | null;
    satisfaction_response_rate: number;
    avg_turn_count: number;
    review_count: number;
  };
  items: Array<{
    session_id: string;
    session_code: string | null;
    template_id: string | null;
    template_name: string | null;
    template_missing: boolean;
    instance_id: string | null;
    instance_name: string | null;
    instance_missing: boolean;
    started_at: string | null;
    ended_at: string | null;
    last_turn_at: string | null;
    satisfaction: number | null;
    outcome: string | null;
    turn_count: number;
    preview_target: {
      mode: "instance" | "template" | "fallback";
      can_preview: boolean;
      reason: string;
      template_id: string | null;
      template_public_key: string | null;
      instance_id: string | null;
      instance_public_key: string | null;
    };
  }>;
  selection: {
    default_session_id: string | null;
  };
};
```

### 7.3 `/api/chat-monitor/[sessionId]` 응답 계약

`GET /api/chat-monitor/[sessionId]`

response 제안:

```ts
type ChatMonitorSessionDetailResponse = {
  session: {
    id: string;
    session_code: string | null;
    started_at: string | null;
    ended_at: string | null;
    satisfaction: number | null;
    outcome: string | null;
    template_id: string | null;
    template_name: string | null;
    instance_id: string | null;
    instance_name: string | null;
    template_missing: boolean;
    instance_missing: boolean;
    metadata: Record<string, unknown> | null;
  };
  preview_target: {
    mode: "instance" | "template" | "fallback";
    can_preview: boolean;
    reason: string;
    template_id: string | null;
    template_public_key: string | null;
    instance_id: string | null;
    instance_public_key: string | null;
  };
  transcript: Array<{
    role: "user" | "bot";
    content: string;
    rich_html?: string | null;
    created_at?: string | null;
    turn_id?: string | null;
  }>;
};
```

detail route 의 목적:

1. 우측 패널 fallback transcript 데이터 제공
2. iframe preview 가 불가능한 세션도 모니터링 가능하게 보장

## 8. 필터와 집계 규칙

### 8.1 템플릿 필터

규칙:

1. `metadata.template_id` 기준
2. 템플릿 row 가 있으면 `B_chat_widgets.name` 사용
3. 템플릿 row 가 없으면 라벨을 `[삭제되었거나 누락됨] <template_id>` 로 표기
4. orphan 템플릿도 옵션에서 숨기지 않는다

### 8.2 인스턴스 필터

규칙:

1. `metadata.widget_instance_id` 기준
2. 인스턴스 row 가 있으면 `B_chat_widget_instances.name` 사용
3. 인스턴스 row 가 없으면 `[삭제되었거나 누락됨] <instance_id>` 로 표기
4. 인스턴스 옵션은 현재 템플릿 필터 결과에 종속된다

### 8.3 대화 리스트 프리셋 필터

규칙:

1. 프리셋은 DB 엔터티가 아니라 계산된 목록이다.
2. 리스트 프리셋은 세션 상태와 review queue 존재 여부로 계산한다.
3. `orphan_ref` 는 관리자에게만 노출한다.

### 8.4 성과 집계 규칙

집계는 반드시 현재 필터 결과 전체에 대해 계산한다.

1. `대화 수`: 필터 결과 세션 수
2. `진행 중`: `ended_at is null`
3. `평균 만족도`: `avg(satisfaction)` with null 제외
4. `만족도 응답률`: `count(satisfaction is not null) / count(*)`
5. `평균 턴 수`: `sum(turn_count) / count(*)`
6. `후속 지원 요청`: review queue 존재 세션 수

주의:

1. 만족도 값이 거의 비어 있을 수 있으므로 `null` 과 `0` 을 섞지 않는다.
2. 만족도 평균이 없으면 `-` 로 표기한다.
3. 현재 실데이터 기준 만족도 응답 세션이 3개뿐이므로, 응답률을 함께 보여줘야 숫자 해석이 가능하다.

## 9. 권한 계약

### 9.1 기본 원칙

`/app/chat` 는 운영 콘솔 페이지이므로 로그인 사용자가 본다.  
그러나 보이는 세션 범위는 아무나 전체를 보면 안 된다.

### 9.2 세션 가시성 규칙

1. 인스턴스 row 가 존재하는 세션
   - `widget-instances` API 와 동일하게 admin 또는 `created_by` 또는 `editable_id/usable_id` 기준을 따른다.
2. template-only 세션
   - admin 또는 해당 template `created_by` 사용자만 본다.
3. instance/template 모두 orphan 인 세션
   - 권한 출처를 확인할 수 없으므로 admin 만 본다.

이 규칙은 `/app/chat` 전용 ad-hoc 예외가 아니라, `세션이 어느 widget contract 에 속하는가` 를 판단하는 공통 해석 규칙으로 구현한다.

## 10. 우측 읽기 전용 프리뷰 설계

### 10.1 프리뷰 모드

우측 프리뷰는 두 모드로 나뉜다.

1. `iframe preview`
2. `fallback transcript`

`iframe preview` 조건:

1. `preview_target.mode === "instance"` 이고 `instance_public_key`, `template_id` 가 모두 있다
2. 또는 `preview_target.mode === "template"` 이고 `template_public_key` 가 있다

`fallback transcript` 조건:

1. orphan instance 세션
2. orphan template 세션
3. public key 누락
4. 위젯 mismatch 가 예상되는 경우

### 10.2 읽기 전용 정책

모니터링 페이지의 iframe preview 는 실제 대화를 다시 보내면 안 된다.  
따라서 preview overrides 를 아래처럼 강제한다.

```ts
{
  chat_policy: {
    interaction: {
      inputSubmit: false,
      inputPlaceholder: "모니터링 전용 미리보기입니다.",
    },
    widget: {
      header: {
        newConversation: false,
      },
    },
  },
}
```

추가 규칙:

1. 선택 세션의 `session_id` 를 iframe src 에 넣는다.
2. `visitorId` 는 빈 문자열을 허용한다.
3. 세션 seed 는 `sid=<sessionId>` 로 넘기고, embed 페이지는 init 토큰의 `session_id` 로 history 를 복원한다.
4. template-only 세션만 template mode 프리뷰를 사용한다.
5. instance 세션은 instance mode 로만 연다.

### 10.3 공통 컴포넌트화

아래 구조를 권장한다.

1. `WidgetConversationPreviewCard`
   - 탭 버튼
   - iframe area
   - unavailable state
2. `CreateWorkspacePreviewRail`
   - 위 공통 컴포넌트 사용
3. `ChatMonitoringPreviewPanel`
   - 위 공통 컴포넌트 사용 + fallback transcript wrapping

이 구조로 가면 `위젯 UI 프리뷰` 시각 정의는 한 군데에서만 관리된다.

## 11. 구현 순서

1. `AppSidebar`, `AppShell` 에 `/app/chat` 네비게이션과 타이틀 추가
2. `/app/chat` 라우트와 `ChatWorkspacePage` 생성
3. shared helper `chatMonitoring.ts` 추가
4. `/api/chat-monitor`, `/api/chat-monitor/[sessionId]` 구현
5. `WidgetConversationPreviewCard` 생성
6. `CreateWorkspacePreviewRail` 를 shared preview card 로 전환
7. `/app/chat` 좌측 필터/요약/리스트 UI 구현
8. 우측 iframe preview + fallback transcript 구현
9. URL state 동기화
10. MCP 테스트 및 문서 체크리스트 업데이트

## 12. 비목표

이번 설계의 1차 범위에 포함하지 않는 항목은 아래와 같다.

1. 세션 메타데이터를 정규 컬럼으로 마이그레이션
2. 신규 materialized view 또는 DB function 생성
3. `/app/create?tab=chat` 기능 재설계
4. `/app/install` 과 `/app/embed` 의 전면 리팩터링
5. orphan 데이터 복구 작업

## 13. 리스크와 대응

### 13.1 orphan 세션 비율이 높음

현재 실데이터 기준 instance orphan 세션이 1309건이다.  
이 상태에서는 많은 세션이 iframe preview 를 못 열 수 있다.

대응:

1. 숨기지 않고 리스트에 남긴다.
2. `preview 불가` 배지와 원인을 표기한다.
3. 우측 패널에서 fallback transcript 를 보여 준다.

### 13.2 만족도 데이터가 적음

현재 만족도 응답 세션 수가 3건이다.

대응:

1. 평균만 보여주지 말고 응답률도 함께 노출한다.
2. 표본 수가 너무 적으면 `N=3` 같은 보조 텍스트를 함께 노출한다.

### 13.3 chrome-devtools 검증 차단 가능성

이번 턴에서는 `chrome-devtools` MCP 가 profile lock 으로 막혔다.

대응:

1. 구현 턴 시작 전에 다시 시도한다.
2. 계속 막히면 해당 오류를 테스트 기록에 남기고, 최소한 shell 기반 로컬 응답 확인을 보조로 수행한다.
3. 단, 사용자 정책상 최종 검증은 chrome-devtools MCP 재시도가 필요하다.

## 14. 체크리스트

- [x] `/app/chat` 의 목적과 1차 범위를 정의했다.
- [x] 현재 코드 기준 관련 파일을 식별했다.
- [x] 현재 DB 기준 실제 데이터 함정을 기록했다.
- [x] 템플릿/인스턴스/대화 리스트 필터 계약을 정의했다.
- [x] 좌측 성과/리스트, 우측 preview/fallback 구조를 정의했다.
- [x] whitelist 후보 파일을 파일 단위로 제안했다.
- [x] 이해확정 절차를 명시했다.
- [x] diff 백업 절차를 명시했다.
- [x] MCP 테스트 의무와 기록 형식을 명시했다.
- [x] 1차 구현에서 DB 변경 없이 진행한다는 원칙을 고정했다.

## 15. 테스트 기록

### 2026-03-15 설계 문서 작성 턴

`supabase` MCP

- 성공
- 확인 항목:
  - `public.B_chat_widget_instances`, `public.B_chat_widgets`, `public.D_conv_sessions`, `public.D_conv_turns` 존재 확인
  - row 수 확인
  - `widget_instance_id` null 처리 함정 확인
  - orphan session/orphan template session 수 확인
  - 만족도 응답 수와 평균 확인

`chrome-devtools` MCP

- 실패
- 시도 항목:
  - `list_pages`
  - `new_page` for `http://localhost:3000/app`
  - `new_page` for `http://localhost:3000/app/create?tab=chat`
  - `take_snapshot`
- 실패 원인:
  - `C:\Users\buddd\.cache\chrome-devtools-mcp\chrome-profile` 가 이미 점유되어 profile lock 발생
- 후속 조치:
  - 구현 턴 시작 전에 chrome-devtools MCP 재시도 필요
  - 이번 턴에서는 코드 수정이 아니라 설계 문서 작성만 수행
