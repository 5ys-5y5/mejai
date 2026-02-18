# runtime 계약/의도 리팩토링 평가 (2026-02-18) 업데이트

## 범위
- `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`
- `src/app/api/runtime/chat/runtime/intentContractRuntime.ts`
- `src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts`
- `src/app/api/runtime/chat/runtime/intentRuntime.ts`
- `src/app/api/runtime/chat/runtime/intentScopeGateRuntime.ts`
- `src/app/api/runtime/chat/runtime/memoryReuseRuntime.ts`
- `src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts`
- `src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts`
- `src/app/api/runtime/chat/runtime/finalizeRuntime.ts`
- `src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts`
- `src/app/api/runtime/chat/runtime/toolRuntime.ts`
- `src/app/api/runtime/chat/runtime/otpRuntime.ts`
- `src/app/api/runtime/chat/runtime/restockPendingRuntime.ts`
- `src/app/api/runtime/chat/runtime/runtimeTurnIo.ts`
- `src/app/api/runtime/chat/policies/intentSlotPolicy.ts`
- `src/app/api/runtime/chat/handlers/orderChangeHandler.ts`
- `src/app/api/runtime/chat/handlers/refundHandler.ts`

## 변경 요약
- `expected_input` 기록은 OTP/환불/주소/재입고/스코프 게이트 등 주요 경로에 구현되어 있고, `runtimeInitializationRuntime`에서 `prevBotContext.expected_input`을 우선 사용함.
- 계약 기반 슬롯 재사용(`shouldReuseSlotForIntent`)은 `memoryReuseRuntime`에 연결되어 있으나, 모든 재질문/재시도 경로에 강제 적용되지는 않음.
- 의도 판별/후보/라벨 정규식은 `intentSlotPolicy.ts`, `intentRuntime.ts`, `intentScopeGateRuntime.ts`에 구현되어 있으나 대표 발화 테스트가 부재.
- 스코프 게이트는 `restock_inquiry`, `faq`만 지원하며, 추가 확장 여부는 정책 결정 필요.

## 항목별 평가
|항목|점수(10)|미달 사유|10점 개선|기존 답변 성능 유지 가능 여부|
|---|---:|---|---|---|
|문구/정규식 한글 무결성|8|핵심 런타임/핸들러 문구는 복구됐으나 전체 스캔 및 CI 검증 체계는 아직 없음.|Mojibake 스캔 스크립트/CI 체크 추가, 템플릿 스냅샷 테스트 도입.|가능|
|의도 판별/후보화/라벨|7|정규식과 라벨을 보완했으나 대표 발화 테스트가 부재.|대표 발화 기반 단위 테스트 추가, 엣지 케이스(복합 의도) 케이스 확장.|가능|
|계약/의도 분리 중앙화|8|계약 기반 재사용 제한을 연결했으나, 모든 흐름에 강제되는 것은 아님.|슬롯 재사용/재질문 경로 전반에 계약 체크를 일관 적용.|가능|
|슬롯 재사용/expected_input 흐름|8|OTP/환불/주소/재입고에 기록되지만 일부 프롬프트는 미기록.|모든 “정보 요청” 프롬프트에 `expected_input` 기록 표준화.|가능|
|스코프 게이트(FAQ/재입고)|7|키워드/문구는 개선됐지만 범위가 여전히 제한적.|FAQ/재입고 외 추가 스코프 확장 여부 결정, KB 연동 보강.|가능|
|최종 답변 자연스러움/에스컬레이션 방지|7|결정적 가드 문구는 개선되었으나 정책 문구 전수 점검 필요.|의도별 허용 문구 기준 정리 및 디버그/사용자 문구 분리 규칙 보강.|가능|
|컨텍스트 오염 방지/안전성|8|기존 로직 유지. 의도 기반 재사용 제한이 보조 개선.|phone/address 등 추가 오염 감지 규칙 확장.|가능|
|성능/비용/지연|7|LLM 추출 조건은 유지됨.|LLM 호출 조건 세분화 또는 플래그로 제어.|조건부|

## 이슈 상황
- [PARTIAL] MCP allowlist 조회 실패 시 `allowed_tool_count=0` 가능 → `send_otp` 등 MCP 호출이 `TOOL_NOT_ALLOWED_FOR_AGENT`로 스킵될 수 있음. 비프로덕션에서는 fallback allowlist를 적용했고, 프로덕션은 추가 대응 필요.
- [RESOLVED] `toolRuntime.ts` 템플릿 리터럴 내부 백틱 중첩으로 파싱 에러 발생 → `'mall.read_order'`로 치환해 빌드 파서 에러 해소.

## 테스트 실행
- 2026-02-18 현재 `npm run build` 재시도하지 않음.
- 이전 시도에서는 `prebuild` 통과 후 `spawn EPERM`으로 중단됨. (PowerShell 실행 정책 제한 영향 가능)

## 잔여 리스크/개선 과제
- Mojibake 자동 검출 및 템플릿 스냅샷 테스트 추가.
- MCP allowlist 조회 실패 대응(health check/fallback) 및 `TOOL_NOT_ALLOWED_FOR_AGENT` 방지.
- `expected_input` 기록 누락 프롬프트 점검.
- 의도 판별 대표 발화 테스트 추가.
- LLM 추출 조건 최적화 여부 검토.
