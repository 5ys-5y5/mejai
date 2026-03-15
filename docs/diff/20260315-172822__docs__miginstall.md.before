# `/app/install` -> `/app/create` 마이그레이션 설계서

작성일: 2026-03-15  
대상 범위: `/app/create?tab=template`, `/app/create?tab=chat`, `/app/create?tab=api`, `/app/install` 유지 정책

## 1. 문서 목적

이 문서는 `/app/install` 페이지의 역할을 `/app/create` 페이지로 단계적으로 옮기기 위한 설계 문서다.  
이번 문서의 핵심은 "삭제 설계"가 아니라 "안전한 병행 운영 설계"다.

이번 설계에서 반드시 지켜야 하는 제품 계약은 아래와 같다.

1. 템플릿 설치 UI는 `/app/create?tab=template` 에서 제공한다.
2. 인스턴스 설치 UI는 `/app/create?tab=chat` 에서 제공한다.
3. `/app/install?tab=env` 의 `환경 변수 관리 안내`, `서버 환경 변수` 는 더 이상 이관 대상이 아니다.
4. 대신 `/app/install?tab=env` 의 `환경 변수` 영역 안에 있는 Cafe24 연결 플로우는 `/app/create?tab=api` 에 반드시 독립 구현한다.
5. 사용자가 명시적으로 허락하기 전까지 `/app/install` 페이지는 삭제하지 않는다.
6. `/app/create` 구현을 위해 `/app/install` 의 페이지 코드나 패널 코드를 import 하면 안 된다.
7. 나중에 `/app/install` 이 삭제되어도 `/app/create` 만으로 기능이 완전히 동작해야 한다.

이 문서는 후속 구현자가 바로 따라야 하는 실행 문서다. 따라서 아래를 모두 포함한다.

- 현재 상태 진단
- 목표 UX
- 구현 원칙
- 단계별 구현안
- 수정 전 이해확정 절차
- 실행 정책
- 수정 허용 화이트리스트
- 테스트 체크리스트
- 이번 문서 작성 시점의 MCP 확인 기록

## 2. 이번 설계에서 확정된 해석

### 2.1 템플릿 설치 UI에 대한 해석

`/app/create?tab=template` 는 이미 템플릿 설치의 핵심 기능을 상당 부분 가지고 있다.  
현재도 템플릿 키, 설치 코드, 프리뷰 메타, 설치 링크/프리뷰 링크를 다룬다.

근거 코드:

- `src/components/create/CreateWidgetTab.tsx:28-30`
- `src/components/create/CreateWidgetTab.tsx:73-78`
- `src/components/widget-template/WidgetTemplateSettingsEditor.tsx:277-320`
- `src/lib/conversation/client/useWidgetTemplateSettingsController.ts:604-633`

현재 실제 화면 확인:

- `/app/create?tab=template` 에 `설치 코드와 프리뷰 메타` 카드가 이미 보인다.
- 설치 스크립트는 `widget_id + public_key` 기반이다.

Chrome DevTools 스냅샷 확인값:

- `설치 코드와 프리뷰 메타`
- `템플릿 설치 코드는 관리자 전용입니다.`
- `<script async src="http://localhost:3000/widget.js" data-widget-id="..." data-public-key="..."></script>`

따라서 이번 설계의 해석은 아래와 같다.

- 템플릿 설치 "기능"은 이미 대부분 존재한다.
- 부족한 것은 설치 안내용 UX다.
- 후속 구현은 새 기능을 억지로 만드는 것이 아니라, 기존 기능을 설치 안내 중심으로 재구성하는 작업이다.

### 2.2 인스턴스 설치 UI에 대한 해석

`/app/create?tab=chat` 는 이미 dedicated 인스턴스 설치 코드와 preview URL 을 생성한다.  
하지만 사용자가 처음 보는 "설치 안내용 UX" 는 없다.

근거 코드:

