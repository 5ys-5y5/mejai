# /app/conversation 대화 정책 소스 전환 설계

## 목표
- `/app/conversation`의 "대화 설정 관리" 정책을 `B_chat_widgets.chat_policy`에서 읽고 저장한다.
- 위젯 범위 정책으로 한정하고, 기존 전역 정책 컬럼/데이터(`B_chat_settings.chat_policy` 또는 `A_iam_auth_settings.providers.chat_policy`)는 유지한다.
- 런타임 전체에서 정책 소스가 일관되도록, 위젯 정책 해석 계약을 공통 로직으로 통합한다.
- **DB는 반드시** `https://grfkmbrhbvcyahflqttl.supabase.co`를 사용한다. 다른 Supabase 프로젝트는 사용 금지.

## 배경
- 현재 전역 정책은 auth settings에 저장/로드되고, 위젯 템플릿 정책은 `theme.__widget_meta.chat_policy`에 저장되어 있다.
- 전역 정책 저장소(`B_chat_settings` 또는 `A_iam_auth_settings`)는 유지하면서, 위젯 정책은 `B_chat_widgets.chat_policy` 컬럼으로 분리하여 관리해야 한다.

## 비목표
- 전역 정책 테이블/컬럼 삭제 또는 데이터 정리
- 위젯 외 페이지(예: `/app/laboratory`, `/demo`)의 정책 소스 변경
- UI 리디자인

## 데이터 계약(Contract) 변경
- **정책 소스 우선순위(위젯 전용 공통 계약):**
  - 1순위: 요청 오버라이드(`overrides.chat_policy`)
  - 2순위: `B_chat_widgets.chat_policy` (인스턴스)
  - 3순위: `B_chat_widgets.chat_policy` (템플릿)
  - 4순위: 전역 정책(`A_iam_auth_settings.providers.chat_policy` 또는 `B_chat_settings.chat_policy`)
- 위 계약은 `resolveWidgetRuntimeConfig` 또는 공통 helper로 통합한다.
- 기존 `theme.__widget_meta.chat_policy`는 **레거시**로 취급하고, 필요 시 마이그레이션/백필에만 사용한다.

## 데이터 모델
- `B_chat_widgets.chat_policy` 타입은 `docs/chat_policy.jsonb` 구조를 따른다.
- 템플릿/인스턴스 모두 동일 컬럼을 사용한다.
- **기존 컬럼/데이터는 삭제하지 않는다.**

## API 변경
- `/api/widget-templates/:id/chat-policy`
  - GET: `B_chat_widgets.chat_policy`를 반환
  - POST: `B_chat_widgets.chat_policy`에 저장
- `/api/widget/init`, `/api/widget/chat`, `/api/widget/stream`, `/api/widget/config`
  - 위젯 정책 해석은 공통 helper를 통해 `B_chat_widgets.chat_policy` 기반으로 통일

## 화면 변경
- `/app/conversation`의 "대화 설정 관리"는
  - `dataSource`가 `B_chat_widgets.chat_policy`를 읽고 저장하도록 변경
  - 전역 정책과 분리된 문구를 유지(위젯 전용 정책임을 명확히)

## 마이그레이션 전략
- **즉시 전환 + 점진 백필**
  - 신규 저장은 `B_chat_widgets.chat_policy`로만 기록
  - 기존 템플릿의 `theme.__widget_meta.chat_policy`가 있으면
    - 런타임 폴백으로만 사용(읽기용)
    - 운영에서 안정화 후, 백필 스크립트로 컬럼에 복사
- 전역 정책은 계속 전역 정책 소스로 유지

## Supabase 주의사항
- 환경 변수 확인:
  - `NEXT_PUBLIC_SUPABASE_URL`가 `https://grfkmbrhbvcyahflqttl.supabase.co`인지 확인
  - 서비스 키도 동일 프로젝트용으로 사용
- `https://jpkhwcllltnqjlomskig.supabase.co`는 **절대 사용 금지**

## 테스트/검증
- `/app/conversation`
  - 템플릿 선택 후 "대화 설정 관리" 저장 -> `B_chat_widgets.chat_policy`에 저장되는지 확인
  - 새로고침 후 동일 정책이 다시 로드되는지 확인
- 런타임
  - 위젯 실행 시 `B_chat_widgets.chat_policy`가 적용되는지 확인
  - 전역 정책만 존재하는 조직에서 폴백이 정상 동작하는지 확인

## 롤백
- `B_chat_widgets.chat_policy` 사용을 중단하고 기존 로직으로 복원
- DB 컬럼/데이터는 그대로 유지 (삭제하지 않음)

## 체크리스트
### 할 것
- 환경 변수/서비스 키가 `https://grfkmbrhbvcyahflqttl.supabase.co`를 가리키는지 확인
- 테스트/검증 시나리오 수행 및 결과 기록

### 한 것
- 설계서 작성
- `/app/conversation` 정책 저장/로드가 `B_chat_widgets.chat_policy`를 사용하도록 변경 (API 기준)
- 위젯 정책 해석 로직을 공통 helper로 통합하고 소스 우선순위 계약 적용
- `/api/widget-templates/:id/chat-policy`가 `B_chat_widgets.chat_policy` 기준으로 동작하도록 수정
- 런타임(`/api/widget/init|chat|stream|config`)에 새 정책 소스 반영
- 레거시(`theme.__widget_meta.chat_policy`) 읽기 폴백 처리 추가
