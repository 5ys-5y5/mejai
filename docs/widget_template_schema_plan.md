# B_chat_widgets 템플릿 재설계 (확정 반영 + 진행 계획)

## 목표
- `B_chat_widgets`는 **순수 템플릿 테이블**로 사용한다.
- 설치된 위젯(공개키 기반 인스턴스)은 **별도 데이터/흐름**으로 관리한다.
- 대화 설정은 `chat_policy`에 통합 저장한다.
- 에이전트/KB/MCP 권한은 별도 권한 모델로 제어한다.

## 제안 스키마 (요청안)
```sql
create table public."B_chat_widgets" (
  id uuid not null default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chat_policy jsonb null,
  constraint b_chat_widgets_pkey primary key (id)
);
```

## 현재 코드/데이터와의 차이
- 제거 예정 컬럼: `org_id`, `agent_id`, `public_key`, `theme`, `allowed_domains`, `allowed_paths`, `created_by`, `owner_user_ids`, `allowed_user_ids`, `is_public`, `widget_type` 등
- 현재 로직은 `public_key`를 **템플릿 행에 직접 저장**하고 있음
- 설치/임베드 흐름은 `public_key` → 템플릿 조회를 기본으로 동작

## 제약 및 영향 (핵심)
1. **설치 인스턴스(public_key) 저장 위치 필요**
   - 템플릿 테이블에서 `public_key`를 제거하면, 설치된 인스턴스를 저장할 **신규 테이블**이 필요.
   - 예: `B_chat_widget_instances (id, template_id, public_key, created_at, updated_at, ... )`
   - 현재 `/app/install`, `/embed/[key]`, `/api/widget/*`는 모두 `public_key`로 `B_chat_widgets`를 바로 조회하므로 **전면 수정** 필요.

2. **멀티 테넌트/권한 모델 재설계 필요**
   - `org_id` 제거 시, 템플릿 소유자/관리자 범위를 `created_by` 또는 별도 ACL로 정의해야 함.
   - `A_iam_user_access_maps`와의 연결 구조가 변함.

3. **chat_policy에 agent/kb/mcp 저장 시, 참조 무결성 문제**
   - FK가 없으므로 원본 삭제 시 `chat_policy` 정리 자동화 필요.
   - 방법: 트리거/배치 작업으로 `B_bot_agents`, `B_bot_knowledge_bases`, `C_mcp_tools` 삭제 시 해당 ID를 `chat_policy`에서 제거.

4. **설치된 페이지에서 사용자별 선택(override) 허용 모델 필요**
   - `editable_id`, `usable_id`, `is_public` 정책을 강제하려면
     - 위젯 런타임(`/api/widget/chat`, `/api/widget/init`)에서 요청값 검증
     - `chat_policy`의 허용 범위와 `editable/usable` 정책을 합산해야 함.

## 권한/편집 허용 모델 (요청 반영 초안)
- 대상 테이블: `B_bot_agents`, `B_bot_knowledge_bases`, `C_mcp_tools`
- 추가 컬럼:
  - `editable_id` (uuid, default created_by)
  - `usable_id` (uuid)
  - `is_public` (boolean)
- 규칙:
  - `editable_id` 포함 유저는 수정 가능
  - `usable_id` 포함 유저는 사용 가능
  - `is_public = true`이면 로그인/비로그인 모두 사용 가능

## 필요한 신규 테이블 (가정)
- `B_chat_widget_instances`
  - `id` (uuid pk)
  - `template_id` (fk -> B_chat_widgets.id)
  - `public_key` (unique)
  - `created_by` (uuid)
  - `created_at`, `updated_at`
  - (선택) `install_meta` (origin, page_url, referrer 등)

## 변경 영향 범위 (코드)
- `/app/install` (템플릿 선택 → 인스턴스 발급)
- `/embed/[key]` 및 `/api/widget/*` (public_key → instance → template → 정책 적용)
- `/api/widget-templates/*` (템플릿 CRUD)
- 정책 merge/override 로직 (허용/편집 권한 기반 필터)

## 확정된 사항 (사용자 확인)
1. **public_key는 인스턴스 테이블에서만 관리**
2. **템플릿 소유/관리 권한은 `created_by + 입력값` 기반** (생성 후 소유/관리 권한에서 배제될 수 있음)
3. **비로그인 usable 기준**
   - `is_public = true` 이면 누구나 **usable**
   - `is_public = false` 이면 **editable/usable에 ID가 없으면 사용/수정 불가**
