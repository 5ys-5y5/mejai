# Runtime Chat 리팩터링 체크리스트

목표: `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts` 중심의 오케스트레이션 구조로
`route -> runtime/runtimeOrchestrator + 도메인 모듈` 실행 경로를 고정

## 1) 엔트리/오케스트레이션 분리

- [x] 실행 본체를 `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`로 분리
- [x] `src/app/api/runtime/chat/route.ts`가 `runtime/runtimeOrchestrator`를 직접 참조하도록 전환
- [x] 중간 엔트리 `src/app/api/runtime/chat/core.ts` 삭제
- [x] 중간 엔트리 `src/app/api/runtime/chat/runtime/orchestration.ts` 삭제

## 2) 대원칙/정책 분리

- [x] `src/app/api/runtime/chat/policies/principles.ts` 생성
- [x] OTP 필수 intent/tool 대원칙 분리
- [x] 유일 답변/선택형 답변/preview 상한 대원칙 분리
- [x] `runtime/runtimeOrchestrator.ts`에서 대원칙 import 사용

## 3) 의도/슬롯 정책 모듈화

- [x] `src/app/api/runtime/chat/policies/intentSlotPolicy.ts` 생성
- [x] 의도 판별/후보 생성/의도 라벨 함수 이동
- [x] yes/no/선택 입력 파싱 정책 함수 이동
- [x] 재입고 선택 정책(lead days/채널 등) 함수 이동

## 4) 슬롯 추출/정규화 모듈화

- [x] `src/app/api/runtime/chat/shared/slotUtils.ts` 생성
- [x] 주문번호/전화/우편번호/주소 추출 함수 이동
- [x] 슬롯 유효성/정규화 함수 이동
- [x] 주소 분해 및 주문조회 payload 보조 함수 이동

## 5) 재입고/응답 정책 모듈화

- [x] `src/app/api/runtime/chat/policies/restockResponsePolicy.ts` 생성
- [x] 재입고 KB 파싱/랭킹 함수 이동
- [x] 재입고 안내문 생성 함수 이동
- [x] LLM 엔티티 추출 보조 함수 이동

## 6) 데이터/런타임 서비스 분리

- [x] `src/app/api/runtime/chat/services/dataAccess.ts` 생성
- [x] `src/app/api/runtime/chat/services/mcpRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/services/auditRuntime.ts` 생성
- [x] 에이전트/KB/세션/최근턴 조회 함수 이동
- [x] MCP 실행/주소검색 fallback 함수 이동
- [x] 이벤트/최종턴 저장 로직 이동

## 7) 타입/런타임 유틸 분리

- [x] `src/app/api/runtime/chat/shared/types.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeSupport.ts` 생성
- [x] `src/app/api/runtime/chat/presentation/ui-responseDecorators.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/postToolRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/errorRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/postActionRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/pendingStateRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/restockPendingRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeTurnIo.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeBootstrap.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimePipelineState.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeStepContracts.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/policyInputRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeConversationIoRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/presentation/ui-runtimeResponseRuntime.ts` 생성
- [x] `src/app/api/runtime/chat/runtime/runtimeEngine.ts` 호환 shim 재도입 (`runtimeOrchestrator` 재-export)
- [x] 공유 타입(`AgentRow`, `KbRow`, `ProductDecision` 등) 분리
- [x] debug prefix/failed payload/timing 유틸 분리
- [x] quick reply/rich message HTML 파생 로직 분리

## 8) 핸들러 분리

- [x] `src/app/api/runtime/chat/handlers/orderChangeHandler.ts`
- [x] `src/app/api/runtime/chat/handlers/refundHandler.ts`
- [x] `src/app/api/runtime/chat/handlers/restockHandler.ts` (restock 분기 위임 완료)

## 9) 문서화

- [x] `docs/runtime_chat_통합_동작_명세.md` 생성/갱신
- [x] 폴더링 구조(`runtime|policies|services|shared|handlers`) 반영
- [x] 오케스트레이션 얇은 허브 구조 반영

