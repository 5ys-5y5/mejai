# Supabase 기능/목적별 정리

본 문서는 현재 코드(`src/`) 기준으로, Supabase 테이블/뷰를 **기능(업무 목적) 중심**으로 묶어 정리합니다.

## 1) 멀티테넌트/권한/외부인증 관리

### 목적
- 조직 단위 분리, 사용자 권한 판별, 외부 시스템 연동 설정 관리

### 테이블
- `organizations`: 조직(tenant) 마스터
- `user_access`: 사용자-조직 권한/역할/그룹 매핑
- `auth_settings`: Cafe24 등 provider 인증/설정 저장

### 주요 코드
- `src/app/onboarding/page.tsx`
- `src/lib/serverAuth.ts`
- `src/app/api/user-access/groups/route.ts`
- `src/app/api/auth-settings/providers/route.ts`
- `src/app/api/cafe24/authorize/route.ts`

## 2) 에이전트/지식베이스 운영

### 목적
- 상담 에이전트 정의와 KB 기반 답변 근거 관리

### 테이블
- `agent`: 에이전트 설정(LLM, 연결 KB 등)
- `knowledge_base`: KB 문서/버전/활성/정책 필드
- `kb_version_metrics`: KB 버전별 운영 지표

### 주요 코드
- `src/app/api/agents/route.ts`
- `src/app/api/agents/[id]/route.ts`
- `src/app/api/kb/route.ts`
- `src/app/api/kb/[id]/route.ts`
- `src/app/api/kb/metrics/route.ts`

## 3) 상담 세션 처리(대화 본문 데이터)

### 목적
- 세션 단위 흐름 관리 및 턴 단위 대화 저장

### 테이블
- `sessions`: 세션 마스터(상태/메타/bot_context)
- `turns`: 턴별 발화/요약/확인/최종응답
- `audio_segments`: 오디오 세그먼트 정보

### 주요 코드
- `src/app/api/sessions/route.ts`
- `src/app/api/sessions/[id]/route.ts`
- `src/app/api/sessions/[id]/turns/route.ts`
- `src/app/api/sessions/[id]/audio-segments/route.ts`
- `src/app/api/playground/chat/route.ts`

## 4) 처리 이벤트/검토/감사

### 목적
- 처리 과정 추적, 사람 검토 큐, 운영 감사 기록

### 테이블
- `event_logs`: 정책/도구호출/완료 등 이벤트 로그
- `review_queue`: 검토 필요 건 큐
- `audit_logs`: 관리자 감사 로그

### 주요 코드
- `src/app/api/sessions/[id]/events/route.ts`
- `src/app/api/sessions/[id]/process/route.ts`
- `src/app/api/review-queue/route.ts`
- `src/app/api/audit-logs/route.ts`

## 5) 디버그/관측

### 목적
- 디버그 prefix 저장 및 조회 가공

### 테이블/뷰
- `debug_log`: 턴 단위 디버그 JSON 저장
- `debug_log_view` (VIEW): 디버그 트리 가공 조회

### 주요 코드
- `src/app/api/playground/chat/route.ts`
- `src/app/api/playground/chat/route_mk2.ts`
- `src/app/api/sessions/[id]/debug-logs/route.ts`
- `src/app/api/labolatory/logs/route.ts`

### 스키마 참고
- `docs/debug_log.sql`

## 6) MCP 툴 거버넌스(레지스트리/정책/감사)

### 목적
- MCP 툴 정의, 조직별 실행 정책, 호출 감사 로그 관리

### 테이블
- `mcp_tools`: 툴 레지스트리(스키마/활성 상태)
- `mcp_tool_policies`: 조직별 허용/스코프/조건/마스킹
- `mcp_tool_audit_logs`: 요청/응답/상태/지연 감사 기록

### 주요 코드
- `src/app/api/mcp/tools/route.ts`
- `src/app/api/mcp/tools/call/route.ts`
- `src/app/api/playground/chat/route.ts`
- `src/app/api/labolatory/logs/route.ts`

## 7) 재입고/상품판정/본인인증 도메인

### 목적
- 상품 판정 기반 응답 제어, 재입고 알림, 주문 관련 본인확인

### 테이블
- `product_alias`: 고객 표현(alias) -> 상품ID 매핑
- `product_rule`: 상품별 답변 가능/재입고 정책
- `restock_subscription`: 재입고 알림 구독
- `otp_verifications`: OTP 발급/검증 상태

### 주요 코드
- `src/app/api/playground/chat/route.ts`
- `src/app/api/playground/chat/route_mk2.ts`
- `src/lib/mcpAdapters.ts`

