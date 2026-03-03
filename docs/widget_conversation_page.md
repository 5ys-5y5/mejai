# 위젯 관리(Conversation) 페이지 설계

## 목표
- `/app/conversation`에서 위젯 템플릿을 중앙 관리(생성/조회/수정/삭제)한다.
- 위젯 템플릿은 `에이전트`, `MCP`, `KB`를 선택적으로 가지며 규칙을 강제한다.
  - 에이전트가 확정되면 MCP/KB 선택은 비활성화된다.
  - 에이전트가 없으면 MCP는 필수, KB는 필수(사용자 입력 KB 또는 지정 KB + 관리자 KB)이다.
- 템플릿은 “대화 설정 관리”와 동일한 UI/정책으로 위젯의 대화 정책을 편집할 수 있어야 한다.
- 템플릿은 페이지 내 미리보기(iframe 기반)로 실제 설치 환경과 동일한 기준(origin/page_url/referrer)에서 실행되어야 한다.
- 템플릿은 `/app/install`에서 인스턴스로 복제/변형되어 설치용 위젯을 만들 수 있어야 한다.
- 템플릿은 `/`(Landing) 또는 데모 페이지에서 활용 가능해야 한다.

## 범위
- 신규 페이지: `src/app/app/conversation/page.tsx`
- 템플릿/인스턴스 CRUD API
- 위젯 런타임(`/api/widget/*`)의 정책/설정 반영
- `/app/install` 위젯 생성 흐름 변경
- 공통 UI(대화 정책 관리 UI) 재사용 구조
- 문서 + diff 로그

## 용어
- **위젯 템플릿**: 중앙에서 관리하는 위젯 “틀”.
- **위젯 인스턴스**: 템플릿에서 복제되어 실제 설치되는 위젯.

## 데이터 모델 제안
> 기존 `B_chat_widgets`를 확장하고 템플릿/인스턴스를 모두 수용한다.

필드 추가(DDL):
- `widget_type text not null default 'instance'`  // template | instance
- `template_id uuid null`                         // 인스턴스의 원본 템플릿
- `chat_policy jsonb null`                        // ConversationFeaturesProviderShape 저장
- `setup_config jsonb null`                       // 에이전트/KB/MCP 설정 저장

`setup_config` 예시:
```json
{
  "agent_id": "",
  "kb": { "mode": "inline" | "select", "kb_id": "", "admin_kb_ids": [] },
  "mcp": { "provider_keys": [], "tool_ids": [] },
  "llm": { "default": "chatgpt" }
}
```

호환성:
- 기존 위젯은 `widget_type='instance'`, `chat_policy/setup_config` 없이 동작.
- 런타임은 `chat_policy`가 없으면 기존 org chat_policy로 폴백.

## 정책/설정 적용 규칙
- 템플릿/인스턴스 저장 시
  - `agent_id`가 있으면 `setup_config.mcp/*` 및 `setup_config.kb/*`는 읽기 전용 처리.
  - `agent_id`가 없으면 MCP와 KB 필수 검증.
- 런타임(`/api/widget/init`, `/api/widget/chat`, `/api/widget/stream`, `/api/widget/config`)
  - 위젯 row의 `chat_policy` 우선 사용, 없으면 org chat_policy 사용.
  - `setup_config`를 embed 페이지에서 기본 값으로 사용.

## UI/페이지 설계

### 1) /app/conversation
- 좌측: 템플릿 리스트 (검색/정렬/복제/삭제)
- 우측 탭:
  - **기본 정보**: 이름, 활성 상태, 설명, 템플릿 키(공개키), 생성/수정 일시
  - **구성**: 에이전트/MCP/KB 선택 (규칙 강제)
  - **대화 정책**: “대화 설정 관리”와 동일 UI
  - **미리보기**: iframe + origin/page_url/referrer 오버라이드

### 2) 위젯 구성 규칙
- 에이전트 선택 시
  - MCP/KB 선택 UI 비활성화
  - 런타임 호출 시 `agent_id`만 사용
- 에이전트 미선택 시
  - MCP 필수 (provider 또는 tool 최소 1개)
  - KB 필수
    - `inline KB` 옵션 선택 가능
    - 선택형 KB의 경우 사용자 KB + 관리자 KB 선택 허용

### 3) 대화 정책 UI 재사용
- `ChatSettingsPanel`을 공통 편집기로 분리
- 데이터 소스만 변경하여 템플릿 정책 저장
  - 글로벌: `/api/auth-settings/providers`
  - 템플릿: `/api/widget-templates/:id/chat-policy`

## API 설계

### 템플릿 CRUD
- `GET /api/widget-templates` → 목록
- `POST /api/widget-templates` → 생성
- `GET /api/widget-templates/:id` → 상세
- `PATCH /api/widget-templates/:id` → 수정
- `DELETE /api/widget-templates/:id` → 삭제

### 템플릿 정책
- `GET /api/widget-templates/:id/chat-policy`
- `POST /api/widget-templates/:id/chat-policy`

### 인스턴스 생성
- `POST /api/widgets` (기존) 확장
  - `{ template_id, overrides }` 형태로 인스턴스 생성

## 미리보기(설치 환경 시뮬레이션)
- `/app/conversation`에서 `/embed/{public_key}` iframe 로드
- postMessage로 `mejai_widget_init`를 전송하여
  - `origin`, `page_url`, `referrer`를 지정 도메인으로 주입

## 마이그레이션/롤백 전략
- DDL 롤백용 down SQL 제공
- 정책 저장은 새 컬럼 사용, 실패 시 org chat_policy로 폴백
- 런타임 영향 최소화: 기존 위젯 동작 유지

## 체크리스트 (Diff 연동)
- WCP-001: `B_chat_widgets` 스키마 확장 마이그레이션 추가
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-001`
- WCP-002: 템플릿 CRUD API 추가
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-002`
- WCP-003: 템플릿 정책 API 추가
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-003`
- WCP-004: 공통 대화 정책 UI 리팩터링 (ChatSettingsPanel 재사용)
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-004`
- WCP-005: `/app/conversation` 페이지 UI 구현
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-005`
- WCP-006: 위젯 템플릿 구성(에이전트/MCP/KB) 규칙 적용
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-006`
- WCP-007: 런타임(`/api/widget/*`) 템플릿 정책/설정 반영
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-007`
- WCP-008: `/app/install` 템플릿 기반 인스턴스 생성 흐름 반영
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-008`
- WCP-009: Landing/demo에서 템플릿 위젯 연동
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-009`
- WCP-010: 테스트/검증 및 문서 업데이트
  - Diff: `docs/diff/2026-03-03_widget-conversation.md#WCP-010`
