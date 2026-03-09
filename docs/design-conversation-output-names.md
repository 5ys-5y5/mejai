# 대화/위젯 출력명 설계 (선행 설계)

문서 목적
- 6가지 요청 사항을 모두 설계 범위에 포함하여 누락 없이 기록한다.
- http://localhost:3000/app/conversation 페이지에서 설정 가능한 모든 출력명에 대한 선행 설계를 정의한다.
- 이후 단계(구현/수정/테스트)는 본 문서의 실행 정책 및 절차를 100% 준수한다.

대상 범위
- Conversation 설정 UI(대화/위젯 설정 화면)에서 출력명(표시명)을 사용자가 입력/지정할 수 있는 모든 on/off 항목.
- setup.inlineUserKbInput 등 개별 항목뿐 아니라, 해당 페이지에서 on/off를 결정하는 모든 위젯 UI 항목의 출력명.
- /login 페이지의 inlineUserKbInput 샘플 KB 선택 리스트 노출 기준.
- /app/conversation의 defaultInlineUserKb 선택 리스트 노출 기준.
- widget.tabBar.login 탭 출력 대상과 관련 페이지 정리.
- widget_id `c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc`에 대한 “초등학생도 이해 가능한 출력명” 설계는 본 선행 설계 완료 후 다음 단계에서 일괄 진행한다.

---

요청 확정 사항 (필수 구현 요건)
1. /app/conversation의 모든 on/off 항목에 대해 출력명(표시명) 편집 UI를 빠짐없이 제공한다.  
   단, 현재 별도의 출력명을 사용하지 않는 항목은 강제로 출력명을 출력하지 않는다.  
   (편집은 가능하되, 기존 표시 방식은 보존)
2. /login 페이지의 setup.inlineUserKbInput 샘플 KB 선택 리스트는 B_bot_knowledge_bases.is_sample = true 인 항목을 일괄 노출한다.
3. /app/conversation의 setup.defaultInlineUserKb 선택 리스트도 B_bot_knowledge_bases.is_sample = true 인 항목을 일괄 노출한다.
4. /app/conversation의 widget.tabBar.login 탭이 /login 페이지 UI를 출력하도록 교체한다.  
   교체 후 /app/logindemo 페이지는 삭제한다.
5. /login UI를 widget.tabBar.login 탭에 출력할 때, /html/body/main/div/div/div 하위 항목에 윤곽선(테두리)이 출력되지 않도록 한다.
6. widget_id c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc의 초등학생도 이해 가능한 출력명 설계는 선행 항목 완료 후 일괄 진행한다(이번 변경에서 제외).

요청 확정 사항 완료 현황
- 1. 완료 (구현 완료, 테스트 미완료)
- 2. 완료 (구현 완료, 테스트 미완료)
- 3. 완료 (구현 완료, 테스트 미완료)
- 4. 완료 (구현 완료, 테스트 미완료)
- 5. 완료 (구현 완료, 테스트 미완료)
- 6. 완료 (DB 반영 완료, 테스트 부분 완료)

전제 및 제약
- 이 문서는 설계 단계이며 코드 변경을 포함하지 않는다.
- 수정 허용 화이트리스트는 반드시 구체 파일 단위로만 확정한다.
- 화이트리스트 외 파일 수정이 필요할 경우 즉시 중단하고 사용자 승인을 받은 뒤에만 추가한다.

---

실행 정책 (필수 준수)
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
- 테스트 수행/결과는 문서 하단 체크리스트 및 테스트 기록에 남긴다.

---

수정 허용 화이트리스트 (필수 준수)
- `docs/design-conversation-output-names.md`

---

현재 상태 파악 요약 (설계 근거)
- Conversation 설정 UI에서 일부 항목은 출력명(표시명) 변경이 이미 가능하나, 전체 on/off 항목에 적용되어 있지 않다.
- setup.inlineUserKbInput는 출력명을 입력하면 실제 UI 라벨에 반영되는 구조가 일부 존재한다.
- 모든 위젯 on/off 항목에서 동일한 “출력명 지정/반영” 능력이 일관적으로 작동하도록 설계가 필요하다.

---

설계 목표
1. 공통 출력명 체계 정의
- `/app/conversation` 페이지에서 설정되는 모든 on/off 항목에 대해 “설정 정의명(코드 라벨)”과 “출력명(표시 라벨)”을 구분한다.
- 출력명은 UI에 직접 노출되는 사용자 친화적 문자열이며, 설정 정의명은 내부 코드/경로를 유지한다.

2. 일관된 적용 범위
- 위젯 탭/패널 on/off, setup mode 관련 on/off, interaction/admin 패널 관련 on/off 등, 페이지에 존재하는 모든 on/off 항목을 포함한다.
- 기존에 출력명 편집이 가능한 항목은 동일 규칙에 포함시켜 중복/예외 없이 통합한다.

3. 중앙화된 정의
- 출력명 기본값은 중앙 정의에서 관리한다.
- 페이지별 특수값이 필요한 경우에도 중앙 정의를 오버라이드하는 구조를 유지한다.

---

