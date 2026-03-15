# `/app/create` MCP / Provider 연결 구조 개편 설계서

작성일: 2026-03-15  
대상 범위: `/app/create?tab=api`, `/app/create?tab=agents`, `A_iam_auth_settings.providers`, `B_bot_agents` 의 MCP provider binding 계약

## 1. 문서 목적

이 문서는 아래 2개 문제를 같은 계약으로 해결하기 위한 설계 문서다.

1. `/app/create?tab=api` 에서 provider 연결을 현재보다 넓게 관리해야 한다.
2. `/app/create?tab=agents` 에서 도구 선택을 `provider -> 연결 정보 -> 하위 기능` 구조로 바꿔야 한다.

이번 설계는 단순 UI 변경 문서가 아니다.  
실제 저장 계약, agent 편집 계약, MCP 실행 전 provider 연결 해석 계약까지 포함하는 문서다.

이번 설계에서 확정적으로 지켜야 하는 목표는 아래와 같다.

1. `A_iam_auth_settings` 는 `user_id` 기준 1 row 를 유지한다.
2. provider 연결 정보는 모두 `A_iam_auth_settings.providers` JSON 안에 저장한다.
3. `cafe24`, `juso`, `solapi` 는 `/app/create?tab=api` 에서 등록/수정 가능해야 한다.
4. `cafe24` 는 다중 연결을 지원해야 한다. 즉 mall_id 가 여러 개인 연결을 저장할 수 있어야 한다.
5. `juso`, `solapi` 도 연결 단위 등록 구조를 가져야 한다.
6. `/app/create?tab=agents` 는 단순 `mcp_tool_ids` 선택이 아니라, provider 선택 후 해당 provider 의 연결 정보를 고르고, 마지막에 그 provider 의 하위 기능을 선택해야 한다.
7. 나중에 MCP 실행 시 agent 가 선택한 provider 연결을 정확히 식별할 수 있어야 한다.

## 2. 현재 문제 상황

### 2.1 `/app/create?tab=api` 의 현재 한계

현재 구현은 `Cafe24` 와 `Shopify` 2개만 대상으로 하고 있다.

근거 코드:

- `src/components/create/CreateApiTab.tsx`
- `src/components/create/CreateCafe24ConnectionFlow.tsx`

실제 화면 확인 결과:

- `/app/create?tab=api` 에 `Cafe24`, `Shopify` 2개만 보인다.
- `Cafe24` 는 단계형 연결 플로우가 있지만, 신규 연결을 여러 개 관리하는 구조는 아니다.
- `board_no` 는 버튼 나열형으로 선택되고 있다.
- `juso`, `solapi` 는 API 탭에서 보이지 않는다.

Chrome DevTools 확인값:

- `연결 목록`
- `Cafe24`
- `Shopify`
- `3. board_no 선택`
- `1 공지사항 선택됨`

즉 현재 API 탭은 아래 요구를 만족하지 못한다.

1. `juso`, `solapi` 등록/수정
2. `cafe24` 다중 mall 연결
3. provider별 여러 연결 중 하나를 고르는 구조
4. `board_no` 셀렉트 박스 UX

### 2.2 `/app/create?tab=agents` 의 현재 한계

현재 Agent 탭은 도구를 하나의 멀티셀렉트 필드로만 저장한다.

근거 코드:

- `src/components/create/CreateAgentsTab.tsx`
- `src/app/api/agents/route.ts`
- `src/app/api/agents/[id]/route.ts`

실제 화면 확인 결과:

- `도구` 라벨 아래에 하나의 선택 필드만 있다.
- 선택값은 `mcp_tool_ids` 배열로만 저장된다.
- 어떤 provider 를 쓰는지, 그 provider 안에서 어떤 연결 정보를 쓰는지 저장하지 않는다.

Chrome DevTools 확인값:

- `도구`
- `도구` 버튼 하나만 노출

즉 현재 Agent 탭은 아래 요구를 만족하지 못한다.

1. `사용할 도구(provider)` 선택
2. `A_iam_auth_settings.providers` 에 저장된 연결 정보 선택
3. 해당 provider 의 하위 기능 선택
4. agent 별 provider 연결 binding 저장

