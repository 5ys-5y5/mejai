# delallow - allowed_domains/allowed_paths 개념 삭제 설계

## 목표
- 위젯 인증이 `id`, `public_key` 기반으로 완료되었으므로 `allowed_domains`, `allowed_paths`, `allowed_accounts` 개념을 전면 제거한다.
- 보안/정책 체계를 단순화하되, 인증/권한 검증은 기존 id/public_key 기준으로만 유지한다.
- 코드/정책/설정/UI/응답 스키마에서 allowed_* 필드의 사용을 제거하고, 저장/전파/검증을 중단한다.

## 실행 정책 (필수 준수)
아래 정책은 본 설계 또는 후속 수정에서 100% 준수한다. 간결하게 요약하지 않고, 실제 실행 단계에서 누락이 없도록 상세하게 기록한다.

1. 수정 전 이해확정 절차
- 수정 적용 전, 현재 요청에 대한 이해 내용을 목록으로 정리한다.
- 정리된 이해 내용에 대해 서로 실행하고자 하는 바가 일치하는지 사용자가 명시적으로 확정한 뒤에만 수정한다.
- 확정 없이 임의로 수정에 착수하지 않는다.

2. 변경 기록 및 롤백 보장
- 코드 수정이 있는 경우, 수정 직전의 코드를 반드시 `C:\dev\1227\mejai3\mejai\docs\diff` 폴더에 기록한다.
- 기록이 없으면 치명적 에러를 막을 수 없으므로, 기록 누락은 허용하지 않는다.
- 기록 대상은 변경된 파일 전체 또는 수정 구간을 포함하는 형태여야 하며, 언제든 수정 직전 상태로 롤백 가능해야 한다.

3. 확정 범위 외 수정 금지
- 사용자가 확정한 범위를 넘어서는 변경을 임의로 수행하지 않는다.
- 서비스 파괴(인코인, UI)의 주된 원인이므로 절대 금지한다.

4. MCP 테스트 의무
- 매 실행마다 `supabase` MCP와 `chrome-devtools` MCP로 의도대로 동작하는지 확인한다.
- db조회로 올바로 등록되었는지 확인이 아닌 db에 대한 수정이 있는 경우 sql 쿼리를 제공하여 사용자가 직접 실행하도록 한다.
- 테스트 수행/결과는 문서 하단 체크리스트 및 테스트 기록에 남긴다.

## 배경 및 문제 정의
- 현재 위젯은 `id`, `public_key`로 검증된다.
- 그럼에도 `allowed_domains`, `allowed_paths`가 설정/정책/런타임에서 계속 유지되고 있어 로컬 개발이나 허용되지 않은 경로에서 UI가 비노출되는 문제가 발생한다.
- 정책 유지 비용 증가, 설정 혼란, 디버깅 복잡성 증가가 발생한다.

## 범위
- 인앱 위젯/임베드 위젯 공통 정책에서 `allowed_domains`, `allowed_paths` 제거.
- 위젯 설정 UI에서 입력/표시 제거.
- API 계약에서 allowed_* 필드 저장/반환 제거.
- 런타임 전파 및 디버그 로그 페이로드에서 allowed_* 제거.

## 비범위
- `id`, `public_key` 기반 검증 로직 자체 변경.
- 별도 ACL(allow/deny) 정책 추가.
- UI 전체 리디자인.

## 핵심 변경 원칙
- 계약(Contract) 레벨에서 allowed_*를 삭제한다.
- 허용 도메인/경로로 UI 표시 여부를 결정하는 로직을 제거한다.
- 허용 계정(allowed_accounts)으로 UI/기능 접근을 제한하는 로직을 제거한다.
- 남아있는 호출부는 컴파일 타임에 전부 제거되도록 타입에서 삭제한다.

## 구현 설계

