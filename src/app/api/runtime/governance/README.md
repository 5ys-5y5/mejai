# Runtime Governance (Auto Suggest + Approve)

## Goal
- Detect principle violations from runtime audit logs.
- Auto-generate patch proposals.
- Require explicit approval before apply.
- Baseline source of truth: `src/app/api/runtime/chat/policies/principles.ts`

## Endpoints
- `GET/POST /api/runtime/governance/config`
  - `principles.ts` 기준 self-update on/off 설정 조회/변경
- `POST /api/runtime/governance/review`
  - Detect violations and create pending proposals.
  - Body:
    - `session_id?: string`
    - `limit?: number` (default bounded)
    - `dry_run?: boolean`
- `GET /api/runtime/governance/proposals`
  - self update 항목 조회 (상태 포함)
- `POST /api/runtime/governance/proposals/approve`
  - Approve/reject proposal and optionally apply.
  - Body:
    - `proposal_id: string`
    - `approve?: boolean` (default `true`)
    - `apply?: boolean` (default `false`)
    - `reviewer_note?: string`
- `POST /api/runtime/governance/proposals/complete`
  - 외부(LLB/로컬 CLI) 수동 적용이 끝난 proposal을 "적용 완료"로 상태만 기록.
  - Body:
    - `proposal_id: string`
    - `reason?: string`
    - `reviewer_note?: string`

## Access
- Admin user (IAM `is_admin=true`) or cron secret.
- Cron mode requires:
  - `x-cron-secret: <CRON_SECRET>`
  - `x-org-id: <org uuid>`

## Events written to `F_audit_events`
- `PRINCIPLE_VIOLATION_DETECTED`
- `RUNTIME_PATCH_PROPOSAL_CREATED`
- `RUNTIME_PATCH_PROPOSAL_APPROVED`
- `RUNTIME_PATCH_PROPOSAL_REJECTED`
- `RUNTIME_PATCH_APPLY_RESULT`
- `RUNTIME_PATCH_PROPOSAL_ON_HOLD`
- `RUNTIME_PATCH_PROPOSAL_COMPLETED`
- `RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED`

## Optional configs
- `RUNTIME_ADMIN_WEBHOOK_URL`: notify admin channel
- `RUNTIME_GOVERNANCE_MODEL`: proposal model (default `gpt-4o-mini`)
- `RUNTIME_PROPOSAL_APPLY_ENABLED=1`: allow patch apply on approval
- `POST /api/runtime/governance/proposals/hold`
  - 보류(미실행) 처리