### 2.3 현재 DB 계약의 한계

현재 DB 읽기 확인 결과는 아래와 같다.

1. `A_iam_auth_settings` 는 `providers jsonb` 하나로 provider 값을 저장한다.
2. `B_bot_agents` 는 `mcp_tool_ids` 는 있지만 provider 연결 binding 전용 컬럼은 없다.
3. `A_iam_auth_settings.providers` 에 실제로 들어 있는 key 는 현재 `cafe24`, `shopify` 뿐이다.
4. `C_mcp_tools` 에는 실제 provider_key 로 `cafe24`, `juso`, `solapi` 가 존재한다.

Supabase SQL 확인 결과:

- `A_iam_auth_settings` columns: `id`, `org_id`, `user_id`, `providers`, `updated_at`, `created_at`
- `B_bot_agents` columns: `id`, `parent_id`, `name`, `llm`, `kb_id`, `mcp_tool_ids`, `agent_type`, `industry`, `use_case`, `website`, `goal`, `version`, `is_active`, `org_id`, `created_by`, `created_at`, `admin_kb_ids`, `is_public`, `editable_id`, `usable_id`
- `providers` key 조회 결과: `cafe24`, `shopify`
- `C_mcp_tools` provider count: `cafe24 = 513`, `juso = 1`, `solapi = 2`

이 상태에서는 agent 가 `juso` 나 `solapi` 를 쓰더라도, 어떤 연결 자격정보를 써야 하는지 DB에 남길 방법이 없다.

## 3. 목표 계약

### 3.1 `A_iam_auth_settings.providers` 목표 구조

핵심 원칙은 아래와 같다.

1. `user_id` 당 하나의 `A_iam_auth_settings` row 를 유지한다.
2. provider 연결 정보는 모두 `providers` JSON 안에 넣는다.
3. provider 값은 단일 object 가 아니라 `connections[]` 배열 구조로 정규화한다.
4. 같은 provider 타입도 여러 연결을 가질 수 있어야 한다.

권장 JSON 구조는 아래와 같다.

```json
{
  "cafe24": {
    "connections": [
      {
        "id": "uuid-or-stable-id",
        "label": "sungjy2020 main",
        "mall_id": "sungjy2020",
        "mall_domain": "sungjy2020.cafe24.com",
        "shop_no": "1",
        "board_no": "1,2,3",
        "access_token": "masked-at-ui",
        "refresh_token": "masked-at-ui",
        "expires_at": "2026-03-15T19:21:29.000",
        "updated_at": "2026-03-15T10:00:00.000Z",
        "is_active": true
      }
    ]
  },
  "juso": {
    "connections": [
      {
        "id": "uuid-or-stable-id",
        "label": "juso main",
        "juso_api_key": "....",
        "updated_at": "2026-03-15T10:00:00.000Z",
        "is_active": true
      }
    ]
  },
  "solapi": {
    "connections": [
      {
        "id": "uuid-or-stable-id",
        "label": "solapi main",
        "solapi_api_key": "....",
        "solapi_api_secret": "....",
        "solapi_from": "01012345678",
        "solapi_temp": "....",
        "solapi_bypass": "true",
        "updated_at": "2026-03-15T10:00:00.000Z",
        "is_active": true
      }
    ]
  }
}
```

주의:

1. `shopify` 는 현재 legacy provider 로 남아 있을 수 있으나, 이번 MCP binding 설계의 1차 범위는 `cafe24`, `juso`, `solapi` 다.
2. `juso`, `solapi` 값 이름은 운영자가 기존 env 명칭과 바로 대응할 수 있도록 snake_case 로 저장한다.
3. `solapi_bypass` 는 문자열/boolean 혼용을 허용하지 말고 저장 시 일관된 boolean 으로 정규화하는 편이 안전하다.

### 3.2 `B_bot_agents` 목표 구조

현재 `mcp_tool_ids` 만으로는 부족하다.  
agent 가 어떤 연결 정보를 쓰는지 따로 저장해야 한다.

권장 컬럼:

```sql
alter table public."B_bot_agents"
  add column if not exists mcp_provider_bindings jsonb not null default '{}'::jsonb;
```

권장 JSON 구조:

