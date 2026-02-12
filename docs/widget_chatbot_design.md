# Web Widget Chatbot Design

mejai 서비스를 사용하는 고객사의 웹사이트 우측 하단에 챗봇 접근 위젯을 제공하기 위한 설계 문서입니다.

**1. 목표/범위**
- 고객사 페이지에 플로팅 런처와 채팅 패널을 제공한다.
- 고객사 페이지에 "코드 한 줄" 수준으로 삽입 가능해야 한다.
- mejai 런타임(`POST /api/runtime/chat`) 응답을 동일한 형태로 표시한다.
- 스트리밍(SSE/WS) 응답을 지원한다.
- 도메인 허용 목록 기반으로 보안을 적용한다.
- 운영 콘솔에서 에이전트, 브랜딩, 기본 메시지를 관리한다.
- 고객사 페이지당 위젯 1개만 지원한다.
- 프리챗 폼(이름/이메일)은 필수가 아니며, 대화 맥락상 필요한 경우에만 요청한다.

**2. 사용자 경험**
- 우측 하단 플로팅 버튼으로 진입한다.
- 클릭 시 패널이 열리고 다시 클릭 시 최소화된다.
- 데스크탑: 패널 폭 360~420px, 높이 560~640px.
- 모바일: 풀스크린 전환.
- 환영 메시지, 최근 세션 이어보기 지원.

**3. 시스템 구성**
- 고객사 페이지: `widget.js` 1줄 삽입
- mejai 도메인: `iframe` 기반 채팅 UI
- API
  - `POST /api/widget/init`
  - `POST /api/widget/chat`
  - `POST /api/widget/event` (선택)
  - `GET /api/widget/stream` 또는 `ws://.../api/widget/ws` (스트리밍)

**4. 데이터 모델**
- `B_chat_widgets` 신규 테이블
  - `id`, `org_id`, `name`, `agent_id`, `public_key`
  - `allowed_domains` (array)
  - `allowed_paths` (optional)
  - `theme` (json: 색상, 아이콘, 환영 메시지, 위치 등)
  - `is_active`, `created_at`, `updated_at`
- `D_conv_sessions` 재사용
  - `channel = "web_widget"`
  - `metadata.widget_id`, `metadata.origin`, `metadata.page_url`, `metadata.visitor_id`
- `A_end_users` 계열 테이블 연동
  - 상세 설계: `docs/end_user_memory_design.md`
  - visitor 식별 정보(이메일/전화/외부ID/쿠키)를 기반으로 `A_end_user_identities` 매칭
  - 세션 생성 시 `A_end_user_sessions` 연결
- `F_widget_events` 선택 로그 테이블
  - `event_type`, `session_id`, `payload`, `created_at`

**5. API 계약**

`POST /api/widget/init`
- 요청
  - `public_key`
  - `origin`, `page_url`, `referrer`
  - `visitor` (선택: id, name, email, phone)
- 응답
  - `widget_token` (짧은 TTL JWT)
  - `session_id`
  - `widget_config` (theme, greeting, ui 옵션)

`POST /api/widget/chat`
- 헤더: `Authorization: Bearer <widget_token>`
- 요청
  - `message`
  - `session_id` (있으면 이어쓰기)
  - `context` (선택: visitor, page_url, custom attributes)
- 스트리밍
  - `Accept: text/event-stream` 또는 `?stream=1`
- 응답
  - 런타임 표준 payload 그대로 반환
  - `message`, `quick_replies`, `render_plan`, `response_schema`, `session_id`, `turn_id`

`GET /api/widget/stream` (SSE, 권장)
- 요청
  - 쿼리: `token`, `session_id`
- 응답
  - `event: delta` (부분 응답)
  - `event: message` (최종 응답)
  - `event: error`

`ws://.../api/widget/ws` (선택)
- 요청
  - `join`, `user_message` 이벤트
- 응답
  - `assistant_message`, `delta`, `error`

`POST /api/widget/event` (선택)
- 요청
  - `type` (`open`, `close`, `cta_click`, `form_submit`)
  - `session_id`, `payload`

**6. 런타임 연동 방식**
- `/api/widget/chat`에서 내부적으로 `POST /api/runtime/chat`에 전달한다.
- widget 토큰 기반 요청을 위해 런타임 bootstrap 분기 필요.
- 세션 생성 시 `channel = "web_widget"`와 `metadata`를 저장한다.
- end-user 메모리 설계에 맞춰 `A_end_users`, `A_end_user_sessions`, `A_end_user_messages`를 함께 갱신한다.

