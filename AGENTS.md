# AGENTS

## Prompt Standards

Use the following prompt when build or type errors repeat. It is designed to drive root-cause fixes instead of file-by-file hotfixes.

```text
TypeScript/React 빌드 에러는 개별 핫픽스가 아니라
공통 컴포넌트의 타입 정의/props 설계를 수정해
재발 방지까지 포함해 해결해 주세요.

규칙:
- `React.HTMLAttributes`를 확장할 때 `onChange`/`value` 등 충돌 가능 prop은 Omit 처리
- 공통 컴포넌트(`src/components`) 타입부터 점검
- 사용처는 최소 변경(핸들러 래핑 없이 해결 가능하면 우선)
- 변경 후, 동일 패턴이 있는 파일들을 검색해 한 번에 정리
```

## Engineering Principles: Centralized UI Definitions

Goal: Keep UI definitions centralized under `src/components` so a single source of truth drives service-wide UI changes.

- Define each UI component once, in the lowest appropriate layer, and reuse it from higher layers.
- Avoid duplicate or parallel definitions across hierarchy levels. If a higher-level component needs the same UI, import and compose the lower-level component instead of re-declaring it.
- Prefer composition over copy/paste. If variations are needed, add well-scoped props or variants to the single definition.
- Keep cross-cutting UI primitives in `src/components` and reference them everywhere else; do not fork them per feature page.
- When refactoring, collapse duplicates by moving shared UI into the most reusable layer and updating higher layers to consume it.

## Deployment-Safe Code Change Rules (Railway)

Goal: Prevent syntax/compile errors from reaching Railway builds.

- When editing large files (e.g., `runtimeOrchestrator.ts`), prefer **small, scoped patches** and re-open the modified region to verify **all braces/closures** are balanced before finishing.
- After any non-trivial code change, **run `npm run build` locally** and fix errors before pushing. If you cannot run it, explicitly state that and minimize changes.
- Avoid mid-function refactors unless required. If you must add a new block inside a long function, **place the closing braces immediately**, then fill in the block.
- If you add new fields to debug payloads, **update all related types** in the same patch (e.g., `runtimeSupport.ts`, `runtimeConversationIoRuntime.ts`, `runtimeTurnIo.ts`).
- If a build error occurs, **fix it before any further edits**. Do not stack unrelated changes.

## Terminal Encoding (PowerShell + Codex CLI)

To prevent Korean text corruption in the Codex CLI PowerShell terminal output, ensure UTF-8 is set for the session and profile.

### One-time (current session)
```powershell
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

### Persist (PowerShell profile)
```powershell
if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
notepad $PROFILE
```

## Build Error Guardrail: Import/Export Mismatch

When a build error complains about a missing export (e.g., "export X doesn't exist in target module"):

- Do not hotfix by moving code blindly. Verify the **correct source module** for the symbol.
- Confirm the export with a direct file check or a repo search before changing imports.
- Prefer importing from the module where the symbol is defined, not adjacent policy files.
- After fixing, run a quick search for other references to the same symbol to avoid repeated mismatches.

## Type Safety Guardrail: Unknown Payloads in API Routes

When a TypeScript build error says `unknown` is not assignable to a typed payload:

- Do not pass raw `unknown` into typed helpers.
- Add a small type guard or normalize function that narrows to the expected shape.
- If needed, cast explicitly **after** checking `typeof === "object"` or array validation.
- Keep the conversion close to the data boundary (e.g., in the API route) to avoid leaking `unknown` downstream.

## Type Safety Guardrail: Callback Return Types

When changing the return type of a callback used across shared UI props (e.g., copy actions):

- Update the **shared prop types** first (e.g., component prop interfaces in `src/components`) to include the new return type.
- Avoid `void` wrappers like `() => void fn()` when the return value matters; return the promise/boolean directly.
- Check all call sites for type compatibility and update wrappers to preserve the return value.
- Apply the same rule to submit actions (e.g., `onSubmitMessage`) if they start returning `boolean` for control flow.
- Prefer consistent return shapes (e.g., always `boolean`), not `false | undefined`, to keep inference stable.

## Type Safety Guardrail: Optional Children Props

When a component expects an array prop (e.g., `tree: Item[]`) but data may be missing:

- Keep the component prop type strict (`Item[]`) and normalize at the call site with a safe default (`children ?? []`).
- Do not pass `undefined` into required array props; avoid widening the component prop to `Item[] | undefined`.
- If a parent/child relationship is optional, model it as `children?: Item[]` on the data type, not the renderer props.

Add the following lines to the profile:
```powershell
chcp 65001
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

If the profile fails to load with a `PSSecurityException`, either:
- run the one-time commands each session, or
- allow profile scripts for the current user with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Verification
```powershell
[Console]::OutputEncoding.WebName
```
Expected: `utf-8`