```json
{
  "cafe24": {
    "connection_id": "conn-cafe24-a",
    "label": "sungjy2020 main"
  },
  "juso": {
    "connection_id": "conn-juso-a",
    "label": "juso main"
  },
  "solapi": {
    "connection_id": "conn-solapi-a",
    "label": "solapi main"
  }
}
```

저장 원칙:

1. `mcp_tool_ids` 는 계속 유지한다.
2. `mcp_tool_ids` 는 실제 허용할 하위 기능 목록이다.
3. `mcp_provider_bindings` 는 provider별로 어느 연결 자격정보를 쓸지 가리킨다.
4. provider 선택은 binding key 존재 여부로 판단 가능하다.

이 구조를 쓰면 기존 `mcp_tool_ids` 기반 allowlist 계약을 깨지 않으면서, provider 연결 해석만 추가할 수 있다.

## 4. `/app/create?tab=api` 목표 UX

### 4.1 화면 구조

API 탭은 아래 구조로 바꾼다.

1. 좌측 목록은 provider 타입을 보여준다.
2. 1차 provider 목록에는 `Cafe24`, `Juso`, `Solapi` 가 반드시 포함된다.
3. 우측 상세 패널은 선택한 provider 의 `등록된 연결 목록` 과 `연결 편집기` 를 함께 보여준다.
4. 각 provider 는 `새 연결` 버튼을 통해 connection 단위 신규 등록이 가능해야 한다.

권장 흐름:

1. 좌측에서 provider 타입 선택
2. 우측 상단에서 해당 provider 의 기존 연결 목록 확인
3. `새 연결` 또는 기존 연결 선택
4. provider별 편집 UI로 저장

### 4.2 `Cafe24` UX

`Cafe24` 는 현재 단계형 플로우를 유지하되, 단일 연결 편집기가 아니라 connection 단위 편집기가 되어야 한다.

반드시 포함:

1. `mall_id 입력`
2. `OAuth 연결`
3. `shop_no 선택`
4. `board_no 선택`
5. `저장`

추가 요구:

1. `board_no 선택` 은 버튼 나열이 아니라 셀렉트 박스 기반 다중 선택 UI로 바꾼다.
2. 새 연결 생성 시 기존 연결을 덮어쓰지 않고 `connections[]` 에 새 항목을 추가한다.
3. 기존 연결 수정 시에는 해당 `connection_id` 항목만 교체한다.

권장 컴포넌트:

1. `MultiSelectPopover`
2. 또는 동등한 다중 선택 Select UI

### 4.3 `Juso` UX

`Juso` 는 입력형 provider 다.

관리 항목:

1. `label`
2. `juso_api_key`
3. `is_active`

동작 원칙:

1. OAuth 없음
2. 입력 후 저장
3. 여러 연결을 저장할 수 있음

### 4.4 `Solapi` UX

`Solapi` 도 입력형 provider 다.

관리 항목:

1. `label`
2. `solapi_api_key`
3. `solapi_api_secret`
4. `solapi_from`
5. `solapi_temp`
6. `solapi_bypass`
7. `is_active`

동작 원칙:

1. OAuth 없음
2. 입력 후 저장
3. 여러 연결을 저장할 수 있음

## 5. `/app/create?tab=agents` 목표 UX

### 5.1 현재 flat 도구 선택을 폐기해야 하는 이유

현재는 `도구` 멀티셀렉트 하나만 있으므로 아래 질문에 답할 수 없다.

1. 이 agent 는 `cafe24`, `juso`, `solapi` 중 무엇을 쓰는가
2. `cafe24` 를 쓴다면 어떤 mall 연결을 쓰는가
3. `solapi` 를 쓴다면 어떤 발신/템플릿 자격정보를 쓰는가

따라서 agent 편집은 아래 3단계 구조로 바꿔야 한다.

1. 사용할 도구(provider) 선택
2. 해당 provider 의 연결 정보 선택
3. 해당 provider 하위 기능 선택

### 5.2 권장 UX 구조

Agent 편집 화면에서 `도구` 섹션은 아래 형태가 되어야 한다.