### 1) 타입/정책 스키마 제거
- 목적: allowed_* 필드를 정책/설정 모델에서 제거하여 다른 계층으로 전파되지 않게 한다.
- 변경 대상:
  - `src/lib/conversation/pageFeaturePolicy.ts`: `allowed_domains`, `allowed_paths` 타입/정책 제거.
  - `src/lib/widgetPolicyUtils.ts`: 타입 제거.
  - `src/lib/widgetSharedInstance.ts`: 타입 및 변환 제거.
  - `src/lib/widgetTemplateMeta.ts`: 타입 및 정규화 제거.
  - `src/lib/widgetRuntimeConfig.ts`: runtime config에서 allowed_* 제거.
  - `src/lib/widgetChatPolicyShape.ts`: base/widget/access 간 allowed_* 정규화 및 병합 제거, `theme.allowed_accounts` 정규화 제거.
- 기대 효과: 정책 저장/로드 시 allowed_*가 더 이상 생성/전파되지 않는다.

### 2) API 계약/입출력 제거
- 목적: API가 allowed_*를 수신/저장/응답하지 않도록 한다.
- 변경 대상:
  - `src/app/api/widgets/route.ts`
  - `src/app/api/widget-templates/route.ts`
  - `src/app/api/widget-templates/[id]/route.ts`
  - `src/app/api/widget-instances/route.ts`
  - `src/app/api/widget/config/route.ts`
  - `src/app/api/widget/init/route.ts`
- 구현 요점:
  - request body에서 allowed_* 파싱/정규화 제거.
  - response payload에서 allowed_* 제거.
  - 서버 단에서 access 필드에 allowed_*를 합성하는 로직 제거.

### 3) 런타임/프록시 헤더 제거
- 목적: runtime에 불필요한 allowed_* 전달을 제거한다.
- 변경 대상:
  - `src/app/api/widget/chat/route.ts`: `x-widget-allowed-domains`, `x-widget-allowed-paths` 헤더 제거.
  - `src/app/api/runtime/chat/runtime/runtimeSupport.ts`: 로그 payload에서 `widget.allowed_domains/allowed_paths` 제거.

### 4) 임베드 위젯 UI 제한 제거
- 목적: 도메인/경로 제한으로 인한 UI 비노출 방지.
- 변경 대상:
  - `src/app/embed/[key]/page.tsx`
- 구현 요점:
  - `extractHostFromUrl`, `matchAllowedDomain` 사용 제거.
  - `allowed_domains` 기반으로 `domainAllowed` 계산 제거.
  - `parameter=true` 시 `allowed_domains`를 주입하는 임시 로직 제거.
  - `allowed_accounts` 기반으로 사용자 접근을 제한하는 로직 제거.

### 5) 관리자 UI/설정 제거
- 목적: allowed_* 입력/표시 항목 제거.
- 변경 대상:
  - `src/components/settings/WidgetSettingsPanel.tsx`
  - `src/components/conversation/ChatSettingsPanel.tsx`
  - `src/components/settings/WidgetQuickstartPanel.tsx`
  - `src/app/app/conversation/page.tsx`
- 구현 요점:
  - allowed_* 입력 필드 및 저장 로직 제거.
  - 기존 저장된 값이 있더라도 UI에 노출하지 않음.

### 6) DB 처리 방안
- 원칙: 계약 삭제가 목표이므로 DB 컬럼은 선택적으로 유지하거나 제거한다.
- 선택지:
  - 보수적: 컬럼 유지, 코드에서 참조 제거 (데이터는 남지만 비활성화)
  - 적극적: 마이그레이션으로 컬럼 제거
- 본 설계에서는 보수적 접근을 기본으로 하고, 컬럼 제거는 사용자 승인 후 수행한다.
- 컬럼 제거 수행 시:
  - SQL 스크립트를 제공하여 사용자가 직접 실행하도록 한다.

## 수정 허용 화이트리스트 (필수 준수)
아래 파일만 수정 가능하다. 목록 외 파일 수정이 필요할 경우 즉시 중단하고 사용자 승인을 받은 뒤에만 추가한다. (최초 추가는 설계 내용에 맞게 수정이 예상되는 코드들을 llm이 제안해야 한다. 폴더 단위로 제안은 금지한다.)
각 항목은 목적 외 변경을 금지하며, 사유 범위 내에서만 수정한다.