## 10) 빌드 안정성 확인

- [x] `npx tsc --noEmit --pretty false` 통과
- [ ] `npm run lint` 전체 통과 (현재 전체 기준 273 errors / 72 warnings, 런타임 외 레거시 포함)

## 현재 상태 요약

- 엔트리 경로는 `route.ts -> runtime/runtimeOrchestrator.ts`로 단순화되었습니다.
- `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`는 963줄이며, 단계 호출 조합 + 상태 동기화 중심으로 동작합니다.
- `restock` 의도 대형 블록은 `handlers/restockHandler.ts`로 이동되어 `runtimeOrchestrator.ts`에서 위임 호출합니다.

## 11) `runtimeOrchestrator.ts` 현황 진단 (라인 기준)

- 기준 파일: `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts` (총 963줄)
- 시작점: `POST` 진입 라인 `133`
- 이미 외부 분리된 대표 지점
  - `createRuntimeResponder` 호출: 라인 `147`
  - `bootstrapRuntime` 호출: 라인 `158`
  - `initializeRuntimeState` 호출: 라인 `200`
  - `createRuntimeConversationIo` 호출: 라인 `295`
  - `resolveIntentDisambiguation` 호출: 라인 `317`
  - `handlePreTurnGuards` 호출: 라인 `356`
  - `deriveSlotsForTurn` 호출: 라인 `386`
  - `handleAddressChangeRefundPending` 호출: 라인 `424`
  - `handleRestockPendingStage` 호출: 라인 `464`
  - `handlePostActionStage` 호출: 라인 `497`
  - `resolveIntentAndPolicyContext` 호출: 라인 `515`
  - `runInputStageRuntime` 호출: 라인 `555`
  - `createRuntimeMcpOps` 호출: 라인 `629`
  - `handleOtpLifecycleAndOrderGate` 호출: 라인 `657`
  - `runToolStagePipeline` 호출: 라인 `733`
  - `handleRestockIntent` 호출: 라인 `815`
  - `handleGeneralNoPathGuard` 호출: 라인 `863`
  - `runFinalResponseFlow` 호출: 라인 `914`
  - `handleRuntimeError` 호출: 라인 `953`

판단:
- 코드 구조 기준으로는 오케스트레이터 목표를 사실상 달성
- `runtimeOrchestrator.ts`는 단계 호출 조합 + 명시 상태 동기화(`RuntimePipelineState`)로 동작
- 남은 과제는 운영 전환(엔트리 경로 정리)과 품질 게이트(`lint`/회귀 시나리오)입니다.

## 12) 분리 로드맵 (남은 작업 식별용)

### Phase A (최우선)
- [x] `handlers/restockHandler.ts` 신설
- [x] `runtimeOrchestrator.ts`의 restock 블록을 `handleRestockIntent(...)`로 위임
- [x] `runtimeOrchestrator.ts`에서 restock 관련 대형 분기 제거/대체
- [x] `npx tsc --noEmit --pretty false` 통과 확인

### Phase B
- [x] `runtime/sessionRuntime.ts` 신설 (세션 생성/최근턴 복원 공통화)
- [x] `runtime/intentRuntime.ts` 신설 (expected input/subscribe stage 판별 공통화)
- [x] `runtime/otpRuntime.ts` 신설 (OTP 상태 읽기 공통화)
- [x] `runtimeOrchestrator.ts`에서 Phase B 모듈 호출 연결
- [x] OTP lifecycle 본문(`pending/send/verify/pre_lookup_order`)을 `otpRuntime`으로 이동

