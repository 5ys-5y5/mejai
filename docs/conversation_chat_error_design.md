# Conversation Chat Error Resolution Design

**목표**
- `/app/conversation`의 Chat 프리뷰에서 메시지 전송 실패("응답 오류")를 근본적으로 제거한다.
- 위젯/프리뷰/실서비스 대화 전송 경로의 계약을 통일하여 동일한 실패가 재발하지 않게 한다.

**현상 요약**
- Chat 프리뷰에서 메시지 전송 시 `응답 오류`와 "요청에 실패했습니다"가 표시됨.
- 입력은 UI에 표시되지만 서버 응답이 실패로 처리됨.

**핵심 설계 원칙 (계약/의도 수준)**
- 프리뷰/실서비스를 구분하지 않고 동일한 "대화 생성 + 메시지 전송" 계약을 사용한다.
- 요청 실패의 원인이 되는 필수 파라미터(위젯/에이전트/정책/엔드유저/세션) 결핍을 UI가 감추지 않는다.
- 정책/에이전트/엔드유저의 선택 상태를 단일 "ConversationContext"로 정규화하여 모든 호출 경로에서 재사용한다.

**공통 계약(Contract) 정의**
- `ConversationContext`
  - `widget_id`: 위젯 ID
  - `agent_id`: 설정된 에이전트 ID (없어도 대화 가능)
  - `policy`: 위젯 정책 (현재 DB는 `B_chat_widgets.chat_policy` jsonb로 보유)
  - `preview`: `true | false`
  - `visitor_id`: 프리뷰 방문자 ID
  - `end_user`: `{ id?: string; email?: string; name?: string } | null`
  - `origin`: 방문 Origin
  - `page_url`: 페이지 URL
  - `referrer`: 리퍼러
  - `setup_override?`: `{ kb?: string; mcp_provider?: string; mcp_action?: string; llm?: string }`
- `StartConversationRequest`
  - `context: ConversationContext`
  - `initial_message?: string`
- `StartConversationResponse`
  - `session_id`
  - `end_user_id?`
  - `status`

**동작 설계**
1. 프리뷰/실서비스 공통으로 `ConversationContext`를 생성한다.
2. 전송 버튼 클릭 시 다음 순서로 처리한다.
   - `policy`가 없으면 UI에서 즉시 실패 처리하고 원인을 표기한다.
   - `agent_id`가 없어도 `setup_override`가 유효하면 대화가 가능해야 한다.
   - `agent_id`가 없고 `setup_override`도 비어 있으면 실패 처리하고 원인을 표기한다.
   - `end_user`가 지정되었으면 `context.end_user`에 포함한다.
   - `StartConversation` API를 호출하여 `session_id`를 확정한다.
   - `session_id`를 기반으로 메시지 전송 API 호출.
3. 실패 응답은 표준화된 `error.code`로 맵핑한다.
   - `MISSING_AGENT_OR_SETUP`
   - `MISSING_POLICY`
   - `INVALID_WIDGET`
   - `CONVERSATION_DISABLED`
   - `SERVER_ERROR`
4. UI는 `error.code`에 따라 텍스트를 결정한다.

**API/서버 측 설계 변경 제안**
- 프리뷰용 엔드포인트가 별도이면 유지하되, 내부에서 동일한 컨트랙트를 사용한다.
- 모든 대화 시작 요청은 `ConversationContext`를 받아 검증하고 명확한 에러코드를 반환한다.
- 위젯에 에이전트가 할당되지 않았더라도 `setup_override`가 유효하면 정상 처리한다.
- `agent_id`와 `setup_override`가 모두 없을 경우 4xx로 반환하고 UI에 명확히 안내한다.

**프론트엔드 상태 설계**
- `ConversationContext`는 `/app/conversation`의 위젯 설정, 테스트 사용자 입력, Setup 입력을 단일 스토어로 합친다.
- Chat 프리뷰 iframe 생성 시 `context`를 쿼리 혹은 초기 API로 전달한다.
- Chat 프리뷰에서 발생한 에러를 상위 페이지에 리포트(옵션)할 수 있게 한다.

**데이터/정책 의존성**
- 위젯 활성화(`widget.is_active`) 및 정책 설정이 `StartConversation` 호출 전에 검증되어야 한다.
- `agent_id`가 없을 경우 Setup 입력값이 대화 실행의 유일한 설정 소스가 된다.

**DB 확인 사항 (Supabase)**
- `B_chat_widgets`
  - `id`(uuid), `agent_id`(uuid, nullable), `chat_policy`(jsonb), `public_key`(text), `is_public`(bool)
- `D_conv_sessions`
  - `widget_id`(uuid, nullable), `agent_id`(text, nullable), `end_user_id`(uuid, nullable)
  - `metadata`(jsonb) 존재 (런타임 세션 생성 시 사용)
  - `bot_context`(jsonb) 존재

**확정 사항 (런타임 기준 저장/매핑)**
- 위젯 정책은 `B_chat_widgets.chat_policy` jsonb를 그대로 사용한다.
- Setup 입력값은 런타임 요청 바디로 전달되며, DB에는 런타임이 **실제로 사용한 결과**만 기록된다.
  - `inline_kb` 텍스트: 런타임에서 임시 KB로만 사용되며, DB에 별도 저장하지 않는다.
  - `kb_id`/`admin_kb_ids`: 응답 시 `kb_references`로 반영되고, 이후 `A_end_user_session_resources.kb_ids`에 집계된다.
  - `mcp_tool_ids`/`mcp_provider_keys`: 런타임에서 `C_mcp_tools.id`(uuid) 또는 `C_mcp_tools.provider_key` 기준으로 허용 툴을 해석한다.
    - 실제 호출된 액션은 `bot_context.mcp_actions`에 기록되며, `A_end_user_session_resources.mcp_tool_ids`로 집계된다.
  - LLM 선택값은 런타임 응답/디버그 로그에 사용되며, 별도 컬럼으로 저장하지 않는다.

**근거 코드 위치**
- `src/app/api/widget/chat/route.ts` (setup 입력값을 런타임으로 전달)
- `src/app/api/runtime/chat/runtime/runtimeBootstrap.ts` (inline_kb, mcp 선택 해석)
- `src/app/api/runtime/chat/runtime/finalizeRuntime.ts` (`kb_references`, `mcp_actions` 생성)
- `src/app/api/runtime/chat/services/endUserRuntime.ts` (`A_end_user_session_resources` 집계)

**롤아웃 전략**
- 기존 엔드포인트는 유지하고, 신규 계약을 적용한 경로를 우선 프리뷰에 적용한다.
- 프리뷰에서 통과한 뒤 실서비스 경로에 동일 계약을 적용한다.

**체크리스트**
- [ ] `ConversationContext` 타입 정의가 공통 위치에 추가됨
- [ ] 프리뷰/실서비스가 동일한 `StartConversation` 계약을 사용함
- [ ] `policy` 누락 시 UI에서 즉시 명확한 오류 표시
- [ ] `agent_id` 미지정이어도 Setup 입력값으로 대화 가능함
- [ ] `agent_id`와 Setup 입력값이 모두 비어 있을 때만 오류 표시
- [ ] 서버 응답의 `error.code`가 표준화됨
- [ ] Chat 프리뷰에서 메시지 전송 성공 확인
- [ ] 실패 원인이 로그에 구조화되어 기록됨