**7. 보안**
- `allowed_domains`와 요청 `Origin` 또는 `Referer`를 비교 검증한다.
- `iframe` 페이지에 CSP `frame-ancestors` 적용.
- 위젯 토큰 TTL 30~60분 권장.
- `widget_token`에는 `org_id`, `widget_id`, `origin`, `visitor_id`를 포함한다.

**8. 운영 콘솔**
- 메뉴: `설정 > 채팅 위젯`, `설정 > Quickstart`
- 기능
  - 위젯 이름, 에이전트 선택
  - 허용 도메인/경로
  - 색상/아이콘/환영 메시지
  - 위치, 모바일 허용 여부
- 저장 시 `public_key` 발급 및 설치 스니펫 제공.
- Quickstart(`http://localhost:3000/app/settings?tab=quickstart`)
  - 코드 1줄 설치 스니펫 표시
  - 복사해야 할 API 키 안내 (`public_key`)
  - 복사 후 사용자별 고유 키 확인
  - 허용 도메인 상태 및 설치 완료 여부 표시
  - 상세 UI 설계: `docs/widget_quickstart_ui_design.md`

**9. 설치 스니펫**
```html
<script async src="https://mejai.help/widget.js" data-key="mw_pk_xxx"></script>
```
확장 설정(선택):
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

**10. 구현 순서**
1. `B_chat_widgets` 테이블 및 관리자 UI
2. `POST /api/widget/init`, `POST /api/widget/chat` 구현
3. `embed/{public_key}` 페이지 및 `widget.js` 런처
4. 도메인 허용/보안 헤더 적용
5. 이벤트 로그 및 기본 통계

**11. 결정 사항**
- 위젯 복수 개 지원 여부: 불허. 고객사 페이지당 1개만 지원.
- 스트리밍(SSE/WS) 필요 여부: 필요.
- 프리챗 폼(이름/이메일) 필수 여부: 필수가 아니며, 대화 맥락상 필요한 경우에만 요청.

**12. 구현 체크리스트**
전제 조건(완료 전에는 아래 구현을 시작하지 않음):
- [x] end-user 메모리 설계 구현 완료(`docs/end_user_memory_design.md`)

문서/정의(선행 가능):
- [x] Quickstart 탭 UI 설계 문서 추가 (`docs/widget_quickstart_ui_design.md`)
- [x] 위젯 스트리밍 상세 프로토콜(이벤트 스키마) 정의 (`docs/widget_streaming_protocol.md`)
- [x] end-user 메모리 연동 구체 플로우(저장 타이밍, 필드 매핑) 추가 (`docs/widget_end_user_memory_flow.md`)

구현(전제 조건 완료 후):
- [x] `B_chat_widgets` 테이블 및 관리자 UI 구현
- [x] 위젯 `public_key` 발급 및 관리 로직 구현
- [x] `POST /api/widget/init` 구현 및 도메인 검증
- [x] `POST /api/widget/chat` 구현 및 런타임 브릿지
- [x] 스트리밍(SSE/WS) 엔드포인트 구현
- [x] `embed/{public_key}` 페이지 구현(iframe UI)
- [x] `widget.js` 런처 구현(1줄 삽입 지원)
- [x] CSP `frame-ancestors` 및 보안 헤더 적용
- [x] 위젯 이벤트 로깅(`F_widget_events`) 연동
- [x] end-user 메모리 테이블 연동(`A_end_users` 계열)
- [x] Quickstart 탭에 설치 스니펫/키/상태 표시 구현

**13. End-User Memory 설계 구현 완료 이후 체크리스트**
아래 항목은 `docs/end_user_memory_design.md` 구현 완료 이후 진행한다.
- [ ] 마이그레이션 검증: `A_end_users` 계열 테이블 생성 및 인덱스 적용 확인
- [ ] 백필 실행: `D_conv_sessions`, `D_conv_turns`, `F_audit_mcp_tools` 기반으로 기존 데이터 채우기
- [ ] 데이터 품질 점검: 중복 end user 병합, 식별자 정규화 규칙 검증
- [ ] 개인정보/보안 점검: 마스킹/암호화 정책 적용 여부 확인
- [ ] 운영 모니터링 추가: 백필 실패율, 식별 매칭 실패율, 쓰기 지연 모니터링
- [ ] 성능 검증: `/contacts`, `/users/{customer_id}` 쿼리 응답시간 측정
- [ ] UI 노출 플래그 적용: 단계적 롤아웃(조직별 feature flag)
- [ ] 데이터 보관 정책 확정: retention 및 삭제 요청 처리 플로우 문서화
- [ ] 운영 가이드 작성: 관리자 매뉴얼 및 장애 대응 런북 작성
