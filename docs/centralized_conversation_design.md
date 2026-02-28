# 중앙 대화 관리 설계 (실제 구조 기반, 최소 DB 변경 원칙)

작성일: 2026-02-27
상태: Draft
문서 목적: 모든 대화를 한 곳에서 관리하고, 위젯 생성과 대화 운영이 같은 규칙을 따르도록 합의한다. 이 문서는 구현 지침까지 포함한다.

**변경 원칙 (중요)**
- DB에 번잡한 신규 테이블을 추가하지 않는다.
- 꼭 필요한 컬럼만 최소로 추가한다.
- 기존 테이블과 런타임 구조를 최대한 재사용한다.

**요구사항 요약**
- `/app/conversation`에서 위젯을 페이지별로 다른 설정으로 생성/관리할 수 있어야 한다.
- `/app/conversation`에서 위젯 UI와 실제 대화 흐름을 점검해야 한다. 실제 다른 도메인 설치 환경도 재현해야 한다.
- 같은 설치 코드를 여러 번 넣어도 여러 위젯이 보여야 하며, 각 위젯은 파라미터로 UI 가시성을 달리할 수 있어야 한다.
- 모든 위젯은 KB/MCP 등 대화 설정을 공유해야 하며, 하나는 설정 관리용, 하나는 대화용으로 동시에 사용할 수 있어야 한다.
- 대화 기록은 `D_conv_sessions`에서 `agent_id`와 `widget_id`로 어디서 대화가 진행됐는지 식별할 수 있어야 한다.

---

**현재 구조 요약 (실제 DB/런타임 기준)**
- `B_chat_settings`: 전역 대화 정책. `chat_policy`, `runtime_env` 저장
- `B_chat_widgets`: 위젯 기본 정보. `name`, `agent_id`, `public_key`, `allowed_domains`, `allowed_paths`, `theme`, `is_active`
- `B_bot_agents`: 에이전트 설정. `llm`, `kb_id`, `mcp_tool_ids`, `admin_kb_ids`, `is_active`
- `B_bot_knowledge_bases`: KB
- `C_mcp_tools`: MCP 도구 정의
- `D_conv_sessions`: 대화 세션
- `D_conv_turns`: 대화 턴(메시지)
- `F_audit_events`: 이벤트 로그
- `F_audit_mcp_tools`: MCP 호출 로그
- `F_widget_events`: 위젯 이벤트 로그

현재 런타임 흐름 요약
- 위젯 생성: `POST /api/widgets` -> `B_chat_widgets`
- 위젯 초기화: `POST /api/widget/init` -> `B_chat_widgets` 읽고 `D_conv_sessions` 생성
- 위젯 메시지: `POST /api/widget/chat` -> 내부 `/api/runtime/chat`
- `/app/conversation` 대화 실행: `POST /api/conversation/run` -> 내부 `/api/runtime/chat`

---

**핵심 설계 방향 (DB 최소 변경)**
1. 위젯은 여러 개 생성 가능해야 한다. 새 테이블 없이 `B_chat_widgets`에 여러 레코드로 관리한다.
2. 페이지별 다른 설정은 “위젯을 여러 개 만든다”로 해결한다. 각 위젯은 `allowed_domains`/`allowed_paths`와 `theme`로 구분한다.
3. 같은 위젯을 여러 번 설치할 때의 UI 차이는 DB가 아니라 설치 코드 파라미터로 해결한다.
4. 대화 기록 식별을 위해 `D_conv_sessions`에 `widget_id` 컬럼만 추가한다.

---

**DB 변경 (최소)**
- `D_conv_sessions`에 `widget_id` 컬럼 추가 (nullable, uuid)
- 위젯에서 생성된 세션만 `widget_id`를 채운다.
- `/app/conversation`에서 생성된 대화는 `widget_id = null`로 유지한다.

주의
- 현재 `widget_id`는 `metadata`에도 저장되고 있다. 새 컬럼 추가 후에도 하위 호환을 위해 `metadata` 유지.

---

**/app/conversation 위젯 관리 설계**
- `/app/conversation`에 “위젯 관리 패널”을 추가한다.
- 위젯 목록을 보여주고, 새 위젯 생성/수정/삭제를 할 수 있어야 한다.
- 이 패널은 `/app/install`의 위젯 생성 폼과 동일한 컴포넌트를 재사용한다.