### Phase C
- [x] `runtime/toolRuntime.ts` 신설 (tool 접근 평가/forced call 필터 공통화)
- [x] `runtime/finalizeRuntime.ts` 신설 (final LLM message 구성 공통화)
- [x] `runtime/postToolRuntime.ts` 신설 (post-tool 결정론 분기 공통화)
- [x] `runtimeOrchestrator.ts`에서 Phase C 모듈 호출 연결
- [x] tool 실행 본문/후처리 전체를 단계 모듈로 이동 (`runtime/toolStagePipelineRuntime.ts`에서 tool gate + forced/filter + 실행 + post-tool 단계 조합)
- [x] general guard + finalize 저장 단계(`insertTurn`/`insertEvent`)를 `finalizeRuntime`으로 이동
- [x] `extractTemplateIds`/`noteMcp` 공통화(`runtimeSupport`/`toolRuntime`)
- [x] `POST`를 “단계 호출 + 상태 전달” 중심으로 추가 축소 (`toolStagePipelineRuntime`, `runtimeConversationIoRuntime`, `runtimeMcpOpsRuntime` 반영)

## 15) "완벽한 Orchestrator" 점검 체크리스트

정의(본 문서 기준):
- `runtimeOrchestrator.ts`는 비즈니스 세부 구현을 직접 담지 않고, 단계 모듈을 순서대로 조합/위임한다.
- 단계 간 데이터는 명시적인 상태 객체로 전달된다.
- 로깅/디버그/턴저장 I/O도 별도 모듈에서 제공된다.

### 15.1 단계 위임 완결성
- [x] pre-turn 단계(의도모호성/선행가드/slot derivation/pending 상태) 위임
- [x] context resolution 단계 위임 (`resolveIntentAndPolicyContext`)
- [x] otp/tool/post-tool/finalize/error 단계 위임
- [x] bootstrap 단계 위임 (auth, agent/kb/admin_kb, allowed_tools, session 준비) (`runtimeBootstrap.bootstrapRuntime`)

### 15.2 공통 I/O 위임
- [x] `makeReply` debug payload 구성 로직을 runtime IO 모듈로 이동 (`runtimeTurnIo.makeReplyWithDebug`)
- [x] `insertTurn` 저장 래퍼 로직을 runtime IO 모듈로 이동 (`runtimeTurnIo.insertTurnWithDebug`)
- [x] `flushMcpSkipLogs`(audit insert 포함)를 audit/tool 모듈로 이동 (`toolRuntime.flushMcpSkipLogsWithAudit`)

### 15.3 상태 전달 일관성
- [x] `POST` 내부 로컬 변수 일부를 `RuntimePipelineState` 타입으로 정리 (`runtimePipelineState.createRuntimePipelineState` 도입)
- [x] 단계 모듈 입출력 표준 타입 도입 (`runtimeStepContracts.ts`, pre-turn 3단계 적용)
- [x] step 간 변경 가능한 필드(예: intent/order_id/token) 명시 갱신 (pre-turn/input/tool/post-tool/finalize 직전 + error fallback intent 반영 완료)

### 15.4 엔트리 경로 단순화
- [x] `route.ts -> runtime/runtimeOrchestrator.ts` 경로로 단순화
- [x] `core.ts`/`runtime/orchestration.ts` 정리(삭제) 완료

### 15.5 검증 기준
- [x] `npx tsc --noEmit --pretty false` 통과
- [ ] `npm run lint` 통과 (현재 전체 기준 실패, 런타임 포함 레거시 다수)
- [x] 런타임 스코프 lint 현황 수집 (`npx eslint src/app/api/runtime/chat/runtime --max-warnings=0` -> 165 errors / 14 warnings)
- [ ] 핵심 대화 시나리오 회귀 체크리스트 실행 및 결과 문서화
- [x] 실험실 첫 턴(`session_id` 없음 + `agent_id` 없음) 회귀 방지 (`sessionRuntime`에서 null `agent_id` 세션 생성 허용)

### 15.6 Orchestrator 완료 판정
- [x] 코드 레벨 orchestrator 완성 (단계 위임 + 상태 동기화 + 공통 I/O 분리)
- [ ] 운영 레벨 orchestrator 완성 (엔트리 경로 단순화/참조 전환/검증 완료)

## 14) 엔트리 경로/명명 정리 작업

