# 기본 vs 대화 정책 탭 설정 비교

근거: `src/app/app/conversation/page.tsx` (기본/대화 정책 탭 렌더링)와 `src/components/conversation/ChatSettingsPanel.tsx` (대화 정책 UI 구성).

## 한 쪽에만 존재하는 설정

### 기본 탭에만 존재
- 템플릿 이름 (`draft.name` 입력)
- 에이전트 선택 (`draft.agent_id` Select)
- 구성 (에이전트 하위) 설정
- LLM 기본값 (`setupConfig.llm.default` 버튼)
- KB 모드 (`setupConfig.kb.mode` 버튼)
- 사용자 KB / 관리자 KB 선택 (`setupConfig.kb.kb_id`, `setupConfig.kb.admin_kb_ids`)
- MCP Provider / MCP Tool 선택 (`setupConfig.mcp.provider_keys`, `setupConfig.mcp.tool_ids`)
- 허용 도메인 / 허용 경로 (`domainText`, `pathText` 텍스트 영역)
- 인사말 / 입력 안내 / 아이콘 URL (`draft.theme.greeting`, `draft.theme.input_placeholder`, `draft.theme.launcher_icon_url`)

### 대화 정책 탭에만 존재
- 별도의 설정 항목 없음
- (참고: UI 액션으로만 "정책 저장" 버튼이 있음)

## 공통으로 존재하는 대화 정책 설정
- 두 탭 모두 `ChatSettingsPanel`을 렌더링하며, 설정 범위는 동일함.
- 기본 탭: `variant="base"`로 표시(항목 확장/스타일만 다름)
- 대화 정책 탭: 기본 `variant="policy"` (접힘 UI)
