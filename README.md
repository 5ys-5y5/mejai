# mejai

mejai는 Next.js + Supabase 기반 상담 런타임 프로젝트입니다.  
코어 실행 엔드포인트는 `POST /api/runtime/chat`입니다.

## Local Run

```bash
npm install
npm run dev
```

브라우저: `http://localhost:3000`

## WebSocket Run

```bash
npm run ws
```

필수 환경 변수:

```env
NEXT_PUBLIC_CALL_WS_URL=ws://localhost:8080
APP_BASE_URL=http://localhost:3000
```

- WS 서버는 `ws-server.js`에서 `/api/runtime/chat`를 호출합니다.

## `/call/{token}` Usage

- 기본: `/call/{token}`
- 권장:
  - `/call/{token}?agent_id={agentId}&mode={mk2|natural}&llm={chatgpt|gemini}&session_id={sessionId}`

파라미터:
- `token` (필수): 통화/웹입력 세션 식별자
- `agent_id` (권장): 에이전트 기반 실행
- `session_id` (선택): 기존 런타임 세션 이어서 실행
- `mode` (선택): `mk2`(기본), `natural`
- `llm` (선택): `chatgpt`(기본), `gemini` (`agent_id` 미지정 시 사용)

## Reference Docs

- `quick_start.md`
- `docs/bot_spec.md`

## Environment Variables

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### LLM

```env
OPENAI_API_KEY=
GEMINI_API_KEY=
```

### Cafe24 OAuth/API

```env
CAFE24_CLIENT_ID=
CAFE24_CLIENT_SECRET_KEY=
CAFE24_REDIRECT_URI=
CAFE24_SCOPE=
CAFE24_OAUTH_STATE_SECRET=
```

### Solapi / Juso

```env
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_FROM=
SOLAPI_TEMP=
SOLAPI_BYPASS=
JUSO_API_KEY=
```

### Cron

```env
CRON_SECRET=
```