- `src/components/create/CreateChatTab.tsx:188-212`
- `src/components/create/CreateChatTab.tsx:340-342`
- `src/components/create/CreateChatTab.tsx:510-539`

현재 실제 화면 확인:

- `/app/create?tab=chat` 에서는 인스턴스가 없으면 `생성된 대화창이 없습니다.` 만 보인다.
- quickstart 형식의 단계 안내는 없다.

따라서 이번 설계의 해석은 아래와 같다.

- 인스턴스 설치 "기능"은 이미 존재한다.
- 부족한 것은 설치 시작 문맥, 단계 안내, 선택 전/후 상태 설명이다.
- 후속 구현은 `/app/install?tab=quickstart` 를 복사하는 것이 아니라, dedicated 인스턴스 기준으로 안내 UX 를 다시 써야 한다.

### 2.3 API / Env 통합에 대한 해석

`/app/create?tab=api` 는 현재 provider DB 값 편집기다.  
반면 `/app/install?tab=env` 는 3개 덩어리를 갖고 있다.

1. `환경 변수 관리 안내`
2. `서버 환경 변수`
3. `환경 변수` 편집 및 Cafe24 연결 플로우

근거 코드:

- `src/components/create/CreateApiTab.tsx:203-256`
- `src/components/create/CreateApiTab.tsx:260-420`
- `src/components/settings/EnvSettingsPanel.tsx:803-842`
- `src/components/settings/EnvSettingsPanel.tsx:845-1245`

현재 실제 화면 확인:

- `/app/create?tab=api` 는 스스로 `서버 환경 변수는 이 탭에서 다루지 않습니다.` 라고 말한다.
- `/app/install?tab=env` 에는 `환경 변수 관리 안내`, `서버 환경 변수`, `환경 변수` 섹션이 모두 존재한다.
- Cafe24 mall_id -> OAuth -> shop_no -> board_no 흐름은 아직 `/app/create?tab=api` 에 없다.

따라서 이번 설계의 해석은 아래와 같다.

- `환경 변수 관리 안내` 와 `서버 환경 변수` 는 버린다.
- `환경 변수` 편집 기능과 Cafe24 연결 플로우만 `/app/create?tab=api` 로 가져온다.
- 이 플로우는 `/app/install` 코드를 import 하지 않고 새로 구현해야 한다.

## 3. 현재 상태 진단

### 3.1 `/app/create?tab=template`

현재 있는 것:

- 템플릿 목록
- 템플릿키 표시
- 설치 코드 복사
- overrides JSON 입력
- preview meta 입력
- 위젯 UI 링크
- 설치 링크

현재 없는 것:

- 설치 목적만 빠르게 이해시키는 별도 안내 카드
- "무엇을 어디에 붙여넣는지" 를 설명하는 비개발자용 가이드
- 템플릿 설치와 프리뷰 메타 편집을 명확히 구분한 UX

정리:

- 기능은 있다.
- 안내 UX 가 부족하다.

### 3.2 `/app/create?tab=chat`

현재 있는 것:

- 인스턴스 생성/수정/삭제
- 연결 템플릿 선택
- public key 기반 설치 코드 생성
- preview URL 표시
- 설치 코드 복사

현재 없는 것:

- 인스턴스 선택 전의 quickstart 안내
- "템플릿 선택 -> 인스턴스 생성 -> 코드 복사 -> 사이트에 붙여넣기" 흐름 설명
- 인스턴스가 비어 있을 때의 설치 시작 가이드

정리:

- 기능은 있다.
- 첫 진입 가이드가 없다.

### 3.3 `/app/create?tab=api`

현재 있는 것:

- `A_iam_auth_settings.providers` 읽기/쓰기
- Cafe24 / Shopify 값 직접 편집
- 현재 저장 요약 확인

현재 없는 것:

- Cafe24 OAuth 시작
- OAuth popup/callback 처리
- shop_no 목록 읽기
- board_no 선택 단계
- 단계형 저장 흐름

정리:

