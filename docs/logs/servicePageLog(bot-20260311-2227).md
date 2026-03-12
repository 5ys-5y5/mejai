

SESSION_ID: 06ddb19e-566f-4141-80bd-d81ebab24af3
PAGE: /app/laboratory
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): -
기대 목록(Debug): -

사용 모듈(Runtime): src/app/api/runtime/chat/route.ts, src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts, src/app/api/runtime/chat/runtime/runtimeBootstrap.ts, src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts, src/app/api/runtime/chat/runtime/runtimeStepContracts.ts, src/app/api/runtime/chat/runtime/runtimePipelineState.ts
사용 모듈(Handlers): -
사용 모듈(Services): src/app/api/runtime/chat/services/dataAccess.ts
사용 모듈(Policies): src/app/api/runtime/chat/policies/principles.ts, src/app/api/runtime/chat/policies/intentSlotPolicy.ts
사용 모듈(Shared): src/app/api/runtime/chat/shared/slotUtils.ts, src/app/api/runtime/chat/shared/types.ts

점검 완료 항목: -
점검 미완료: -
점검 불가: -
