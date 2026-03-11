# delsettingtab - /app/admin?tab=chat 삭제 설계 및 체크리스트

## 목적
- /app/admin?tab=chat 페이지(관리자 대화 설정 탭)를 삭제하기 전에 영향 범위, 위험, 검증 절차를 명확히 문서화한다.
- 위젯 실행 조건(키/ID 조합)과 무관한 관리자 UI 삭제가 실제로 서비스 동작에 영향을 주지 않도록 사전 확인한다.

## 배경 및 현재 상태 요약
- /app/admin?tab=chat 은 관리자 UI에서 대화 설정을 편집하는 화면이다.
- 위젯 실행은 B_chat_widgets / B_chat_widget_instances의 ID 및 public_key 조합 검증으로 이뤄지며, 관리자 UI와 분리되어 있다.
- ChatSettingsPanel은 정책(provider) 설정/디버그 옵션 등을 편집하는 UI이다.
- BASE_PAGE_KEYS는 관리자 UI에서 기본 페이지 목록을 생성하는 내부 상수이며 위젯 실행과 직접적 관련이 없다.

## 영향 범위 (삭제로 인해 영향을 받는 항목 전수 나열)

### 1) 사용자/관리자 UI 경로
- /app/admin?tab=chat (삭제 대상)
  - 관리자 대화 설정 화면 접근 불가
  - 대화 설정/정책 편집 기능 제거됨

### 2) 라우팅 및 네비게이션 연동
- src/app/app/admin/page.tsx
  - 탭 목록에 "대화 설정"(chat) 포함
  - /app/admin?tab=chat 진입 시 ChatSettingsPanel 렌더
- src/components/AppSidebar.tsx
  - 어드민 메뉴(/app/admin) 링크 존재
- src/components/AppShell.tsx
  - /app/admin 경로 타이틀 표기
- src/middleware.ts
  - /app/admin, /app/admin/:path* 접근 제어 규칙 존재
- src/app/app/settings/page.tsx
  - 설정 페이지에서 /app/admin?tab=... 리다이렉트

### 3) 실제 기능/데이터 경로
- ChatSettingsPanel을 통해 관리되는 항목
  - conversation/page features (setup, visibility, interaction 등)
  - debug_copy 설정
  - settings_ui.setup_fields 및 labels
  - policy 관련 필드 관리
- 위젯 실행 경로에는 직접 영향 없음
  - 위젯 실행은 별도 API 경로 및 키 검증으로 진행

### 4) 데이터 저장 위치
- B_chat_widgets.chat_policy
- B_chat_widget_instances.chat_policy
- B_chat_settings.chat_policy (정책 저장 장소 중 하나)


## 삭제 시 예상되는 문제/변화

### A. 관리자 운영 측면
- 관리자 UI에서 대화 설정(정책/디버그/세팅)을 수정할 수 없음
- 설정 변경이 필요한 경우, 직접 DB/API 수정으로만 가능
- 운영자가 정책 수정이 필요한 상황에서 대응 지연 가능

### B. 기능/서비스 동작 측면
- 위젯 실행 자체는 영향 없음 (ID/public_key 조합 검증 로직은 별도)
- 기존 저장된 정책은 유지되며, 런타임은 기존 정책을 계속 사용
- 단, 향후 정책 변경이 필요한 경우 UI 부재로 인해 위험 증가

### C. 개발/운영 흐름 측면
- 테스트 환경에서 관리자 설정을 손쉽게 조정하는 경로가 사라짐
- QA/운영팀이 직접 확인할 수 있는 UI가 사라짐


## 삭제 범위 정의 (계획 단계)
- 삭제 대상: /app/admin?tab=chat 탭
- 제거 방식: 탭 목록에서 chat 제거, 해당 탭 렌더 분기 제거
- /app/settings?tab=chat 진입 시 /app/conversation으로 리다이렉트
- 삭제 후 영향이 없는지 확인할 항목:
  - 관리자 페이지 로딩
  - 다른 탭(proposal/performance/policies/design-system) 정상 동작
  - 위젯 실행 (ID+key 조합) 정상 동작


## 수정 허용 화이트리스트 (확정)
아래 파일만 수정 가능하다. 목록 외 파일 수정이 필요할 경우 즉시 중단하고 사용자 승인을 받은 뒤에만 추가한다.

1. src/app/app/admin/page.tsx
   - 목적: chat 탭 제거 및 라우팅 분기 제거

2. src/app/app/settings/page.tsx
   - 목적: /app/admin?tab=chat 리다이렉트 제거, /app/conversation으로 이동 처리


## 실행 정책 (필수 준수)
아래 정책은 본 설계 또는 후속 수정에서 100% 준수한다. 간결하게 요약하지 않고, 실제 실행 단계에서 누락이 없도록 상세하게 기록한다.

### 1) 수정 전 이해확정 절차
- 수정 적용 전, 현재 요청에 대한 이해 내용을 목록으로 정리한다.
- 정리된 이해 내용에 대해 서로 실행하고자 하는 바가 일치하는지 사용자가 명시적으로 확정한 뒤에만 수정한다.
- 확정 없이 임의로 수정에 착수하지 않는다.