- 단순 편집기만 있다.
- 실사용 연결 플로우는 빠져 있다.

### 3.4 `/app/install`

현재 유지해야 하는 이유:

- `/app/create` 는 아직 설치 안내 UX parity 를 갖추지 못했다.
- `/app/create?tab=api` 는 Cafe24 연결 플로우 parity 가 없다.
- 사용자 명시 승인 전에는 삭제 금지다.

따라서 이 문서 기준 구현 단계에서는 `/app/install` 을 손대지 않는다.

## 4. 목표 UX

### 4.1 `/app/create?tab=template`

목표는 "템플릿 설치 기능"을 새로 만드는 것이 아니라, 이미 있는 템플릿 설치 기능 위에 "설치 안내용 UX" 를 얹는 것이다.

최종 UX 요구사항:

1. 템플릿 상세 영역 안에 설치 안내 카드가 보여야 한다.
2. 안내 카드는 비개발자도 이해 가능한 순서형 설명을 제공해야 한다.
3. 현재 템플릿의 public key, 설치 코드, 설치 링크, 위젯 UI 링크를 한 그룹으로 보여야 한다.
4. preview meta 편집 영역과 설치 안내 영역은 시각적으로 분리해야 한다.
5. 설치 가이드는 `/app/install` 을 전혀 참조하지 않아야 한다.

권장 문장 흐름:

1. 템플릿을 선택한다.
2. 템플릿키가 발급되어 있는지 확인한다.
3. 설치 코드를 복사해 고객사 페이지 `body` 끝에 붙여넣는다.
4. 필요하면 설치 링크나 위젯 UI 링크로 미리보기한다.

### 4.2 `/app/create?tab=chat`

목표는 dedicated 인스턴스 설치 UX 를 `/app/create?tab=chat` 안에서 시작부터 끝까지 이해 가능하게 만드는 것이다.

최종 UX 요구사항:

1. 인스턴스가 없을 때도 "어떻게 시작하는지" 설명하는 가이드가 보여야 한다.
2. 인스턴스를 선택하면 현재의 배포/설치 카드와 연결된 안내 카드가 함께 보여야 한다.
3. 안내 카드에는 `연결 템플릿`, `발급키`, `preview URL`, `설치 코드 복사` 의 의미를 쉬운 말로 설명해야 한다.
4. quickstart 안내는 shared, ready, missing 같은 과거 개념을 사용하면 안 된다.
5. 안내 문구는 dedicated 인스턴스 흐름만 설명해야 한다.

권장 문장 흐름:

1. 템플릿을 고른다.
2. 새 대화창을 만든다.
3. 발급된 키를 포함한 설치 코드를 복사한다.
4. 고객사 페이지에 붙여넣고 새로고침해 확인한다.

### 4.3 `/app/create?tab=api`

목표는 `/app/install?tab=env` 의 `환경 변수` 영역만 독립 이식하는 것이다.

최종 UX 요구사항:

1. `환경 변수 관리 안내` 카드는 만들지 않는다.
2. `서버 환경 변수` 카드는 만들지 않는다.
3. `환경 변수` 편집 UX 와 Cafe24 연결 플로우만 만든다.
4. Cafe24 연결은 `mall_id 입력 -> OAuth 연결 -> shop_no 선택 -> board_no 선택 -> 저장` 흐름을 가져야 한다.
5. `/app/install` 의 `EnvSettingsPanel` 을 import 하면 안 된다.
6. `/app/install` 이 나중에 삭제돼도 `/app/create?tab=api` 단독으로 동작해야 한다.

권장 문장 흐름:

1. mall_id 를 입력한다.
2. OAuth 연결을 진행한다.
3. 연결된 mall 에서 shop_no 를 선택한다.
4. 사용할 게시판 board_no 를 선택한다.
5. 저장 후 현재 등록된 값을 확인한다.

## 5. 구현 원칙

### 5.1 가장 중요한 금지 사항

아래는 절대 금지다.