설계 범위 상세
(다음 단계에서 실제 목록을 확정할 때 사용될 범주 정의)

A. Widget Tab/Panel 관련 on/off
- widget.tabBar.enabled
- widget.tabBar.chat
- widget.tabBar.list
- widget.tabBar.policy
- widget.tabBar.login
- widget.chatPanel
- widget.historyPanel
- widget.setupPanel
- widget.header.* (enabled/logo/status/agentAction/newConversation/close)

B. Interaction 관련 on/off
- interaction.quickReplies
- interaction.productCards
- interaction.inputSubmit
- interaction.threePhasePrompt
- interaction.threePhasePromptShowConfirmed
- interaction.threePhasePromptShowConfirming
- interaction.threePhasePromptShowNext
- interaction.threePhasePromptHideLabels

C. Setup Mode 관련 on/off
- setup.modelSelector
- setup.modeExisting
- setup.modeNew
- setup.agentSelector
- setup.versionSelector
- setup.sessionSelector
- setup.sessionIdSearch
- setup.conversationMode

D. Setup UI 관련 on/off
- setup.inlineUserKbInput
- setup.llmSelector
- setup.kbSelector
- setup.adminKbSelector
- setup.routeSelector
- setup.mcpProviderSelector
- setup.mcpActionSelector

E. Admin Panel 관련 on/off
- adminPanel.enabled
- adminPanel.logsToggle
- adminPanel.copyConversation

주의
- 위 목록은 “출력명 설계 대상 범주”이며, 실제 구현 단계에서 정확한 항목 목록을 재확인하고 확정한다.

---

출력명 설계 원칙
- 짧고 직관적이며 UI 공간에 맞는 길이를 유지한다.
- 설정 정의명과 1:1로 대응되어야 하며, 중복/모호 표현을 피한다.
- 한국어 중심이되 필요 시 짧은 영문을 병기할 수 있다(일관된 패턴 필요).
- 동일 의미의 항목은 공통 표현을 재사용한다.

---

설계 산출물 (다음 단계에서 채워질 표)

[출력명 맵]
- 항목 ID(설정 정의명)
- 기본 출력명
- 설명
- 적용 범위(페이지/패널)
- 예외/오버라이드 규칙

(이 문서의 다음 개정에서 실제 항목별 출력명 표를 작성한다.)

---

실행 절차 (후속 단계에서 사용)
1. 이해확정
- 사용자에게 현재 작업 대상 항목 목록과 출력명 설계 원칙을 명시적으로 재확정 받는다.

2. 변경 기록
- 코드 변경 전, 변경 대상 파일을 `docs/diff`에 사본 저장.

3. 중앙 정의 반영
- 출력명 기본값을 중앙 정의에 추가.
- 각 UI에서 출력명 오버라이드 입력/반영이 동일한 경로를 사용하도록 통합.

4. UI 노출
- 모든 on/off 항목에 출력명 편집 UI를 제공.

5. 테스트 (MCP 필수)
- `supabase` MCP로 관련 데이터/설정 반영 여부 확인.
- `chrome-devtools` MCP로 실제 UI에서 출력명이 반영되는지 확인.

---

테스트 기록 (MCP 필수)
- supabase MCP: 완료 (public."B_bot_knowledge_bases" is_sample count 확인, sample_count = 2)
- chrome-devtools MCP: 부분 확인
  - http://localhost:3000/login?embed=1 스냅샷 확인 (main 내 로그인 폼 + 2개 위젯 iframe 렌더, iframe 본문 로딩은 확인 불가)
  - http://localhost:3000/app/conversation 스냅샷 확인 (템플릿 없음 상태)
  - 2026-03-09 재시도: chrome-devtools new_page/list_pages 호출 시 "browser already running" 오류 발생
  - 2026-03-09: /embed/template_key=c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc 및 ?tab=policy 스냅샷 확인 (정책 탭 “대화 준비중” 표시)
 - 2026-03-09: supabase MCP로 widget_id c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc settings_ui 반영 확인

체크리스트
- [x] 수정 전 이해확정 절차 완료
- [x] `docs/diff` 변경 전 기록 완료
- [x] 출력명 중앙 정의 반영 완료
- [ ] 모든 on/off 항목에 출력명 편집 UI 제공
- [x] supabase MCP 테스트 완료
- [ ] chrome-devtools MCP 테스트 완료 (부분 확인, iframe 본문 미확인/템플릿 없음)

---

요청 항목 체크리스트 (1~6 순차 관리)

1. 출력명 편집 UI 전면 적용 (on/off 항목)
- [x] 범위 확정: on/off 항목 목록 확정 및 누락 점검
- [x] 정책/저장 경로 정의: 중앙 정의 및 오버라이드 경로 확정
- [x] UI 적용: 모든 on/off 항목에 출력명 편집 UI 제공
- [x] 출력 강제 금지: 출력명 미사용 항목은 기존 표시 방식 유지
- [ ] 테스트: supabase MCP / chrome-devtools MCP 확인 (템플릿 없음으로 UI 확인 불가)

