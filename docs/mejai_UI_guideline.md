# Mejai UI Guideline (Compact Functional Spec)

## 1) 목적
- 페이지 정보 없이도, 기능 요소 단위로 UI를 **복제 구현**할 수 있도록 디자인/구조/상호작용 기준을 정의한다.
- 운영 콘솔 스타일을 기본으로 한다.

## 2) 디자인 토큰 (고정)
- 폰트: `Apple SD Gothic Neo`
- 기본 톤: `bg-white`, `text-slate-900`, `border-slate-200`
- 상태색:
  - 성공: `emerald` (`bg-emerald-50 text-emerald-700 border-emerald-200`)
  - 경고: `amber` (`bg-amber-50 text-amber-700 border-amber-200`)
  - 위험: `rose` (`bg-rose-50 text-rose-600/700 border-rose-200`)
- 라운드:
  - 기본 박스/카드: `rounded-xl`
  - 보조 박스: `rounded-lg`
  - 배지/토글: `rounded-full`

## 3) 레이아웃 시스템

### 3.1 앱 프레임
- 전체: `h-screen overflow-hidden flex`
- 상단 헤더: `h-[60px] sticky top-0 z-30`
- 본문 스크롤: `main`에 `overflow-y-auto pt-[60px]`
- 사이드바: `sticky top-0 h-screen` (확장 `w-72`, 축소 `w-20`)

### 3.2 페이지 컨테이너
- 기본: `px-5 md:px-8 py-6`
- 폭: `mx-auto w-full max-w-6xl`
- 확장형(고밀도 패널): `max-w-7xl`

### 3.3 간격 스케일
- 기준: 0.5=2px, 1=4px, 1.5=6px, 2=8px, 2.5=10px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px
- 권장 조합:
  - 섹션: `space-y-6` / `mt-6`
  - 카드 내부 그룹: `space-y-3` / `gap-3`
  - 라벨-필드: `mb-1`

## 4) 박스/카드/행 구성 규격
- 기본 카드: `rounded-xl border border-slate-200 bg-white`
- 카드 헤더: `px-4 py-3` 또는 `px-5 py-4`
- 카드 본문: `p-4` 또는 `p-5`
- 행 높이:
  - 헤더행: `min-h-[40px]`
  - 데이터행: `min-h-[44px]`

## 5) 데이터 표시 패턴

### 5.1 리스트 패턴
- 컨테이너: `ul.divide-y.divide-slate-200`
- 행: `p-4 hover:bg-slate-50`
- 행 구성:
  - 1행: 제목/ID + 상태 배지 + 시간(우측)
  - 2행: 보조정보 칩/링크

### 5.2 운영형 테이블 패턴 (권장)
- `<table>`보다 `ul + grid` 사용
- 헤더/본문 동일 컬럼 폭 유지
- 셀 패딩:
  - 밀집형 `px-2 py-2`
  - 일반형 `px-4 py-3`

### 5.3 비교/문서형 테이블
- 의미상 표가 명확한 경우만 `<table>` 사용
- 가로 오버플로 필요 시 `overflow-x-auto`

## 6) 스크롤 규격
- 페이지 스크롤: 본문(`main`) 단일 스크롤
- 카드 내부 스크롤:
  - 기본 `max-h-[360px] overflow-y-auto`
  - 대형 `max-h-[720px] overflow-y-auto`
  - 선택 리스트 `max-h-56 overflow-auto`
- 내부 헤더 고정: `sticky top-0 z-10 bg-white`
- 코드/Diff/와이드 표: `overflow-x-auto`

## 7) 입력/버튼/상태 요소

### 7.1 입력
- 높이:
  - 밀집 폼 `h-9`
  - 일반 폼 `h-10`
- 공통: `border-slate-200 px-3`
- Textarea: `px-3 py-2`, `min-h-[50px|80px|160px|220px]`

### 7.2 버튼 계층
- Primary: `bg-slate-900 text-white`
- Secondary: `border border-slate-200 bg-white`
- Destructive: `border-rose-200 bg-rose-50 text-rose-600`
- 아이콘 버튼:
  - 소형 `h-6 w-6`
  - 기본 `h-8 w-8`
  - 중형 `h-9 w-9`
- 비활성: `disabled:opacity-*`, `disabled:cursor-not-allowed`

### 7.3 상태 요소
- 배지: `px-2 py-0.5 text-[11px] rounded-full`
- 칩(아이콘+라벨): `rounded-lg border bg-slate-50 px-2 py-1 text-xs`
- 에러 문구: `text-rose-600` 또는 에러 박스(`rose` 배경)

## 8) 기능 요소별 디자인 규격 (페이지 무관)

### 8.1 필터 바
- 구조: 좌/우 정렬 + `gap-2`~`gap-3`
- 요소: 텍스트 필터, 단일 선택, 다중 선택, 기간 선택
- 컨트롤 높이: `h-8` 또는 `h-9`

### 8.2 모드 스위치
- 2분할 또는 3분할 버튼 그리드 사용
- 활성 버튼은 배경 강조:
  - 중립 모드: `bg-slate-100`
  - 생성/신규: `bg-emerald-50`
  - 수정/주의: `bg-amber-50`

### 8.3 버전 관리 요소
- 컬럼 포함:
  - 버전, 배포(ON/OFF), 성과 지표, 수정일, 변경요약, 삭제
- 배포 ON:
  - 활성 `bg-emerald-600 text-white`
  - 비활성 `bg-slate-200 text-slate-600`

### 8.4 단계형 위저드
- 상단 Stepper + 하단 카드 단일 본문
- 하단 액션: 이전/다음/완료
- 스텝 상태 색:
  - 완료/현재: primary
  - 미완료: muted