1. `/app/install` 삭제 선조치
2. `/app/create` 에서 `WidgetInstallPanel`, `WidgetQuickstartPanel`, `EnvSettingsPanel` 을 import 하는 방식
3. `/app/install` 의 문구를 그대로 복사해 shared 개념을 다시 들여오는 방식
4. 사용자의 별도 승인 없이 `/app/install` 링크나 라우팅을 제거하는 작업

### 5.2 허용되는 구현 방식

아래 방식만 허용한다.

1. `/app/create` 전용 컴포넌트를 새로 만든다.
2. `/app/create` 전용 컴포넌트가 기존 create 탭 컴포넌트 안에서만 사용되도록 한다.
3. 필요한 경우 install 페이지와 무관한 새로운 중립 helper 를 추가한다.
4. API 호출은 기존 endpoint 를 사용하되, UI 코드는 create 쪽에서 새로 작성한다.

## 6. 단계별 구현안

### 6.1 1단계: 템플릿 설치 안내 UX 추가

수정 방향:

- `CreateWidgetTab` 또는 `WidgetTemplateSettingsEditor` 안에 설치 안내 카드 추가
- 현재 controller 가 제공하는 `installScript`, `installUrl`, `templatePreviewUrl`, `public_key` 를 안내 카드에서 읽기
- 기존 설치 코드/preview meta 영역을 "편집 영역"과 "설치 안내 영역"으로 분리

예상 산출물:

- 설치 순서 안내 블록
- 현재 템플릿키 표시
- 설치 코드 복사 CTA
- 설치 링크 / 위젯 UI 링크 설명

### 6.2 2단계: 인스턴스 설치 안내 UX 추가

수정 방향:

- `CreateChatTab` 안에 dedicated 설치 quickstart 카드 추가
- 인스턴스가 없을 때는 시작 안내 상태를 보여줌
- 인스턴스가 선택되면 기존 배포/설치 카드와 연결된 설명 블록을 보여줌

예상 산출물:

- 생성 전 empty-state 가이드
- 생성 후 설치 순서 안내
- 현재 배포/설치 카드의 용어 설명

### 6.3 3단계: Cafe24 연결 플로우를 `/app/create?tab=api` 로 이식

수정 방향:

- `CreateApiTab` 의 단순 Cafe24 입력 폼을 단계형 플로우로 재구성
- `mall_id`, OAuth, `shop_no`, `board_no`, 저장 단계를 create 전용 구현으로 재작성
- 현재의 `범위 제외`, `서버 환경 변수는 다루지 않습니다` 문구는 새 목표에 맞게 다시 씀

반드시 포함할 기능:

- `/api/cafe24/authorize` 호출
- popup 시작
- postMessage callback 처리
- OAuth timeout / retry 대응
- shop_no 목록 조회
- board_no 다중 선택
- 저장 전 유효성 검사

### 6.4 4단계: 병행 운영 검증

이 단계에서는 아래만 확인한다.

1. `/app/create?tab=template` 에서 템플릿 설치 가이드가 독립 동작하는가
2. `/app/create?tab=chat` 에서 인스턴스 설치 가이드가 독립 동작하는가
3. `/app/create?tab=api` 에서 Cafe24 연결 플로우가 독립 동작하는가
4. `/app/install` 은 여전히 기존대로 접속 가능한가

이 단계까지는 `/app/install` 삭제 금지다.

## 7. 수정 전 이해확정 절차

후속 구현 시작 전, 아래 이해 항목을 목록으로 다시 정리한 뒤 사용자의 `확정` 을 받아야 한다.

1. 템플릿 설치 안내 UX 는 `/app/create?tab=template` 에 추가한다.
2. 인스턴스 설치 안내 UX 는 `/app/create?tab=chat` 에 추가한다.
3. `/app/create?tab=api` 는 `환경 변수 관리 안내`, `서버 환경 변수` 없이 `환경 변수` 와 Cafe24 연결 플로우만 제공한다.
4. `/app/install` 은 사용자 허락 전 삭제하지 않는다.
5. `/app/create` 는 `/app/install` 컴포넌트를 import 하지 않는다.
6. 이번 단계에서 네비게이션 링크 제거는 하지 않는다.
7. 화이트리스트 외 파일이 필요하면 즉시 중단하고 승인받는다.

