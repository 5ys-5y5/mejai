# 위젯 로드시 초기 설정 불일치 제거 설계

작성일: 2026-03-08  
작성자: Codex

## 문제 요약
위젯이 로드되는 과정에서 다음 설정이 즉시 반영되지 않고, 잠시 기본값으로 렌더링되는 현상이 있다.
- `widget.defaultTab`
- URL 파라미터 `tab=policy` 등 강제 탭 지정
- `/app/conversation`에서 설정한 on/off 항목

결과적으로 사용자가 **의도된 탭/기능 상태와 다른 화면을 잠깐 보게 된다.**

## 설계 원칙 (계약/의도 레벨)
- 특정 페이지나 탭에 한정된 패치가 아니라, **위젯 로딩 계약 자체를 명확히**한다.
- “설정이 확정되기 전에는 UI를 노출하지 않는다”는 공통 규칙을 **모든 위젯 로딩 흐름에 적용**한다.
- 초기 탭/기능 결정 로직은 **공통 함수/공통 단계**로 이동하여 재사용한다.

## 목표
- 초기 렌더 시점부터 **설정과 완전히 일치하는 UI만 표시**
- 비동기 설정 로딩 중에는 **잘못된 탭/기능을 절대 노출하지 않음**
- `tab` 파라미터, `widget.defaultTab`, `allowedTabs` 우선순위가 **항상 동일하게 적용**

## 해결 전략 (설계)

### 1) “설정 준비 완료 단계” 도입 (공통 단계)
위젯 로딩 단계에 `configReady` 개념을 추가한다.
- `widget_config` 수신 완료
- `pageFeatures`/`setupUi` 계산 완료
- `allowedTabs` 계산 완료

이 조건을 모두 만족할 때만 실제 UI를 렌더링한다.  
준비 전에는 **로딩 스켈레톤 또는 빈 화면**을 사용한다.

### 2) 초기 탭 확정 로직 단일화
설정 완료 시점에만 **딱 한 번** 탭을 결정한다.

우선순위:
1. URL 파라미터 `tab=...`
2. `widget.defaultTab`
3. `allowedTabs[0]` (fallback)

이 우선순위는 **공통 함수로 고정**하여 어디서든 동일하게 적용한다.

### 3) 정책/기능 토글 반영 타이밍 고정
`pageFeatures`/`setupUi`가 확정되기 전에는 아래 UI를 숨긴다.
- 탭바
- 개별 패널 (`chat/list/policy/login`)

즉, “초기 화면”은 **정책 확정 이후에만 노출**된다.

## 구현 위치 (예상)
- `src/app/embed/[key]/page.tsx`  
  - `configReady` 상태 도입
  - 설정 준비 전 렌더 차단
- `src/components/widget/*` (공통 로더/탭 결정 로직)  
  - 탭 결정 공통 함수
  - `configReady` 기반 렌더 제어

## 기대 효과
- “잠깐 잘못된 탭이 보이는 현상” 제거
- URL 파라미터/기본 탭/허용 탭 우선순위 일관성 확보
- 모든 위젯에서 동일한 초기 로딩 계약 적용

## 테스트 기록 (MCP)
- 2026-03-08 `supabase` MCP: `list_tables` 실행 완료
- 2026-03-08 `chrome-devtools` MCP: `/app/conversation` 스냅샷 확인 완료
- 2026-03-08 `supabase` MCP: `list_tables` 실행 완료 (구현 변경 후 재검증)
- 2026-03-08 `chrome-devtools` MCP: `/logindemo` 및 `tab=policy` embed 스냅샷 확인 완료

## 체크리스트
- [x] `supabase` MCP 테스트 수행
- [x] `chrome-devtools` MCP 테스트 수행