1. `사용할 도구(provider)` 멀티셀렉트
2. 선택된 provider 별 설정 카드 반복 렌더링
3. 각 카드 안에 `연결 정보` 셀렉트
4. 각 카드 안에 `하위 기능` 멀티셀렉트

예시:

1. provider: `cafe24`, `solapi` 선택
2. `cafe24` 카드
   - 연결 정보: `sungjy2020 main`
   - 하위 기능: `list_orders`, `lookup_order`
3. `solapi` 카드
   - 연결 정보: `solapi main`
   - 하위 기능: `send_kakao`, `send_sms`

### 5.3 저장 규칙

저장 시 아래 두 값을 함께 기록한다.

1. `mcp_tool_ids`
   - 선택된 모든 하위 기능 ID를 flatten 해서 저장
2. `mcp_provider_bindings`
   - provider별 선택된 `connection_id` 저장

검증 규칙:

1. provider 를 선택했으면 connection 도 반드시 선택해야 한다.
2. provider 를 선택했으면 그 provider 의 tool 도 최소 1개 선택해야 한다.
3. provider 를 해제하면 해당 provider binding 과 tool 선택도 함께 제거해야 한다.

## 6. API / 서버 계약 변경안

### 6.1 `src/app/api/auth-settings/providers/route.ts`

현재 이 route 는 provider object 단위의 shallow merge 구조다.  
이 구조로는 `connections[]` 배열 편집이 어렵다.

따라서 아래 방식으로 바꿔야 한다.

1. GET
   - `provider=cafe24` 요청 시 단일 object 를 반환하지 말고, provider 계약 전체를 반환
   - 예: `{ provider: { connections: [...] } }`
2. POST
   - `mode=create_connection`
   - `mode=update_connection`
   - `mode=delete_connection`
   - 또는 동등한 command 방식으로 명시 분기

중요:

1. 단순 `{ ...current, ...body.values }` merge 는 connection 단위 식별에 취약하다.
2. connection 배열 수정은 반드시 `connection_id` 기준 명시 command 로 처리해야 한다.

### 6.2 `src/app/api/agents/route.ts`, `src/app/api/agents/[id]/route.ts`

현재 body 는 `mcp_tool_ids` 만 받는다.  
향후에는 아래 필드까지 받아야 한다.

1. `mcp_tool_ids`
2. `mcp_provider_bindings`

생성/수정 공통 규칙:

1. binding key 는 허용 provider 만 통과시킨다.
2. binding value 의 `connection_id` 는 문자열 정규화가 필요하다.
3. 선택된 `mcp_tool_ids` 의 provider 와 binding key 불일치 시 저장 거부가 필요하다.

## 7. 런타임 영향성

이 설계는 UI에서 끝나지 않는다.  
MCP 실행 시 어떤 연결 자격정보를 써야 하는지도 바뀐다.

영향 받는 대표 경로:

1. `src/app/api/runtime/chat/runtime/runtimeBootstrap.ts`
2. `src/app/api/mcp/tools/call/route.ts`

현재는 `cafe24` provider 설정을 사실상 전역 단일 값처럼 읽는 코드가 남아 있다.  
provider별 다중 연결 구조로 바꾸면 runtime 은 agent 의 `mcp_provider_bindings` 를 읽어 선택된 연결을 해석해야 한다.

권장 원칙:

1. tool 실행 전 `provider_key` 를 확인한다.
2. agent 의 `mcp_provider_bindings[provider_key].connection_id` 를 찾는다.
3. `A_iam_auth_settings.providers[provider_key].connections[]` 에서 해당 연결을 resolve 한다.
4. resolve 실패 시 명시 오류를 반환한다.

## 8. 실행 정책 (필수 준수)

아래 정책은 본 설계 또는 후속 수정에서 100% 준수한다.

1. 계약 수준으로 수정한다.
   - `api` 탭만 임시 수정하지 않는다.
   - `agents` 저장 계약과 runtime 연결 해석 계약까지 함께 맞춘다.
2. provider별 다중 연결 구조를 기준으로 설계한다.
   - 단일 `cafe24` 값만 맞추는 핫픽스 금지
   - `juso`, `solapi` 까지 같은 connection 계약으로 일반화한다.
3. `A_iam_auth_settings` 는 `user_id` 기준 1 row 원칙을 유지한다.
   - provider row 를 별도 테이블처럼 흉내 내는 임시 구조 금지