확정 없이 수정에 착수하지 않는다.

## 8. 실행 정책 (필수 준수)

아래 정책은 후속 구현에서 100% 준수한다.

1. 계약 수준으로 구현한다.
   - 템플릿 설치, 인스턴스 설치, Cafe24 연결 흐름을 각각 독립 계약으로 설계한다.
   - 한 화면의 임시 문구 수정으로 끝내지 않는다.
2. UI 변경은 확정된 범위 안에서만 수행한다.
   - 템플릿 탭, 대화창 탭, api 탭 외 영역을 임의로 건드리지 않는다.
3. `/app/install` 은 병행 운영 대상으로 유지한다.
   - 삭제, redirect, 숨김, 네비게이션 제거는 사용자 승인 전 금지다.
4. import 금지 규칙을 지킨다.
   - `WidgetInstallPanel`, `WidgetQuickstartPanel`, `EnvSettingsPanel` 을 create 쪽에서 import 하면 설계 위반이다.
5. DB 스키마 변경은 이번 설계 범위에 없다.
   - 필요성이 새로 생기면 즉시 중단하고 사용자 승인을 받는다.
6. build 검증은 구현 턴마다 반드시 수행한다.
   - `npm run build` 실패 상태로 종료하지 않는다.
7. MCP 테스트는 구현 턴마다 반드시 수행한다.
   - `chrome-devtools` 로 실제 페이지 흐름을 확인한다.
   - `supabase` 로 저장 결과를 읽기 확인한다.
   - DB 수정이 필요해지면 SQL 을 제공하고 사용자가 직접 실행하도록 한다.

## 9. 수정 허용 화이트리스트 (필수 준수)

아래 파일만 수정 가능하다. 각 파일은 명시된 목적 범위 안에서만 수정한다.

| 파일 | 허용 목적 |
| --- | --- |
| `docs/miginstall.md` | 본 설계 문서 유지/갱신 |
| `src/components/create/CreateWidgetTab.tsx` | 템플릿 탭에 설치 안내 UX 진입 구조 추가 |
| `src/components/widget-template/WidgetTemplateSettingsEditor.tsx` | 템플릿 편집기 안의 설치 안내/설치 편집 UX 재구성 |
| `src/lib/conversation/client/useWidgetTemplateSettingsController.ts` | 템플릿 설치 안내에 필요한 파생 데이터 노출 정리 |
| `src/components/create/CreateChatTab.tsx` | dedicated 인스턴스 설치 안내 UX 추가 |
| `src/components/create/CreateApiTab.tsx` | Cafe24 연결 플로우를 포함한 create 전용 환경 변수 UX 구현 |
| `src/components/create/CreateTemplateInstallGuide.tsx` | create 전용 템플릿 설치 안내 컴포넌트 신설 |
| `src/components/create/CreateChatInstallGuide.tsx` | create 전용 인스턴스 설치 안내 컴포넌트 신설 |
| `src/components/create/CreateCafe24ConnectionFlow.tsx` | create 전용 Cafe24 연결 플로우 컴포넌트 신설 |

화이트리스트 외 파일이 필요하면 즉시 중단하고 사용자 승인을 먼저 받는다.  
폴더 단위 제안은 금지하고, 파일 단위로만 추가 요청한다.

## 10. 이번 단계에서 수정 금지 대상

아래 파일은 이번 설계 기준 구현에서 수정 금지다.

- `src/app/app/install/page.tsx`
- `src/components/settings/WidgetInstallPanel.tsx`
- `src/components/settings/WidgetQuickstartPanel.tsx`
- `src/components/settings/EnvSettingsPanel.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/AppShell.tsx`
- `src/app/app/page.tsx`
- `src/app/app/settings/page.tsx`