### 14.1 `core.ts` 참조 전환 계획
- [x] 코드베이스에서 `src/app/api/runtime/chat/core.ts` 참조 지점 식별 (코드/문서/운영스크립트)
- [x] 저장소 내부 서비스 참조를 최종 엔트리 기준으로 전환 (`route.ts`는 `runtime/runtimeOrchestrator` 직접 참조)
- [x] 전환 완료 후 `core.ts` 제거
- [x] `src/app` 코드 기준 직접 참조 확인: 현재 `src/app` 내부 직접 참조 0건 (`route.ts`는 `runtime/runtimeOrchestrator` 직접 참조)
- [x] 전체 검색 기준 참조 현황 기록: `src` 코드 직접 참조 0건 + `docs` 참조 다수(명세/기록 문서)

### 14.2 파일 명명 정리 계획
- [x] 현재 역할 기준 명명 재검토 (`runtimeEngine.ts` -> `runtimeOrchestrator.ts`)
- [x] 명명 변경 시 import 경로 일괄 변경 + 타입체크 검증
- [x] 라우트 엔트리(`route.ts`)는 유지, 중간 엔트리(`core.ts`/`runtime/orchestration.ts`) 제거 결정 및 반영

### 14.3 삭제/단순화 결정 기준
- [x] 외부/내부 참조가 `core.ts`에 남아있지 않음
- [ ] 모니터링/로그/문서 경로 반영 완료
- [ ] 배포 후 롤백 경로 확보 (1 릴리즈 이상 관찰)

## 13) 완료 기준 (Definition of Done)

- [x] `runtimeOrchestrator.ts` 2000줄 이하 (현재 963줄)
- [x] intent별 핵심 분기가 handler/runtime 모듈로 분리
- [x] 라우트는 `runtimeOrchestrator.ts` 직접 호출
- [x] 타입체크(`npx tsc --noEmit --pretty false`) 연속 통과

## 16) "완벽한 Orchestrator" 실행 체크리스트 (무엇을/어떻게)

현재 진행률(코드 구조 기준): **10/11 완료**

- [x] **무엇**: 엔진은 단계 호출만 남기기  
  **어떻게**: bootstrap/pre-turn/context/input-policy/otp/tool/finalize/error를 모듈 호출로 고정
- [x] **무엇**: tool 단계 본문 제거  
  **어떻게**: `runToolStagePipeline`에서 tool gate + 실행 + post-tool을 일괄 조합
- [x] **무엇**: 대화 I/O 래퍼 분리  
  **어떻게**: `runtimeConversationIoRuntime`에서 `makeReply`/`insertTurn` 생성
- [x] **무엇**: MCP 추적/skip 감사 분리  
  **어떻게**: `runtimeMcpOpsRuntime`에서 `noteMcp`/`noteMcpSkip`/`flushMcpSkipLogs` 생성
- [x] **무엇**: input 정책 단계 본문 제거  
  **어떻게**: `runInputStageRuntime`에서 intent 보정/충돌기록/slot 이벤트/forced input 응답 처리
- [x] **무엇**: 초기 상태 계산(이전 턴/슬롯 seed) 분리  
  **어떻게**: `initializeRuntimeState`에서 prev context 파생 + pipelineState 초기화 일괄 처리
- [x] **무엇**: 상태 전달 규약화  
  **어떻게**: `RuntimePipelineState` + `runtimeStepContracts` 유지
- [x] **무엇**: 엔트리 경로 단순화 결정  
  **어떻게**: `route -> runtime/runtimeOrchestrator`로 단순화
- [x] **무엇**: `core.ts` 참조 전환(저장소 내부)  
  **어떻게**: `route.ts` 직접 참조를 `runtime/runtimeOrchestrator`로 이관 후 `core.ts`/`orchestration.ts` 삭제
- [x] **무엇**: 파일 명명 정합성  
  **어떻게**: `runtimeEngine.ts`를 `runtimeOrchestrator.ts`로 rename하고 import 경로 + 타입체크 검증 완료
- [ ] **무엇**: 운영 검증 완료  
  **어떻게**: 핵심 시나리오 회귀 실행/기록 + lint 전략 확정
