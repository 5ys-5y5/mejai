# Widget Streaming Protocol

위젯에서 스트리밍 응답을 수신하기 위한 이벤트 스키마 정의다.

**1. SSE (권장)**
엔드포인트 예시: `GET /api/widget/stream?token=...&session_id=...`

**1.1 기본 이벤트**
- `event: ready`
  - data: `{ "ts": 1730000000000 }`
- `event: delta`
  - data: `{ "turn_id": "...", "delta": "부분응답", "index": 12 }`
- `event: message`
  - data: `{ "payload": { ...runtime_response } }`
- `event: error`
  - data: `{ "error": "CODE", "detail": "..." }`

**1.2 클라이언트 처리**
- `delta`는 누적하여 렌더링.
- `message` 수신 시 최종 메시지로 확정.
- `error` 수신 시 스트림 종료 및 재시도 UI 표시.

**2. WebSocket (선택)**
엔드포인트 예시: `ws://.../api/widget/ws`

**2.1 요청 이벤트**
- `join`
  - `{ "type": "join", "token": "...", "session_id": "..." }`
- `user_message`
  - `{ "type": "user_message", "text": "...", "session_id": "..." }`

**2.2 응답 이벤트**
- `assistant_delta`
  - `{ "type": "assistant_delta", "turn_id": "...", "delta": "..." }`
- `assistant_message`
  - `{ "type": "assistant_message", "payload": { ...runtime_response } }`
- `error`
  - `{ "type": "error", "error": "CODE", "detail": "..." }`

**3. 런타임 응답 스키마**
- `payload`는 `/api/runtime/chat`의 응답 스키마와 동일하게 유지한다.
- 필수 필드: `message`, `session_id`, `turn_id`
- 선택 필드: `quick_replies`, `render_plan`, `response_schema`, `trace_id`
