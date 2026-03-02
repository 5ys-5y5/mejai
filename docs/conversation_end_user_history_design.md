# Conversation End-User History Design

**목표**
- `/app/conversation`에서 "테스트 사용자 *" 입력 여부에 따라 과거 대화 목록이 명확히 분리되어 조회된다.
- 엔드유저가 확정되면 해당 `end_user_id` 기반으로 과거 대화가 즉시 반영된다.

**현상 요약**
- 테스트 사용자 입력값을 변경해도 List 프리뷰의 과거 대화 목록이 동일하게 노출됨.
- 엔드유저 지정/미지정 시나리오를 구분해 테스트할 수 없음.

**핵심 설계 원칙 (계약/의도 수준)**
- 엔드유저 식별은 "입력값"이 아닌 "정규화된 식별자"로만 전달한다.
- 프리뷰에서도 실서비스와 동일한 `end_user_id` 결정 로직을 사용한다.
- 엔드유저가 불확실할 때는 목록 조회가 분리되어야 한다.

**공통 계약(Contract) 정의**
- `EndUserIdentifier`
  - `id?`
  - `email?`
  - `name?`
- `ResolveEndUserRequest`
  - `context: ConversationContext`
  - `end_user: EndUserIdentifier | null`
- `ResolveEndUserResponse`
  - `end_user_id?: string`
  - `status: "resolved" | "unresolved"`
- `ListConversationsRequest`
  - `context: ConversationContext`
  - `end_user_id?: string`

**동작 설계**
1. 테스트 사용자 입력값을 `EndUserIdentifier`로 정규화한다.
2. `ResolveEndUser` API로 `end_user_id`를 확정한다.
   - 입력값이 없으면 `status=unresolved`로 응답
   - 입력값이 유효하고 매칭되면 `end_user_id` 반환
3. `ListConversations` 호출 시 `end_user_id` 존재 여부에 따라 조회 범위를 분기한다.
   - 있음: 해당 `end_user_id`의 세션만 조회
   - 없음: 미지정 상태의 프리뷰 세션만 조회
4. Chat 전송 성공 후 `end_user_id`가 확정되면, List 프리뷰가 자동으로 갱신된다.

**DB/서버 설계 변경 제안**
- `A_end_users` 조회/생성 로직을 서비스/프리뷰에서 공통 모듈로 합친다.
- `D_conv_sessions.end_user_id`는 `ResolveEndUser` 이후 확정된 값만 기록한다.
- 미지정 상태의 프리뷰 세션은 `end_user_id IS NULL` 필터로 관리한다.
  - `agent_id`가 없더라도 `setup_override`로 시작된 세션도 동일하게 포함되어야 한다.

**DB 확인 사항 (Supabase)**
- `A_end_users`
  - 식별 필드: `email`, `phone`, `member_id`, `external_user_id`, `display_name`
  - `org_id`(uuid), `last_session_id`(uuid)
- `A_end_user_identities`
  - `identity_type`(text), `identity_value`(text), `identity_hash`(text), `is_primary`(bool)
- `D_conv_sessions`
  - `end_user_id`(uuid, nullable), `widget_id`(uuid), `agent_id`(text), `bot_context`(jsonb)
- `A_end_user_sessions`
  - `end_user_id`(uuid), `session_id`(uuid), `agent_id`(text), `llm`(text), `mode`(text)

**확정 사항 (런타임 기준)**
- 엔드유저 식별 우선순위(매칭 우선순위)는 `phone > email > member_id > external` 순서다.
- `A_end_user_identities.identity_type` 허용 값은 `email`, `phone`, `member_id`, `external`이다.
- `is_primary`는 최초로 생성된 식별값(우선 채택된 값)에 대해 `true`로 저장된다.

**근거 코드 위치**
- `src/app/api/runtime/chat/services/endUserRuntime.ts`

**프론트엔드 상태 설계**
- `/app/conversation`은 `EndUserIdentifier`와 `resolved_end_user_id`를 별도 상태로 보관한다.
- 테스트 사용자 입력 변경 시 즉시 `ResolveEndUser`를 호출하거나 "조회" 버튼을 통해 확정한다.
- List 프리뷰 iframe 생성 시 `end_user_id`를 쿼리/초기화 API로 전달한다.
- `agent_id`가 없을 경우 `setup_override`가 포함된 `ConversationContext`로 동일하게 조회한다.

**에러/빈 상태 처리**
- `ResolveEndUser` 실패 시 UI에 원인을 표시하고 List 조회를 중단한다.
- `unresolved` 상태에서는 "엔드유저 미지정" 안내 배너를 표기한다.
- `agent_id` 없이 Setup 입력으로 시작된 세션도 동일한 미지정/지정 분기를 따른다.

**체크리스트**
- [ ] `EndUserIdentifier`/`ResolveEndUser` 계약이 공통 위치에 추가됨
- [ ] 테스트 사용자 입력값 변경 시 `end_user_id`가 재계산됨
- [ ] List 프리뷰가 `end_user_id` 존재 여부로 분기됨
- [ ] 엔드유저 미지정 시나리오가 독립적으로 재현됨
- [ ] 엔드유저 확정 후 과거 대화 목록이 즉시 노출됨
- [ ] `agent_id`가 없어도 `setup_override` 기반 세션이 목록에 반영됨
