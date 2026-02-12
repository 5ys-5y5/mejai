# Widget End-User Memory Flow

위젯 채널에서 end-user 메모리를 적재하는 저장 타이밍 및 필드 매핑 정의다.

**1. 입력 소스**
- `window.mejaiWidget.user`: 고객사가 선택적으로 전달하는 사용자 정보
- `visitor_id`: 위젯 SDK가 생성하는 익명 식별자(localStorage/cookie)
- `page_url`, `origin`, `referrer`
- 런타임 턴의 `bot_context.entity`

**2. 저장 타이밍**
1. `POST /api/widget/init`
   - visitor id 생성/조회
   - `D_conv_sessions` 생성 전 `A_end_users` 매칭 시도
2. `POST /api/widget/chat`
   - 턴 완료 후 `A_end_user_messages`/`A_end_user_sessions`/`A_end_user_memories` 업데이트
3. 세션 종료 또는 비활성 타이머(예: 15분)
   - `A_end_users.last_seen_at` 갱신

**3. 필드 매핑**
- `A_end_users`
  - `display_name` <- `user.name`
  - `email` <- `user.email` (normalize)
  - `phone` <- `user.phone` (normalize)
  - `external_user_id` <- `user.id` or `visitor_id`
  - `attributes` <- `user.attributes` + `page_url`, `origin`
- `A_end_user_identities`
  - `email`, `phone`, `external`
- `A_end_user_sessions`
  - `session_id` <- `D_conv_sessions.id`
  - `channel` <- `web_widget`
  - `agent_id`, `llm`, `mode`
- `A_end_user_messages`
  - `role`: `user`/`assistant`
  - `content`/`content_summary`
- `A_end_user_memories`
  - `profile`: name/email/phone/address 등
  - `order`: order_id 등

**4. 매칭 우선순위**
`external_user_id` > `email` > `phone` > `visitor_id`

**5. 유의사항**
- `user` 정보가 없는 경우에도 `visitor_id` 기반으로 end-user를 생성한다.
- `visitor_id`는 org 단위로 유효하며, 다른 org와 공유하지 않는다.