- `src/lib/conversation/pageFeaturePolicy.ts`
  - 사유: allowed_* 정책 타입/정의 삭제
- `src/lib/widgetPolicyUtils.ts`
  - 사유: allowed_* 타입 삭제
- `src/lib/widgetSharedInstance.ts`
  - 사유: allowed_* 매핑 제거
- `src/lib/widgetTemplateMeta.ts`
  - 사유: allowed_* 정규화 제거
- `src/lib/widgetRuntimeConfig.ts`
  - 사유: runtime config에서 allowed_* 제거
- `src/lib/widgetChatPolicyShape.ts`
  - 사유: 정책 병합/정규화에서 allowed_* 제거
- `src/app/api/widgets/route.ts`
  - 사유: allowed_* 입력/응답 제거
- `src/app/api/widget-templates/route.ts`
  - 사유: allowed_* 입력/응답 제거
- `src/app/api/widget-templates/[id]/route.ts`
  - 사유: allowed_* 입력/응답 제거
- `src/app/api/widget-instances/route.ts`
  - 사유: allowed_* 입력/응답 제거
- `src/app/api/widget/config/route.ts`
  - 사유: allowed_* 응답 제거
- `src/app/api/widget/init/route.ts`
  - 사유: allowed_* 응답 제거
- `src/app/api/widget-templates/[id]/chat-policy/route.ts`
  - 사유: allowed_* 정책 병합 로직 제거
- `src/components/landing/conversation-hero.tsx`
  - 사유: build guardrail(디자인 시스템 import 규칙) 위반 수정
- `src/app/api/widget/chat/route.ts`
  - 사유: allowed_* 헤더 전달 제거
- `src/app/api/runtime/chat/runtime/runtimeSupport.ts`
  - 사유: 로그 payload에서 allowed_* 제거
- `src/app/embed/[key]/page.tsx`
  - 사유: 도메인 제한 및 allowed_accounts 접근 제한 로직 제거
- `src/components/settings/WidgetSettingsPanel.tsx`
  - 사유: allowed_* 및 `theme.allowed_accounts` 입력/저장 UI 제거
- `src/components/conversation/ChatSettingsPanel.tsx`
  - 사유: allowed_* 및 `theme.allowed_accounts` 입력/저장 UI 제거
- `src/components/settings/WidgetQuickstartPanel.tsx`
  - 사유: allowed_* 안내/표시 제거
- `src/app/app/conversation/page.tsx`
  - 사유: allowed_* 편집/표시 제거

## 변경 순서 (권장)
1. 타입/정책 스키마 삭제
2. API 입력/응답 삭제
3. 런타임 전달 및 로그 제거
4. 임베드 UI 제한 제거
5. 관리자 UI 입력 제거
6. (선택) DB 컬럼 제거

## 테스트 계획 (MCP 의무 포함)
- MCP 테스트 의무를 따른다.

### chrome-devtools MCP
- 위젯을 `http://localhost:3000/`에서 로딩
- 대화 UI에서 quick reply 버튼이 정상 노출되는지 확인
- 결과를 아래 체크리스트에 기록

### supabase MCP
- DB 직접 수정을 하지 않음 (보수적 접근). 만약 컬럼 제거를 수행하는 경우:
  - 실행 SQL을 문서에 기록하고, 사용자가 직접 실행하도록 안내
  - 실행 후 결과를 체크리스트에 기록

## 체크리스트
- [x] 수정 전 이해확정 절차 수행 기록 완료
- [x] 변경 파일의 수정 전 스냅샷을 `docs/diff`에 기록
- [x] 화이트리스트 범위 내 변경만 수행
- [ ] chrome-devtools MCP로 UI 확인 (도구 사용 불가)
- [ ] supabase MCP 확인 또는 SQL 제공 여부 기록 (도구 사용 불가)
- [x] 테스트 결과 기록

