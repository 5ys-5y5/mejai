# Engineering Standards

## TypeScript + React: onChange Prop Conflicts

When a component extends `React.HTMLAttributes`, its `onChange` type can conflict with custom `onChange` props. Fix the component API, not just the usage site.

### Rule
- If a component defines a custom `onChange`, use `Omit<React.HTMLAttributes<...>, "onChange">` in the props type.

### Standard Prompt (for assistance)

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

