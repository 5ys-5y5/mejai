# Bot Spec (Current)

기준: 코드 스냅샷 `2026-02-05` (`main` 워크트리 기준)

## 1) 목적
- `LLM + MCP + KB + Policy`를 결합한 상담 런타임을 운영하고, 대화/도구 실행을 감사 로그로 추적한다.
- 핵심 실행 엔드포인트는 `POST /api/runtime/chat` 하나로 통합한다.

## 2) 현재 아키텍처
- 앱 서버: Next.js App Router(API Route) + Supabase.
- 런타임 진입: `POST /api/runtime/chat` (코어 로직: `src/app/api/runtime/chat/core.ts`).
- 실험/테스트 진입: `POST /api/laboratory/run` → 내부적으로 `/api/runtime/chat` 프록시.
- 별도 WS 서버: `ws-server.js` (`npm run ws`)를 Railway 등에서 분리 실행 가능.

## 3) LLM/임베딩
- 지원 LLM 타입: `chatgpt | gemini` (`B_bot_agents.llm`).
- OpenAI 라우팅: `gpt-4.1-mini`(기본), `gpt-4.1`(긴/복잡 프롬프트).
- Gemini 라우팅: `gemini-2.5-flash-lite`(기본), `gemini-2.5-pro`(긴/복잡 프롬프트).
- 임베딩: OpenAI `text-embedding-3-small` 고정 (`src/lib/embeddings.ts`).

## 4) 대화 엔진(mk2) 동작
- 모드: `mk2` 기본, `natural` 선택.
- Intent(주요): `general`, `faq`, `shipping_inquiry`, `order_change`, `refund_request`, `restock_inquiry`, `restock_subscribe`.
- 슬롯/상태는 `D_conv_turns.bot_context`에 누적 관리(주문번호, 전화번호, 주소, OTP, 재입고 단계 등).
- 정책은 Admin KB(`is_admin=true`)의 `content_json(PolicyPack)`을 compile 후 `input/tool/output` 단계에 적용.
- 최종 응답은 기본적으로 LLM 생성 + 정책 강제 템플릿/포맷 게이트를 거친다.

## 5) KB 설계
- 테이블: `B_bot_knowledge_bases`.
- org 스코프 + 공통(`org_id is null`) 조회.
- Admin KB는 `apply_groups`, `apply_groups_mode(all|any)`로 사용자 그룹별 적용.
- KB 본문 변경 시 새 버전 row를 생성(`parent_id` 기반), 기존 활성 버전 비활성화 후 교체.
- 임베딩 생성 시점:
  - 생성: `POST /api/kb`
  - 버전 변경 PATCH: `PATCH /api/kb/[id]`
  - 누락 재색인: `POST /api/kb/reindex`

## 6) MCP 실행 규칙(현재 구현)
- 도구 카탈로그: `C_mcp_tools` (`is_active=true`).
- 런타임 허용 도구: 에이전트의 `mcp_tool_ids` + provider 선택값 기준으로 allowlist 구성.
- 사전 검증:
  1. JSON schema required/type 검증
  2. condition 검증(예: 고객인증 필요)
  3. 분당 rate limit 검증
  4. masking_rules 기반 응답 마스킹
- 호출은 서버에서만 수행(`callAdapter`)하며 org/user 컨텍스트를 전달한다.
- 감사 로그: `F_audit_mcp_tools`에 요청/응답/지연/정책결정/마스킹 필드 저장.

### 현재 어댑터(요약)
- Cafe24: `list_orders`, `lookup_order`, `track_shipment`, `update_order_shipping_address`, `create_ticket`, `read_product`, `resolve_product`, `subscribe_restock` 등.
- Solapi: `send_otp`, `verify_otp`.
- Juso: `search_address`.

## 7) 데이터 기록/감사
- 세션: `D_conv_sessions`
- 턴: `D_conv_turns` (`kb_references`, `bot_context` 포함)
- 오디오 세그먼트: `D_conv_audio_segments`
- 이벤트 로그: `F_audit_events`
- MCP 감사: `F_audit_mcp_tools`
- 턴 디버그 스펙: `F_audit_turn_specs`, 조회 뷰 `F_audit_turn_specs_view`
- 에스컬레이션 큐: `E_ops_review_queue_items`

## 8) 주요 API
- Runtime: `POST /api/runtime/chat`
- Lab: `POST /api/laboratory/run`, `GET /api/laboratory/logs`
- Agent: `GET/POST /api/agents`, `GET/PATCH/DELETE /api/agents/[id]`
- KB: `GET/POST /api/kb`, `GET/PATCH/DELETE /api/kb/[id]`, `POST /api/kb/reindex`
- MCP: `GET /api/mcp`, `GET /api/mcp/providers`, `GET /api/mcp/providers/[provider]/actions`, `GET /api/mcp/tools`, `POST /api/mcp/tools/call`
- Sessions: `GET/POST /api/sessions`, `GET /api/sessions/[id]`, `GET/POST /api/sessions/[id]/turns`, `GET/POST /api/sessions/[id]/events`
- Queue/Audit: `GET/POST /api/review-queue`, `GET /api/audit-logs`

## 9) 환경 변수(코드 기준)
- 공통: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- LLM: `OPENAI_API_KEY`, `GEMINI_API_KEY`
- Cafe24 OAuth/API: `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET_KEY`, `CAFE24_REDIRECT_URI`, `CAFE24_SCOPE`, `CAFE24_OAUTH_STATE_SECRET`
- Solapi/Juso: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_FROM`, `SOLAPI_TEMP`, `SOLAPI_BYPASS`, `JUSO_API_KEY`
- Cron성 API: `CRON_SECRET`
- WS: `NEXT_PUBLIC_CALL_WS_URL`, `APP_BASE_URL`, `PORT`

## 10) WebSocket 연동 규격(현재)
- WS 서버는 `ws-server.js`에서 `POST /api/runtime/chat`를 호출한다.
- `/call/[token]` 페이지는 `join`/`user_message`에서 아래 필드를 전송한다:
  - `token`, `access_token`, `agent_id`, `session_id`, `mode`, `llm`
- `agent_id`가 있으면 Runtime 호출 시 `agent_id`를 사용한다.
- `agent_id`가 없으면 Runtime 호출 시 `llm` 기반 호출로 fallback 한다.
- Runtime 응답의 `session_id`는 WS 서버/클라이언트가 다음 턴에서 재사용한다.

### `/call/{token}` URL 규격
- 기본: `/call/{token}`
- 권장: `/call/{token}?agent_id={agentId}&mode={mk2|natural}&llm={chatgpt|gemini}&session_id={sessionId}`
- 파라미터:
  - `token` (필수): 통화/웹입력 세션 식별자
  - `agent_id` (권장): 에이전트 기반 실행
  - `session_id` (선택): 기존 대화 이어서 실행
  - `mode` (선택): `mk2` 기본, `natural` 선택
  - `llm` (선택): `chatgpt` 기본, `gemini` 선택
