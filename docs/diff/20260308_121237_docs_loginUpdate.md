# Login UI Widget Embed Design

## 개요
목표는 `/login` 페이지의 기존 로그인 UI/로직을 **그대로 유지**하면서, 위젯(B_chat_widgets.id = `c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc`)을 임베드해 대화 기능을 시험하는 것입니다. 안전한 적용을 위해 **/logindemo 페이지**에서 먼저 검증한 뒤 성공 시 `/login`으로 이동합니다.

## 현재 구조(현황)
- 로그인 페이지는 `src/app/login/page.tsx` → `src/app/login/LoginClient.tsx` 구조이며 `AuthShell`, `Input`, `getSupabaseClient`를 사용합니다.
- 위젯 렌더링은 `/embed/[key]` 라우트(`src/app/embed/[key]/page.tsx`)에서 제공되며, `template_key=` 또는 public key를 경로에 전달해 위젯을 로딩합니다.
- 위젯 초기화는 `/api/widget/init` 및 `/api/widget/config` 등의 서버 라우트를 통해 수행됩니다.

## 요구사항
1. 로그인 페이지에서 위젯(B_chat_widgets.id = `c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc`)을 임베드해 대화 기능을 사용할 수 있어야 함.
2. 기존 로그인 UI/API 동작을 훼손하지 않아야 함.
3. `/logindemo` 페이지에서 먼저 시도 후 성공 시 `/login`으로 이동.

## 실행 정책 (필수 준수)
아래 정책은 본 설계 또는 후속 수정에서 100% 준수한다. 간결하게 요약하지 않고, 실제 실행 단계에서 누락이 없도록 상세하게 기록한다.

### 1. 수정 전 이해확정 절차
- 수정 적용 전, 현재 요청에 대한 이해 내용을 목록으로 정리한다.
- 정리된 이해 내용에 대해 서로 실행하고자 하는 바가 일치하는지 사용자가 명시적으로 확정한 뒤에만 수정한다.
- 확정 없이 임의로 수정에 착수하지 않는다.

### 2. 변경 기록 및 롤백 보장
- 코드 수정이 있는 경우, 수정 직전의 코드를 반드시 `C:\dev\1227\mejai3\mejai\docs\diff` 폴더에 기록한다.
- 기록이 없으면 치명적 에러를 막을 수 없으므로, 기록 누락은 허용하지 않는다.
- 기록 대상은 변경된 파일 전체 또는 수정 구간을 포함하는 형태여야 하며, 언제든 수정 직전 상태로 롤백 가능해야 한다.

### 3. 확정 범위 외 수정 금지
- 사용자가 확정한 범위를 넘어서는 변경을 임의로 수행하지 않는다.
- 서비스 파괴(인코인, UI)의 주된 원인이므로 절대 금지한다.

### 4. MCP 테스트 의무
- 매 실행마다 `supabase` MCP와 `chrome-devtools` MCP로 의도대로 동작하는지 확인한다.
- 테스트 수행/결과는 문서 하단 체크리스트 및 테스트 기록에 남긴다.

## 수정 허용 화이트리스트 (필수 준수)
아래 파일만 수정 가능하다. 목록 외 파일 수정이 필요할 경우 즉시 중단하고 사용자 승인을 받은 뒤에만 추가한다.
각 항목은 목적 외 변경을 금지하며, 사유 범위 내에서만 수정한다.

- `src/app/logindemo/page.tsx` (신규 데모 라우트)
- `src/app/logindemo/LoginDemoClient.tsx` (신규 데모 클라이언트 컴포넌트)
- `src/components/LoginForm.tsx` (기존 로그인 폼을 재사용하기 위한 공통 컴포넌트, 필요 시)
- `src/app/login/LoginClient.tsx` (공통 로그인 폼 도입 시에만, 로그인 로직 유지 목적)
- `src/app/login/page.tsx` (필요 시 라우팅/레이아웃만 한정 변경)
- `src/components/AuthShell.tsx` (레이아웃 변경이 불가피할 때만, 최소 변경)
- `docs/loginUpdate.md` (본 설계 문서)

## 설계안
### 핵심 전략
- `/login`은 **변경하지 않고 유지**한다.
- `/logindemo`에 위젯을 임베드한다.
- `/logindemo`에서 성공(위젯 로드, 메시지 송신/응답 확인) 후, 동일한 UI 구성을 `/login`으로 옮긴다.

### UI/컴포넌트 구성
- 로그인 폼을 공통 컴포넌트로 분리해 중복을 제거한다.
  - 예: `src/components/LoginForm.tsx`
  - `LoginClient`는 기존 로직(상태/핸들러)을 유지하면서 `LoginForm`에 props로 전달.
  - `LoginDemoClient`는 동일한 `LoginForm`을 사용하고, 추가로 위젯 임베드 영역을 렌더링.

### 위젯 임베드 방식
- 위젯은 `/embed/[key]` 라우트를 iframe으로 임베드한다.
- `key`는 템플릿 키 형식(`template_key=<widget_id>`)을 사용한다.
  - 예: `/embed/template_key=c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc`
