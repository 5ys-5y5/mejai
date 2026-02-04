# Runtime API 구조 및 종속관계

대상 폴더: `src/app/api/runtime/chat`

## 파일별 역할

### 1) `chat/route_mk2.ts`
- 역할: **현재 핵심 실행 엔진**(정책 평가, 슬롯 추출, MCP 호출, 이벤트/디버그 로그 기록).
- 주요 의존:
  - `@/lib/serverAuth` (인증/조직 컨텍스트)
  - `@/lib/llm_mk2` (LLM 호출)
  - `@/lib/policyEngine` (input/tool/output 단계 정책 실행)
- 로그 기록:
  - `F_audit_mcp_tools`
  - `F_audit_events`
  - `F_audit_turn_specs` (`prefix_json`)

### 2) `chat/route.ts`
- 역할: **Legacy 파이프라인**(기존 플레이그라운드 채팅 경로).
- 주요 의존:
  - `@/lib/serverAuth`
  - `@/lib/llm`
  - `@/lib/policyEngine`
- 로그 기록:
  - `F_audit_mcp_tools`
  - `F_audit_events`
  - `F_audit_turn_specs` (`prefix_json`)

### 3) `shipping/route.ts`
- 역할: Shipping 엔드포인트 진입점.
- 실제 동작: `export { POST } from "../chat/route_mk2";`
- 결론: **독자 로직 없음**, `route_mk2.ts`를 그대로 사용.

### 4) `orchestration/route.ts`
- 역할: Orchestration 엔드포인트 진입점.
- 실제 동작: 요청 바디를 정리한 뒤 `../chat/route_mk2`의 POST로 위임.
- 결론: **실행 엔진은 동일하게 `route_mk2.ts`**.

## 실행 흐름(요약)

1. 프론트 `labolatory`는 `/api/labolatory/run`으로 요청  
2. `/api/labolatory/run`이 `route` 값에 따라 아래로 프록시:
   - `legacy` → `/api/runtime/chat/legacy`
   - `shipping` → `/api/runtime/chat/shipping` (내부적으로 `chat/route_mk2`)
   - `orchestration` → `/api/runtime/chat/orchestration` (내부적으로 `chat/route_mk2`)
3. 최종 실행은 대부분 `chat/route_mk2.ts`에서 수행

## 종속관계 다이어그램

```text
/api/labolatory/run
 ├─ route=legacy        -> /api/runtime/chat/legacy            -> chat/route.ts
 ├─ route=shipping      -> /api/runtime/chat/shipping        -> chat/route_mk2.ts
 └─ route=orchestration -> /api/runtime/chat/orchestration   -> chat/route_mk2.ts
                                                            (wrapper -> delegate)
```

## 운영 관점 포인트

- `shipping`, `orchestration`의 로그가 `F_audit_turn_specs`에 남는 이유:
  - 두 경로 모두 내부적으로 `chat/route_mk2.ts`를 타기 때문.
- 구조/로깅 정책 변경 시 우선 수정 대상:
  1. `chat/route_mk2.ts`
  2. `chat/route.ts` (legacy 유지 필요 시)