### 2) 변경 기록 및 롤백 보장
- 코드 수정이 있는 경우, 수정 직전의 코드를 반드시 C:\dev\1227\mejai3\mejai\docs\diff 폴더에 기록한다.
- 기록이 없으면 치명적 에러를 막을 수 없으므로, 기록 누락은 허용하지 않는다.
- 기록 대상은 변경된 파일 전체 또는 수정 구간을 포함하는 형태여야 하며, 언제든 수정 직전 상태로 롤백 가능해야 한다.

### 3) 확정 범위 외 수정 금지
- 사용자가 확정한 범위를 넘어서는 변경을 임의로 수행하지 않는다.
- 서비스 파괴(인코인, UI)의 주된 원인이므로 절대 금지한다.

### 4) MCP 테스트 의무
- 매 실행마다 supabase MCP와 chrome-devtools MCP로 의도대로 동작하는지 확인한다.
- DB 수정이 있는 경우 SQL 쿼리를 제공하여 사용자가 직접 실행하도록 한다.
- 테스트 수행/결과는 문서 하단 체크리스트 및 테스트 기록에 남긴다.


## 삭제 실행 전 체크리스트 (사전 확정용)
- [ ] 삭제 대상 범위 확정: /app/admin?tab=chat 만 제거하는지 확인
- [ ] 위젯 실행 조건(ID/public_key 조합)과 독립적임을 재확인
- [ ] 관리자 운영 프로세스에서 대체 경로(DB/API 수정) 합의
- [ ] 수정 허용 화이트리스트 확정
- [ ] 이해확정 절차 완료(사용자 명시적 승인)


## 삭제 실행 단계 체크리스트 (실행 후 검증 포함)

### A. 코드 변경 전
- [x] 변경 대상 파일을 docs/diff에 백업
- [x] 변경 범위가 확정 목록 내인지 확인

### B. 코드 변경 후
- [x] 빌드/타입 오류 없음 확인 (npm run build 성공)
- [ ] UI에서 /app/admin 접속 시 다른 탭 정상 렌더 확인 (미로그인 상태로 리다이렉트됨)

### C. MCP 테스트 기록
- [x] supabase MCP 테스트 실행
- [x] chrome-devtools MCP 테스트 실행
- [x] 테스트 결과를 문서 하단에 기록


## 테스트 기록 (실행 시 업데이트)

### supabase MCP
- 실행 여부: 실행
- 실행 시각: 2026-03-11
- 결과: `select 1` 정상 반환 (ok=1)

### chrome-devtools MCP
- 실행 여부: 실행
- 실행 시각: 2026-03-11
- 결과: /app/admin?tab=chat 접근 시 로그인 페이지로 리다이렉트됨 (미로그인 상태)


## 예상되는 후속 결정 항목
- 관리자 설정 기능을 다른 페이지로 이동할지 여부
- 정책 수정의 대체 운영 절차 수립(DB 직접 수정 또는 별도 UI)
- /app/admin 경로 자체는 유지할지 삭제할지 범위 확정


## 삭제 대상 후보 ( /app/conversation 과의 충돌 점검 결과 )

### 0) /app/conversation -> src/components/settings 의존성 점검 결과
- 직접 의존성(코드 import) 없음
  - `/app/conversation` 구현: `src/app/app/conversation/page.tsx`
  - 사용 패널: `src/components/conversation/ChatSettingsPanel.tsx`
  - 위 두 파일 및 관련 라이브러리에서 `src/components/settings/*` import가 발견되지 않음
- 간접 의존성(동일 API 사용)
  - /app/conversation은 `src/components/settings/ChatSettingsPanel.tsx`와 일부 API를 공유함
  - 공유 API는 “설정 폴더 코드”가 아니라 **서버 API**이므로,
    /app/conversation이 `src/components/settings`에 의존하는 것이 아님

### 1) /app/conversation 과 공유되어 삭제하면 안 되는 항목
- /api/runtime/governance/config
  - /app/conversation 페이지의 `src/components/conversation/ChatSettingsPanel.tsx`에서 사용
  - /app/admin?tab=chat용 `src/components/settings/ChatSettingsPanel.tsx`에서도 사용
  - 따라서 /app/admin?tab=chat 삭제와 무관하게 유지 필요

### 2) /app/conversation 과 충돌하지 않으며, admin?tab=chat 전용으로 보이는 삭제 후보
- src/components/settings/ChatSettingsPanel.tsx
  - /app/admin?tab=chat 전용 UI 구현
  - /app/conversation은 `src/components/conversation/ChatSettingsPanel.tsx` 사용
- src/app/api/runtime/debug-fields/route.ts
  - 사용처가 `src/components/settings/ChatSettingsPanel.tsx`에만 존재
  - /app/conversation은 이 엔드포인트를 호출하지 않음

### 3) /app/conversation 과 직접 충돌하지 않지만, 다른 화면에서 사용되므로 삭제하면 안 되는 항목
- /api/auth-settings/providers (chat_policy provider)
  - /app/conversation은 사용하지 않지만,
    lab/hero/runtime 등 다른 기능에서 사용
  - /app/admin?tab=chat 삭제와 별개로 유지 필요

