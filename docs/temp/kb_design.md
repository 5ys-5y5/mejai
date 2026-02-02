# KB 설계 상태 (현행)

작성일: 2026-01-29
대상: KB 생성/편집(특히 /app/kb/new) 및 Admin 공통 KB 적용 흐름

## 1) 데이터 모델 요약

### knowledge_base
- `is_admin` (boolean): Admin 공통 KB 여부. true이면 policy_pack으로 취급.
- `apply_groups` (jsonb, optional): Admin KB 적용 대상 그룹. 형태는 아래와 동일한 리스트.
  - 예: `[ { "path": "paid.grade", "values": ["pro", "starter"] } ]`
- `apply_groups_mode` (text): `all` | `any`
  - `all`: 선택한 모든 조건을 만족해야 적용
  - `any`: 선택한 조건 중 하나라도 만족하면 적용
- `content_json` (jsonb): Admin 정책 JSON 원본 저장
- `content` (text): Admin KB도 동일하게 policy JSON 문자열 저장

### user_access (참조)
- `group` (jsonb): 사용자 그룹 속성. Admin KB 적용 대상 매칭에 사용

## 2) Admin 공통 KB 적용 방식

### 적용 기준
- Admin 공통 KB는 `knowledge_base.is_admin = true`인 문서만 사용
- 일반 KB는 `is_admin = false`인 문서만 사용
- Admin KB는 `apply_groups`/`apply_groups_mode`에 따라 org/user 대상 필터링됨

### 매칭 규칙
- `apply_groups`는 path/value 형태로 저장됨
  - 예: `path = "service.tenant"`, `values = ["cafe24"]`
- `apply_groups_mode = all`:
  - 모든 path/value 조건을 만족해야 적용
- `apply_groups_mode = any`:
  - 하나라도 만족하면 적용

## 3) Admin 정책 JSON 구조

Admin KB는 content/content_json에 아래 구조(JSON)로 저장됨.

```json
{
  "rules": [
    {
      "id": "R001_abuse",
      "stage": "input",
      "priority": 1000,
      "when": { "any": [{ "predicate": "text.contains_abuse" }] },
      "enforce": { "actions": [
        { "type": "set_flag", "flag": "conversation.abusive", "value": true },
        { "type": "force_response_template", "template_id": "abuse_warn" },
        { "type": "deny_tools", "tools": ["*"] }
      ]}
    }
  ],
  "templates": {
    "abuse_warn": "불편을 드려 죄송합니다..."
  },
  "tool_policies": {
    "lookup_order": {
      "required_args": ["order_id"],
      "arg_validators": { "order_id": { "regex": "^[0-9]{8}-[0-9]{7}$" } }
    }
  }
}
```

### 정책 구성 요소
- `rules`: input/tool/output 단계별 정책 rule
- `templates`: 템플릿 문구
- `tool_policies`: MCP 툴 argument 정책

## 4) /app/kb/new (UI 동작) — 일반 모드

### 입력 구조
- Textarea 분리 방식
  - textarea[1]: 사용자 직접 입력 전용
  - textarea[2]: 추천 지침 자동 출력 전용 (readOnly)

### 추천 지침 선택
- 추천 지침은 리스트에서 선택 즉시 하단 textarea[2]에 자동 반영
- 선택 해제 시 자동 삭제
- 사용자 입력(상단 textarea[1])은 항상 유지됨

### 저장 시
- `content` 저장 시:
  - 사용자 입력 + 추천 지침(자동 선택 값)을 합쳐서 저장
  - 구분선 텍스트(`--- 추천 지침 ---`)로 사용자 입력과 분리

## 5) /app/kb/new (UI 동작) — Admin 모드

### 상단 전환
- is_admin = true인 사용자에게만 단일 버튼으로 모드 전환 표시
  - 버튼 클릭 시 일반 ↔ ADMIN 전환

### 적용 대상 그룹
- 라벨: `적용 대상 그룹 *`
- 라벨 우측에 매칭 방식 라디오 배치 (`모두 포함` / `하나라도 포함`)
- 그룹 선택은 select-box + 리스트(스크롤 없는) 형태

### 정책 선택 UI
- 규칙/템플릿/툴 정책을 하나의 select-box + 리스트 박스로 통합
- 리스트는 기본 숨김, 버튼 클릭 시 펼침
- 섹션 구분 표시: 규칙 / 템플릿 / 툴 정책

### 새 규칙 추가
- 동일 박스 안에 “새 규칙 추가” 영역을 compact하게 배치
- 하드코딩 필요 영역은 경고 표시

### Policy JSON
- Policy JSON textarea는 readOnly
- UI 선택 결과로 자동 생성됨
- 사용자가 직접 수정 불가

## 6) 매칭/정책 적용 로직

### 로직 위치
- `src/lib/policyEngine.ts`: 정책 적용 엔진
- `src/app/api/playground/chat/route.ts`: 적용 로직 연결

### 적용 단계
- input gate → tool gate → output gate 순서
- 조건 충족 시 template 강제, tool deny/allow, force_tool_call 적용 가능

## 7) UI 스펙 요약

- 추천 리스트 / 그룹 선택 / 정책 선택은 모두:
  - select-box 버튼 + 아래 리스트 박스 형태
  - 기본은 접힌 상태, 클릭 시 펼침
  - 리스트는 스크롤 없이 전체 항목 표시

## 8) 파일 위치

- UI: `src/app/app/kb/new/page.tsx`
- 정책 엔진: `src/lib/policyEngine.ts`
- 플레이그라운드 적용: `src/app/api/playground/chat/route.ts`
- 그룹 옵션 조회: `src/app/api/user-access/groups/route.ts`

## 9) 주의사항

- Admin KB는 반드시 `is_admin = true`
- Admin KB는 `content_json` 필수
- 일반 KB는 `content`에 직접 입력
- 추천 지침 선택은 사용자 입력과 독립적이며 항상 하단에만 적용됨