위젯 생성/수정 시 저장되는 항목
- `B_chat_widgets.name`
- `B_chat_widgets.agent_id` (KB/MCP 공유는 이 값이 핵심)
- `B_chat_widgets.allowed_domains`
- `B_chat_widgets.allowed_paths`
- `B_chat_widgets.theme`
- `B_chat_widgets.is_active`

여러 위젯을 사용해 페이지별 설정을 분리하는 방식
- 페이지 A용 위젯: `allowed_domains = [A]`, `allowed_paths = [/support]`
- 페이지 B용 위젯: `allowed_domains = [B]`, `allowed_paths = [/faq]`
- 두 위젯 모두 같은 `agent_id`를 사용하면 KB/MCP 설정이 공유된다.

---

**/app/conversation 위젯 프리뷰(실제 설치 환경 재현)**
목표
- 위젯이 실제 도메인에서 동작할 때의 UI와 대화 흐름을 `/app/conversation`에서 점검

방법
- `/embed/{public_key}`를 iframe으로 로드한다.
- iframe 로드 후 `postMessage`로 `mejai_widget_init`을 전송한다.
- 이 메시지에 `origin`, `page_url`, `referrer`, `visitor_id`를 넣어 실제 도메인 환경을 시뮬레이션한다.

필수 입력 필드 (프리뷰 패널)
- 시뮬레이션 도메인 (origin)
- 시뮬레이션 페이지 URL (page_url)
- referrer
- 테스트 유저 정보 (선택)

이 방식은 현재 `/embed/[key]`의 메시지 핸들러가 이미 지원하는 흐름이다.

---

**같은 설치 코드를 여러 번 사용하기 (UI 파라미터 오버라이드)**
요구사항을 만족하려면 “설치 코드 파라미터”로 위젯 UI를 제어해야 한다.
DB에 별도 레코드를 추가하지 않는다.

설치 코드 예시 (같은 public_key, 다른 UI)
```html
<div id="widget-a"></div>
<div id="widget-b"></div>

<script async src="https://mejai.help/widget.js"
  data-key="mw_pk_xxx"
  data-mode="embed"
  data-container="#widget-a"
  data-view="setup"
  data-show-header="0"></script>

<script async src="https://mejai.help/widget.js"
  data-key="mw_pk_xxx"
  data-mode="embed"
  data-container="#widget-b"
  data-view="chat"
  data-show-header="1"></script>
```

권장 파라미터 (추가 구현 필요)
- `data-mode`: `embed` | `launcher`
- `data-view`: `chat` | `list` | `setup` | `both`
- `data-show-header`: `0` | `1`
- `data-show-logo`: `0` | `1`
- `data-show-status`: `0` | `1`
- `data-show-tabbar`: `0` | `1`
- `data-show-chat-tab`: `0` | `1`
- `data-show-list-tab`: `0` | `1`
- `data-show-policy-tab`: `0` | `1`
- `data-show-chat-panel`: `0` | `1`
- `data-show-history-panel`: `0` | `1`

위 파라미터는 “각 위젯 인스턴스”에만 적용되고, DB에는 저장하지 않는다.

---

**실제 구현 지침 (LLM이 바로 구현 가능하도록)**

1) DB 변경
- `D_conv_sessions`에 `widget_id` 컬럼 추가
- 기존 코드에서 위젯 세션 생성 시 `widget_id`를 함께 저장
- 적용 위치: `src/app/api/widget/init/route.ts`

2) 위젯 API 다중화
- `/api/widgets`는 단일 위젯이 아니라 리스트를 반환해야 한다.
- 신규 위젯 생성은 `POST /api/widgets`로 생성
- 위젯 수정은 `PATCH /api/widgets/:id` 형태로 분리하거나 `POST /api/widgets`에 id를 포함하도록 변경
- 적용 위치: `src/app/api/widgets/route.ts`

3) /app/conversation 위젯 관리 패널
- 위젯 목록 + 생성/수정 UI 추가
- `/app/install`의 `WidgetSettingsPanel` 재사용
- 적용 위치: `src/app/app/conversation/page.tsx`

4) 위젯 프리뷰 패널
- 선택한 위젯을 iframe으로 렌더링
- iframe 로드 후 `postMessage`로 `mejai_widget_init` 전달
- 프리뷰 파라미터 입력 UI 제공
- 적용 위치: `/app/conversation` 내 신규 컴포넌트