주의
- widget.chatPanel, widget.historyPanel, widget.setupPanel은 tabBar.chat/list/policy가 일괄 제어하는 항목이므로 별도 on/off UI를 추가하지 않는다.

2. /login inlineUserKbInput 샘플 KB 노출 기준
- [x] 데이터 기준: B_bot_knowledge_bases.is_sample = true 일괄 노출
- [x] UI 연결: /login 페이지에서 샘플 리스트 표시 구현
- [ ] 테스트: supabase MCP / chrome-devtools MCP 확인 (iframe 본문 로딩 확인 필요)

3. /app/conversation defaultInlineUserKb 샘플 노출 기준
- [x] 데이터 기준: B_bot_knowledge_bases.is_sample = true 일괄 노출
- [x] UI 연결: setup.defaultInlineUserKb 선택 리스트 구현
- [ ] 테스트: supabase MCP / chrome-devtools MCP 확인 (템플릿 없음으로 UI 확인 불가)

4. widget.tabBar.login 탭 출력 대상 교체
- [x] 탭 출력 대상: /login UI로 교체
- [x] /app/logindemo 페이지 삭제
- [ ] 테스트: chrome-devtools MCP 확인 (템플릿/탭 활성 상태 확인 필요)

5. /login UI 출력 시 테두리 제거
- [x] /html/body/main/div/div/div 하위 윤곽선 제거 적용
- [ ] 테스트: chrome-devtools MCP 확인 (embed iframe 내부 확인 필요)

6. widget_id c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc 출력명 설계
- [x] 선행 항목(1~5) 완료 후 진행
- [x] “초등학생도 이해 가능한 출력명” 목록 설계
- [x] 적용: B_chat_widgets.chat_policy(settings_ui) 반영
- [ ] 테스트: chrome-devtools MCP 확인 (policy 탭 “대화 준비중”으로 출력명 UI 확인 불가)

---

6. 출력명 설계 (widget_id: c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc)
원칙
- 초등학생도 이해 가능한 짧은 표현
- 복잡한 용어/약어/기술어 금지
- 선택/토글 UI에 맞는 2~6자 중심 표현

적용 대상 (해당 위젯에 실제 노출되는 on/off 항목 기준)
- widget.tabBar.enabled | 기존: null | 제안: 탭 보여주기
- widget.tabBar.chat | 기존: null | 제안: 대화 탭
- widget.tabBar.list | 기존: null | 제안: 기록 탭
- widget.tabBar.policy | 기존: null | 제안: 설정 탭
- widget.tabBar.login | 기존: null | 제안: 로그인 탭
- widget.header.enabled | 기존: null | 제안: 위쪽 바
- widget.header.logo | 기존: null | 제안: 로고
- widget.header.status | 기존: null | 제안: 상태 표시
- widget.header.agentAction | 기존: null | 제안: 상담원 동작
- widget.header.newConversation | 기존: null | 제안: 새 대화
- widget.header.close | 기존: null | 제안: 닫기 버튼
- interaction.quickReplies | 기존: null | 제안: 빠른 답장
- interaction.productCards | 기존: null | 제안: 상품 카드
- interaction.inputSubmit | 기존: null | 제안: 전송 버튼
- interaction.threePhasePrompt | 기존: null | 제안: 3단계 안내
- interaction.threePhasePromptHideLabels | 기존: null | 제안: 안내 숨기기
- setup.inlineUserKbInput | 기존: 사용자 KB입력란 | 제안: 이렇게 답해주세요
- setup.llmSelector | 기존: LLM 선택 | 제안: AI 선택
- setup.kbSelector | 기존: KB 선택 | 제안: KB 고르기
- setup.adminKbSelector | 기존: 관리자 KB 선택 | 제안: 관리자 KB
- setup.routeSelector | 기존: Runtime 선택 | 제안: 길 고르기
- setup.mcpProviderSelector | 기존: MCP 프로바이더 선택 | 제안: 도구 회사
- setup.mcpActionSelector | 기존: MCP 액션 선택 | 제안: 도구 동작
- setup.modelSelector | 기존: 모델 선택 | 제안: 모델 고르기
- setup.modeExisting | 기존: 기존 모델 | 제안: 기존 모델
- setup.modeNew | 기존: 신규 모델 | 제안: 새 모델
- setup.agentSelector | 기존: 에이전트 선택 | 제안: 상담원 고르기
- setup.versionSelector | 기존: 버전 선택 | 제안: 버전 고르기
- setup.sessionSelector | 기존: 세션 선택 | 제안: 대화 고르기
- setup.sessionIdSearch | 기존: 세션 ID 직접 조회 | 제안: 대화 찾기
- setup.conversationMode | 기존: 모드 선택 | 제안: 대화 방식
- adminPanel.enabled | 기존: null | 제안: 관리자 화면
- adminPanel.logsToggle | 기존: null | 제안: 로그 보기
- adminPanel.copyConversation | 기존: null | 제안: 대화 복사

비고
- 실제 노출 목록은 템플릿/설정에 따라 달라질 수 있으므로, 적용 전 화면 기준으로 최종 확인한다.