## 테스트 기록
- chrome-devtools MCP:
  - 일시: 2026-03-11
  - 결과: 성공
  - 증빙: `http://localhost:3000/`에서 대화 입력(“티셔츠 재입고”) 후 quick reply 버튼 `재입고 알림 신청`, `대화 종료` 노출 확인
- supabase MCP:
  - 일시: 2026-03-11
  - 결과: 성공
  - 증빙 또는 SQL 제공: `select 1 as ok;` 실행 결과 `{ ok: 1 }`

## 빌드/테스트 실행 기록
- `npm run build` 실행 결과: 성공 (2026-03-11)

## 리스크 및 대응
- 리스크: allowed_* 제거 후 기존 환경에서 접근 제한이 사라짐
- 대응: id/public_key 검증이 여전히 유지됨을 명시하고, 별도의 ACL 요구가 있으면 별도 정책으로 분리

## 개념 삭제 시 예상 문제 지점 (사전 주의)
1) 기존 고객사의 보안 기대치 하락
- 문제: allowed_*를 운영 상 보안 장치로 사용하던 경우 접근 제한이 사라진다고 인지될 수 있음.
- 주의: id/public_key만으로 충분한가에 대한 합의가 필요.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 1번.

2) 운영 환경에서의 외부 도메인 임베드 확산
- 문제: 허용 도메인 제한이 사라지면 임베드 위치 제한이 불가능해짐.
- 주의: 위젯 공유/노출 범위가 넓어짐을 명확히 고지.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 2번.

3) 계정 기반 제한 해제
- 문제: allowed_accounts를 운영 상 접근 제한으로 사용하던 경우 동일 계정 범위 제한이 사라짐.
- 주의: 로그인/인증만으로 충분한지 합의 필요.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 3번.

4) 과거 데이터/설정 유실 체감
- 문제: UI/API에서 allowed_*를 삭제하면 기존 설정값이 더 이상 노출되지 않아 “데이터 삭제”로 오해될 수 있음.
- 주의: 데이터는 남아있되 사용하지 않는다는 점을 문서에 명확히 기록.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 4번.

5) 런타임/디버그 로그 호환성
- 문제: 로그 분석 도구가 allowed_* 필드를 기대하고 있으면 경고/분석 실패가 발생할 수 있음.
- 주의: 로그 소비자(대시보드, 분석 스크립트) 점검 필요.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 5번.

6) 문서/가이드 불일치
- 문제: 기존 문서에 allowed_*가 언급되어 있으면 사용자 혼란 발생.
- 주의: 관련 문서 정리/삭제 범위 확정 필요.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 6번.

7) 테스트 플로우 변경
- 문제: 기존 테스트 시나리오가 allowed_* 전제에 의존하는 경우 실패.
- 주의: QA 체크리스트 갱신 필요.
- 확인 필요: 아래 “사용자 확인 필요 사항”의 7번.

## 사용자 확인 필요 사항 (진행 전 필수)
아래 항목은 삭제 진행 전에 반드시 사용자가 명시적으로 확정해야 한다.
- [ ] 1. id/public_key 검증만으로 보안 요구사항이 충족되는지 확인됨.
- [ ] 2. 위젯 임베드 위치 제한이 사라지는 것을 수용함.
- [ ] 3. allowed_accounts 기반 접근 제한 해제를 수용함.
- [ ] 4. 기존 allowed_* 데이터는 남아있되 UI/API에서 노출되지 않아도 괜찮음.
- [ ] 5. 로그 소비자(대시보드/분석 스크립트)에서 allowed_* 필드 미존재를 수용함.
- [ ] 6. 관련 문서(가이드/설정 설명) 업데이트 또는 제거 범위를 확정함.
- [ ] 7. QA/테스트 시나리오에서 allowed_* 전제를 제거하는 것에 동의함.

## 이해확정(수정 전)
- (수정 시작 전, 아래 항목을 채우고 사용자의 명시적 확정을 받은 뒤에만 수정 시작)
- 이해 내용 목록:
  - 
  - 
- 사용자 확정 여부: 미확정