4. connection 단위 수정은 명시 command 로 처리한다.
   - shallow merge 로 배열을 덮어쓰는 방식 금지
5. Agent 편집은 `provider -> connection -> tools` 3단계 구조를 지킨다.
   - 기존 flat tool multiselect 유지 후 임시 hidden field 추가 같은 우회 금지
6. DB 변경이 필요한 경우 SQL 을 문서로 제공하고 사용자가 직접 실행하도록 한다.
   - 직접 DB 변경 금지
7. `/app/install` 및 위젯 관련 기존 범위를 임의로 건드리지 않는다.
   - 이번 설계 범위는 `api`, `agents`, auth settings, agent 계약이다.

## 9. 수정 허용 화이트리스트 (필수 준수)

아래 파일만 수정 가능하다. 목록 외 파일 수정이 필요할 경우 즉시 중단하고 사용자 승인을 받은 뒤에만 추가한다.

| 파일 | 허용 목적 |
| --- | --- |
| `docs/mcpUpdates.md` | 본 설계 문서 작성 및 갱신 |
| `src/components/create/CreateApiTab.tsx` | provider 타입 목록, connection 목록, 신규 등록 진입 구조 구현 |
| `src/components/create/CreateCafe24ConnectionFlow.tsx` | Cafe24 connection 편집기 재구성, board_no 멀티셀렉트 셀렉트 UI 전환 |
| `src/components/create/CreateAgentsTab.tsx` | agent 도구 선택을 provider -> connection -> tools 구조로 변경 |
| `src/app/api/auth-settings/providers/route.ts` | providers.connection command 계약 구현 |
| `src/app/api/agents/route.ts` | agent 생성 시 `mcp_provider_bindings` 저장 계약 추가 |
| `src/app/api/agents/[id]/route.ts` | agent 수정 시 `mcp_provider_bindings` 저장 계약 추가 |
| `src/app/api/runtime/chat/runtime/runtimeBootstrap.ts` | agent binding 기준 provider 연결 해석 |
| `src/app/api/mcp/tools/call/route.ts` | tool call 시 provider 연결 resolve 계약 반영 |
| `src/lib/providerConnections.ts` | provider connection normalize / read / write helper 신설 |
| `src/lib/agentMcpBindings.ts` | agent binding normalize / validation helper 신설 |
| `src/components/create/CreateJusoConnectionForm.tsx` | Juso connection 전용 입력 폼 신설 |
| `src/components/create/CreateSolapiConnectionForm.tsx` | Solapi connection 전용 입력 폼 신설 |

화이트리스트 외 파일이 필요하면 즉시 중단하고 사용자에게 파일 단위로 추가 승인을 받아야 한다.

## 10. 수정 전 이해확정 절차

후속 구현 시작 전 아래 이해 내용을 목록으로 정리한 뒤 사용자의 `확정` 을 받아야 한다.

1. `A_iam_auth_settings.providers` 는 user row 안의 provider 연결 저장소다.
2. `cafe24`, `juso`, `solapi` 는 모두 connection 배열 구조를 사용한다.
3. `cafe24` 는 다중 mall 연결을 허용한다.
4. `juso`, `solapi` 는 값 입력형 connection 으로 관리한다.
5. `CreateApiTab` 은 provider 타입 선택 후 connection 생성/수정 구조로 바뀐다.
6. `CreateAgentsTab` 은 `provider -> connection -> tools` 3단계 선택 구조로 바뀐다.
7. `B_bot_agents` 에 `mcp_provider_bindings` 저장 공간이 추가된다.
8. `CreateCafe24ConnectionFlow` 의 `board_no` 는 셀렉트 박스 기반 다중 선택으로 바뀐다.
9. runtime 은 agent binding 에서 선택된 connection 을 기준으로 provider 자격정보를 해석한다.

확정 없이 임의로 수정에 착수하지 않는다.

## 11. 변경 기록 및 롤백 보장

후속 구현 시 아래를 반드시 지킨다.

1. 수정 직전 코드 전체 또는 수정 구간 포함 백업을 `docs/diff` 에 남긴다.
2. 새 파일은 `absent.before` 형태로 기록한다.
3. 롤백 가능 여부를 먼저 보장한 뒤 수정한다.

