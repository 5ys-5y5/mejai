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
