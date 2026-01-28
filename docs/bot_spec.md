# Bot Spec (Draft)

## 목적
- LLM + MCP + KB를 결합해 mejai_Guideline의 1~8 단계 대화 플로우를 기록하며 응답하는 상담봇 구현
- 모든 대화/조치가 어떤 에이전트 버전/KB/툴 구성으로 수행됐는지 추적 가능하도록 설계

## 핵심 결정 사항
- 서버: Node.js(Next.js) 기반, 공식 SDK 사용(OpenAI/Gemini)
- 스트리밍: WebSocket
- KB: org_id 단위 분리, knowledge_base.is_active = true만 사용
- 버전 추적: 성능 차이가 크지 않다면 metadata(jsonb) 중심으로 기록
- DB 마이그레이션: SQL 쿼리 제공 → 사용자가 Supabase 콘솔에서 수동 적용
- WS 서버: 별도 서비스(railway)로 분리 운영, same repo에서 `npm run ws`로 실행

## 모델 라우팅
- 기본 응답: OpenAI `gpt-4.1-mini`
- 고난도: OpenAI `gpt-4.1`
- 저지연/대량: Gemini `gemini-2.5-flash-lite`
- 복잡 추론: Gemini `gemini-2.5-pro`
- 라우팅/1차 → 최종 생성 → 필요 시 정제 구조

## 키/보안
- 환경 변수: `OPENAI_API_KEY`, `GEMINI_API_KEY`
- 프론트 번들에 키 포함 금지
- 로그에 Authorization/키 출력 금지

## RAG 기본 정책
- 임베딩: OpenAI `text-embedding-3-small(1536)` 또는 `text-embedding-3-large(3072)`
- chunk_size: 800~1200 tokens
- overlap: 120~200 tokens
- top-k: 6~10 (초기 8)
- rerank: 가능하면 ON
- 근거 부족 시 답변 보류/추가 질문
- 답변 포맷: 요약 → 근거(출처) → 상세 → 다음 액션

## MCP 실행 규칙
1) JSON schema validation
2) allowlist(tool_name, adapter_key)
3) 인자 타입/길이/enum 검증
4) PII/비밀값 마스킹
5) 정책/세션 상태 체크
6) 서버에서만 호출
7) mcp_tool_audit_logs에 요청/응답/결정/지연 기록

## 대화 기록 (mejai_Guideline 1~8)
1. 고객 발화 기록: turns.transcript_text
2. 요약: turns.summary_text + event_logs(SUMMARY_GENERATED)
3. 확인 질문: turns.confirm_prompt + event_logs(CONFIRMATION_REQUESTED)
4. 확인/정정: turns.confirmation_response, turns.correction_text, turns.user_confirmed
5. KB/MCP 기반 답변: turns.answer_text/turns.final_answer + event_logs(FINAL_ANSWER_READY)
6. 만족도: sessions.satisfaction
7. 에스컬레이션: sessions.is_escalated, sessions.escalation_reason + event_logs(ESCALATED) + review_queue
8. 추가 질문 루프: seq 증가하며 반복 기록

## 버전 추적(초기안: jsonb)
- turns.kb_references에 사용 KB 버전/스니펫/스코어 기록
- event_logs.payload에 agent_version_id/kb_version_id/mcp_tool_version_id 기록
- mcp_tool_audit_logs에 agent_version_id/session_id/tool_version_id 기록
- sessions.metadata에 agent_version_id/used_kb_version_id/used_mcp_tool_versions 기록

## 필요한 후속 작업
- LLM/MCP/KB 통합 API 설계 및 구현
- WebSocket 기반 스트리밍 서버 핸들러 구현
- KB 임베딩 생성/갱신 파이프라인 설계
- 필요한 DB 변경 SQL 작성(수동 적용)

## WebSocket 운영 메모
- 엔트리포인트: `ws-server.js`
- 실행 스크립트: `npm run ws`
- Railway 환경: `PORT`는 자동 주입(문자열 `${PORT}` 수동 입력 금지)
- 프론트 연결: `NEXT_PUBLIC_CALL_WS_URL`에 WSS 주소 설정
