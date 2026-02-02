# 24시간 AI 콜센터 구현 정리

이 문서는 현재 코드베이스 기준으로 24시간 AI 콜센터를 구성하는 핵심 요소와 역할을 간단히 정리합니다.

## 목표
- LLM, KB(유저/관리자), MCP를 결합해 **에이전트처럼 동작**하는 자동 응답을 제공
- 세션/턴 기록과 정책/감사를 통해 운영 안정성을 확보

## 전체 흐름 요약
1. 입력 수신(사용자 메시지)
2. 정책 평가(입력/도구/출력)
3. MCP 도구 호출(필요 시)
4. KB 및 정책을 반영한 LLM 답변 생성
5. 세션/턴/이벤트 기록 및 결과 반환

## 구성 요소

### 1) 실행 파이프라인(핵심)
- Legacy 파이프라인: `src/app/api/playground/chat/route.ts`
- MK2 파이프라인: `src/app/api/playground/chat/route_mk2.ts`
- 파이프라인 포워딩: `src/app/api/playground/chat_mk2/route.ts`

이 라우트들이 **실제 답변 생성 파이프라인**을 담당합니다.
입력 처리 → 정책 평가 → MCP 호출 → KB+LLM 응답 → 로그/세션 저장의 흐름이 여기에 구현되어 있습니다.

### 2) 에이전트 개념(조합)
에이전트는 실질적으로 다음 조합으로 정의됩니다.
- LLM: `agent.llm`
- KB: `agent.kb_id` + 관리자 KB(`knowledge_base.is_admin`)
- MCP: `agent.mcp_tool_ids` + `mcp_tool_policies`
- 실행 파이프라인: Legacy 또는 MK2

즉, **LLM + KB + MCP + Route**의 조합이 에이전트의 실체입니다.

### 3) 정책 엔진
정책은 입력/도구/출력 단계에서 강제 응답, 허용/차단, 포맷팅을 제어합니다.
- `src/lib/policyEngine`
- 정책/템플릿 관련 문서: `docs/policy_gate_design.md`

### 4) MCP 도구/정책/어댑터
MCP는 실제 운영 연동(주문 조회, 티켓 생성 등)을 담당합니다.
- 도구 정의: `mcp_tools`
- 정책: `mcp_tool_policies`
- 마스킹/조건/검증: `src/lib/mcpPolicy`
- 어댑터: `src/lib/mcpAdapters`

### 5) KB(유저용 + 관리자용)
- 유저 KB: `knowledge_base` 테이블에서 `is_admin = false`
- 관리자 KB: `knowledge_base` 테이블에서 `is_admin = true`
관리자 KB는 전역 정책/가이드 역할로 결합됩니다.

### 6) 세션/턴/이벤트 기록
운영 안정성과 추적을 위해 모든 실행은 기록됩니다.
- 세션: `sessions`
- 턴(발화/답변): `turns`
- 이벤트 로그: `event_logs`
관련 API: `src/app/api/sessions/*`

## 24시간 운영 관점 체크리스트
- 인증/권한: `getServerContext` 기반 사용자/조직 검증
- 장애 대응: MCP 호출 실패 시 실패 메시지 처리
- 추적/감사: 이벤트 로그 및 MCP 감사 로그(`mcp_tool_audit_logs`)
- 품질 개선: 세션/턴 로그 기반 분석, 정책 보완

## 실험실(조합 비교)
에이전트 없이 조합 비교가 가능한 페이지:
- UI: `src/app/app/labolatory/page.tsx`
- 실행 프록시: `src/app/api/labolatory/run/route.ts`
좌/우 조합으로 LLM/KB/MCP/실행 파이프라인 성과를 비교합니다.

## 요약
24시간 AI 콜센터의 실제 동작은 **Playground 파이프라인(legacy/mk2)**에서 구현되며,
에이전트는 **LLM+KB+MCP+실행 파이프라인 조합**으로 구성됩니다.
정책/로그/도구 호출 레이어가 함께 동작해야 운영 가능한 콜센터가 됩니다.