4. **정책 충돌 우선순위**: `editable/usable/is_public`가 `chat_policy`보다 우선 (충돌 설계는 지양)
5. **도메인/경로 제한 등 설치 단위 설정은 인스턴스에 저장**

## 확인 결과 반영
1. `editable_id`, `usable_id`는 **UUID 배열**
2. `is_public = false` 이더라도 `editable_id`에 포함된 사용자는 **수정 가능**
3. 소유/관리 권한 배제 정책:
   - `B_chat_widgets`, `C_mcp_tools`: 수정 권한자는 서비스 생성자 단 1명 → **배제 발생 없음**
   - `B_bot_agents`, `B_bot_knowledge_bases`: 생성자/수정권한자 사용자일 수 있음
     - 소유/관리 권한에 `created_by`만 존재하면 **행 삭제**
     - `created_by` 외 유저가 존재하면 **배제되는 사용자 ID만 삭제**
4. 저장 항목 확정
   - 템플릿(`B_chat_widgets`)
     - `id`, `name`, `is_active`, `chat_policy`, `is_public`
     - `chat_policy` 포함 항목:
       - `widget.is_active.기본 세팅`
       - `widget.is_active.위젯 디자인`
       - `widget.header.enabled` 하위 모든 항목
       - `widget.tabBar.enabled` 하위 모든 항목
   - 인스턴스(신규 테이블)
     - `id`, `name`, `is_active`, `template_id (B_chat_widgets.id)`, `chat_policy`, `is_public`, `editable_id[]`, `usable_id[]`
     - `chat_policy` 포함 항목:
       - `widget.is_active.대화 기본값`
       - `widget.is_active.런처 디자인`
       - `widget.is_active.노출/권한`

## 추가 확인 필요 (질문)
1. 인스턴스 테이블에 **`public_key`를 반드시 포함**할까요? (설치/임베드 식별 핵심값)
2. 템플릿/인스턴스 모두에 **`created_by`, `created_at`, `updated_at`을 유지**해야 하나요?
3. `is_public`의 범위는 **템플릿 단위인지, 인스턴스 단위인지** 확정 필요
4. `editable_id`/`usable_id`의 의미가 **템플릿과 인스턴스에 동일하게 적용**되나요?

## 최종 확정
1. 인스턴스 테이블에 `public_key` **포함**
2. 템플릿/인스턴스 모두 `created_by`, `created_at`, `updated_at` **유지**
3. `is_public`은 템플릿/인스턴스 **각각 적용**
   - 인스턴스 기본값: `true`
   - 기타 리소스(MCP/KB 등) 기본값: `false`
4. `editable_id`/`usable_id`는 **템플릿/인스턴스에서 독립적으로 작동**

## 구현 체크리스트 (초안)
- [ ] DB 스키마 변경 계획 확정
- [ ] 인스턴스 테이블 도입 여부 확정
- [ ] 템플릿/인스턴스 흐름 재설계
- [ ] `/app/install`에서 인스턴스 발급 로직 수정
- [ ] `/embed/[key]` 및 `/api/widget/*`에서 인스턴스 → 템플릿 조회로 변경
- [ ] chat_policy에 agent/kb/mcp 저장 규칙 확정
- [ ] 삭제 동기화(트리거/배치) 설계
- [ ] editable/usable/is_public 정책 로직 구현
- [ ] 기존 데이터 마이그레이션 계획

## 템플릿/인스턴스 chat_policy 구분 (초안)
### 템플릿(B_chat_widgets) chat_policy
- 목적: **기본 정책/허용 범위 정의**
- 포함 후보
  - 기본 LLM, 기본 에이전트, 기본 KB/MCP
  - 허용 가능한 `agent_ids`, `kb_ids`, `mcp_tool_ids`의 **allow/deny 규칙**
  - 위젯 UI 정책(헤더/탭바/정책 탭 노출, 권한)
  - 기본 입력/응답 정책(프리필, 입력 placeholder 등)

### 인스턴스(예: B_chat_widget_instances) chat_policy
- 목적: **설치 환경별 overrides**
- 포함 후보
  - 템플릿 허용 범위 내에서 선택된 `agent_id`, `kb_id`, `mcp_tool_ids`
  - 도메인/경로 제한, 설치 환경 메타(origin/page_url/referrer)
  - 사용자별 UI 제한(필요 시)

### 병합 규칙 (제안)
1. 템플릿 정책이 **기본값** 역할
2. 인스턴스 정책은 템플릿의 **허용 범위 내에서만** 적용
3. 최종 적용 전 **editable/usable/is_public 권한 필터**를 우선 적용

---
작성: 2026-03-05
