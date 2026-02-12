# Widget Quickstart UI Design

Quickstart 탭(`/app/settings?tab=quickstart`)에서 위젯 설치를 안내하는 UI 설계 문서다.

**1. 목적**
- 고객사가 “코드 한 줄”을 복사/삽입만 하면 위젯이 활성화되도록 안내한다.
- 복사해야 할 키(`public_key`)와 설치 상태(도메인 확인)를 명확히 보여준다.

**2. 데이터 소스**
- `B_chat_widgets` (org 스코프)
  - `public_key`, `allowed_domains`, `is_active`, `theme`
- 선택: 최근 설치 확인 이벤트(예: `F_widget_events`)

**3. 레이아웃(권장)**
- 카드 0: “시작 안내”
  - `/api/widgets` 호출 → 키 확인 → 코드 삽입 → 런처 확인 → 토큰 발급 → 채팅 확인 순서 안내
- 카드 0-1: “/api/widgets 호출 확인”
  - 성공/실패 상태 표시
  - 실패 시 “채팅 위젯 탭에서 저장 필요” 안내
- 카드 1: “설치 코드”
  - 1줄 스니펫 표시(복사 버튼)
  - “복사할 키: `public_key`” 표시
  - “키 재발급” 버튼(관리자만)
- 카드 2: “허용 도메인”
  - 현재 등록된 도메인 리스트
  - 도메인 추가/삭제 링크(설정 탭으로 이동)
- 카드 3: “설치 상태”
  - 마지막 설치 확인 시간(있으면)
  - 감지되지 않으면 “미확인” 상태 표시
  - 토큰 발급은 위젯 열림 시 자동 처리됨을 안내

**4. 설치 스니펫(기본)**
```html
<script async src="https://mejai.help/widget.js" data-key="mw_pk_xxx"></script>
```

**5. 확장 설정(선택)**
```html
<script>
  window.mejaiWidget = {
    key: "mw_pk_xxx",
    position: "bottom-right",
    locale: "ko",
    user: { id: "user_123", name: "홍길동", email: "a@b.com" }
  };
</script>
<script async src="https://mejai.help/widget.js"></script>
```

**6. 상태 문구**
- 키 없음: “위젯 키가 아직 생성되지 않았습니다.”
- 도메인 미등록: “허용 도메인을 추가해주세요.”
- 설치 미확인: “최근 설치 신호가 없습니다.”
- 정상: “설치가 확인되었습니다.”

**7. 권한**
- `public_key` 재발급 및 비활성화는 관리자만 가능.

**8. 체크리스트**
- [ ] Quickstart 탭에서 1줄 스니펫 복사 가능
- [ ] `public_key` 노출/복사 가능
- [ ] 허용 도메인 상태 확인 가능
