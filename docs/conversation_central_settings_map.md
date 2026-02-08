# Conversation Central Settings Map

## 1) Runtime Answer Settings

- Entry: `src/app/api/runtime/chat/route.ts`
- Orchestration: `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`
- Render decision inputs: `src/app/api/runtime/chat/policies/renderPolicy.ts`
- Intent/slot/policy: `src/app/api/runtime/chat/policies/*`, `src/app/api/runtime/chat/runtime/*`

## 2) Client Response Mapping Settings

- Runtime response -> transcript/UI fields:
  - `src/lib/runtimeResponseTranscript.ts`
- Message render helpers(shared):
  - `src/lib/conversation/messageRenderUtils.tsx`

## 3) Debug Transcript Formatting Settings

- Transcript formatter:
  - `src/lib/debugTranscript.ts`

## 4) Page-Specific Copy/Debug Exposure Settings

- Page policy (what to copy, which options to expose):
  - `src/lib/transcriptCopyPolicy.ts`

## 5) Client Conversation Controller (single client entry)

- Hook:
  - `src/lib/conversation/client/useConversationController.ts`
- Laboratory action hook:
  - `src/lib/conversation/client/useLaboratoryConversationActions.ts`
- Runtime API wrapper:
  - `src/lib/conversation/client/runtimeClient.ts`
  - `src/lib/conversation/client/laboratoryTransport.ts`
- Copy execution (policy + clipboard + toast):
  - `src/lib/conversation/client/copyExecutor.ts`
- Shared thread render skeleton:
  - `src/components/conversation/ConversationThread.tsx`
- Shared admin menu:
  - `src/components/conversation/ConversationAdminMenu.tsx`

---

## New Page Minimal Usage (target: <=10 lines)

### A. UI 포함 컴포넌트 사용 (가장 짧음)

```tsx
<ConversationQuickStart
  page="/app/laboratory"
  makeRunBody={({ text, sessionId }) => ({ route: "shipping", llm: "chatgpt", message: text, session_id: sessionId || undefined })}
/>
```

컴포넌트 위치: `src/components/conversation/ConversationQuickStart.tsx`

### B. 페이지 커스텀 UI 사용

```tsx
const convo = useConversationController({
  page: "/app/laboratory",
  makeRunBody: ({ text, sessionId }) => ({ route: "shipping", llm: "chatgpt", message: text, session_id: sessionId || undefined }),
});
await convo.send(input);
await convo.copyConversation();
```

페이지는 레이아웃/UI 구성만 담당하고, 대화/로그/복사 흐름은 컨트롤러를 사용한다.