이번 문서 작성 턴의 백업:

- `docs/diff/20260315-173925__docs__mcpUpdates.md.absent.before`

## 12. DB 변경안 및 사용자 직접 실행 SQL

이번 설계에서 확정적으로 필요한 DB 변경은 `B_bot_agents.mcp_provider_bindings` 추가다.

사용자 직접 실행 SQL 제안:

```sql
alter table public."B_bot_agents"
  add column if not exists mcp_provider_bindings jsonb not null default '{}'::jsonb;
```

선택 제안:

```sql
comment on column public."B_bot_agents".mcp_provider_bindings
is 'provider별로 agent가 사용할 connection_id binding을 저장한다. 예: {\"cafe24\":{\"connection_id\":\"...\"}}';
```

주의:

1. 이번 턴에서는 DB 변경을 수행하지 않았다.
2. 실제 구현 승인 후 사용자가 직접 실행해야 한다.

## 13. 테스트 체크리스트

후속 구현 턴마다 아래를 확인한다.

### 13.1 Chrome DevTools MCP

1. `/app/create?tab=api`
   - `Cafe24`, `Juso`, `Solapi` provider 가 보이는가
   - provider별 `새 연결` 흐름이 있는가
   - `Cafe24` 의 `board_no` 가 셀렉트 박스로 보이는가
2. `/app/create?tab=agents`
   - `사용할 도구(provider)` 선택 필드가 보이는가
   - provider 선택 후 `연결 정보` 선택 필드가 보이는가
   - provider 선택 후 하위 기능 목록이 provider 기준으로 필터링되는가
3. agent 저장 후 다시 열었을 때
   - `mcp_provider_bindings` 와 `mcp_tool_ids` 가 복원되는가

### 13.2 Supabase MCP

1. `A_iam_auth_settings.providers` 안에 `cafe24`, `juso`, `solapi` connection 구조가 저장되는가
2. `B_bot_agents.mcp_provider_bindings` 값이 저장되는가
3. `C_mcp_tools.provider_key` 와 agent 선택 provider 가 일치하는가

### 13.3 Build

1. `npm run build` 성공
2. 타입 에러 없음
3. route payload mismatch 없음

## 14. 이번 문서 작성 시점 테스트 기록

### 14.1 Chrome DevTools MCP

확인 페이지:

1. `/app/create?tab=api`
2. `/app/create?tab=agents`

확인 결과:

1. `/app/create?tab=api`
   - `Cafe24`, `Shopify` 2개만 노출됨
   - `juso`, `solapi` 없음
   - `board_no` 는 버튼 나열형임
2. `/app/create?tab=agents`
   - `도구` 선택 필드가 하나만 있음
   - `provider -> connection -> tools` 구조 없음

### 14.2 Supabase MCP

확인 결과:

1. `A_iam_auth_settings` 는 `providers jsonb` 컬럼 하나로 provider 데이터를 저장함
2. `B_bot_agents` 는 `mcp_tool_ids` 는 있으나 `mcp_provider_bindings` 는 없음
3. 현재 `providers` key 는 `cafe24`, `shopify` 만 확인됨
4. `C_mcp_tools` provider count 는 `cafe24 513`, `juso 1`, `solapi 2`

### 14.3 DB 수정 여부

이번 턴에서는 DB를 수정하지 않았다.  
따라서 SQL은 문서에만 제안으로 기록한다.

## 15. 최종 판단

현재 구조에서 필요한 것은 단순히 provider 몇 개를 더 그리는 UI 수정이 아니다.

핵심은 아래 4가지다.

1. `A_iam_auth_settings.providers` 를 connection 배열 구조로 일반화
2. `CreateApiTab` 을 connection 등록/수정 화면으로 재구성
3. `CreateAgentsTab` 을 `provider -> connection -> tools` 구조로 재설계
4. `B_bot_agents` 와 runtime 에 provider binding 계약 추가

즉 이번 설계의 본질은 `cafe24` 예외처리가 아니라, `cafe24 / juso / solapi` 를 같은 연결 계약으로 통일하는 것이다.