이유:

- `/app/install` 은 아직 병행 운영 대상이다.
- create 쪽 기능을 install 쪽 코드에 의존시키면 나중 삭제 시 다시 깨진다.
- 링크 제거, redirect 전환, install 진입점 변경은 사용자 승인 이후 별도 단계로 분리해야 안전하다.

## 11. 테스트 체크리스트

후속 구현 턴마다 아래를 확인한다.

### 11.1 Chrome DevTools MCP

1. `/app/create?tab=template`
   - 설치 안내 카드가 보이는가
   - 템플릿키, 설치 코드, 설치 링크, 위젯 UI 링크가 안내 문맥 안에 보이는가
2. `/app/create?tab=chat`
   - 인스턴스 없음 상태에서 시작 안내가 보이는가
   - 인스턴스 선택 시 설치 순서와 설치 코드가 함께 보이는가
3. `/app/create?tab=api`
   - `환경 변수 관리 안내`, `서버 환경 변수` 카드가 없는가
   - Cafe24 mall -> OAuth -> shop -> board -> 저장 흐름이 동작하는가
4. `/app/install?tab=env`
   - 기존 페이지가 여전히 열리는가

### 11.2 Supabase MCP

1. `A_iam_auth_settings` 의 provider 값이 create/api 저장 결과와 일치하는가
2. template/chat 안내 UX 추가가 불필요한 DB write 를 만들지 않는가
3. DB 변경이 필요해지면 SQL 을 문서에 적고 사용자가 직접 실행하도록 했는가

### 11.3 Build

1. `npm run build` 성공
2. 타입 에러, import/export mismatch, props 타입 에러 없음

## 12. 이번 문서 작성 시점 MCP 확인 기록

작성일 기준 실제 확인 결과:

### 12.1 Chrome DevTools MCP

- `/app/create?tab=template`
  - `설치 코드와 프리뷰 메타` 카드 존재 확인
  - 실제 설치 스크립트가 `data-widget-id`, `data-public-key` 기반임을 확인
- `/app/create?tab=chat`
  - 대화창이 0개인 상태에서 설치 안내 대신 empty state 만 보임 확인
- `/app/create?tab=api`
  - `서버 환경 변수는 이 탭에서 다루지 않습니다.`
  - `범위 제외`
  - ``/app/install?tab=env` 의 "서버 환경 변수" 영역은 이 탭에서 제외됩니다.`
  - 위 문구가 실제로 노출됨을 확인
- `/app/install?tab=env`
  - `환경 변수 관리 안내`
  - `서버 환경 변수`
  - `환경 변수`
  - 세 섹션이 모두 실제로 존재함을 확인

### 12.2 Supabase MCP

- `public.B_chat_widgets` 존재 확인
- `public.B_chat_widget_instances` 존재 확인
- `public.A_iam_auth_settings` 존재 확인
- 현재 `public.B_chat_widget_instances` row count 는 `0`

## 13. 최종 판단

현재 단계의 정답은 아래다.

1. `/app/create?tab=template` 는 템플릿 설치 기능을 이미 가지고 있으므로, 설치 안내 UX 를 추가하는 방향이 맞다.
2. `/app/create?tab=chat` 는 인스턴스 설치 기능을 이미 가지고 있으므로, dedicated quickstart UX 를 추가하는 방향이 맞다.
3. `/app/create?tab=api` 는 아직 Cafe24 연결 플로우 parity 가 없으므로, 이 부분을 create 전용으로 새로 구현해야 한다.
4. `/app/install` 은 지금 삭제 대상이 아니라 병행 운영 대상이다.
5. `/app/install` 코드를 import 해서 create 를 만드는 방식은 금지한다.

즉, 이번 설계의 핵심은 "복사 재사용"이 아니라 "독립 구현 후 병행 검증"이다.
