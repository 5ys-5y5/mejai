# Self-Heal Navigation

단일 관리 파일:
- `src/app/api/runtime/governance/selfHeal/principles.ts`
  - self-heal 원칙 키
  - self-heal 위반 키
  - self-heal 이벤트 타입
  - 원인형(evidence contract) 필드 기준
  - 원칙별 기여 모듈(owner modules) 네비게이션

실행 구현 파일:
- 감지: `src/app/api/runtime/governance/_lib/detector.ts`
- 제안: `src/app/api/runtime/governance/_lib/proposer.ts`
- 런타임 리뷰 기록: `src/app/api/runtime/chat/runtime/runtimeTurnIo.ts`
- 주소 재현 검증: `src/app/api/runtime/governance/repro/address/route.ts`