- 위젯 페이지에 전달할 메타 파라미터(선택):
  - `origin`: `window.location.origin`
  - `page_url`: `window.location.href`
  - 필요 시 `preview=1` (관리자 프리뷰 기능)

### 데이터/권한 전제 조건
- `B_chat_widgets.id = c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc`가 **활성화(is_active)** 되어 있어야 한다.
- 임베드가 동작하려면 아래 중 하나를 만족해야 한다.
  - 위젯이 공개(is_public)이며 `allowed_domains`에 `localhost` 또는 `localhost:3000`이 허용됨
  - 또는 관리자 프리뷰(로그인 상태 + `preview=1`) 사용

## 단계별 실행 계획
### 0) 이해확정(필수)
- 아래 이해 목록을 작성 후 사용자에게 확인 요청한다.
- 사용자가 명시적으로 “확정”한 후에만 수정에 착수한다.

### 1) 변경 전 기록(필수)
- 수정 대상 파일의 현재 상태를 `docs/diff`에 저장한다.
- 기록 파일명은 `YYYYMMDD_HHMMSS_원본경로.md` 형식을 권장한다.

### 2) logindemo 구현
- `src/app/logindemo/page.tsx` 생성
- `src/app/logindemo/LoginDemoClient.tsx` 생성
- `LoginForm` 공통화가 필요할 경우 `src/components/LoginForm.tsx` 생성 후 `LoginClient`에서 사용
- UI는 기존 로그인 화면을 그대로 유지하고, 위젯 영역만 추가한다.

### 3) 동작 검증(MCP 테스트)
- `chrome-devtools` MCP로 `/logindemo` 접속 후 위젯 렌더/대화 송신/응답 확인
- `supabase` MCP로 위젯 관련 테이블(B_chat_widgets, B_chat_widget_instances 등) 상태 확인

### 4) 로그인 페이지로 이관
- `/logindemo`가 정상 동작함이 확인되면 동일 구성을 `/login`에 반영
- 기존 로그인 동작과 API 호출 흐름이 바뀌지 않도록 유지

## 변경 영향 범위
- UI: 로그인 페이지 레이아웃에 위젯 임베드 영역 추가
- 로직: 로그인 로직/서명/라우팅은 **변경 금지**
- 공통화: 로그인 폼을 재사용 컴포넌트로 분리(필요 시)

## 롤백 전략
- 변경 전 기록 파일로 즉시 원복 가능해야 한다.
- 롤백 시에는 `/logindemo` 제거 → `/login` 원상 복구 순서로 진행한다.

## 테스트 계획
- 필수: `supabase` MCP, `chrome-devtools` MCP
- 기능 테스트 항목:
  - `/logindemo`에서 로그인 폼이 기존과 동일하게 렌더되는지
  - `/logindemo`에서 위젯이 로드되는지
  - 위젯에서 메시지 전송 및 응답이 정상 동작하는지
  - `/login`에 기존 로그인 흐름이 변함없는지

## 테스트 기록 (실행 시 채움)
- 실행 날짜: 2026-03-08
- 실행자: Codex
- 테스트 환경: `http://localhost:3000/logindemo`
- MCP 테스트 결과 (supabase): `B_chat_widgets`에서 `c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc` 조회됨 (is_active=true, is_public=true)
- MCP 테스트 결과 (chrome-devtools): `/logindemo` 접속, 위젯 iframe 로드 확인
- 기능 검증 결과 (로그인 폼 렌더): 정상
- 기능 검증 결과 (위젯 로드): 정상
- 기능 검증 결과 (위젯 메시지 송수신): 미검증 (사용자 입력 필요)
## 추가 실행 기록 (2026-03-08)
- 변경 사항: `/logindemo` 위젯 주변 껍데기 제거, iframe 1개 div로 단순화
- 빌드: `npm run build` 성공
- MCP 테스트 결과 (supabase): `B_chat_widgets`에서 `c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc` 조회됨 (is_active=true, is_public=true)
- MCP 테스트 결과 (chrome-devtools): `/logindemo` 접속, 위젯 iframe 로드 확인 (헤더/설명 제거됨)
- 기능 검증 결과 (로그인 폼 렌더): 정상
- 기능 검증 결과 (위젯 로드): 정상
- 기능 검증 결과 (위젯 메시지 송수신): 미검증 (사용자 입력 필요)

## 이해확정용 요약(수정 전 사용자 확인용)
- `/login`은 그대로 두고 `/logindemo`에서 위젯 임베드 검증 후 성공 시 이관한다.
- 위젯은 `/embed/template_key=c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc` 형태로 iframe 임베드한다.
- 로그인 로직 및 API 호출 흐름은 변경하지 않는다.
- 변경 전에는 반드시 `docs/diff`에 원본 기록을 남긴다.
- 매 실행마다 `supabase` MCP와 `chrome-devtools` MCP로 테스트하고 기록한다.