### 스키마 참고
- `docs/mk2/001_schema_restock.sql`

---

## 참고
- 본 정리는 코드 사용처(`src/`) 기반 실사용 관점입니다.
- 보조 스키마 문서:
  - `docs/debug_log.sql`
  - `docs/mk2/001_schema_restock.sql`
  - `reply/2026-01-28_16-10-43(봇 테스트 구현 시작).md`

## 8) 기능별 Prefix 표준안 (테이블명 변경 제안)

테이블명이 기능별로 섞여 있어 이해가 어렵다는 점을 반영해, 아래처럼 **기능 Prefix + 복수형** 기준으로 통일을 권장합니다.

### A. 멀티테넌트/권한/외부인증 (`iam_`)
- `organizations` -> `A_iam_organizations`
- `user_access` -> `A_iam_user_access_maps`
- `auth_settings` -> `A_iam_auth_settings`

### B. 에이전트/지식베이스 (`bot_`)
- `agent` -> `B_bot_agents`
- `knowledge_base` -> `B_bot_knowledge_bases`
- `kb_version_metrics` -> `B_bot_knowledge_bases` 컬럼 통합 예정

### C. 상담 세션 데이터 (`conv_`)
- `sessions` -> `D_conv_sessions`
- `turns` -> `D_conv_turns`
- `audio_segments` -> `D_conv_audio_segments`

### D. 운영/검토/감사 (`ops_`)
- `review_queue` -> `E_ops_review_queue_items`
- `audit_logs` -> `E_ops_actions`

### E. 관측/디버그 (`obs_`)
- `debug_log` -> `F_audit_turn_specs`
- `event_logs` -> `F_audit_events`
- `mcp_tool_audit_logs` -> `F_audit_mcp_tools`

### F. MCP 거버넌스 (`mcp_`)
아래는 접두 순서 강제를 위해 `C_`를 부여:
- `mcp_tools` -> `C_mcp_tools`
- `mcp_tool_policies` -> `C_mcp_tool_policies`
- `mcp_tool_endpoints` -> `C_mcp_tool_endpoints`
- `mcp_tool_versions` -> `C_mcp_tool_versions`

### G. 커머스/재입고/본인인증 (`com_`, `idv_`)
- `product_alias` -> `G_com_product_aliases`
- `product_rule` -> `G_com_product_rules`
- `restock_subscription` -> `G_com_restock_subscriptions`
- `otp_verifications` -> `H_auth_otp_verifications`

## 9) 전체 테이블명 변경 적용 난이도

결론: **중~상(실무 기준 High에 가까움)**  
이유는 단순 문자열 교체가 아니라, DB 오브젝트/정책/뷰/함수/앱코드/운영 스크립트를 함께 변경해야 하기 때문입니다.

### 난이도 근거 (현재 코드 참조 수 기준)
- 고영향:
  - `agent` (약 130회)
  - `sessions` (약 108회)
  - `turns` (약 79회)
  - `knowledge_base` (약 36회)
  - `event_logs` (약 35회)
  - `auth_settings` (약 28회)
  - `user_access` (약 22회)
- 중영향:
  - `mcp_tools`, `mcp_tool_policies`, `mcp_tool_audit_logs`
  - `debug_log` (RLS/VIEW/FUNCTION 연계)
- 저영향:
  - `kb_version_metrics`, `audit_logs`, `otp_verifications` 등

### 특히 까다로운 포인트
- `debug_log`는 아래 객체가 연결되어 동시 수정 필요:
  - FK, INDEX, RLS POLICY, FUNCTION(`debug_log_entries_to_tree`), VIEW(`debug_log_view`)
- SQL 문서/마이그레이션 문서(`docs/*.sql`, `docs/mk2/*.sql`)와 런타임 코드(`src/app/api/**`, `src/lib/**`)를 함께 정합성 맞춰야 함
- 배포 중간 단계에서 구/신 테이블명이 섞이면 API 장애 가능

### 권장 적용 전략
1. **1차: Prefix 통일 범위를 확정** (MCP는 유지 권장)  
2. **2차: 호환 레이어 도입** (신규 테이블명 + 구명 VIEW 또는 동시 접근 지원)  
3. **3차: 앱 코드 전환** (`src` 전면 치환 + 통합 테스트)  
4. **4차: 운영 검증 후 구명 제거**

### 체감 난이도 요약
- 전면 일괄 rename + 무중단 적용: **높음**
- MCP 테이블 유지 + 나머지 단계적 전환: **중간**
