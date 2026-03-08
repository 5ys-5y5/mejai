# Setup 모드 UI 누락 정리 (app/conversation)

대상 페이지
- `http://localhost:3000/app/conversation`

누락 정의
- 정책 스키마에는 존재하지만, 해당 setup 모드의 UI에서 설정할 수 없는 항목은 누락으로 본다.

확인 결과
1. setup.modeNew 누락
- UI에 없음: `setup.mcpProviderSelector`, `setup.mcpActionSelector`
- 근거 스키마: `SetupFieldKey` (`src/lib/conversation/pageFeaturePolicy.ts`)
- UI 렌더링 위치: `src/components/conversation/ChatSettingsPanel.tsx`
- 원인: `orderedSetupKeys`에서 MCP 항목을 필터링하여 렌더링되지 않음

2. setup.modeExisting 누락
- 없음 (모든 `ExistingSetupFieldKey` 항목이 UI에 렌더링됨)

참고
- `setup.modeNew` 현재 렌더링 항목:
  `inlineUserKbInput`, `llmSelector`, `kbSelector`, `adminKbSelector`, `routeSelector`
- `SetupFieldKey`에 존재하지만 렌더링되지 않는 항목:
  `mcpProviderSelector`, `mcpActionSelector`