### 8.5 관리자 전용 블록
- 구분 배지: `ADMIN`(amber 톤)
- 관리자 토글/설정 버튼은 우상단 아이콘 버튼으로 배치
- 사용자 UI와 충돌하지 않도록 접기/펼치기 구조 사용

### 8.6 실시간 상태 표시
- 상태 pill: `rounded-full border px-3 py-1.5 text-xs`
- 점 색상:
  - 연결됨 `emerald`
  - 연결중 `amber`
  - 종료/오류 `rose`

### 8.7 대화/채팅 패턴
- 버블:
  - 사용자 `bg-slate-900 text-white`
  - 시스템/봇 `bg-slate-100 border border-slate-200`
- 공통: `rounded-2xl px-4 py-2 text-sm`
- 메시지 영역: 스크롤 컨테이너 + 하단 gradient 페이드 가능

### 8.8 선택지 UI (답변 선택/확인 포함)
- 텍스트 선택지:
  - 버튼 그리드(최대 3열), `rounded-lg border px-3 py-2 text-xs`
  - 선택 상태: `border-slate-900 bg-slate-900 text-white`
- 선택 확인 버튼:
  - `h-8 w-8 rounded-lg border`
  - 활성은 dark, 비활성은 `slate-100/400`
- 카드형 선택지:
  - `rounded-xl border p-2`
  - 썸네일 영역 `h-24`
  - 좌상단 번호 배지 `h-5 w-5 rounded-full`
  - 제목 2줄, 보조텍스트 2줄 clamp

### 8.9 액션 로그/디버그 표시
- 메시지 하단 보조 박스:
  - `rounded-md border border-slate-200 bg-white/70 px-2 py-1.5`
- 로그 라벨 + 관리자 배지 + 줄목록

## 9) 반응형/접근성 기준
- `md` 기준으로 레이아웃 전환(사이드바/여백/그리드)
- 작은 화면에서:
  - 탭/필터는 `overflow-x-auto`
  - 텍스트 줄바꿈/잘림(`truncate`) 명확히 제어
- 인터랙션 요소는 아이콘만 쓰지 말고 `aria-label` 제공

## 10) 구현 체크리스트 (복제 완료 기준)
- [ ] 앱 프레임(사이드바/헤더/본문 스크롤) 동일
- [ ] 페이지 컨테이너/폭/간격 토큰 동일
- [ ] 카드/행 높이/셀 패딩 규격 동일
- [ ] 상태색과 버튼 계층 동일
- [ ] 리스트/테이블/스크롤 패턴 동일
- [ ] 기능 요소(필터/모드 스위치/버전관리/위저드/실시간상태/채팅선택지) 구현
- [ ] 관리자 전용 요소 분리 구현
- [ ] 로딩/빈 상태/오류 상태 UI 포함

## 11) 구현 금지/주의
- 임의 색상 추가(보라/강한 원색) 금지
- 카드 라운드/패딩을 페이지마다 다르게 쓰는 것 금지
- 페이지 전체와 카드 내부에 동시에 과도한 중첩 스크롤 금지
- `<table>` 남용 금지(운영형은 grid-table 우선)

## 12) `src/app` 전체 라우터 점검 (규칙 위반 + 복제 구현율)

평가 기준:
- 규칙 위반: 본 문서 2~11장의 규칙 기준 (Yes/No)
- 복제 구현율: 이 문서만 보고 동일 UI를 재현할 수 있는 예상치 (%)

| Route | 규칙 위반 | 문서 기반 복제 구현율 |
|---|---|---:|
| `/call/{token}` | Yes (accent/primary 중심 채팅 예외 스타일) | 74% |
| `/onboarding` | Yes (accent/muted 기반 위저드 예외 스타일) | 72% |
| `/` | Yes (마케팅 전용 강한 스타일, 운영 토큰과 차이) | 65% |
| `/demo` | Yes (데모 전용 인터랙티브 레이아웃 상세 부족) | 60% |
| `/admin` | Yes (랜딩 설정 전용 zinc 기반 UI, 본 가이드 범위 밖) | 35% |
| `/app/team` | No (리다이렉트) | 100% |
| `/app/audit` | No (리다이렉트) | 100% |
| `/app/eval` | No | 96% |
| `/app/billing` | No | 95% |
| `/app/calls` | No | 93% |
| `/app` | No | 92% |
| `/app/review` | No | 92% |
| `/app/kb` | No | 92% |
| `/app/agents` | No | 91% |
| `/app/rules` | No | 91% |
| `/app/agents/{id}` | No | 89% |
| `/app/settings` | No | 89% |
| `/login` | No | 88% |
| `/signup` | No | 86% |
| `/app/calls/{sessionId}` | No | 86% |
| `/verify` | No | 85% |
| `/forgot` | No | 85% |
| `/app/agents/new` | No | 85% |
| `/app/kb/{id}` | No | 84% |
| `/app/laboratory` | No | 83% |
| `/app/kb/new` | No | 82% |

### 12.1 요약
- 운영 콘솔 라우터(` /app/* `)는 현재 문서만으로도 대체로 82~96% 범위 복제가 가능하다.
- 복제율이 낮은 구간:
  - `/app/laboratory` (복잡한 상태/선택/관리자 토글/대화 분기)
  - `/app/kb/new`, `/app/kb/{id}` (관리자 정책 입력/버전 분기)
- Public/Admin 특수 라우터(`/`, `/demo`, `/onboarding`, `/call/{token}`, `/admin`)는 운영 콘솔 규칙과 다른 예외 스타일이 있어 복제율이 상대적으로 낮다.