5) 설치 코드 파라미터 적용
- `widget.js`에서 `data-show-*` 파라미터를 읽고 embed 런타임에 전달
- `/embed/[key]`에서 해당 파라미터를 UI 가시성에 반영
- 적용 위치:
  - `src/components/design-system/widget/WidgetUI.parts.tsx`
  - `src/app/embed/[key]/page.tsx`

---

**검증 기준 (완료 체크)**
- 위젯을 여러 개 생성할 수 있다.
- 각 위젯은 다른 `allowed_domains`/`allowed_paths`를 갖는다.
- `/app/conversation`에서 여러 위젯을 동시에 프리뷰할 수 있다.
- 같은 public_key를 여러 번 설치해도 위젯이 각각 보인다.
- 각 위젯 인스턴스는 `data-show-*` 파라미터로 UI가 달라진다.
- 위젯 대화 세션은 `D_conv_sessions.widget_id`로 식별된다.

---

필요하면 다음 단계로 실제 구현 순서를 쪼개서 적용할 수 있다.

---

**구현 완료 체크리스트 (진행 표시용)**

상태 표기 기준
- `Not Started` 아직 시작하지 않음
- `In Progress` 진행 중
- `Done` 완료

0. 진행 순서(권장) 및 모드
- [x] 0-1 계약/의도 정합성 확정 (xhigh) (Status: Done)
- [x] 0-2 구현 적용(반복/기계적 변경) (medium) (Status: Done)
- [ ] 0-3 빌드/타입 검증 및 잔여 정리 (medium) (Status: Not Started)

1. 계약/의도 정합성 확정 (xhigh)
- [x] 1-1 `D_conv_sessions.widget_id` 추가 영향 범위 정리 및 하위 호환 기준 합의 (xhigh) (Status: Done)
- [x] 1-2 `/api/widgets` 다중화 계약 확정 (GET 리스트/POST 생성/PATCH 수정 방식) (xhigh) (Status: Done)
- [x] 1-3 `/app/conversation` 위젯 관리 패널 데이터 흐름 및 컴포넌트 재사용 범위 확정 (xhigh) (Status: Done)
- [x] 1-4 `data-show-*` 파라미터 → embed/UI 가시성 매핑 규칙 확정 (xhigh) (Status: Done)

2. D_conv_sessions.widget_id 추가 + 런타임 반영 (medium)
- [x] 2-1 `D_conv_sessions`에 `widget_id` 컬럼 존재 (medium) (Status: Done)
- [x] 2-2 위젯 세션 생성 시 `widget_id` 저장 (`/api/widget/init`) (medium) (Status: Done)
- [x] 2-3 기존 세션 조회/로그 API가 `widget_id` 없어도 정상 동작 (medium) (Status: Done)
- [x] 2-4 `/app/conversation` 대화는 `widget_id = null` 유지 (medium) (Status: Done)

3. /api/widgets 다중 위젯 지원 (medium)
- [x] 3-1 `GET /api/widgets`가 리스트 반환 (medium) (Status: Done)
- [x] 3-2 `POST /api/widgets`로 새 위젯 생성 가능 (medium) (Status: Done)
- [x] 3-3 `PATCH /api/widgets/:id` 또는 `POST /api/widgets`(id 포함) 수정 가능 (medium) (Status: Done)
- [x] 3-4 기존 단일 위젯 사용자 설정 마이그레이션 없이 유지 (medium) (Status: Done)

4. /app/conversation 위젯 관리/프리뷰 패널 적용 (medium)
- [x] 4-1 위젯 목록 표시 (medium) (Status: Done)
- [x] 4-2 위젯 생성/수정/삭제 가능 (medium) (Status: Done)
- [x] 4-3 위젯별 설치 코드 표시 (medium) (Status: Done)
- [x] 4-4 iframe 프리뷰로 실제 도메인 환경 시뮬레이션 (medium) (Status: Done)
- [x] 4-5 `origin`, `page_url`, `referrer` 입력 반영 (medium) (Status: Done)
- [x] 4-6 동일 `public_key` 중복 설치 시 각각 렌더링 (medium) (Status: Done)
- [x] 4-7 `data-show-*` 파라미터로 UI 오버라이드 적용 (medium) (Status: Done)

---
