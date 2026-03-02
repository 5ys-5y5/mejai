# 소유/권한 모델 설계 (Agents, KB, Widgets, MCP)

## 목표 요약
1. 모든 위젯/에이전트/KB/MCP는 생성자(`created_by`)가 주인이다.
2. `is_public = true`이면 누구든(로그인/비로그인) 사용/열람 가능하다.
3. `is_public = false`이면 생성자의 초대로만 사용/수정 권한을 획득한다.
4. `is_public = true`이어도 수정 권한은 생성자의 초대로만 획득한다.

## 권한 역할
- 생성자: 전체 읽기/수정 가능.
- 수정 권한자(Owner): 읽기/수정 가능. 생성자 초대 필요.
- 사용 권한자(Allowed): 읽기/사용만 가능. 생성자 초대 필요.
- 공개 상태:
  - `is_public = true`: 읽기/사용은 모두에게 허용.
  - `is_public = false`: 읽기/사용도 초대된 사용자만 허용.

## 권한 판정 규칙
- `can_write(user)`:
  - `user_id == created_by` OR `user_id ∈ owner_user_ids`
- `can_read(user)`:
  - `is_public = true` OR
  - `user_id == created_by` OR `user_id ∈ owner_user_ids` OR `user_id ∈ allowed_user_ids`

## DB 설계 (4개 테이블 공통)
적용 대상:
- `B_bot_agents`
- `B_bot_knowledge_bases`
- `B_chat_widgets`
- `C_mcp_tools`

공통 컬럼:
- `created_by uuid`
- `owner_user_ids uuid[]`
- `allowed_user_ids uuid[]`
- `is_public boolean` (없으면 생성)

## 계층 보정 규칙
1. `created_by`는 항상 `owner_user_ids`에 포함된다.
2. `owner_user_ids`는 항상 `allowed_user_ids`에 포함된다.

## 상위 → 하위 권한 전파
에이전트에 수정 권한이 있고, 연결된 KB/MCP/Widget이 **권한 공백**이면:
- 하위 항목에 **사용 권한(allowed_user_ids)**만 부여한다.
- 하위 항목에 이미 creator/owner/allowed가 있으면 변경하지 않는다.

## 서비스 설계
### 생성/수정
- 생성 시 `created_by`를 반드시 설정한다.
- 권한 부여(초대)는 생성자만 가능하다.

### 초대(권한 부여) 흐름
- 생성자가 다음 중 하나로 초대:
  - `owner_user_ids`에 추가 → 수정 권한
  - `allowed_user_ids`에 추가 → 사용 권한
- 수정 권한자는 자동으로 사용 권한자에도 포함된다.

### 공개/비공개 동작
- `is_public=true`: 누구나 읽기/사용 가능, 수정은 초대 필요.
- `is_public=false`: 읽기/수정 모두 초대 필요.

## 구현 메모
- DB 트리거로 계층 보정 및 상위→하위 전파를 보장한다.
- 서비스 레이어에서 `can_read`/`can_write`를 동일 규칙으로 적용한다.
- RLS가 있다면 동일 규칙으로 정책을 맞춘다.

## 진행 체크리스트
- [x] 공통 권한 판정 유틸 추가(`canRead/canWrite`)
- [x] Agents/KB/Widgets/MCP 읽기 권한 적용
- [x] Agents/KB/Widgets 수정/삭제 권한 적용
- [x] 생성 시 `created_by`/`is_public` 설정 및 수정 시 `is_public` 업데이트 허용
- [x] 공개 위젯만 외부 접근 허용(`widget/*` 공개 엔드포인트 차단 포함)
- [x] 초대(권한 부여) API 설계/구현
- [x] UI에서 `is_public` 토글 및 권한 관리 UI 반영
- [x] RLS 정책 반영 (SQL 문서화)
- [ ] 로컬 빌드/테스트 실행(`npm run build`)

## 추가 체크리스트
- [x] 권한 상세 조회 API 추가(`/api/ownership/resource`)
- [x] 에이전트/KB/위젯 권한 목록 표시
- [x] MCP 권한 관리 UI 및 공개 토글 추가
- [x] 대화 페이지 위젯 리스트 UI 동작 보정
- [x] created_by 일괄 업데이트 SQL 문서화
